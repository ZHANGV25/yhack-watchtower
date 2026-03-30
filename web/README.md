# WatchTower Web

Caregiver dashboard for WatchTower, an AI-powered elder care monitoring system. Lets family members and caregivers monitor their loved ones' wellbeing from anywhere.

Built for YHack 2026.

## What Caregivers See

### Home View (Room Grid)
- All monitored rooms at a glance (Mom's Living Room, Kitchen, Bedroom)
- Status per room: "All good" / "No activity for 2 hours" / "Alert: Fall detected"
- Online/offline indicator per camera
- Tap a room to see details

### Room Detail View
- **Status banner** — "Mom is doing fine" / "Alert: No movement for 3 hours"
- **Live check-in** — WebRTC video feed (peer-to-peer, tap to view)
- **Activity timeline** — Timestamped log of what happened throughout the day
- **Alerts** — Fall detected, inactivity, night wandering, custom concerns
- **Ask about Mom** — Natural language Q&A ("What did she do this morning?" / "When did she last eat?")

### Alert Types
- 🔴 **Critical** — Fall detected, emergency (no movement after fall)
- 🟠 **High** — Prolonged inactivity (3+ hours daytime), night wandering
- 🟡 **Medium** — Missed medication time, unusual pattern
- 🟢 **Low** — Visitor detected, routine note

### Custom Concerns
Caregivers add monitoring concerns in plain English:
- "Mom forgets to drink water — watch how often she goes to the kitchen"
- "Dad shouldn't be climbing stairs"
- "Remind me if she hasn't taken pills by 2pm"

The AI translates these into monitoring rules automatically.

### Daily Reports (for doctors/caregivers)
- Structured Activities of Daily Living (ADL) summary generated daily
- Covers: sleep, meals, hydration, mobility, visitors, medication compliance
- Flags concerns: missed meals, declining activity, sleep disruptions
- Exportable for clinical review
- Weekly trend analysis for long-term pattern tracking

### Continuous Activity Log
- Timestamped record of everything that happens throughout the day
- Doctors can review for declining mobility, cognitive changes, social isolation
- Searchable: "Show me all meals this week" / "When did she last have a visitor?"

## Tech Stack

- **Framework:** Next.js 15 + React 19
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Data:** REST API calls to Lambda backend (polling every 5s for alerts)
- **Live Video:** WebRTC (peer-to-peer from camera device)
- **Auth:** JWT tokens

## Setup

```bash
npm install
NEXT_PUBLIC_API_URL=https://your-api-gateway-url.amazonaws.com npm run dev
```

Runs on http://localhost:3000

## Pages

```
/login              — Sign in (pre-filled for demo)
/                   — Room grid (all monitored rooms)
/camera/[id]        — Room detail (live view, timeline, alerts, Q&A)
```

## Project Structure

```
app/
  page.tsx              — Room grid (home page)
  login/page.tsx        — Authentication
  camera/[id]/page.tsx  — Room detail view

components/
  CameraGrid.tsx        — Room overview grid
  WebRTCPlayer.tsx      — WebRTC live video player
  AlertLog.tsx          — Alert history list
  InvestigationChat.tsx — "Ask about Mom" Q&A
  RuleList.tsx          — Active monitoring rules
  Narration.tsx         — Latest alert description
  ThemeToggle.tsx       — Dark/light mode

lib/
  api.ts                — REST API client with auth
  auth.ts               — JWT token management
  types.ts              — All TypeScript interfaces
  websocket.ts          — WebSocket client (local dev mode)
  useWatchTower.ts      — State management hook (local dev mode)
  utils.ts              — Utilities
```
