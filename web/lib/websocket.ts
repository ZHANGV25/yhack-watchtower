import type {
  Alert,
  AnomalyDetectedPayload,
  AnomalyScorePayload,
  AnomalyStatusPayload,
  AskResponsePayload,
  Detection,
  FramePayload,
  InitPayload,
  Insight,
  LiveNarrationPayload,
  MemoryEntryPayload,
  ReplayPayload,
  ReplayTimestampsPayload,
  Rule,
  SceneAnalysisPayload,
  WSMessage,
  Zone,
  ActionConfig,
} from "./types"

type Listener<T> = (data: T) => void

interface WatchTowerEvents {
  // Existing
  frame: FramePayload
  init: InitPayload
  alert: Alert
  narration: { alert_id: string; narration: string }
  rule_added: Rule
  rule_updated: Rule
  rule_deleted: { id: string }
  zones_updated: { zones: Zone[] }
  replay: ReplayPayload
  replay_frame: { frame: string | null; timestamp: number }
  replay_timestamps: ReplayTimestampsPayload
  plan_generated: Record<string, unknown>
  plan_applied: { plan_id: string }
  plan_error: { error: string }
  alerts_cleared: Record<string, never>
  rules_cleared: Record<string, never>
  connected: undefined
  disconnected: undefined

  // Block 1: Bootstrap
  scene_analysis: SceneAnalysisPayload
  camera_switched: { source: string }
  camera_error: { error: string }

  // Block 2: Reasoning
  insight: Insight
  reasoning_toggled: { enabled: boolean }

  // Block 3: Actions
  tts_audio: { audio_b64: string; format: string; alert_id: string }
  tts_fallback: { text: string; alert_id: string }
  play_sound: { severity: string }
  actions_updated: { config: ActionConfig }

  // Block 4: Investigation
  ask_response: AskResponsePayload
  memory_entry: MemoryEntryPayload

  // Block 5: Live Narration
  live_narration: LiveNarrationPayload
  narration_toggled: { enabled: boolean }

  // Block 6: Anomaly
  anomaly_status: AnomalyStatusPayload
  anomaly_score: AnomalyScorePayload
  anomaly_detected: AnomalyDetectedPayload
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws"

class WatchTowerSocket {
  private ws: WebSocket | null = null
  private listeners: Map<string, Set<Listener<unknown>>> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = true

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.ws = new WebSocket(WS_URL)

    this.ws.onopen = () => {
      this.emit("connected", undefined)
    }

    this.ws.onclose = () => {
      this.emit("disconnected", undefined)
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.connect(), 2000)
      }
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        this.emit(msg.type, msg.payload)
      } catch {
        // ignore malformed messages
      }
    }
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }

  send(type: string, payload: Record<string, unknown> = {}): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ type, payload }))
  }

  on<K extends keyof WatchTowerEvents>(
    event: K,
    listener: Listener<WatchTowerEvents[K]>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    const set = this.listeners.get(event)!
    set.add(listener as Listener<unknown>)
    return () => set.delete(listener as Listener<unknown>)
  }

  private emit(event: string, data: unknown): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const listener of set) {
      listener(data)
    }
  }
}

// Singleton
export const socket = new WatchTowerSocket()
