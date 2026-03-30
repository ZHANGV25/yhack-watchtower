#!/usr/bin/env python3
"""WatchTower Camera Client

Two modes:
1. Stream mode (--stream): Push live frames via WebSocket for real-time dashboard
2. Clip mode (default): Record clips on motion, upload to S3, notify API

Both modes support motion detection. Clip mode is production-grade —
camera only uploads when something happens.

Usage:
    # Production: clip mode with motion detection
    python camera_client.py --server localhost:8000 --camera-id front-door

    # Live stream mode (for real-time dashboard)
    python camera_client.py --server localhost:8000 --camera-id front-door --stream

    # With RTSP source
    python camera_client.py --camera "rtsp://192.168.1.100:8554/stream" --camera-id backyard
"""
from __future__ import annotations

import argparse
import asyncio
import io
import json
import os
import sys
import tempfile
import threading
import time
import uuid
from collections import deque
from pathlib import Path

import socket

import cv2
import numpy as np

try:
    import websockets
except ImportError:
    print("pip install websockets opencv-python")
    sys.exit(1)

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

try:
    import boto3
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False

# WebRTC support (optional but needed for live view)
try:
    import aiohttp
    from aiohttp import web
    from aiortc import RTCPeerConnection, RTCSessionDescription, RTCConfiguration, RTCIceServer, VideoStreamTrack
    from aiortc.contrib.media import MediaRelay
    from av import VideoFrame
    HAS_WEBRTC = True
except ImportError:
    HAS_WEBRTC = False


class FrameGrabber:
    """Reads camera in a background thread so OpenCV never blocks the async event loop.

    The thread continuously reads frames and keeps only the latest one.
    Callers get the most recent frame instantly via read() — no blocking.
    This is critical: without it, synchronous cap.read() starves the
    async event loop, preventing WebSocket messages from being processed.
    """

    def __init__(self, source: int | str = 0, width: int = 640) -> None:
        self._source = source
        self.width = width
        self.cap = cv2.VideoCapture(source)
        if not self.cap.isOpened():
            raise RuntimeError(f"Cannot open camera: {source}")
        if width:
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        try:
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except Exception:
            pass
        self._frame: np.ndarray | None = None
        self._lock = threading.Lock()
        self._running = True
        self._thread = threading.Thread(target=self._reader, daemon=True)
        self._thread.start()
        print(f"Camera opened: {source}")

    def _reader(self) -> None:
        """Background thread: continuously reads frames, keeps only the latest."""
        while self._running:
            ok, frame = self.cap.read()
            if ok:
                if self.width:
                    h, w = frame.shape[:2]
                    if w > self.width:
                        scale = self.width / w
                        frame = cv2.resize(frame, (self.width, int(h * scale)))
                with self._lock:
                    self._frame = frame
            else:
                # Camera disconnected — try to reopen
                print("Camera read() failed. Reopening in 5s...")
                self.cap.release()
                time.sleep(5)
                self.cap = cv2.VideoCapture(self._source)
                if self.cap.isOpened():
                    if self.width:
                        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                    print("Camera reopened.")
                else:
                    print("Camera reopen failed. Retrying...")

    def read(self) -> tuple[bool, np.ndarray | None]:
        """Get the latest frame. Non-blocking — never stalls the event loop."""
        with self._lock:
            if self._frame is not None:
                return True, self._frame.copy()
        return False, None

    def release(self) -> None:
        self._running = False
        self._thread.join(timeout=3)
        if self.cap.isOpened():
            self.cap.release()


class MotionDetector:
    """Frame differencing motion detector."""

    def __init__(self, threshold: float = 25.0, min_area_pct: float = 0.5) -> None:
        self.prev_gray: np.ndarray | None = None
        self.threshold = threshold
        self.min_area_pct = min_area_pct

    def detect(self, frame: np.ndarray) -> bool:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)
        if self.prev_gray is None:
            self.prev_gray = gray
            return False  # First frame — no reference yet
        delta = cv2.absdiff(self.prev_gray, gray)
        thresh = cv2.threshold(delta, self.threshold, 255, cv2.THRESH_BINARY)[1]
        changed_pct = (np.count_nonzero(thresh) / thresh.size) * 100
        self.prev_gray = gray
        return changed_pct > self.min_area_pct


