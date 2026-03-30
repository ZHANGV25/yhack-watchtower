# CareWatch AI — Design & Wireframe Specification

> AI-powered elderly patient monitoring dashboard for care facilities.
> This document is the single source of truth for layout, components, interactions, and data shape.
> Hand this file directly to Cursor / an LLM coding agent to scaffold the full application.

---

## 1. Product Overview

**CareWatch AI** is a real-time caregiver dashboard for monitoring elderly patients via AI-analyzed camera feeds. It surfaces fall detection, activity tracking, unusual behavior alerts, and medication reminders across multiple patients in a single ward.

### Core user
Ward nurses and facility caregivers who need at-a-glance status for 4–20 patients and immediate escalation paths when something goes wrong.

### Key flows
1. Caregiver loads dashboard → sees all patients + live alert count
2. Clicks a patient → camera feed + AI analysis loads for that room
3. Triggers on-demand AI analysis → Claude returns a clinical scene assessment
4. Marks medication as administered → status updates inline
5. Exports a PDF health summary report for a patient

---

## 2. Tech Stack (recommended)

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| UI primitives | shadcn/ui |
| AI integration | Anthropic SDK (`@anthropic-ai/sdk`) |
| Icons | Lucide React |
| Charts (future) | Recharts |
| State | Zustand or React Context |
| Notifications | react-hot-toast |

---

## 3. Color Tokens

Define these as CSS variables in `globals.css` and Tailwind config.

### Brand palette
| Token | Hex | Usage |
|---|---|---|
| `--color-blush` | `#FFC7D0` | Sidebar bg, card highlights, hover states |
| `--color-mauve` | `#9A7F82` | Secondary text, muted labels, borders |
| `--color-rose` | `#D49AA5` | Metric card fills, subtle accents |
| `--color-coral` | `#FD5E85` | Primary action buttons, alert badges, active states |
| `--color-white` | `#FEFDFD` | Page background, panel surfaces |

```css
:root {
  /* Brand palette */
  --color-blush:  #FFC7D0;
  --color-mauve:  #9A7F82;
  --color-rose:   #D49AA5;
  --color-coral:  #FD5E85;
  --color-white:  #FEFDFD;

  /* Backgrounds — mapped from brand */
  --bg-primary:   #FEFDFD;        /* --color-white */
  --bg-secondary: #FFC7D0;        /* --color-blush: sidebar, card surfaces */
  --bg-tertiary:  #f5eef0;        /* blush tint: page background */

  /* Text — mapped from brand */
  --text-primary:   #3a2a2d;      /* deep rose-brown for strong contrast on white */
  --text-secondary: #9A7F82;      /* --color-mauve */
  --text-tertiary:  #b8a0a4;      /* light mauve for hints and timestamps */

  /* Borders — derived from mauve */
  --border-subtle:  rgba(154,127,130,0.15);
  --border-default: rgba(154,127,130,0.30);

  /* Semantic — remapped to brand */
  --color-ok:      #2d7a5f;       /* deep green — keep accessible on white */
  --color-ok-bg:   #e6f4ef;
  --color-warn:    #9A7F82;       /* mauve as "watch" state */
  --color-warn-bg: #f5eef0;
  --color-alert:   #FD5E85;       /* --color-coral: alerts, fall detection */
  --color-alert-bg:#ffe0e8;       /* blush tint of coral */
  --color-info:    #D49AA5;       /* --color-rose: informational */
  --color-info-bg: #FFC7D0;       /* --color-blush */

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

[data-theme="dark"] {
  --bg-primary: #111110;
  --bg-secondary: #1a1a18;
  --bg-tertiary: #0d0d0c;
  --text-primary: #f0ede8;
  --text-secondary: #a8a7a2;
  --text-tertiary: #666560;
  --border-subtle: rgba(255,255,255,0.08);
  --border-default: rgba(255,255,255,0.14);
}
```

---

## 4. Typography

| Role | Size | Weight | Usage |
|---|---|---|---|
| App name | 15px | 500 | Sidebar logo |
| Section label | 10px | 500 | ALL CAPS, 0.8px letter-spacing |
| Patient name | 13px | 500 | Sidebar list |
| Page title | 16px | 500 | Topbar patient name |
| Body | 13px | 400 | General content |
| Small / meta | 11px | 400 | Timestamps, sub-labels |
| Metric value | 18–24px | 500 | KPI cards |
| Mono overlay | 9px | 400 | Camera AI bounding box labels |

