// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

export interface Zone {
  id: string
  name: string
  x: number // percentage 0-100
  y: number
  width: number
  height: number
  color: string
}

// ---------------------------------------------------------------------------
// Detections
// ---------------------------------------------------------------------------

export interface BBox {
  x: number
  y: number
  width: number
  height: number
}

export interface PoseKeypoint {
  name: string
  x: number
  y: number
  visibility: number
}

export interface PolygonPoint {
  x: number // percentage 0-100
  y: number
}

export interface Detection {
  class_name: string
  confidence: number
  bbox: BBox
  pose: PoseKeypoint[] | null
  mask: PolygonPoint[] | null // segmentation polygon outline
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export interface Condition {
  type: string
  params: Record<string, unknown>
}

export interface Rule {
  id: string
  name: string
  natural_language: string
  conditions: Condition[]
  severity: "low" | "medium" | "high" | "critical"
  enabled: boolean
  created_at: number
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export interface Alert {
  id: string
  rule_id: string
  rule_name: string
  severity: "low" | "medium" | "high" | "critical"
  timestamp: number
  frame_b64: string
  frame_path: string
  clip_s3_key: string
  narration: string
  detections: Detection[]
}

// ---------------------------------------------------------------------------
// WebSocket messages
// ---------------------------------------------------------------------------

export interface WSMessage {
  type: string
  payload: Record<string, unknown>
}

export interface FramePayload {
  frame: string
  detections: Detection[]
  timestamp: number
  fps: number
}

export interface InitPayload {
  zones: Zone[]
  rules: Rule[]
  alerts: Alert[]
  reasoning_enabled: boolean
  narration_enabled: boolean
  anomaly_phase: AnomalyPhase
  action_config: ActionConfig
  camera_source: string
}

export interface ReplayPayload {
  frames: Array<{ frame: string; timestamp: number }>
}

export interface ReplayTimestampsPayload {
  start: number
  end: number
  count: number
}

// ---------------------------------------------------------------------------
// Monitoring Plans
// ---------------------------------------------------------------------------

export interface Camera {
  id: string
  name: string
  description: string
  location: string
  status: "online" | "offline"
  last_seen: number
  webrtc_url?: string
  created_at: number
  alert_count?: number
}

export interface MonitoringPlan {
  id: string
  name: string
  description: string
  scenario: string
  rules: Rule[]
  zones: Zone[]
  created_at: number
}

// ---------------------------------------------------------------------------
// Block 1: Scene Analysis / Bootstrap
// ---------------------------------------------------------------------------

export interface SceneAnalysisPayload {
  scene_type: string
  scene_description: string
  zones: Array<{ name: string; x: number; y: number; width: number; height: number }>
  suggested_rules: Array<{
    name: string
    natural_language: string
    conditions: Condition[]
    severity: string
  }>
}

// ---------------------------------------------------------------------------
// Block 2: Reasoning / Insights
// ---------------------------------------------------------------------------

export interface Insight {
  observation: string
  concerns: string[]
  suggested_alerts: Array<{ reason: string; severity: string }>
  prediction: string
  timestamp: number
}

// ---------------------------------------------------------------------------
// Block 3: Actions
// ---------------------------------------------------------------------------

export type ActionConfig = Record<string, string[]>

// ---------------------------------------------------------------------------
// Block 4: Investigation
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  frames?: Array<{ frame: string; timestamp: number }>
}

export interface AskResponsePayload {
  answer: string
  relevant_frames: Array<{ frame: string; timestamp: number }>
  question: string
}

// ---------------------------------------------------------------------------
// Block 5: Live Narration
// ---------------------------------------------------------------------------

export interface LiveNarrationPayload {
  text: string
  timestamp: number
}

// ---------------------------------------------------------------------------
// Block 6: Anomaly Detection
// ---------------------------------------------------------------------------

export type AnomalyPhase = "off" | "learning" | "detecting"

export interface AnomalyStatusPayload {
  phase: AnomalyPhase
  time_remaining: number
  threshold?: number
}

export interface AnomalyDetectedPayload {
  score: number
  description: string
  frame_b64: string
  timestamp: number
}

export interface AnomalyScorePayload {
  score: number
  timestamp: number
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export interface MemoryEntryPayload {
  timestamp: number
  summary: string
}

// ---------------------------------------------------------------------------
// Elder Care: Activity
// ---------------------------------------------------------------------------

export interface ActivityEntry {
  id: string
  timestamp: string
  summary: string
  detection_count: number
  frame_url?: string
}

// ---------------------------------------------------------------------------
// Elder Care: Status
// ---------------------------------------------------------------------------

export interface StatusSummary {
  status_text: string
  status_level: "good" | "warning" | "alert" | "critical"
  last_activity: number | string | null
  last_alert: Alert | null
  alert_count_today: number
}

// ---------------------------------------------------------------------------
// Elder Care: Daily Report
// ---------------------------------------------------------------------------

export interface DailyReport {
  date: string
  camera_id: string
  room_name: string
  sleep: { bed_time: string; wake_time: string; duration_hours: number; disruptions: number }
  meals: { time: string; duration_minutes: number; type: string }[]
  mobility: { room_transitions: number; primary_areas: string[] }
  hydration: { observations: number; note: string }
  visitors: { time: string; duration_minutes: number }[]
  medication: { taken_on_time: boolean; notes: string }
  concerns: string[]
  summary: string
}

// ---------------------------------------------------------------------------
// Elder Care: Weekly Report
// ---------------------------------------------------------------------------

export interface WeeklyReport {
  start_date: string
  end_date: string
  trends: {
    sleep_avg_hours: number
    sleep_trend: string
    meal_consistency: string
    mobility_trend: string
    visitor_frequency: string
    concerns: string[]
  }
  daily_summaries: DailyReport[]
  recommendation: string
}

// ---------------------------------------------------------------------------
// Elder Care: Medication Reminder
// ---------------------------------------------------------------------------

export interface MedicationReminder {
  id: string
  name: string
  time: string
  notes: string
  rule_id: string
}

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------

export const SEVERITY_COLORS: Record<string, string> = {
  low: "#4ade80",      // green-400
  medium: "#fbbf24",   // amber-400
  high: "#f97316",     // orange-500
  critical: "#ef4444", // red-500
}

export const SEVERITY_ORDER: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
}

/** Human-friendly severity labels */
export const SEVERITY_LABELS: Record<string, string> = {
  low: "Info",
  medium: "Note",
  high: "Needs Attention",
  critical: "Emergency",
}
