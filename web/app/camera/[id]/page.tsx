"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { AlertLog } from "@/components/AlertLog"
import { InvestigationChat } from "@/components/InvestigationChat"
import { StatusBanner } from "@/components/StatusBanner"
import { ActivityTimeline } from "@/components/ActivityTimeline"
import { ConcernInput } from "@/components/ConcernInput"
import { MedicationManager } from "@/components/MedicationManager"
import { WebRTCPlayer } from "@/components/WebRTCPlayer"
import { CameraSetup } from "@/components/CameraSetup"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Loader2,
  Activity,
  Shield,
  Bell,
  Pill,
} from "lucide-react"
import { isAuthenticated } from "@/lib/auth"
import {
  fetchAlerts,
  fetchStatus,
  fetchCameras,
  clearAlerts,
  askAboutRoom,
} from "@/lib/api"
import type { Alert, Camera, StatusSummary, ChatMessage } from "@/lib/types"
import { extractPersonName } from "@/lib/utils"

type Tab = "activity" | "concerns" | "medications" | "alerts"

let _chatIdCounter = 0
function nextChatId(): string {
  return `chat-${++_chatIdCounter}-${Date.now()}`
}

export default function CameraDetail() {
  const params = useParams()
  const router = useRouter()
  const cameraId = params.id as string

  useEffect(() => {
    if (!isAuthenticated()) router.push("/login")
  }, [router])

  // State
  const [camera, setCamera] = useState<Camera | null>(null)
  const [status, setStatus] = useState<StatusSummary | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("activity")
  const [signalingUrl, setSignalingUrl] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isInvestigating, setIsInvestigating] = useState(false)

  const roomName = camera?.name || "Room"
  const personName = extractPersonName(roomName)

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [camerasResp, statusResp, alertsResp] = await Promise.allSettled([
        fetchCameras(),
        fetchStatus(cameraId),
        fetchAlerts(cameraId),
      ])
      if (camerasResp.status === "fulfilled") {
        const cam = camerasResp.value.cameras.find(c => c.id === cameraId)
        if (cam) {
          setCamera(cam)
          // Auto-populate signaling URL via API proxy (avoids mixed content)
          if (cam.webrtc_url && !signalingUrl) {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
            setSignalingUrl(`${API_URL}/api/webrtc/offer/${cameraId}`)
          }
        }
      }
      if (statusResp.status === "fulfilled") {
        setStatus(statusResp.value)
      }
      if (alertsResp.status === "fulfilled") {
        setAlerts(alertsResp.value.alerts as unknown as Alert[])
      }
    } catch (err) {
      console.error("Failed to load data:", err)
    } finally {
      setLoading(false)
    }
  }, [cameraId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [loadData])

  // Poll alerts and status every 10 seconds (silent — no loading flash)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [statusResp, alertsResp] = await Promise.allSettled([
          fetchStatus(cameraId),
          fetchAlerts(cameraId),
        ])
        if (statusResp.status === "fulfilled") setStatus(statusResp.value)
        if (alertsResp.status === "fulfilled") {
          const newAlerts = alertsResp.value.alerts as unknown as Alert[]
          setAlerts(prev => {
            // Only update if alert count or latest alert changed
            if (prev.length === newAlerts.length && prev[0]?.id === newAlerts[0]?.id) return prev
            return newAlerts
          })
        }
      } catch { /* ignore */ }
    }, 10000)
    return () => clearInterval(interval)
  }, [cameraId])

  // Actions
  const handleClearAlerts = async () => {
    await clearAlerts(cameraId)
    setAlerts([])
  }

  const handleSelectAlert = (_alert: Alert) => {
    // No-op — alert details shown inline. Replay button handles clip playback.
  }

  const handleAsk = async (question: string) => {
    setChatMessages(prev => [
      ...prev,
      { id: nextChatId(), role: "user", content: question, timestamp: Date.now() / 1000 },
    ])
    setIsInvestigating(true)
    try {
      const resp = await askAboutRoom(cameraId, question)
      setChatMessages(prev => [
        ...prev,
        {
          id: nextChatId(),
          role: "assistant",
          content: resp.answer,
          timestamp: Date.now() / 1000,
          frames: resp.relevant_frames,
        },
      ])
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          id: nextChatId(),
          role: "assistant",
          content: "Sorry, I was unable to answer that right now. Please try again.",
          timestamp: Date.now() / 1000,
        },
      ])
    } finally {
      setIsInvestigating(false)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "activity", label: "Today", icon: Activity },
    { id: "concerns", label: "Concerns", icon: Shield },
    { id: "medications", label: "Meds", icon: Pill },
    { id: "alerts", label: "Alerts", icon: Bell },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading room...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => router.push("/")}
                className="rounded-xl"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">{roomName}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {/* Camera + Chat row */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-stretch">
            {/* Camera feed */}
            <div className="min-w-0">
              <div className="rounded-xl border border-border overflow-hidden bg-card h-full">
                {signalingUrl ? (
                  <div className="aspect-video bg-muted">
                    <WebRTCPlayer signalingUrl={signalingUrl} className="w-full h-full" />
                  </div>
                ) : (
                  <CameraSetup cameraId={cameraId} roomName={roomName} onConnect={(url) => setSignalingUrl(url)} />
                )}
              </div>
            </div>

            {/* Chat — matches video height, scrolls internally */}
            <div className="min-w-0">
              <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col h-full">
                <InvestigationChat
                  messages={chatMessages}
                  isInvestigating={isInvestigating}
                  onAsk={handleAsk}
                  onClear={() => setChatMessages([])}
                  personName={personName}
                />
              </div>
            </div>
          </div>

          {/* Status Banner — full width */}
          <div className="mt-6">
            <StatusBanner status={status} roomName={roomName} />
          </div>

          {/* Tabs — full width */}
          <div className="border-b border-border mt-6">
            <div className="flex gap-1 overflow-x-auto -mb-px">
              {tabs.map(tab => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                const alertCount = tab.id === "alerts" ? alerts.length : 0
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    {alertCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {alertCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab content — full width */}
          <div className="mt-6 min-h-[400px]">
            {activeTab === "activity" && (
              <ActivityTimeline cameraId={cameraId} />
            )}
            {activeTab === "concerns" && (
              <ConcernInput cameraId={cameraId} roomName={roomName} />
            )}
            {activeTab === "medications" && (
              <MedicationManager cameraId={cameraId} />
            )}
            {activeTab === "alerts" && (
              <div className="rounded-xl border border-border bg-card overflow-hidden" style={{ minHeight: 400 }}>
                <AlertLog
                  alerts={alerts}
                  onSelectAlert={handleSelectAlert}
                  onClearAll={handleClearAlerts}
                  onDismiss={(id) => setAlerts(prev => prev.filter(a => a.id !== id))}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
