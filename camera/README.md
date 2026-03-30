# WatchTower Camera

In-room camera device for WatchTower, an AI-powered elder care monitoring system. Plug a camera into any room to monitor your loved one's safety and daily activity.

Built for YHack 2026.

## How It Works

A Raspberry Pi (or any device with a webcam) runs this software in a monitored room. It:

1. **Watches for motion** — Only records when something happens (saves bandwidth and storage)
2. **Records clips** — On motion, saves a video clip (5s pre-buffer + recording + 10s post-buffer)
3. **Uploads to cloud** — Clip goes to S3, triggers AI processing (YOLO + rules + Claude reasoning)
4. **Serves live video** — WebRTC peer-to-peer stream when caregiver wants to check in

Everything runs in a single process. All intelligence runs in the cloud.

## Raspberry Pi Setup

### 1. Install dependencies

```bash
sudo apt update && sudo apt install -y python3-pip python3-opencv git libopus0 libvpx7
```

### 2. Clone and install

```bash
git clone https://github.com/ZHANGV25/watchtower-camera.git
cd watchtower-camera
pip3 install -r requirements.txt
pip3 install aiortc aiohttp  # for WebRTC live view
```

### 3. Set environment variables

```bash
# AWS credentials for S3 clip uploads
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_DEFAULT_REGION="us-east-1"

# TURN server for cross-network live view
export TURN_URL="turn:your-turn-host:3478"
export TURN_USER="your-turn-user"
export TURN_PASS="your-turn-password"
```

### 4. Pair with the dashboard

On the website (https://watchtower-web-three.vercel.app):
1. Log in
2. Create a room (e.g., "Bedroom")
3. Click "Pair Camera" to get a 6-digit code

On the Pi:
```bash
python3 camera_client.py \
  --pair <CODE> \
  --server <your-api-host> \
  --relay ws://localhost:8081
```

Config saves to `~/.watchtower/config.json`. Future runs auto-reconnect:
```bash
python3 camera_client.py \
  --server <your-api-host> \
  --relay ws://localhost:8081
```

### Alternative: skip pairing, use camera-id directly

```bash
python3 camera_client.py \
  --camera-id bedroom \
  --name "Bedroom" \
  --server <your-api-host> \
  --relay ws://localhost:8081
```

## All-in-One Copy-Paste (Pi)

```bash
# Set credentials
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_DEFAULT_REGION="us-east-1"
export TURN_URL="turn:your-turn-host:3478"
export TURN_USER="your-turn-user"
export TURN_PASS="your-turn-password"

# Run camera
cd ~/watchtower-camera
python3 camera_client.py \
  --pair <CODE> \
  --server <your-api-host> \
  --relay ws://localhost:8081
```

## Run as a Service (auto-start on boot)

```bash
sudo cp watchtower-camera.service /etc/systemd/system/
sudo nano /etc/systemd/system/watchtower-camera.service
# Edit: camera-id, name, AWS creds, relay URL

sudo systemctl enable watchtower-camera
sudo systemctl start watchtower-camera

# View logs
sudo journalctl -u watchtower-camera -f
```

## Windows/Mac Setup

```bash
git clone https://github.com/ZHANGV25/watchtower-camera.git
cd watchtower-camera
pip install -r requirements.txt
pip install aiortc aiohttp

# Set env vars (see above), then:
python camera_client.py \
  --camera-id living-room \
  --name "Living Room" \
  --server <your-api-host> \
  --relay ws://localhost:8081
```

## Architecture

```
camera_client.py (single process)
  |
  ├── FrameGrabber         Background thread reads webcam frames
  ├── MotionDetector        Frame differencing (threshold + area %)
  ├── ClipRecorder          Pre/post buffer → MP4
  ├── ClipUploader          S3 upload → notify API → Lambda processes clip
  └── WebRTC server         Embedded signaling + media via relay
        |
        └── relay poll loop    Polls relay for viewer offers, answers with video stream
```

**Clip flow:** Motion → record clip → S3 → Lambda (YOLO + rules + Claude) → alerts in DynamoDB

**Live view flow:** Browser → API proxy (HTTPS) → signaling relay (HTTP) → camera answers → P2P video stream via TURN

## Options

| Flag | Default | Description |
|---|---|---|
| `--pair` | -- | 6-digit pairing code from dashboard |
| `--camera-id` | auto/saved | Room identifier (e.g., "bedroom") |
| `--name` | auto | Human-readable room name |
| `--server` | localhost:8000 | API server address |
| `--relay` | -- | Signaling relay URL (e.g., ws://localhost:8081) |
| `--camera` | `0` | Camera index or RTSP URL |
| `--fps` | `15` | Target frames per second |
| `--quality` | `70` | JPEG quality (lower = less bandwidth) |
| `--width` | `640` | Frame width in pixels |
| `--webrtc-port` | `8080` | Local WebRTC signaling port |
| `--s3-bucket` | `watchtower-clips-008524` | S3 bucket for clips |
| `--stream` | off | WebSocket streaming mode (for local dev) |
| `--motion` | off | Motion-only in stream mode |

## Auto-Reconnect

The camera client automatically handles:
- **S3 upload failures** — retries 3x with exponential backoff, queues failed notifications
- **Camera disconnect** — reopens the camera device every 5 seconds
- **Process crash** — `run_with_restart()` wrapper restarts the main loop

## Room Placement Guide

For elder care monitoring, place cameras to cover:
- **Living room** — Main activity area. Detects falls, tracks time on couch, visitor detection.
- **Kitchen** — Meal preparation, hydration tracking, stove safety.
- **Bedroom** — Sleep tracking, fall detection, night wandering.
- **Hallway/entrance** — Coming and going, visitor arrivals.

Mount cameras at chest height, pointed toward the center of the room. Avoid pointing at windows (backlight) or mirrors (false detections).
