"use client"

import { Button } from "@/components/ui/button"
import { Scan, Power } from "lucide-react"
import type { AnomalyPhase } from "@/lib/types"

interface AnomalyPanelProps {
  phase: AnomalyPhase
  score: number
  timeRemaining: number
  onToggle: () => void
  onSetThreshold: (threshold: number) => void
}

export function AnomalyPanel({
  phase,
  score,
  timeRemaining,
  onToggle,
  onSetThreshold,
}: AnomalyPanelProps) {
  const scorePercent = Math.round(score * 100)
  const scoreColor =
    score > 0.6 ? "#ef4444" : score > 0.35 ? "#f97316" : score > 0.15 ? "#fbbf24" : "#4ade80"

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Scan className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
            Anomaly
          </span>
        </div>
        <Button
          variant={phase === "off" ? "ghost" : "default"}
          size="icon"
          className="h-5 w-5"
          onClick={onToggle}
        >
          <Power className="h-3 w-3" />
        </Button>
      </div>

      <div className="p-3 space-y-3">
        {phase === "off" && (
          <p className="text-xs text-muted-foreground font-mono text-center py-2">
            Enable to learn what &quot;normal&quot; looks like, then detect anomalies automatically.
          </p>
        )}

        {phase === "learning" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">LEARNING</span>
              <span className="text-xs font-mono text-cyan-400">
                {Math.ceil(timeRemaining)}s
              </span>
            </div>
            <div className="h-1.5 bg-muted overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-1000"
                style={{
                  width: `${Math.max(0, 100 - (timeRemaining / 120) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Recording baseline patterns...
            </p>
          </div>
        )}

        {phase === "detecting" && (
          <div className="space-y-3">
            {/* Score gauge */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">ANOMALY SCORE</span>
                <span
                  className="text-lg font-mono font-semibold tabular-nums"
                  style={{ color: scoreColor }}
                >
                  {scorePercent}%
                </span>
              </div>
              <div className="h-2 bg-muted overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${scorePercent}%`,
                    backgroundColor: scoreColor,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Normal</span>
              <span>Anomalous</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