class ClipRecorder:
    """Records motion clips with pre-buffer and post-buffer."""

    def __init__(self, pre_seconds: float = 5.0, post_seconds: float = 10.0, fps: int = 15) -> None:
        self.pre_seconds = pre_seconds
        self.post_seconds = post_seconds
        self.fps = fps
        self.pre_buffer: deque[np.ndarray] = deque(maxlen=int(pre_seconds * fps))
        self.recording = False
        self.clip_frames: list[np.ndarray] = []
        self.motion_end_time: float = 0.0
        self.clip_start_time: float = 0.0

    def feed(self, frame: np.ndarray, motion: bool, now: float) -> str | None:
        """Feed a frame. Returns clip file path when a clip is complete, else None."""
        self.pre_buffer.append(frame.copy())

        if motion and not self.recording:
            # Start recording — include pre-buffer
            self.recording = True
            self.clip_frames = list(self.pre_buffer)
            self.clip_start_time = now - self.pre_seconds
            self.motion_end_time = 0.0
            return None

        if self.recording:
            self.clip_frames.append(frame.copy())

            if motion:
                self.motion_end_time = 0.0  # Reset post-buffer timer
            else:
                if self.motion_end_time == 0.0:
                    self.motion_end_time = now
                elif now - self.motion_end_time >= self.post_seconds:
                    # Post-buffer expired — save clip
                    clip_path = self._save_clip(frame.shape)
                    self.recording = False
                    self.clip_frames = []
                    return clip_path

            # Safety: max 60 seconds per clip
            if len(self.clip_frames) > self.fps * 60:
                clip_path = self._save_clip(frame.shape)
                self.recording = False
                self.clip_frames = []
                return clip_path

        return None

    def _save_clip(self, shape: tuple) -> str:
        """Save clip frames as MP4. Returns file path."""
        h, w = shape[:2]
        path = os.path.join(tempfile.gettempdir(), f"wt_clip_{uuid.uuid4().hex[:8]}.mp4")
        fourcc = cv2.VideoWriter_fourcc(*"avc1")
        out = cv2.VideoWriter(path, fourcc, self.fps, (w, h))
        if not out.isOpened():
            # Fallback if avc1 not available
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            out = cv2.VideoWriter(path, fourcc, self.fps, (w, h))
        for f in self.clip_frames:
            out.write(f)
        out.release()
        return path


class ClipUploader:
    """Uploads clips to S3 and notifies the API."""

    S3_MAX_RETRIES = 3
    API_MAX_RETRIES = 3

    def __init__(self, server: str, camera_id: str, s3_bucket: str) -> None:
        self.server = server
        self.camera_id = camera_id
        self.s3_bucket = s3_bucket
        self.s3 = boto3.client("s3") if HAS_BOTO3 else None
        self._pending_notifications: list[dict] = []

    async def upload(self, clip_path: str, timestamp: float) -> None:
        clip_id = uuid.uuid4().hex[:8]
        s3_key = f"clips/{self.camera_id}/{clip_id}.mp4"

        # Upload to S3 with retries
        if self.s3 and self.s3_bucket:
            uploaded = False
            for attempt in range(1, self.S3_MAX_RETRIES + 1):
                try:
                    self.s3.upload_file(clip_path, self.s3_bucket, s3_key)
                    print(f"  Uploaded clip to s3://{self.s3_bucket}/{s3_key}")
                    uploaded = True
                    break
                except Exception as e:
                    delay = 2 ** attempt
                    print(f"  S3 upload failed (attempt {attempt}/{self.S3_MAX_RETRIES}): {e}")
                    if attempt < self.S3_MAX_RETRIES:
                        print(f"  Retrying in {delay}s...")
                        await asyncio.sleep(delay)
            if not uploaded:
                print("  S3 upload exhausted retries. Falling back to direct API upload.")
                await self._upload_via_api(clip_path, clip_id, timestamp)
                return
        else:
            # No S3 -- upload directly to API
            await self._upload_via_api(clip_path, clip_id, timestamp)
            return

        # Notify API that a clip is ready
        await self._notify_api(clip_id, s3_key, timestamp)

        # Retry any previously failed notifications
        await self._flush_pending_notifications()

        # Clean up temp file
        try:
            os.remove(clip_path)
        except OSError:
            pass

    async def _notify_api(self, clip_id: str, s3_key: str, timestamp: float) -> None:
        """Tell the API a new clip is ready for processing."""
        if not HAS_HTTPX:
            print("  httpx not installed -- cannot notify API")
            return
        url = _api_url(self.server, "/api/clips/process")
        payload = {
            "clip_id": clip_id,
            "camera_id": self.camera_id,
            "s3_key": s3_key,
            "timestamp": timestamp,
        }
        for attempt in range(1, self.API_MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, json=payload)
                    print(f"  API notified: {resp.status_code}")
                    return
            except Exception as e:
                delay = 2 ** attempt
                print(f"  API notification failed (attempt {attempt}/{self.API_MAX_RETRIES}): {e}")
                if attempt < self.API_MAX_RETRIES:
                    await asyncio.sleep(delay)
        # All retries exhausted -- queue for later
        print("  Queuing notification for later retry.")
        self._pending_notifications.append(payload)

    async def _flush_pending_notifications(self) -> None:
        """Retry any previously queued API notifications."""
        if not self._pending_notifications or not HAS_HTTPX:
            return
        remaining: list[dict] = []
        for payload in self._pending_notifications:
            url = _api_url(self.server, "/api/clips/process")
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, json=payload)
                    print(f"  Retried queued notification: {resp.status_code}")
            except Exception as e:
                print(f"  Queued notification still failing: {e}")
                remaining.append(payload)
        self._pending_notifications = remaining

    async def _upload_via_api(self, clip_path: str, clip_id: str, timestamp: float) -> None:
        """Upload clip directly to API when S3 is not available."""
        if not HAS_HTTPX:
            print("  httpx not installed -- cannot upload clip")
            return
        url = _api_url(self.server, "/api/clips/upload")
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                with open(clip_path, "rb") as f:
                    resp = await client.post(url, files={"clip": (f"{clip_id}.mp4", f, "video/mp4")},
                                             data={"camera_id": self.camera_id, "timestamp": str(timestamp)})
                print(f"  Clip uploaded to API: {resp.status_code}")
        except Exception as e:
            print(f"  API upload failed: {e}")
        try:
            os.remove(clip_path)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# Embedded WebRTC server (shares FrameGrabber with clip mode)
