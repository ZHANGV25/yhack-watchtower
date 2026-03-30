"use client"

import { CheckCircle, AlertTriangle, AlertOctagon } from "lucide-react"
import type { StatusSummary } from "@/lib/types"
import { timeAgo } from "@/lib/utils"

interface StatusBannerProps {
  status: StatusSummary | null
  roomName: string
  loading?: boolean
}

const STATUS_CONFIG = {
  good: {
    bg: "bg-card",
    border: "border-border",
    text: "text-foreground",
    subtext: "text-muted-foreground",
    Icon: CheckCircle,
    iconColor: "text-chart-2",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-300/40 dark:border-amber-700/40",
    text: "text-foreground",
    subtext: "text-muted-foreground",
    Icon: AlertTriangle,
    iconColor: "text-amber-500 dark:text-amber-400",
  },
  alert: {
    bg: "bg-destructive/5",
    border: "border-destructive/20",
    text: "text-foreground",
    subtext: "text-muted-foreground",
    Icon: AlertOctagon,
    iconColor: "text-destructive",
  },
  critical: {
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    text: "text-foreground",
    subtext: "text-muted-foreground",
    Icon: AlertOctagon,
    iconColor: "text-destructive",
  },
}

export function StatusBanner({ status, roomName, loading }: StatusBannerProps) {
  if (loading || !status) {
    return (
      <div className="rounded-xl border border-border bg-muted/50 p-5 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted rounded mt-2" />
      </div>
    )
  }

  const config = STATUS_CONFIG[status.status_level] || STATUS_CONFIG.good
  const { Icon } = config

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-5`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-6 w-6 ${config.iconColor} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`text-lg font-semibold ${config.text}`}>
            {status.status_text || `${roomName} is doing fine`}
          </p>
          {status.last_activity && (
            <p className={`text-sm mt-1 ${config.subtext}`}>
              Last activity: {timeAgo(typeof status.last_activity === "number" ? status.last_activity : parseFloat(status.last_activity))}
            </p>
          )}
          {!status.last_activity && (
            <p className={`text-sm mt-1 ${config.subtext}`}>
              No recent activity recorded
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
