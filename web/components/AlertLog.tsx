"use client"

import React, { useState } from "react"
import { Bell, Trash2, Play, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Alert } from "@/lib/types"
import { SEVERITY_LABELS } from "@/lib/types"
import { renderInlineMarkdown, formatFriendlyTime } from "@/lib/utils"
import { fetchAlertClip, dismissAlert } from "@/lib/api"
import { ClipReplayPlayer } from "@/components/ClipReplayPlayer"

interface AlertLogProps {
  alerts: Alert[]
  onSelectAlert: (alert: Alert) => void
  onClearAll: () => void
  onDismiss?: (alertId: string) => void
}

const SEVERITY_BADGE_STYLES: Record<string, string> = {
  low: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  high: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300",
  critical: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
}

interface ReplayState {
  clipUrl: string
  alertName: string
  alertSeverity: string
  alertNarration: string
  alertTimestamp: number
}

export function AlertLog({ alerts, onSelectAlert, onClearAll, onDismiss }: AlertLogProps) {
  const [replay, setReplay] = useState<ReplayState | null>(null)
  const [clipLoading, setClipLoading] = useState<string | null>(null)

  const handlePlayClip = async (e: React.MouseEvent, alert: Alert) => {
    e.stopPropagation()
    setClipLoading(alert.id)
    try {
      const resp = await fetchAlertClip(alert.id)
      setReplay({
        clipUrl: resp.clip_url,
        alertName: alert.rule_name,
        alertSeverity: alert.severity,
        alertNarration: alert.narration || "",
        alertTimestamp: alert.timestamp,
      })
    } catch {
      // No clip available
    } finally {
      setClipLoading(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Custom replay player */}
      {replay && (
        <ClipReplayPlayer
          clipUrl={replay.clipUrl}
          alertName={replay.alertName}
          alertSeverity={replay.alertSeverity}
          alertNarration={replay.alertNarration}
          alertTimestamp={replay.alertTimestamp}
          onClose={() => setReplay(null)}
        />
      )}

      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            Alerts
          </span>
          {alerts.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({alerts.length})
            </span>
          )}
        </div>
        {alerts.length > 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={onClearAll}
            title="Clear all alerts"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-3 space-y-2">
          {alerts.length === 0 && (
            <div className="text-center py-8">
              <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No alerts yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Alerts will appear here when concerns are triggered
              </p>
            </div>
          )}
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="w-full text-left rounded-xl border border-border bg-card p-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* Header: name + severity badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground leading-tight">
                      {alert.rule_name}
                    </span>
                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_BADGE_STYLES[alert.severity] || SEVERITY_BADGE_STYLES.low}`}>
                      {SEVERITY_LABELS[alert.severity] || alert.severity}
                    </span>
                  </div>

                  {/* Narration */}
                  {alert.narration && (
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-3">
                      {renderInlineMarkdown(alert.narration)}
                    </p>
                  )}

                  {/* Timestamp + actions */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-muted-foreground/60">
                      {formatFriendlyTime(alert.timestamp)}
                    </span>
                    {alert.clip_s3_key && (
                      <button
                        onClick={(e) => handlePlayClip(e, alert)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                        disabled={clipLoading === alert.id}
                      >
                        <Play className="h-3 w-3" />
                        {clipLoading === alert.id ? "Loading..." : "Replay"}
                      </button>
                    )}
                    {onDismiss && (
                      <button
                        onClick={async () => {
                          try {
                            await dismissAlert(alert.id)
                            onDismiss(alert.id)
                          } catch { /* ignore */ }
                        }}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-chart-2 font-medium"
                        title="Dismiss alert"
                      >
                        <Check className="h-3 w-3" />
                        Resolve
                      </button>
                    )}
                  </div>
                </div>

                {/* Thumbnail */}
                {alert.frame_b64 && (
                  <img
                    src={`data:image/jpeg;base64,${alert.frame_b64}`}
                    alt="Alert capture"
                    className="w-16 h-12 object-cover rounded-lg shrink-0 border border-border"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
