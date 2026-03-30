"use client"

import { useMemo } from "react"
import type { Alert } from "@/lib/types"
import { SEVERITY_COLORS } from "@/lib/types"

interface AlertTimelineProps {
  alerts: Alert[]
  currentTimestamp: number
  bufferStart: number
  onScrub: (timestamp: number) => void
  isReplayOpen: boolean
}

function formatTimeShort(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function AlertTimeline({
  alerts,
  currentTimestamp,
  bufferStart,
  onScrub,
  isReplayOpen,
}: AlertTimelineProps) {
  // Timeline spans from buffer start to current time
  const timelineStart = bufferStart > 0 ? bufferStart : currentTimestamp - 60
  const timelineEnd = currentTimestamp
  const duration = Math.max(timelineEnd - timelineStart, 1)

  const durationMin = Math.floor(duration / 60)
  const durationSec = Math.floor(duration % 60)
  const durationLabel = durationMin > 0
    ? `${durationMin}m ${durationSec}s recorded`
    : `${durationSec}s recorded`

  const pctFromTs = (ts: number) =>
    Math.max(0, Math.min(100, ((ts - timelineStart) / duration) * 100))

  const markers = useMemo(() => {
    return alerts
      .filter((a) => a.timestamp >= timelineStart && a.timestamp <= timelineEnd)
      .map((alert) => ({
        alert,
        position: pctFromTs(alert.timestamp),
      }))
  }, [alerts, timelineStart, timelineEnd])

  // Adaptive time labels
  const timeLabels = useMemo(() => {
    const labelCount = duration > 300 ? 6 : duration > 60 ? 4 : 3
    const labels: Array<{ time: string; position: number }> = []
    for (let i = 0; i <= labelCount; i++) {
      const ts = timelineStart + (duration / labelCount) * i
      labels.push({
        time: formatTimeShort(ts),
        position: (i / labelCount) * 100,
      })
    }
    return labels
  }, [timelineStart, duration])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const ts = timelineStart + pct * duration
    onScrub(ts)
  }

  return (
    <div className={`px-4 py-2.5 border-t border-border shrink-0 overflow-hidden ${isReplayOpen ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
            Timeline
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {durationLabel}
          </span>
        </div>
        <span className="text-xs font-mono text-muted-foreground/60">
          Click to replay
        </span>
      </div>

      {/* Track */}
      <div
        className="relative h-7 bg-muted/30 rounded-sm cursor-pointer border border-border select-none"
        onClick={handleClick}
      >
        {/* Live position indicator */}
        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-cyan-400" />

        {/* Alert event markers */}
        {markers.map(({ alert, position }) => (
          <div
            key={alert.id}
            className="absolute top-0 bottom-0 w-1.5 rounded-sm opacity-80 hover:opacity-100 transition-opacity"
            style={{
              left: `${position}%`,
              backgroundColor: SEVERITY_COLORS[alert.severity],
              transform: "translateX(-50%)",
            }}
            title={`${alert.rule_name} - ${formatTimeShort(alert.timestamp)}`}
          />
        ))}
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-1">
        {timeLabels.map((label, i) => (
          <span
            key={i}
            className="text-[11px] text-muted-foreground font-mono"
          >
            {label.time}
          </span>
        ))}
      </div>
    </div>
  )
}
