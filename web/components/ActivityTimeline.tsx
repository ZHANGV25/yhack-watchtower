"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Clock, ChevronLeft, ChevronRight, Calendar, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchActivity, clearActivity } from "@/lib/api"
import type { ActivityEntry } from "@/lib/types"
import { formatTime, formatDateISO } from "@/lib/utils"

interface ActivityTimelineProps {
  cameraId: string
}

export function ActivityTimeline({ cameraId }: ActivityTimelineProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState(() => new Date())
  const dateStr = formatDateISO(date)
  const hasLoaded = useRef(false)

  // Fetch activity data
  const fetchData = useCallback(async () => {
    try {
      const resp = await fetchActivity(cameraId, dateStr)
      setEntries(prev => {
        // Only update if data actually changed
        const newLast = resp.entries[resp.entries.length - 1]?.id
        const oldLast = prev[prev.length - 1]?.id
        if (prev.length === resp.entries.length && oldLast === newLast) return prev
        return resp.entries
      })
      setError(null)
    } catch (err) {
      if (!hasLoaded.current) {
        setError(err instanceof Error ? err.message : "Failed to load activity")
      }
    } finally {
      if (!hasLoaded.current) {
        hasLoaded.current = true
        setLoading(false)
      }
    }
  }, [cameraId, dateStr])

  // Initial load + when date changes
  useEffect(() => {
    hasLoaded.current = false
    setLoading(true)
    fetchData()
  }, [fetchData])

  // Silent poll every 10 seconds for today only
  useEffect(() => {
    if (dateStr !== formatDateISO(new Date())) return
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [dateStr, fetchData])

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
    : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{dateLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          {entries.length > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={async () => { await clearActivity(cameraId); setEntries([]) }}
              title="Clear activity log"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
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

      {/* Timeline content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-16 h-4 bg-muted rounded" />
              <div className="flex-1 h-4 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="ghost" size="sm" onClick={fetchData} className="mt-2">
            Try again
          </Button>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No activity recorded yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Activity will appear here as it is detected
          </p>
        </div>
      ) : (
        <div className="relative max-h-[600px] overflow-y-auto">
          {/* Timeline line */}
          <div className="absolute left-[4.5rem] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-1">
            {[...entries].sort((a, b) => {
              const tA = typeof a.timestamp === "string" ? parseFloat(a.timestamp) : a.timestamp
              const tB = typeof b.timestamp === "string" ? parseFloat(b.timestamp) : b.timestamp
              return tB - tA
            }).map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 py-2 group">
                {/* Time */}
                <span className="text-sm text-muted-foreground w-16 text-right shrink-0 pt-0.5">
                  {formatTime(entry.timestamp)}
                </span>

                {/* Dot */}
                <div className="relative z-10 mt-2">
                  <div className="w-2 h-2 rounded-full bg-primary/60 group-hover:bg-primary transition-colors" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm text-foreground leading-relaxed">
                    {entry.summary}
                  </p>
                  {entry.frame_url && (
                    <img
                      src={entry.frame_url}
                      alt="Scene snapshot"
                      className="mt-2 rounded-lg border border-border max-w-xs h-auto"
                      loading="lazy"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
