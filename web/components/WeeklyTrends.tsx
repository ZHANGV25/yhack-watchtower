"use client"

import { useEffect, useState, useCallback } from "react"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Moon,
  UtensilsCrossed,
  Footprints,
  Users,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchWeeklyReport } from "@/lib/api"
import type { WeeklyReport } from "@/lib/types"

interface WeeklyTrendsProps {
  cameraId: string
}

function TrendIcon({ trend }: { trend: string }) {
  const lower = trend.toLowerCase()
  if (lower.includes("increas") || lower.includes("improv") || lower.includes("up") || lower.includes("more")) {
    return <TrendingUp className="h-4 w-4 text-emerald-500" />
  }
  if (lower.includes("decreas") || lower.includes("declin") || lower.includes("down") || lower.includes("less")) {
    return <TrendingDown className="h-4 w-4 text-rose-500" />
  }
  return <Minus className="h-4 w-4 text-muted-foreground" />
}

function TrendCard({
  icon: Icon,
  title,
  value,
  trend,
  iconColor = "text-primary",
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  value: string
  trend: string
  iconColor?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <TrendIcon trend={trend} />
      </div>
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{trend}</p>
    </div>
  )
}

export function WeeklyTrends({ cameraId }: WeeklyTrendsProps) {
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetchWeeklyReport(cameraId)
      setReport(resp)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load weekly trends")
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [cameraId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border border-border p-4 animate-pulse">
            <div className="h-4 w-24 bg-muted rounded mb-3" />
            <div className="h-6 w-16 bg-muted rounded mb-2" />
            <div className="h-3 w-full bg-muted rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="ghost" size="sm" onClick={load} className="mt-2">
          Try again
        </Button>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No weekly data available yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Check back after a few days of monitoring
        </p>
      </div>
    )
  }

  const { trends } = report

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {report.start_date} to {report.end_date}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TrendCard
          icon={Moon}
          title="Sleep"
          value={`${trends.sleep_avg_hours.toFixed(1)} hrs avg`}
          trend={trends.sleep_trend}
          iconColor="text-indigo-500"
        />
        <TrendCard
          icon={UtensilsCrossed}
          title="Meals"
          value={trends.meal_consistency}
          trend={trends.meal_consistency}
          iconColor="text-orange-500"
        />
        <TrendCard
          icon={Footprints}
          title="Mobility"
          value={trends.mobility_trend}
          trend={trends.mobility_trend}
          iconColor="text-green-500"
        />
        <TrendCard
          icon={Users}
          title="Visitors"
          value={trends.visitor_frequency}
          trend={trends.visitor_frequency}
          iconColor="text-purple-500"
        />
      </div>

      {/* Weekly concerns */}
      {trends.concerns.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">Weekly Concerns</h3>
          </div>
          <ul className="space-y-1">
            {trends.concerns.map((c, i) => (
              <li key={i} className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-amber-500" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation */}
      {report.recommendation && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-foreground leading-relaxed">{report.recommendation}</p>
        </div>
      )}
    </div>
  )
}
