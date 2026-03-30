# WatchTower - YHack 2026

AI-powered elder care monitoring system. Turn any camera into an intelligent safety monitor using natural language.

Built at YHack 2026 (March 28-29, 2026).

## What It Does

Family members set up cameras in their elderly parent's home. Instead of writing complex rules, they describe concerns in plain English:

- "Mom hasn't eaten in a while"
- "Looks confused or disoriented"
- "Seems unsteady on feet"

The system watches 24/7. When motion is detected, it records a clip, runs YOLO object detection, then sends multiple frames to Claude to evaluate every active concern. If something is wrong, caregivers get an alert with an annotated frame and a video replay.

## Architecture

```
Camera (Pi/Mac/PC)           Cloud (AWS)                    Dashboard (Vercel)

Motion detected        ->    S3 clip upload          ->     Live WebRTC feed
Record 20s clip        ->    Lambda: YOLO detection   ->    Activity timeline
WebRTC live view       ->    Lambda: Claude evaluates ->    Alert feed + replay
                             concerns from 5 frames   ->    "Ask about their day" chat
                             DynamoDB: alerts, activity      Concerns + medications
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Camera** | Python, OpenCV, WebRTC (aiortc), S3 upload |
| **Backend** | FastAPI, Lambda (containerized), DynamoDB, S3 |
| **AI** | YOLO v8 (object detection), Claude Haiku (concern evaluation, narration, investigation) |
| **Frontend** | Next.js 16, React 19, Tailwind v4, Vercel |
| **Signaling** | HTTP relay on EC2 for WebRTC NAT traversal |
| **TURN** | coturn on EC2 for media relay |

## Key Features

- **Natural language concerns**: Describe what to watch for in plain English. Claude evaluates from video frames.
- **Multi-frame analysis**: Claude sees 5 frames per clip to detect temporal patterns (standing -> fallen).
- **Live view**: WebRTC peer-to-peer video from any camera, anywhere.
- **QR code pairing**: Point camera at screen to pair instantly.
- **Activity timeline**: Timestamped log of observations with snapshots.
- **Investigation chat**: "What did they do today?" answered from the activity log.
- **Custom replay UI**: Security-camera-style playback with timeline scrubber, frame stepping, speed control.
- **Annotated alert frames**: YOLO bounding boxes drawn on alert evidence.
- **Fall detection**: Claude analyzes frame sequences for falls, not just pose heuristics.

## Repo Structure

```
api/        FastAPI backend, Lambda handlers, YOLO detector, Claude integration
web/        Next.js dashboard, Tailwind pixel UI, WebRTC player
camera/     Edge camera client, motion detection, clip recording, WebRTC
```

## Team

Built by 4 people in 24 hours at YHack 2026.
