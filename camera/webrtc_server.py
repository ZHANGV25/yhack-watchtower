"""WebRTC video server for WatchTower camera.

Serves live video from a local webcam via WebRTC. A signaling HTTP server
handles SDP offer/answer exchange. Browsers connect directly to the camera
via peer-to-peer — no video relay through a server.

Usage:
    python webrtc_server.py                         # webcam 0, signaling on port 8080
    python webrtc_server.py --camera 1 --port 8080  # different camera
    python webrtc_server.py --camera "rtsp://..."   # RTSP source
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import threading
import uuid

import aiohttp
import cv2
import numpy as np
from aiohttp import web
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from aiortc import RTCConfiguration, RTCIceServer
from aiortc.contrib.media import MediaRelay
from av import VideoFrame

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("watchtower.webrtc")


# ---------------------------------------------------------------------------
# ICE server configuration for NAT traversal
# ---------------------------------------------------------------------------
def _build_ice_servers() -> list[RTCIceServer]:
    """Build ICE server list from defaults + optional TURN env vars."""
    servers: list[RTCIceServer] = [
        RTCIceServer(
            urls=["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]
        ),
    ]
    turn_url = os.environ.get("TURN_URL")       # e.g. turn:1.2.3.4:3478
    turn_user = os.environ.get("TURN_USER")
    turn_pass = os.environ.get("TURN_PASS")
    if turn_url and turn_user and turn_pass:
        servers.append(
            RTCIceServer(urls=[turn_url], username=turn_user, credential=turn_pass)
        )
        log.info("TURN server configured: %s", turn_url)
    else:
        log.info("No TURN server configured (STUN only). Set TURN_URL, TURN_USER, TURN_PASS for relay.")
    return servers


ICE_SERVERS = _build_ice_servers()

pcs: set[RTCPeerConnection] = set()
relay = MediaRelay()


class FrameGrabber:
    """Reads from camera, draining the internal buffer to always get the latest frame.

    Uses grab() to flush OpenCV's internal buffer (typically 4-5 frames) before
    retrieve(), ensuring we always get the most recent frame. This is macOS-safe
    (no background threads touching VideoCapture).
    """

    def __init__(self, source: int | str = 0, width: int = 640) -> None:
        self.cap = cv2.VideoCapture(source)
        if not self.cap.isOpened():
            raise RuntimeError(f"Cannot open camera: {source}")
        if width:
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        try:
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except Exception:
            pass
        log.info("FrameGrabber started: %s", source)

    def read(self) -> tuple[bool, np.ndarray | None]:
        # Drain buffer: grab() is fast and discards old frames
        for _ in range(4):
            self.cap.grab()
        # Now retrieve the latest
        ok, frame = self.cap.read()
        if ok:
            return True, frame
        return False, None

    def release(self) -> None:
        if self.cap.isOpened():
            self.cap.release()
        log.info("FrameGrabber released")


class CameraVideoTrack(VideoStreamTrack):
    """Video track that reads from a FrameGrabber (always latest frame)."""

    kind = "video"

    def __init__(self, source: int | str = 0, width: int = 640, fps: int = 15) -> None:
        super().__init__()
        self.grabber = FrameGrabber(source=source, width=width)
        self.width = width
        self.fps = fps
        self._frame_count = 0

    async def recv(self) -> VideoFrame:
        pts, time_base = await self.next_timestamp()

        ok, frame = self.grabber.read()
        if not ok or frame is None:
            # Return black frame if camera fails
            frame = np.zeros((480, 640, 3), dtype=np.uint8)

        # Resize
        h, w = frame.shape[:2]
        if w > self.width:
            scale = self.width / w
            frame = cv2.resize(frame, (self.width, int(h * scale)))

        # Convert BGR to RGB for WebRTC
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        video_frame = VideoFrame.from_ndarray(frame, format="rgb24")
        video_frame.pts = pts
        video_frame.time_base = time_base
        self._frame_count += 1
        return video_frame

    def stop(self) -> None:
        super().stop()
        self.grabber.release()


# Shared camera track (one camera, multiple viewers via relay)
camera_track: CameraVideoTrack | None = None


async def offer(request: web.Request) -> web.Response:
    """Handle WebRTC offer from browser. Returns SDP answer."""
    global camera_track

    params = await request.json()
    offer_sdp = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

    config = RTCConfiguration(iceServers=ICE_SERVERS)
    pc = RTCPeerConnection(configuration=config)
    pc_id = uuid.uuid4().hex[:8]
    pcs.add(pc)

    @pc.on("connectionstatechange")
    async def on_state_change():
        log.info("Peer %s: %s", pc_id, pc.connectionState)
        if pc.connectionState in ("failed", "closed"):
            await pc.close()
            pcs.discard(pc)

    # Add camera video track (relayed for multiple viewers)
    if camera_track is None:
        source = request.app["camera_source"]
        width = request.app["width"]
        camera_track = CameraVideoTrack(source=source, width=width)

    relayed_track = relay.subscribe(camera_track)
    pc.addTrack(relayed_track)

    await pc.setRemoteDescription(offer_sdp)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    log.info("Peer %s connected", pc_id)

    return web.json_response({
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type,
    })


async def connect_to_relay(relay_url: str, camera_id: str, camera_name: str,
                           source: int | str, width: int, fps: int) -> None:
    """Connect to signaling relay and handle offers from browsers."""
    ws_url = f"{relay_url}/ws/{camera_id}?name={camera_name}"
    log.info("Connecting to signaling relay: %s", ws_url)

    async with aiohttp.ClientSession() as session:
        while True:
            try:
                async with session.ws_connect(ws_url) as ws:
                    log.info("Connected to relay as %s", camera_id)

                    async for msg in ws:
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            data = json.loads(msg.data)

                            if data.get("type") == "offer":
                                request_id = data.get("request_id")
                                try:
                                    offer_sdp = RTCSessionDescription(
                                        sdp=data.get("sdp"),
                                        type=data.get("sdp_type", "offer"),
                                    )

                                    config = RTCConfiguration(iceServers=ICE_SERVERS)
                                    pc = RTCPeerConnection(configuration=config)
                                    pcs.add(pc)

                                    peer_id = str(uuid.uuid4())[:8]

                                    @pc.on("connectionstatechange")
                                    async def on_state(pc=pc, pid=peer_id):
                                        log.info("Peer %s: %s", pid, pc.connectionState)
                                        if pc.connectionState in ("failed", "closed"):
                                            await pc.close()
                                            pcs.discard(pc)

                                    # Use shared camera track via relay
                                    global camera_track
                                    if camera_track is None:
                                        camera_track = CameraVideoTrack(
                                            source=source, width=width, fps=fps,
                                        )

                                    relayed_track = relay.subscribe(camera_track)
                                    pc.addTrack(relayed_track)

                                    await pc.setRemoteDescription(offer_sdp)
                                    answer = await pc.createAnswer()
                                    await pc.setLocalDescription(answer)

                                    await ws.send_json({
                                        "type": "answer",
                                        "request_id": request_id,
                                        "sdp": pc.localDescription.sdp,
                                        "sdp_type": pc.localDescription.type,
                                    })
                                    log.info("Sent answer for peer %s via relay", peer_id)
                                except Exception as e:
                                    log.error("Failed to handle relay offer: %s", e)
                                    import traceback
                                    traceback.print_exc()

            except asyncio.CancelledError:
                raise
            except Exception as e:
                log.error("Relay connection error: %s. Reconnecting in 5s...", e)
                await asyncio.sleep(5)


async def on_shutdown(app: web.Application) -> None:
    """Close all peer connections on shutdown."""
    global camera_track
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)
    pcs.clear()
    if camera_track:
        camera_track.stop()
        camera_track = None


def create_app(camera_source: int | str = 0, width: int = 640) -> web.Application:
    app = web.Application()
    app["camera_source"] = camera_source
    app["width"] = width
    app.on_shutdown.append(on_shutdown)

    # CORS headers for cross-origin requests
    async def cors_middleware(app, handler):
        async def middleware(request):
            if request.method == "OPTIONS":
                resp = web.Response()
            else:
                resp = await handler(request)
            resp.headers["Access-Control-Allow-Origin"] = "*"
            resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
            resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
            return resp
        return middleware

    app.middlewares.append(cors_middleware)
    app.router.add_post("/offer", offer)

    # Endpoint so browsers can fetch ICE config (including TURN if set)
    async def ice_config(request: web.Request) -> web.Response:
        servers = [
            {"urls": ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]},
        ]
        turn_url = os.environ.get("TURN_URL")
        turn_user = os.environ.get("TURN_USER")
        turn_pass = os.environ.get("TURN_PASS")
        if turn_url and turn_user and turn_pass:
            servers.append({"urls": [turn_url], "username": turn_user, "credential": turn_pass})
        return web.json_response({"iceServers": servers})

    app.router.add_get("/ice-config", ice_config)

    # Health check
    app.router.add_get("/health", lambda r: web.json_response({"status": "ok", "peers": len(pcs)}))

    return app


def main() -> None:
    parser = argparse.ArgumentParser(description="WatchTower WebRTC Camera Server")
    parser.add_argument("--camera", default="0", help="Camera index or URL")
    parser.add_argument("--port", type=int, default=8080, help="Signaling server port")
    parser.add_argument("--width", type=int, default=640, help="Frame width")
    parser.add_argument("--fps", type=int, default=15, help="Target FPS")
    parser.add_argument("--relay", type=str, default="",
                        help="Signaling relay URL (e.g., ws://localhost:8081)")
    parser.add_argument("--camera-id", default="default", help="Camera ID for relay registration")
    parser.add_argument("--name", default="Camera", help="Camera name for relay registration")
    args = parser.parse_args()

    source: int | str = int(args.camera) if args.camera.isdigit() else args.camera
    app = create_app(camera_source=source, width=args.width)

    # Pre-initialize camera track on startup so it's shared between
    # local server and relay (avoids opening camera device twice)
    async def init_camera_on_startup(app: web.Application) -> None:
        global camera_track
        if camera_track is None:
            try:
                camera_track = CameraVideoTrack(
                    source=source, width=args.width, fps=args.fps,
                )
                log.info("Camera track pre-initialized")
            except Exception as e:
                log.error("Failed to pre-initialize camera: %s", e)

    app.on_startup.append(init_camera_on_startup)

    # If relay is configured, connect to it alongside the local server
    if args.relay:
        async def start_relay_on_startup(app: web.Application) -> None:
            app["relay_task"] = asyncio.ensure_future(
                connect_to_relay(
                    args.relay, args.camera_id, args.name,
                    source, args.width, args.fps,
                )
            )

        async def stop_relay_on_cleanup(app: web.Application) -> None:
            task = app.get("relay_task")
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        app.on_startup.append(start_relay_on_startup)
        app.on_cleanup.append(stop_relay_on_cleanup)
        print(f"Relay: {args.relay} (camera_id={args.camera_id})")

    print(f"WebRTC signaling server on http://0.0.0.0:{args.port}")
    print(f"Camera: {source} | Width: {args.width}")
    print(f"Browsers POST to http://<this-ip>:{args.port}/offer")
    web.run_app(app, host="0.0.0.0", port=args.port)


if __name__ == "__main__":
    main()