# ---------------------------------------------------------------------------

if HAS_WEBRTC:
    import logging
    _webrtc_log = logging.getLogger("watchtower.webrtc")

    _webrtc_pcs: set[RTCPeerConnection] = set()
    _webrtc_relay = MediaRelay()
    _shared_track = None  # SharedCameraTrack instance

    def _build_ice_servers() -> list[RTCIceServer]:
        servers: list[RTCIceServer] = [
            RTCIceServer(urls=["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]),
        ]
        turn_url = os.environ.get("TURN_URL")
        turn_user = os.environ.get("TURN_USER")
        turn_pass = os.environ.get("TURN_PASS")
        if turn_url and turn_user and turn_pass:
            servers.append(RTCIceServer(urls=[turn_url], username=turn_user, credential=turn_pass))
        return servers

    _ICE_SERVERS = _build_ice_servers()

    class SharedCameraTrack(VideoStreamTrack):
        """Video track that reads from an existing FrameGrabber (shared, not owned)."""
        kind = "video"

        def __init__(self, grabber: FrameGrabber, width: int = 640, fps: int = 15) -> None:
            super().__init__()
            self.grabber = grabber  # shared — don't release on stop
            self.width = width
            self.fps = fps

        async def recv(self) -> VideoFrame:
            pts, time_base = await self.next_timestamp()
            ok, frame = self.grabber.read()
            if not ok or frame is None:
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            video_frame = VideoFrame.from_ndarray(frame, format="rgb24")
            video_frame.pts = pts
            video_frame.time_base = time_base
            return video_frame

        def stop(self) -> None:
            super().stop()
            # DON'T release grabber — clip mode still needs it

    async def _handle_webrtc_offer(request: web.Request) -> web.Response:
        """Local HTTP endpoint for WebRTC offers."""
        global _shared_track
        params = await request.json()
        offer_sdp = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

        config = RTCConfiguration(iceServers=_ICE_SERVERS)
        pc = RTCPeerConnection(configuration=config)
        _webrtc_pcs.add(pc)
        pc_id = uuid.uuid4().hex[:8]

        @pc.on("connectionstatechange")
        async def on_state():
            _webrtc_log.info("Peer %s: %s", pc_id, pc.connectionState)
            if pc.connectionState in ("failed", "closed"):
                await pc.close()
                _webrtc_pcs.discard(pc)

        relayed = _webrtc_relay.subscribe(_shared_track)
        pc.addTrack(relayed)

        await pc.setRemoteDescription(offer_sdp)
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        _webrtc_log.info("Peer %s connected", pc_id)

        return web.json_response({
            "sdp": pc.localDescription.sdp,
            "type": pc.localDescription.type,
        })

    async def _relay_poll_loop(relay_url: str, camera_id: str, camera_name: str) -> None:
        """Poll the relay for pending SDP offers and answer them via HTTP.

        No WebSocket — pure HTTP polling. Simple and reliable.
        Flow: register → poll /pending → process offer → POST /answer
        """
        global _shared_track
        # Convert ws:// URL to http://
        http_url = relay_url.replace("ws://", "http://").replace("wss://", "https://")
        _webrtc_log.info("Relay polling: %s (camera_id=%s)", http_url, camera_id)

        async with aiohttp.ClientSession() as session:
            while True:
                try:
                    # Register / heartbeat
                    await session.post(
                        f"{http_url}/register/{camera_id}",
                        json={"name": camera_name},
                    )

                    # Poll for pending offers
                    resp = await session.get(f"{http_url}/pending/{camera_id}")
                    data = await resp.json()
                    offers = data.get("offers", [])

                    for offer_data in offers:
                        request_id = offer_data.get("request_id")
                        try:
                            offer_sdp = RTCSessionDescription(
                                sdp=offer_data["sdp"],
                                type=offer_data.get("type", "offer"),
                            )
                            config = RTCConfiguration(iceServers=_ICE_SERVERS)
                            pc = RTCPeerConnection(configuration=config)
                            _webrtc_pcs.add(pc)
                            peer_id = uuid.uuid4().hex[:8]

                            @pc.on("connectionstatechange")
                            async def on_state(pc=pc, pid=peer_id):
                                _webrtc_log.info("Peer %s: %s", pid, pc.connectionState)
                                if pc.connectionState in ("failed", "closed"):
                                    await pc.close()
                                    _webrtc_pcs.discard(pc)

                            relayed = _webrtc_relay.subscribe(_shared_track)
                            pc.addTrack(relayed)

                            await pc.setRemoteDescription(offer_sdp)
                            answer = await pc.createAnswer()
                            await pc.setLocalDescription(answer)

                            # POST answer back to relay
                            await session.post(
                                f"{http_url}/answer/{request_id}",
                                json={
                                    "sdp": pc.localDescription.sdp,
                                    "type": pc.localDescription.type,
                                },
                            )
                            _webrtc_log.info("Answered offer %s for peer %s", request_id, peer_id)

                        except Exception as e:
                            _webrtc_log.error("Failed to handle offer %s: %s", request_id, e)
                            import traceback
                            traceback.print_exc()

                except asyncio.CancelledError:
                    raise
                except Exception as e:
                    _webrtc_log.error("Relay poll error: %s", e)

                await asyncio.sleep(1)  # Poll every second

    def _create_webrtc_app() -> web.Application:
        """Create an aiohttp app for local WebRTC signaling."""
        app = web.Application()

        @web.middleware
        async def cors(request, handler):
            if request.method == "OPTIONS":
                resp = web.Response()
            else:
                resp = await handler(request)
            resp.headers["Access-Control-Allow-Origin"] = "*"
            resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
            return resp

        app.middlewares.append(cors)
        app.router.add_post("/offer", _handle_webrtc_offer)

        async def ice_config(request):
            servers = [{"urls": ["stun:stun.l.google.com:19302"]}]
            t_url = os.environ.get("TURN_URL")
            t_user = os.environ.get("TURN_USER")
            t_pass = os.environ.get("TURN_PASS")
            if t_url and t_user and t_pass:
                servers.append({"urls": [t_url], "username": t_user, "credential": t_pass})
            return web.json_response({"iceServers": servers})

        app.router.add_get("/ice-config", ice_config)
        app.router.add_get("/health", lambda r: web.json_response({"status": "ok", "peers": len(_webrtc_pcs)}))
        return app

    async def start_embedded_webrtc(grabber: FrameGrabber, width: int, fps: int,
                                     port: int, camera_id: str, camera_name: str,
                                     relay: str = "") -> None:
        """Start embedded WebRTC server and optional relay connection."""
        global _shared_track
        _shared_track = SharedCameraTrack(grabber, width=width, fps=fps)

        # Start local signaling HTTP server
        app = _create_webrtc_app()
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, "0.0.0.0", port)
        await site.start()
        print(f"WebRTC signaling on http://0.0.0.0:{port}")

        # Connect to relay if configured
        if relay:
            asyncio.create_task(_relay_poll_loop(relay, camera_id, camera_name))
            print(f"Relay: {relay} (camera_id={camera_id})")


# ---------------------------------------------------------------------------
# WebRTC registration
# ---------------------------------------------------------------------------

def _api_url(server: str, path: str) -> str:
    """Build full API URL, using https for cloud endpoints."""
    scheme = "https" if "amazonaws.com" in server or "vercel" in server else "http"
    return f"{scheme}://{server}{path}"


def get_local_ip():
    """Get this machine's local network IP."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"


async def register_webrtc(server: str, camera_id: str, webrtc_port: int, relay: str = ""):
    """Tell the backend where to find this camera's WebRTC stream.

    If a relay URL is configured, register the relay's HTTP offer endpoint
    (reachable from the internet) instead of the local IP.
    """
    if not HAS_HTTPX:
        print("httpx not installed -- cannot register WebRTC URL")
        return

    if relay:
        # Relay URL is ws:// — convert to http:// offer endpoint
        relay_http = relay.replace("ws://", "http://").replace("wss://", "https://")
        webrtc_url = f"{relay_http}/offer/{camera_id}"
    else:
        local_ip = get_local_ip()
        webrtc_url = f"http://{local_ip}:{webrtc_port}/offer"

    url = _api_url(server, f"/api/cameras/{camera_id}/connect")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json={"webrtc_url": webrtc_url})
            if resp.status_code == 200:
                print(f"Registered WebRTC URL: {webrtc_url}")
            elif resp.status_code == 404:
                print(f"Camera {camera_id} not found on server. Register it via the dashboard first.")
            else:
                print(f"Failed to register WebRTC: {resp.status_code}")
    except Exception as e:
        print(f"Could not register WebRTC URL: {e}")


async def webrtc_heartbeat_loop(server: str, camera_id: str, webrtc_port: int, relay: str = ""):
    """Re-register WebRTC URL every 60 seconds as a heartbeat."""
    while True:
        try:
            await asyncio.sleep(60)
            await register_webrtc(server, camera_id, webrtc_port, relay=relay)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            print(f"Heartbeat error (will retry next cycle): {e}")


# ---------------------------------------------------------------------------
# Clip mode (production)
# ---------------------------------------------------------------------------

async def run_clip_mode(
    server: str, camera_id: str, camera_source: int | str,
    fps: int, quality: int, width: int, s3_bucket: str,
    webrtc_port: int = 8080, relay: str = "", name: str = "",
) -> None:
    """Production mode: record clips on motion, upload to S3."""
    print(f"[CLIP MODE] Camera: {camera_source} | FPS: {fps}")
    print(f"Clips upload to s3://{s3_bucket}/clips/{camera_id}/")

    # Open camera ONCE — shared between clip recording and WebRTC
    grabber = FrameGrabber(source=camera_source, width=width)

    # Start embedded WebRTC server (shares the same grabber)
    if HAS_WEBRTC:
        await start_embedded_webrtc(grabber, width, fps, webrtc_port, camera_id, name or camera_id, relay)
    else:
        print("WebRTC not available (install aiortc aiohttp). Live view disabled.")

    # Register WebRTC URL with backend and start heartbeat
    await register_webrtc(server, camera_id, webrtc_port, relay=relay)
    asyncio.create_task(webrtc_heartbeat_loop(server, camera_id, webrtc_port, relay=relay))

    motion = MotionDetector()
    recorder = ClipRecorder(pre_seconds=5.0, post_seconds=10.0, fps=fps)
    uploader = ClipUploader(server, camera_id, s3_bucket)

    frame_interval = 1.0 / fps
    clips_recorded = 0
    start_time = time.time()
    print("Watching for motion...")

    try:
        while True:
            now = time.time()
            ok, frame = grabber.read()
            if not ok or frame is None:
                await asyncio.sleep(0.01)
                continue

            has_motion = motion.detect(frame)
            clip_path = recorder.feed(frame, has_motion, now)

            if clip_path:
                clips_recorded += 1
                elapsed = now - start_time
                print(f"  Clip #{clips_recorded} saved ({elapsed:.0f}s uptime)")
                asyncio.create_task(uploader.upload(clip_path, now))

            if has_motion and not recorder.recording:
                # Just starting -- recorder will pick it up next frame
                pass

            await asyncio.sleep(max(0, frame_interval - (time.time() - now)))
    finally:
        grabber.release()


# ---------------------------------------------------------------------------
# Stream mode (live dashboard)
# ---------------------------------------------------------------------------

async def run_stream_mode(
    server: str, camera_id: str, camera_source: int | str,
    fps: int, quality: int, width: int, motion_only: bool,
    webrtc_port: int = 8080, relay: str = "",
) -> None:
    """Stream mode: push live frames via WebSocket."""
    url = f"ws://{server}/ws/camera/{camera_id}"
    print(f"[STREAM MODE] Connecting to {url}")

    # Register WebRTC URL with backend and start heartbeat
    await register_webrtc(server, camera_id, webrtc_port, relay=relay)
    asyncio.create_task(webrtc_heartbeat_loop(server, camera_id, webrtc_port, relay=relay))

    grabber = FrameGrabber(source=camera_source, width=width)

    motion = MotionDetector() if motion_only else None
    frame_interval = 1.0 / fps
    frames_sent = 0
    start_time = time.time()

    try:
        async for ws in websockets.connect(url):
            try:
                last_frame_time = 0.0
                last_heartbeat = 0.0
                while True:
                    now = time.time()
                    if now - last_frame_time < frame_interval:
                        await asyncio.sleep(0.001)
                        continue

                    ok, frame = grabber.read()
                    if not ok or frame is None:
                        await asyncio.sleep(0.01)
                        continue

                    if motion and not motion.detect(frame):
                        if now - last_heartbeat < 5.0:
                            continue
                        last_heartbeat = now

                    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
                    if not ok:
                        continue

                    await ws.send(buf.tobytes())
                    last_frame_time = now
                    frames_sent += 1

                    if frames_sent % (fps * 5) == 0 and frames_sent > 0:
                        actual_fps = frames_sent / (now - start_time)
                        print(f"  {frames_sent} frames | {actual_fps:.1f} FPS | ~{len(buf.tobytes()) / 1024:.0f} KB/frame")

            except websockets.ConnectionClosed:
                print("Connection lost. Reconnecting in 2s...")
                await asyncio.sleep(2)
            except KeyboardInterrupt:
                break
    finally:
        grabber.release()


# ---------------------------------------------------------------------------
# Pairing
# ---------------------------------------------------------------------------

def _save_config(camera_id: str, camera_name: str, server: str, relay: str = "") -> None:
    """Save pairing config for future runs."""
    config_dir = Path.home() / ".watchtower"
    config_dir.mkdir(exist_ok=True)
    config_file = config_dir / "config.json"
    config: dict = {}
    if config_file.exists():
        config = json.loads(config_file.read_text())
    config["camera_id"] = camera_id
    config["camera_name"] = camera_name
    config["server"] = server
    if relay:
        config["relay"] = relay
    config_file.write_text(json.dumps(config, indent=2))


async def pair_camera(server: str, code: str, relay: str = "") -> tuple[str, str]:
    """Pair with the server using a 6-digit code. Returns (camera_id, name)."""
    if not HAS_HTTPX:
        print("httpx not installed -- cannot pair")
        sys.exit(1)
    url = _api_url(server, f"/api/cameras/pair/{code}")
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url)
        if resp.status_code == 404:
            print(f"Invalid or expired pairing code: {code}")
            sys.exit(1)
        resp.raise_for_status()
        data = resp.json()

        _save_config(data["camera_id"], data["camera_name"], server, relay)
        print(f"Paired as: {data['camera_name']} (ID: {data['camera_id']})")
        return data["camera_id"], data["camera_name"]


def scan_qr_code(camera_source: int | str = 0) -> dict:
    """Open camera and scan for a WatchTower QR code. Returns parsed config.

    Uses OpenCV's built-in QR detector — no extra dependencies.
    """
    print("Scanning for QR code... Hold the camera up to the screen.")
    cap = cv2.VideoCapture(camera_source)
    if not cap.isOpened():
        print(f"Cannot open camera: {camera_source}")
        sys.exit(1)

    detector = cv2.QRCodeDetector()
    start = time.time()
    timeout = 60  # 1 minute

    try:
        while time.time() - start < timeout:
            ok, frame = cap.read()
            if not ok:
                continue
            data, points, _ = detector.detectAndDecode(frame)
            if data:
                try:
                    config = json.loads(data)
                    if "code" in config and "server" in config:
                        print(f"QR code detected! Pairing code: {config['code']}")
                        return config
                except (json.JSONDecodeError, KeyError):
                    pass  # Not a WatchTower QR code
            time.sleep(0.1)
    finally:
        cap.release()

    print("No QR code found within 60 seconds.")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Process watchdog
# ---------------------------------------------------------------------------

def run_with_restart(func, *args, max_retries=None, restart_delay=5):
    """Run a function, restarting it if it crashes."""
    retries = 0
    while max_retries is None or retries < max_retries:
        try:
            func(*args)
        except KeyboardInterrupt:
            print("Shutting down.")
            break
        except Exception as e:
            retries += 1
            print(f"Camera crashed: {e}. Restarting in {restart_delay}s... (attempt {retries})")
            time.sleep(restart_delay)
    print("Max retries reached. Exiting.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="WatchTower Camera Client")
    parser.add_argument("--server", default="localhost:8000", help="API server (host:port)")
    parser.add_argument("--camera-id", default=None, help="Camera ID (auto-generated if not set)")
    parser.add_argument("--name", default="", help="Camera name")
    parser.add_argument("--camera", default="0", help="Camera index or URL")
    parser.add_argument("--fps", type=int, default=15, help="Target FPS")
    parser.add_argument("--quality", type=int, default=70, help="JPEG quality")
    parser.add_argument("--width", type=int, default=640, help="Frame width")

    # Mode selection
    parser.add_argument("--stream", action="store_true", help="Stream mode (live WebSocket frames)")
    parser.add_argument("--motion", action="store_true", help="Motion-only in stream mode")

    # Pairing
    parser.add_argument("--pair", type=str, help="6-digit pairing code from dashboard")
    parser.add_argument("--scan", action="store_true", help="Scan QR code from dashboard to pair")

    # WebRTC
    parser.add_argument("--webrtc-port", type=int, default=8080, help="WebRTC signaling server port")
    parser.add_argument("--relay", type=str, default="",
                        help="Signaling relay URL (e.g., ws://localhost:8081)")

    # Clip mode options
    parser.add_argument("--s3-bucket", default=os.getenv("WATCHTOWER_S3_BUCKET", "watchtower-clips-008524"),
                        help="S3 bucket for clip uploads")

    args = parser.parse_args()

    source: int | str = int(args.camera) if args.camera.isdigit() else args.camera

    # Resolve camera identity via QR scan, pairing code, explicit arg, or saved config
    if args.scan:
        qr = scan_qr_code(source)
        server = qr.get("server", args.server)
        relay = qr.get("relay", args.relay)
        camera_id, name = asyncio.run(pair_camera(server, qr["code"], relay))
        args.server = server
        args.relay = relay
    elif args.pair:
        camera_id, name = asyncio.run(pair_camera(args.server, args.pair, args.relay))
    elif args.camera_id:
        camera_id = args.camera_id
        name = args.name or camera_id
    else:
        # Check saved config
        config_file = Path.home() / ".watchtower" / "config.json"
        if config_file.exists():
            config = json.loads(config_file.read_text())
            camera_id = config.get("camera_id")
            name = config.get("camera_name", camera_id)
            if not camera_id:
                print("No camera ID. Use --camera-id, --pair <code>, or --scan")
                sys.exit(1)
            # Load saved server/relay if not overridden on CLI
            if args.server == "localhost:8000" and config.get("server"):
                args.server = config["server"]
            if not args.relay and config.get("relay"):
                args.relay = config["relay"]
            print(f"Using saved config: {name} ({camera_id})")
        else:
            print("No camera ID. Use --camera-id, --pair <code>, or --scan")
            sys.exit(1)

    print(f"WatchTower Camera Client")
    print(f"Camera ID: {camera_id}")
    print(f"Server: {args.server}")
    print()

    if args.stream:
        asyncio.run(run_stream_mode(args.server, camera_id, source, args.fps, args.quality, args.width, args.motion, args.webrtc_port, relay=args.relay))
    else:
        if not HAS_BOTO3:
            print("WARNING: boto3 not installed. Clips will upload directly to API instead of S3.")
            print("Install with: pip install boto3")
            print()
        asyncio.run(run_clip_mode(args.server, camera_id, source, args.fps, args.quality, args.width, args.s3_bucket, args.webrtc_port, relay=args.relay, name=name))


if __name__ == "__main__":
    run_with_restart(main)