Font family: `system-ui, -apple-system, 'Segoe UI', sans-serif`

---

## 5. Global Layout

```
┌──────────────────────────────────────────────────────────┐
│  SIDEBAR (260px fixed)  │  MAIN AREA (flex: 1)           │
│                         │                                 │
│  [Logo + Facility name] │  [TOPBAR]                       │
│                         │  Patient name · badge · actions │
│  [Patient list]         ├─────────────────────────────────┤
│   · Margaret R.  ●      │  CONTENT GRID                   │
│   · Harold W.    ● ALRT │  [LEFT col, flex:1] [RIGHT 320px│
│   · Betty E.     ●      │                                 │
│   · Frank O.     ●      │                                 │
│                         │                                 │
│  [Clock + Date]         │                                 │
└──────────────────────────────────────────────────────────┘
```

- Sidebar: `width: 260px`, `flex-shrink: 0`, `border-right: 0.5px`
- Main: `display: flex; flex-direction: column; flex: 1; overflow: hidden`
- Content grid: `display: grid; grid-template-columns: 1fr 320px; gap: 14px; padding: 16px`

---

## 6. Sidebar

### 6.1 Header
```
┌────────────────────────┐
│  [■] CareWatch AI      │
│      Sunrise Elder Care│
│      Ward B            │
└────────────────────────┘
```
- Logo icon: 28×28px, `background: #0C447C`, rounded 6px, white SVG heartbeat/location icon
- App name: 15px / 500
- Facility name: 12px / secondary text, shown below logo row

### 6.2 Patient list

Each row:
```
[Avatar]  Name          [Status dot]
          Room · Age
```

States:
| State | Avatar bg | Border | Dot color |
|---|---|---|---|
| Normal | `--color-info-bg` / teal-bg / amber-bg | transparent | `--color-ok` solid |
| Selected | `#E6F1FB` bg, `#B5D4F4` border | `--color-info` | same |
| Alert | left border `3px solid --color-alert` | red | `--color-alert` pulsing |
| Warning | normal | normal | `--color-warn` |

Avatar: 32×32 circle, initials (2 chars), color matches patient accent color.

Section label above list: `PATIENTS — N MONITORED` in 10px uppercase.

### 6.3 Footer
```
┌────────────────────────┐
│  14:23:07              │
│  Saturday, Mar 28 2026 │
└────────────────────────┘
```
Live clock updated every second via `setInterval`.

---

## 7. Topbar

```
┌────────────────────────────────────────────────────────┐
│ [Avatar] Margaret Richardson    [Stable]               │
│          Age 82 · Room 201 · Admitted Jan 12           │
│                              [Export report] [Protocol]│
└────────────────────────────────────────────────────────┘
```

- Height: ~56px, `border-bottom: 0.5px`
- Avatar: 36×36 circle
- Badge variants: `Stable` (ok-green), `Alert` (red), `Watch` (amber)
- Buttons: outlined `btn-sm`; "Export report" opens PDF generation; "Alert protocol" sends prompt to AI

---

## 8. Left Column — Camera + AI Analysis

### 8.1 Camera panel

```
┌─────────────────────────────────────────┐
│ ● Live feed — Room 201    Camera 1A·HD  │
├─────────────────────────────────────────┤
│                                         │
│   [Simulated room SVG — full width]     │
│   280px tall, dark background #0a0f1a   │
│                                         │
│   [TOP-LEFT]  Room 201 · Primary        │
│   [TOP-RIGHT] Normal / ALERT / Watch    │
│                                         │
│   [AI bounding box over person]         │
│   ┌ ─ ─ ─ ┐  ← colored border          │
│     Person    ← label above box         │
│   └ ─ ─ ─ ┘                            │
└─────────────────────────────────────────┘
```

**Recording dot**: 7px red circle, CSS `animation: pulse 1s infinite`

