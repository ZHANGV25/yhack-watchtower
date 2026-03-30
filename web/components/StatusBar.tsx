"use client"

import { Activity, Brain, Mic, RotateCcw, Scan, Wifi, WifiOff } from "lucide-react"
import { ThemeToggle } from "./ThemeToggle"
import { Button } from "@/components/ui/button"
import type { AnomalyPhase } from "@/lib/types"

interface StatusBarProps {
  connected: boolean
  fps: number
  ruleCount: number
  alertCount: number
  reasoningEnabled: boolean
  narrationEnabled: boolean
  anomalyPhase: AnomalyPhase
  onToggleReasoning: () => void
  onToggleNarration: () => void
  onToggleAnomaly: () => void
  onResetAll: () => void
}

export function StatusBar({
  connected,
  fps,
  ruleCount,
  alertCount,
  reasoningEnabled,
  narrationEnabled,
  anomalyPhase,
  onToggleReasoning,
  onToggleNarration,
  onToggleAnomaly,
  onResetAll,
}: StatusBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tracking-tight">WATCHTOWER</span>
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-red-400" />
          )}
          <span className="text-xs font-mono text-muted-foreground">
            {connected ? "CONNECTED" : "DISCONNECTED"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Feature toggles */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 px-2 gap-1 text-xs font-mono ${
            reasoningEnabled ? "text-cyan-400" : "text-muted-foreground"
          }`}
          onClick={onToggleReasoning}
          title="Toggle AI reasoning"
        >
          <Brain className="h-3 w-3" />
          <span className="hidden sm:inline">REASON</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`h-6 px-2 gap-1 text-xs font-mono ${
            narrationEnabled ? "text-cyan-400" : "text-muted-foreground"
          }`}
          onClick={onToggleNarration}
          title="Toggle live narration"
        >
          <Mic className="h-3 w-3" />
          <span className="hidden sm:inline">NARRATE</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`h-6 px-2 gap-1 text-xs font-mono ${
            anomalyPhase !== "off" ? "text-cyan-400" : "text-muted-foreground"
          }`}
          onClick={onToggleAnomaly}
          title="Toggle anomaly detection"
        >
          <Scan className="h-3 w-3" />
          <span className="hidden sm:inline">ANOMALY</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 gap-1 text-xs font-mono text-muted-foreground hover:text-destructive"
          onClick={onResetAll}
          title="Reset everything and restart"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="hidden sm:inline">RESET</span>
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Stats */}
        <div className="flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-cyan-400" />
          <span className="text-xs font-mono text-muted-foreground">
            {fps} FPS
          </span>
        </div>
        <span className="text-xs font-mono text-muted-foreground ml-2">
          {ruleCount} rules
        </span>
        <span className="text-xs font-mono text-muted-foreground ml-2">
          {alertCount} alerts
        </span>
        <ThemeToggle />
      </div>
    </div>
  )
}
