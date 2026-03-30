"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Moon,
  UtensilsCrossed,
  Footprints,
  Droplets,
  Users,
  Pill,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchDailyReport } from "@/lib/api"
import type { DailyReport as DailyReportType } from "@/lib/types"
import { formatDateISO } from "@/lib/utils"
import { ExportButton } from "@/components/ExportButton"

interface DailyReportProps {
  cameraId: string
}

function ReportCard({
  icon: Icon,
  title,
  children,
  iconColor = "text-primary",
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
  iconColor?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="text-sm text-muted-foreground space-y-1">
        {children}
      </div>
    </div>
  )
}

export function DailyReport({ cameraId }: DailyReportProps) {
  const [report, setReport] = useState<DailyReportType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState<Date>(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetchDailyReport(cameraId, formatDateISO(date))
      setReport(resp)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report")
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [cameraId, date])

  useEffect(() => { load() }, [load])

  const goToPreviousDay = () => {
    setDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 1)
      return d
    })
  }

  const goToNextDay = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 1)
      if (d > tomorrow) return prev
      return d
    })
  }

  const isToday = formatDateISO(date) === formatDateISO(new Date())

  const dateLabel = isToday
    ? "Today"
    : date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Daily Report: {dateLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isToday ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setDate(new Date())}
            disabled={isToday}
          >
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={goToNextDay} disabled={isToday}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border border-border p-4 animate-pulse">
              <div className="h-4 w-24 bg-muted rounded mb-3" />
              <div className="h-3 w-full bg-muted rounded mb-2" />
              <div className="h-3 w-2/3 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="ghost" size="sm" onClick={load} className="mt-2">
            Try again
          </Button>
        </div>
      ) : !report ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No report available for this date</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          {report.summary && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-foreground leading-relaxed">{report.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Sleep */}
            <ReportCard icon={Moon} title="Sleep" iconColor="text-indigo-500">
              <p>Bedtime: {report.sleep.bed_time}</p>
              <p>Wake time: {report.sleep.wake_time}</p>
              <p className="font-medium text-foreground">
                Duration: {report.sleep.duration_hours} hours
              </p>
              {report.sleep.disruptions > 0 && (
                <p className="text-amber-600 dark:text-amber-400">
                  {report.sleep.disruptions} disruption{report.sleep.disruptions !== 1 ? "s" : ""}
                </p>
              )}
            </ReportCard>

            {/* Meals */}
            <ReportCard icon={UtensilsCrossed} title="Meals" iconColor="text-orange-500">
              {report.meals.length > 0 ? (
                report.meals.map((meal, i) => (
                  <p key={i}>
                    {meal.type}: {meal.time}
                    {meal.duration_minutes > 0 && (
                      <span className="text-xs ml-1">({meal.duration_minutes} min)</span>
                    )}
                  </p>
                ))
              ) : (
                <p>No meals recorded</p>
              )}
            </ReportCard>

            {/* Mobility */}
            <ReportCard icon={Footprints} title="Mobility" iconColor="text-green-500">
              <p>{report.mobility.room_transitions} room transitions</p>
              {report.mobility.primary_areas.length > 0 && (
                <p>Mainly in: {report.mobility.primary_areas.join(", ")}</p>
              )}
            </ReportCard>

            {/* Hydration */}
            <ReportCard icon={Droplets} title="Hydration" iconColor="text-blue-500">
              <p>{report.hydration.observations} observation{report.hydration.observations !== 1 ? "s" : ""}</p>
              {report.hydration.note && <p>{report.hydration.note}</p>}
            </ReportCard>

            {/* Visitors */}
            <ReportCard icon={Users} title="Visitors" iconColor="text-purple-500">
              {report.visitors.length > 0 ? (
                report.visitors.map((v, i) => (
                  <p key={i}>
                    {v.time} ({v.duration_minutes} min)
                  </p>
                ))
              ) : (
                <p>No visitors today</p>
              )}
            </ReportCard>

            {/* Medication */}
            <ReportCard icon={Pill} title="Medication" iconColor="text-rose-500">
              <p className={report.medication.taken_on_time
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
              }>
                {report.medication.taken_on_time ? "Taken on time" : "Not confirmed"}
              </p>
              {report.medication.notes && <p>{report.medication.notes}</p>}
            </ReportCard>
          </div>

          {/* Concerns */}
          {report.concerns.length > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">Concerns</h3>
              </div>
              <ul className="space-y-1">
                {report.concerns.map((c, i) => (
                  <li key={i} className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-amber-500" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Export */}
          <div className="flex justify-end">
            <ExportButton cameraId={cameraId} date={formatDateISO(date)} />
          </div>
        </>
      )}
    </div>
  )
}