**Camera scene rendering**: SVG inline, dark (#0d1520 bg), depicts:
- `seated` — person in chair by window, reading
- `standing` — person near doorway, upright gait
- `resting` — person in bed, horizontal
- `seated-tv` — person in recliner, TV visible

**AI bounding box**: `position: absolute` colored `<rect>` overlay on the SVG person.
- OK → `#1D9E75`
- Warn → `#BA7517`
- Alert → `#E24B4A`

**Status badge** (top-right corner of feed):
- `csb-ok`: green pill "Normal"
- `csb-warn`: amber pill "Watch"
- `csb-alert`: red pill "ALERT", also pulsing

Camera refreshes SVG scene every 4 seconds (simulate slight scene variation).

### 8.2 AI Analysis panel

```
┌──────────────────────────────────────────┐
│ 🔵 AI scene analysis   [⟳ Analyzing...] │
├──────────────────────────────────────────┤
│                                          │
│  "Patient is seated comfortably by the   │
│   window reading a book. Posture is      │
│   upright and stable..."                 │
│                                          │
│  ┌──────────┬──────────┐                 │
│  │Movement  │Posture   │                 │
│  │  Low     │  Seated  │                 │
│  │Normal    │Stable    │                 │
│  ├──────────┼──────────┤                 │
│  │Activity  │Risk score│                 │
│  │  Reading │  2/10    │                 │
│  │  Calm    │Low risk  │                 │
│  └──────────┴──────────┘                 │
│                                          │
│  [  Run AI analysis now ↗  ]             │
└──────────────────────────────────────────┘
```

**Metric cards** (2×2 grid, `--bg-secondary` fill, radius-md):
| Card | Value examples |
|---|---|
| Movement detected | None / Low / High / Erratic |
| Posture / position | Seated / Standing / Reclining / Unstable |
| Room activity | Reading / Walking / Resting / Watching TV |
| Risk score | N/10, color-coded sub-label |

**Run AI analysis button**:
- On click → `disabled`, label changes to "Analyzing..."
- Spinner shown in header
- POST to `/api/analyze` (see Section 11)
- Response populates the text block
- Re-enables button on completion

---

## 9. Right Column (320px)

### 9.1 Alerts panel

```
┌────────────────────────────────────┐
│ Active alerts          [2 active]  │
├────────────────────────────────────┤
│ [!] Fall risk — Room 202           │
│     Harold W. showing unsteady     │
│     gait near bathroom             │
│     2 min ago · Camera 2A          │
├────────────────────────────────────┤
│ [!] Medication overdue — Room 204  │
│     Frank O. — Metoprolol 25mg     │
│     45 min ago · Scheduled dose    │
├────────────────────────────────────┤
│ [i] Inactivity — Room 203          │
│     Betty E. — No movement 40 min  │
│     18 min ago · Resolved          │
└────────────────────────────────────┘
```

Alert item anatomy:
- Icon box: 28×28, rounded-md, semantic bg (`ai-red`, `ai-amber`, `ai-blue`)
- Icon: 14×14 SVG (triangle/circle-i/info)
- Title: 12px / 500
- Description: 11px / secondary
- Timestamp + source: 10px / tertiary

Alert count badge: `#FCEBEB` bg, `#A32D2D` text, pill shape.

### 9.2 Medications panel

```
┌──────────────────────────────────┐
│ Medications — Margaret R.        │
├──────────────────────────────────┤
│ [✓] Amlodipine 5mg    08:00 ✓   │
│ [✓] Aspirin 81mg      12:00 ✓   │
│ [ ] Metformin 500mg   16:00 !   │  ← overdue: red text
│ [ ] Vitamin D 1000IU  20:00     │
└──────────────────────────────────┘
```

Checkbox:
- Unchecked: 16×16, `border: 0.5px solid --border-default`, rounded-sm
- Checked: `#E1F5EE` bg, `#5DCAA5` border, green checkmark SVG
- Click toggles state inline (optimistic UI, no server required in MVP)

Overdue indicator: time label styled `color: #A32D2D; font-weight: 500`

### 9.3 Activity timeline

```
┌──────────────────────────────────┐
│ Today's activity                 │
│                                  │
│  ● Morning walk — hallway        │
│  │ 09:12                         │
│  ● Breakfast — dining room       │
│  │ 08:45                         │
│  ● Sitting by window, reading    │
│  │ 10:30                         │
│  ● AI analysis updated           │
│    Now                           │
└──────────────────────────────────┘
```

- Dot: 8×8 circle, color = event type (green=activity, blue=neutral, red=alert)
- Connector line: 1px, `--border-subtle`
- Text: 12px / primary + 10px / tertiary for timestamp
- Always append "AI analysis updated · Now" as last entry after analysis runs

---

## 10. Patient Data Model

```typescript
interface Patient {
  id: string;
  name: string;          // Full name e.g. "Margaret Richardson"
  initials: string;      // "MR"
  accentColor: 'blue' | 'teal' | 'amber' | 'red';
  age: number;
  room: string;          // "201"
  admitted: string;      // "Jan 12"
  status: 'ok' | 'warn' | 'alert';
  badge: 'Stable' | 'Watch' | 'Alert';

  // Camera
  scene: 'seated' | 'standing' | 'resting' | 'seated-tv';

  // AI analysis
  analysis: string;       // cached/fallback analysis text
  movement: string;       // "Low" | "High" | "None" | "Minimal"
  posture: string;        // "Seated" | "Standing" | "Reclining"
  activity: string;       // "Reading" | "Walking" | "Resting" | "Watching TV"
  risk: number;           // 1–10
  riskLabel: string;      // "Low risk" | "High risk" | "Moderate"

  // Medications
  medications: Medication[];

  // Timeline
  events: TimelineEvent[];
}

interface Medication {
  name: string;           // "Amlodipine 5mg"
  scheduledTime: string;  // "08:00"
  taken: boolean;
  overdue: boolean;
}

interface TimelineEvent {
  description: string;
  time: string;           // "09:12"
  type: 'activity' | 'neutral' | 'alert';
}
```

---

## 11. API Routes

### POST `/api/analyze`

Calls Anthropic Claude to analyze a patient scene.

**Request body:**
```json
{
  "patientName": "Margaret Richardson",
  "age": 82,
  "room": "201",
  "scene": "seated",
  "status": "ok",
  "movement": "Low",
  "posture": "Seated",
  "activity": "Reading",
  "risk": 2
}
```

**Handler (Next.js route handler):**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

export async function POST(req: Request) {
  const body = await req.json();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: `You are an AI security camera system for an elderly care facility.
Analyze the described scene and give a concise 2–3 sentence clinical assessment covering:
patient status, any risks or concerns, and recommended action if needed.
Be direct and professional. Plain text only, no markdown.`,
    messages: [{
      role: 'user',
      content: `Patient ${body.patientName}, age ${body.age}, Room ${body.room}.
Scene: ${body.scene}. Status: ${body.status}. Movement: ${body.movement}.
Posture: ${body.posture}. Activity: ${body.activity}. Risk score: ${body.risk}/10.
Provide a fresh AI scene analysis.`
    }]
  });

  const text = message.content.find(b => b.type === 'text')?.text ?? '';
  return Response.json({ analysis: text });
}
```

**Environment variable required:**
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 12. Component Tree

```
<App>
  <Dashboard>
    <Sidebar>
      <SidebarHeader />
      <PatientList>
        <PatientCard /> × N
      </PatientList>
      <SidebarFooter />   ← live clock
    </Sidebar>

    <MainArea>
      <Topbar>
        <PatientSummary />
        <ActionButtons />
      </Topbar>

      <ContentGrid>
        <LeftColumn>
          <CameraPanel>
            <CameraHeader />
            <CameraView>
              <RoomScene />      ← SVG scene
              <AIBoundingBox />  ← overlay
              <CameraLabel />
              <StatusBadge />
            </CameraView>
          </CameraPanel>

          <AIAnalysisPanel>
            <AnalysisHeader />
            <AnalysisText />
            <MetricsGrid>
              <MetricCard /> × 4
            </MetricsGrid>
            <AnalyzeButton />
          </AIAnalysisPanel>
        </LeftColumn>

        <RightColumn>
          <AlertsPanel>
            <AlertItem /> × N
          </AlertsPanel>
          <MedicationsPanel>
            <MedItem /> × N
          </MedicationsPanel>
          <ActivityTimeline>
            <TimelineEvent /> × N
          </ActivityTimeline>
        </RightColumn>
      </ContentGrid>
    </MainArea>
  </Dashboard>
