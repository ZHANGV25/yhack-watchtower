"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { socket } from "./websocket"
import type {
  ActionConfig,
  Alert,
  AnomalyDetectedPayload,
  AnomalyPhase,
  AnomalyScorePayload,
  AnomalyStatusPayload,
  AskResponsePayload,
  ChatMessage,
  Detection,
  FramePayload,
  InitPayload,
  Insight,
  LiveNarrationPayload,
  MonitoringPlan,
  Rule,
  SceneAnalysisPayload,
  Zone,
} from "./types"

let _msgIdCounter = 0
function nextMsgId(): string {
  return `msg-${++_msgIdCounter}-${Date.now()}`
}

export function useWatchTower() {
  // --- Existing state ---
  const [connected, setConnected] = useState(false)
  const [frame, setFrame] = useState<string | null>(null)
  const [detections, setDetections] = useState<Detection[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [lastAddedRule, setLastAddedRule] = useState<Rule | null>(null)
  const [pendingPlan, setPendingPlan] = useState<MonitoringPlan | null>(null)
  const [fps, setFps] = useState(0)
  const [timestamp, setTimestamp] = useState(0)
  const [bufferStart, setBufferStart] = useState(0)

  // --- Block 1: Bootstrap ---
  const [pendingBootstrap, setPendingBootstrap] = useState<SceneAnalysisPayload | null>(null)

  // --- Block 2: Reasoning ---
  const [reasoningEnabled, setReasoningEnabled] = useState(false)
  const [latestInsight, setLatestInsight] = useState<Insight | null>(null)

  // --- Block 3: Actions ---
  const [actionConfig, setActionConfig] = useState<ActionConfig>({
    critical: ["tts", "sound"],
    high: ["tts", "sound"],
    medium: ["sound"],
    low: [],
  })

  // --- Block 4: Investigation ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isInvestigating, setIsInvestigating] = useState(false)

  // --- Block 5: Narration ---
  const [narrationEnabled, setNarrationEnabled] = useState(false)
  const [liveNarration, setLiveNarration] = useState<string>("")

  // --- Block 6: Anomaly ---
  const [anomalyPhase, setAnomalyPhase] = useState<AnomalyPhase>("off")
  const [anomalyScore, setAnomalyScore] = useState(0)
  const [anomalyTimeRemaining, setAnomalyTimeRemaining] = useState(0)

  // --- Camera ---
  const [cameraSource, setCameraSource] = useState<string>("0")

  // --- Audio refs ---
  const ttsQueueRef = useRef<string[]>([])
  const isPlayingRef = useRef(false)

  // --- TTS playback ---
  const playNextTTS = useCallback(() => {
    if (isPlayingRef.current || ttsQueueRef.current.length === 0) return
    isPlayingRef.current = true
    const audioB64 = ttsQueueRef.current.shift()!
    const audio = new Audio(`data:audio/mp3;base64,${audioB64}`)
    audio.onended = () => {
      isPlayingRef.current = false
      playNextTTS()
    }
    audio.onerror = () => {
      isPlayingRef.current = false
      playNextTTS()
    }
    audio.play().catch(() => {
      isPlayingRef.current = false
      playNextTTS()
    })
  }, [])

  const playNotificationSound = useCallback((severity: string) => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      // Different tones for different severities
      const freqs: Record<string, number> = {
        low: 440,
        medium: 660,
        high: 880,
        critical: 1100,
      }
      osc.frequency.value = freqs[severity] || 660
      osc.type = "sine"
      gain.gain.value = 0.15
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
    } catch {
      // Audio not available
    }
  }, [])

  const speakFallback = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      window.speechSynthesis.speak(utterance)
    }
  }, [])

  // --- WebSocket listeners ---
  useEffect(() => {
    socket.connect()

    const unsubs = [
      // Existing
      socket.on("connected", () => setConnected(true)),
      socket.on("disconnected", () => setConnected(false)),
      socket.on("init", (data) => {
        const init = data as unknown as InitPayload
        setZones(init.zones)
        setRules(init.rules)
        setAlerts(init.alerts)
        if (init.reasoning_enabled !== undefined) setReasoningEnabled(init.reasoning_enabled)
        if (init.narration_enabled !== undefined) setNarrationEnabled(init.narration_enabled)
        if (init.anomaly_phase !== undefined) setAnomalyPhase(init.anomaly_phase)
        if (init.action_config !== undefined) setActionConfig(init.action_config)
        if (init.camera_source !== undefined) setCameraSource(init.camera_source)
      }),
      socket.on("camera_switched", (data) => {
        const { source } = data as { source: string }
        setCameraSource(source)
      }),
      socket.on("frame", (data) => {
        const f = data as unknown as FramePayload
        setFrame(f.frame)
        setDetections(f.detections)
        setFps(f.fps)
        setTimestamp(f.timestamp)
        setBufferStart((prev) => (prev === 0 ? f.timestamp : prev))
      }),
      socket.on("alert", (data) => {
        const alert = data as unknown as Alert
        setAlerts((prev) => [alert, ...prev].slice(0, 100))
      }),
      socket.on("narration", (data) => {
        const { alert_id, narration } = data as { alert_id: string; narration: string }
        setAlerts((prev) =>
          prev.map((a) => (a.id === alert_id ? { ...a, narration } : a))
        )
      }),
      socket.on("rule_added", (data) => {
        const rule = data as unknown as Rule
        setRules((prev) => [...prev, rule])
        setLastAddedRule(rule)
      }),
      socket.on("rule_updated", (data) => {
        const rule = data as unknown as Rule
        setRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)))
      }),
      socket.on("rule_deleted", (data) => {
        const { id } = data as { id: string }
        setRules((prev) => prev.filter((r) => r.id !== id))
      }),
      socket.on("zones_updated", (data) => {
        const { zones: newZones } = data as { zones: Zone[] }
        setZones(newZones)
      }),
      socket.on("plan_generated", (data) => {
        setPendingPlan(data as unknown as MonitoringPlan)
      }),
      socket.on("plan_applied", () => {
        setPendingPlan(null)
      }),
      socket.on("plan_error", () => {
        // Plan generation failed — no-op, RuleChat handles its own timeout
      }),
      socket.on("alerts_cleared", () => setAlerts([])),
      socket.on("rules_cleared", () => setRules([])),

      // Block 1: Bootstrap
      socket.on("scene_analysis", (data) => {
        setPendingBootstrap(data as unknown as SceneAnalysisPayload)
      }),

      // Block 2: Reasoning
      socket.on("insight", (data) => {
        setLatestInsight(data as unknown as Insight)
      }),
      socket.on("reasoning_toggled", (data) => {
        const { enabled } = data as { enabled: boolean }
        setReasoningEnabled(enabled)
      }),

      // Block 3: Actions
      socket.on("tts_audio", (data) => {
        const { audio_b64 } = data as { audio_b64: string }
        ttsQueueRef.current.push(audio_b64)
        playNextTTS()
      }),
      socket.on("tts_fallback", (data) => {
        const { text } = data as { text: string }
        speakFallback(text)
      }),
      socket.on("play_sound", (data) => {
        const { severity } = data as { severity: string }
        playNotificationSound(severity)
      }),
      socket.on("actions_updated", (data) => {
        const { config } = data as { config: ActionConfig }
        setActionConfig(config)
      }),

      // Block 4: Investigation
      socket.on("ask_response", (data) => {
        const resp = data as unknown as AskResponsePayload
        setChatMessages((prev) => [
          ...prev,
          {
            id: nextMsgId(),
            role: "assistant",
            content: resp.answer,
            timestamp: Date.now() / 1000,
            frames: resp.relevant_frames,
          },
        ])
        setIsInvestigating(false)
      }),
      socket.on("memory_entry", () => {
        // Memory entries are used server-side for investigation context.
        // No client-side state needed — the ask handler queries memory directly.
      }),

      // Block 5: Narration
      socket.on("live_narration", (data) => {
        const { text } = data as unknown as LiveNarrationPayload
        setLiveNarration(text)
      }),
      socket.on("narration_toggled", (data) => {
        const { enabled } = data as { enabled: boolean }
        setNarrationEnabled(enabled)
      }),

      // Block 6: Anomaly
      socket.on("anomaly_status", (data) => {
        const status = data as unknown as AnomalyStatusPayload
        setAnomalyPhase(status.phase)
        setAnomalyTimeRemaining(status.time_remaining || 0)
      }),
      socket.on("anomaly_score", (data) => {
        const { score } = data as unknown as AnomalyScorePayload
        setAnomalyScore(score)
      }),
      socket.on("anomaly_detected", (data) => {
        const payload = data as unknown as AnomalyDetectedPayload
        // Anomaly detections create alerts on the backend, so they'll appear via the alert listener
        void payload
      }),
    ]

    return () => {
      unsubs.forEach((unsub) => unsub())
      socket.disconnect()
    }
  }, [playNextTTS, playNotificationSound, speakFallback])

  // --- Anomaly timer countdown ---
  useEffect(() => {
    if (anomalyPhase !== "learning" || anomalyTimeRemaining <= 0) return
    const interval = setInterval(() => {
      setAnomalyTimeRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [anomalyPhase, anomalyTimeRemaining])

  // --- Plan actions (web repo exclusive) ---
  const generatePlan = useCallback((text: string) => {
    socket.send("generate_plan", { text })
  }, [])

  const applyPlan = useCallback((planId: string) => {
    socket.send("apply_plan", { plan_id: planId })
  }, [])

  const dismissPlan = useCallback(() => {
    setPendingPlan(null)
  }, [])

  // --- Existing actions ---
  const toggleRule = useCallback((id: string) => {
    socket.send("toggle_rule", { id })
  }, [])

  const deleteRule = useCallback((id: string) => {
    socket.send("delete_rule", { id })
  }, [])

  const updateZones = useCallback((newZones: Zone[]) => {
    socket.send("update_zones", { zones: newZones })
  }, [])

  const autoGenerateZones = useCallback(() => {
    socket.send("auto_zones", {})
  }, [])

  const clearAlerts = useCallback(() => {
    setAlerts([])
    socket.send("clear_alerts", {})
  }, [])

  const clearRules = useCallback(() => {
    setRules([])
    socket.send("clear_rules", {})
  }, [])

  const resetAll = useCallback(() => {
    setZones([])
    setRules([])
    setAlerts([])
    setReasoningEnabled(false)
    setNarrationEnabled(false)
    setAnomalyPhase("off")
    setAnomalyScore(0)
    setLatestInsight(null)
    setLiveNarration("")
    setChatMessages([])
    setPendingPlan(null)
    socket.send("reset_all", {})
  }, [])

  // --- Camera actions ---
  const switchCamera = useCallback((source: string) => {
    socket.send("switch_camera", { source })
  }, [])

  // --- Block 1 actions ---
  const approveBootstrap = useCallback((
    selectedZones: SceneAnalysisPayload["zones"],
    selectedRules: SceneAnalysisPayload["suggested_rules"],
  ) => {
    socket.send("approve_bootstrap", { zones: selectedZones, rules: selectedRules })
    setPendingBootstrap(null)
  }, [])

  const dismissBootstrap = useCallback(() => {
    socket.send("dismiss_bootstrap", {})
    setPendingBootstrap(null)
  }, [])

  // --- Block 2 actions ---
  const toggleReasoning = useCallback(() => {
    socket.send("toggle_reasoning", {})
  }, [])

  // --- Block 3 actions ---
  const updateActions = useCallback((config: ActionConfig) => {
    socket.send("update_actions", { config })
  }, [])

  // --- Block 4 actions ---
  const askQuestion = useCallback((question: string) => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: nextMsgId(),
        role: "user",
        content: question,
        timestamp: Date.now() / 1000,
      },
    ])
    setIsInvestigating(true)
    socket.send("ask", { question })
  }, [])

  const clearChat = useCallback(() => {
    setChatMessages([])
  }, [])

  // --- Block 5 actions ---
  const toggleNarration = useCallback(() => {
    socket.send("toggle_narration", {})
  }, [])

  // --- Block 6 actions ---
  const toggleAnomaly = useCallback(() => {
    socket.send("toggle_anomaly", {})
  }, [])

  const setAnomalyThreshold = useCallback((threshold: number) => {
    socket.send("set_anomaly_threshold", { threshold })
  }, [])

  return {
    // Existing
    connected,
    frame,
    detections,
    zones,
    rules,
    alerts,
    lastAddedRule,
    pendingPlan,
    fps,
    timestamp,
    bufferStart,
    generatePlan,
    applyPlan,
    dismissPlan,
    toggleRule,
    deleteRule,
    updateZones,
    autoGenerateZones,
    clearAlerts,
    clearRules,
    resetAll,

    // Camera
    cameraSource,
    switchCamera,

    // Block 1: Bootstrap
    pendingBootstrap,
    approveBootstrap,
    dismissBootstrap,

    // Block 2: Reasoning
    reasoningEnabled,
    latestInsight,
    toggleReasoning,

    // Block 3: Actions
    actionConfig,
    updateActions,

    // Block 4: Investigation
    chatMessages,
    isInvestigating,
    askQuestion,
    clearChat,

    // Block 5: Narration
    narrationEnabled,
    liveNarration,
    toggleNarration,

    // Block 6: Anomaly
    anomalyPhase,
    anomalyScore,
    anomalyTimeRemaining,
    toggleAnomaly,
    setAnomalyThreshold,
  }
}
