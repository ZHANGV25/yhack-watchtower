"""WebRTC signaling relay server.

Simple HTTP-based relay. No WebSocket complexity.

Flow:
1. Camera registers via POST /register/{camera_id}
2. Browser sends SDP offer via POST /offer/{camera_id}
3. Camera polls GET /pending/{camera_id} to get offers
4. Camera sends SDP answer via POST /answer/{request_id}
5. Browser gets the answer

Run: python3 signaling_relay.py --port 8081
"""
import argparse
import asyncio
import json
import logging
import os
import time
import uuid

from aiohttp import web

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("watchtower.signaling")

# Registered cameras: camera_id -> {"name": str, "last_seen": float}
cameras: dict[str, dict] = {}

# Pending offers waiting for camera to pick up: camera_id -> list of offers
pending_offers: dict[str, list[dict]] = {}

# Pending answers: request_id -> asyncio.Future
pending_answers: dict[str, asyncio.Future] = {}


async def register(request: web.Request) -> web.Response:
    """Camera registers itself. Called periodically as heartbeat."""
    camera_id = request.match_info["camera_id"]
    body = await request.json() if request.content_length else {}
    name = body.get("name", camera_id)
    cameras[camera_id] = {"name": name, "last_seen": time.time()}
    if camera_id not in pending_offers:
        pending_offers[camera_id] = []
    log.info("Camera registered: %s (%s). Total: %d", camera_id, name, len(cameras))
    return web.json_response({"status": "registered"})


async def offer(request: web.Request) -> web.Response:
    """Browser sends SDP offer. Waits for camera to answer."""
    camera_id = request.match_info["camera_id"]

    if camera_id not in cameras:
        return web.json_response({"error": f"Camera {camera_id} not registered"}, status=404)

    # Check camera is alive (seen in last 30s)
    if time.time() - cameras[camera_id]["last_seen"] > 30:
        return web.json_response({"error": "Camera not responding"}, status=504)

    body = await request.json()
    request_id = uuid.uuid4().hex[:8]

    # Create future for the answer
    future = asyncio.get_event_loop().create_future()
    pending_answers[request_id] = future

    # Queue the offer for the camera to pick up
    if camera_id not in pending_offers:
        pending_offers[camera_id] = []
    pending_offers[camera_id].append({
        "request_id": request_id,
        "sdp": body.get("sdp"),
        "type": body.get("type", "offer"),
    })
    log.info("Queued offer %s for camera %s", request_id, camera_id)

    # Wait for answer (15 seconds)
    try:
        answer = await asyncio.wait_for(future, timeout=15.0)
    except asyncio.TimeoutError:
        pending_answers.pop(request_id, None)
        return web.json_response({"error": "Camera did not respond in time"}, status=504)
    finally:
        pending_answers.pop(request_id, None)

    return web.json_response({
        "sdp": answer["sdp"],
        "type": answer.get("type", "answer"),
    })


async def get_pending(request: web.Request) -> web.Response:
    """Camera polls for pending offers."""
    camera_id = request.match_info["camera_id"]

    # Update heartbeat
    if camera_id in cameras:
        cameras[camera_id]["last_seen"] = time.time()

    offers = pending_offers.get(camera_id, [])
    # Drain the queue
    pending_offers[camera_id] = []

    return web.json_response({"offers": offers})


async def post_answer(request: web.Request) -> web.Response:
    """Camera sends SDP answer for a specific request."""
    request_id = request.match_info["request_id"]
    body = await request.json()

    if request_id in pending_answers:
        pending_answers[request_id].set_result(body)
        log.info("Answer received for %s", request_id)
        return web.json_response({"status": "delivered"})
    else:
        return web.json_response({"error": "Request expired or unknown"}, status=404)


async def list_cameras(request: web.Request) -> web.Response:
    now = time.time()
    cams = [
        {"camera_id": cid, "name": info["name"], "alive": now - info["last_seen"] < 30}
        for cid, info in cameras.items()
    ]
    return web.json_response({"cameras": cams, "count": len(cams)})


async def health(request: web.Request) -> web.Response:
    alive = sum(1 for c in cameras.values() if time.time() - c["last_seen"] < 30)
    return web.json_response({"status": "ok", "cameras_registered": len(cameras), "cameras_alive": alive})


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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8081)
    args = parser.parse_args()

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
    app.router.add_post("/register/{camera_id}", register)
    app.router.add_post("/offer/{camera_id}", offer)
    app.router.add_get("/pending/{camera_id}", get_pending)
    app.router.add_post("/answer/{request_id}", post_answer)
    app.router.add_get("/cameras", list_cameras)
    app.router.add_get("/health", health)
    app.router.add_get("/ice-config", ice_config)

    log.info("Signaling relay on http://0.0.0.0:%d", args.port)
    web.run_app(app, host="0.0.0.0", port=args.port)


if __name__ == "__main__":
    main()