</App>
```

---

## 13. Animations & Motion

| Element | Animation | Spec |
|---|---|---|
| Recording dot | Pulse opacity | `0→1→0`, 1s infinite |
| Alert status dot | Pulse opacity | `1→0.3→1`, 1.2s infinite |
| Alert badge (ALERT state) | Pulse opacity | 0.8s infinite |
| AI spinner | Rotate | `360deg`, 0.8s linear infinite |
| Patient card hover | bg transition | 0.15s ease |
| Camera feed scene | Re-render | Every 4 seconds (new SVG draw) |
| Analyze button active | Scale down | `scale(0.98)` on `:active` |

---

## 14. Responsive Behavior

| Breakpoint | Layout change |
|---|---|
| `> 1024px` | Full two-column layout as specified |
| `768–1024px` | Right column drops below left (single column), sidebar collapses to icon rail |
| `< 768px` | Sidebar becomes bottom nav, content stacks fully |

---

## 15. Interaction States

### Patient selection
- Click any `<PatientCard>` → update all panels for that patient
- Sidebar card gets `active` class (light blue bg + blue border)
- All panels (camera, AI analysis, meds, timeline) re-render with patient data
- No page reload — purely client-side state swap

### Medication checkbox
- Click toggles `taken` boolean on the medication object
- Visual: unchecked ↔ checked with green fill + checkmark
- Overdue meds: red timestamp, remains until checked

### AI Analysis
1. User clicks "Run AI analysis now"
2. Button becomes disabled, label → "Analyzing..."
3. Spinner appears in panel header
4. `POST /api/analyze` called with current patient context
5. Response text replaces the analysis paragraph
6. Spinner hidden, button re-enabled
7. Timeline appends "AI analysis updated · [HH:MM]"

### Alert protocol button
- Calls `sendPrompt('How should I respond to a fall detection alert for an elderly patient?')` or routes to a protocol page

---

## 16. Seed Data (4 patients)

```typescript
export const PATIENTS: Patient[] = [
  {
    id: 'p1', name: 'Margaret Richardson', initials: 'MR', accentColor: 'blue',
    age: 82, room: '201', admitted: 'Jan 12', status: 'ok', badge: 'Stable',
    scene: 'seated', movement: 'Low', posture: 'Seated', activity: 'Reading', risk: 2,
    riskLabel: 'Low risk',
    analysis: 'Patient is seated comfortably by the window reading a book. Posture is upright and stable. No unusual movements detected. No fall risk indicators present.',
    medications: [
      { name: 'Amlodipine 5mg',   scheduledTime: '08:00', taken: true,  overdue: false },
      { name: 'Aspirin 81mg',     scheduledTime: '12:00', taken: true,  overdue: false },
      { name: 'Metformin 500mg',  scheduledTime: '16:00', taken: false, overdue: true  },
      { name: 'Vitamin D 1000IU', scheduledTime: '20:00', taken: false, overdue: false },
    ],
    events: [
      { description: 'Morning walk — hallway',    time: '09:12', type: 'activity' },
      { description: 'Breakfast — dining room',   time: '08:45', type: 'activity' },
      { description: 'Sitting by window, reading',time: '10:30', type: 'neutral'  },
    ]
  },
  {
    id: 'p2', name: 'Harold Whitmore', initials: 'HW', accentColor: 'red',
    age: 78, room: '202', admitted: 'Feb 2', status: 'alert', badge: 'Alert',
    scene: 'standing', movement: 'High', posture: 'Standing', activity: 'Walking', risk: 8,
    riskLabel: 'High risk',
    analysis: 'ALERT: Patient detected near bathroom doorway with unsteady gait. Possible fall risk. Patient appears to be holding wall for support. Immediate caregiver attention recommended.',
    medications: [
      { name: 'Metoprolol 25mg', scheduledTime: '08:00', taken: true,  overdue: false },
      { name: 'Lisinopril 10mg', scheduledTime: '12:00', taken: true,  overdue: false },
      { name: 'Warfarin 5mg',    scheduledTime: '18:00', taken: false, overdue: false },
    ],
    events: [
      { description: 'Bathroom visit',          time: '14:02', type: 'alert'    },
      { description: 'Lunch — dining room',     time: '12:30', type: 'activity' },
      { description: 'Physical therapy session',time: '11:00', type: 'neutral'  },
    ]
  },
  {
    id: 'p3', name: 'Betty Erickson', initials: 'BE', accentColor: 'teal',
    age: 75, room: '203', admitted: 'Mar 1', status: 'ok', badge: 'Stable',
    scene: 'resting', movement: 'None', posture: 'Reclining', activity: 'Resting', risk: 1,
    riskLabel: 'Very low',
    analysis: 'Patient is resting in bed. Breathing appears normal and regular. No distress signs visible. Inactivity alert was triggered but patient is confirmed resting, not unresponsive.',
    medications: [
      { name: 'Atorvastatin 40mg',   scheduledTime: '08:00', taken: true,  overdue: false },
      { name: 'Levothyroxine 50mcg', scheduledTime: '07:00', taken: true,  overdue: false },
      { name: 'Calcium 600mg',       scheduledTime: '20:00', taken: false, overdue: false },
    ],
    events: [
      { description: 'Nap — in room',           time: '13:30', type: 'neutral'  },
      { description: 'Occupational therapy',    time: '10:00', type: 'activity' },
      { description: 'Breakfast in room',       time: '08:00', type: 'activity' },
    ]
  },
  {
    id: 'p4', name: 'Frank Okafor', initials: 'FO', accentColor: 'amber',
    age: 88, room: '204', admitted: 'Dec 20', status: 'warn', badge: 'Watch',
    scene: 'seated-tv', movement: 'Minimal', posture: 'Reclining', activity: 'Watching TV', risk: 4,
    riskLabel: 'Moderate',
    analysis: 'Patient is seated in recliner watching television. Medication overdue alert active — Metoprolol 25mg was scheduled at 14:00. Patient appears comfortable but should be visited for medication administration.',
    medications: [
      { name: 'Metoprolol 25mg',  scheduledTime: '14:00', taken: false, overdue: true  },
      { name: 'Furosemide 20mg',  scheduledTime: '08:00', taken: true,  overdue: false },
      { name: 'Potassium 20mEq',  scheduledTime: '08:00', taken: true,  overdue: false },
      { name: 'Pantoprazole 40mg',scheduledTime: '20:00', taken: false, overdue: false },
    ],
    events: [
      { description: 'Missed medication — Metoprolol', time: '14:00', type: 'alert'    },
      { description: 'Watching TV in room',            time: '13:00', type: 'neutral'  },
      { description: 'Lunch — dining room',            time: '12:00', type: 'activity' },
    ]
  }
];
```

---

## 17. Future Enhancements (not in MVP)

- **Real camera integration** — WebRTC or RTSP stream via a proxy server
- **Computer vision** — actual pose estimation using MediaPipe or a custom model
- **Email / SMS alerts** — Twilio or SendGrid when risk score exceeds threshold
- **Weekly health trend charts** — Recharts line/bar charts for vitals and activity scores
- **Multi-ward view** — overview grid showing all wards at once
- **Caregiver mobile app** — React Native companion with push notifications
- **EHR integration** — pull real medication schedules from Epic or Cerner
- **Audit log** — immutable record of all alerts, responses, and AI analyses
- **Role-based access** — nurse vs. doctor vs. admin views

---

## 18. File Structure (suggested)

```
carewatch-ai/
├── app/
│   ├── page.tsx                  ← dashboard root
│   ├── layout.tsx
│   ├── globals.css               ← CSS variables + reset
│   └── api/
│       └── analyze/
│           └── route.ts          ← POST /api/analyze
├── components/
│   ├── Sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── PatientCard.tsx
│   │   └── SidebarFooter.tsx
│   ├── Topbar/
│   │   └── Topbar.tsx
│   ├── Camera/
│   │   ├── CameraPanel.tsx
│   │   ├── RoomScene.tsx         ← SVG scene renderer
│   │   └── AIBoundingBox.tsx
│   ├── AIAnalysis/
│   │   ├── AIAnalysisPanel.tsx
│   │   └── MetricCard.tsx
│   ├── Alerts/
│   │   ├── AlertsPanel.tsx
│   │   └── AlertItem.tsx
│   ├── Medications/
│   │   ├── MedicationsPanel.tsx
│   │   └── MedItem.tsx
│   └── Timeline/
│       ├── ActivityTimeline.tsx
│       └── TimelineEvent.tsx
├── data/
│   └── patients.ts               ← seed data
├── hooks/
│   ├── usePatient.ts             ← selected patient state
│   └── useClock.ts               ← live clock
├── types/
│   └── index.ts                  ← Patient, Medication, TimelineEvent
├── lib/
│   └── anthropic.ts              ← SDK client
├── .env.local                    ← ANTHROPIC_API_KEY
└── README.md
```

---

*End of DESIGN.md — hand this document to Cursor with the prompt: "Implement this design spec as a Next.js 14 application with Tailwind CSS."*
