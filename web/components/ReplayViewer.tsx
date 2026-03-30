"use client"

import { Play, Pause, X, SkipBack, SkipForward, History } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { socket } from "@/lib/websocket"
import type { ReplayPayload } from "@/lib/types"

interface ReplayViewerProps {
  timestamp: number
  onClose: () => void
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("en-US", { hour12: false })
}

type LoadRange = "event" | "15s" | "60s" | "full"

const RANGE_CONFIG: Record<LoadRange, { label: string; before: number; after: number }> = {
  event: { label: "Event", before: 3, after: 5 },
  "15s": { label: "15s", before: 15, after: 5 },
  "60s": { label: "1 min", before: 60, after: 5 },
  full: { label: "Full", before: 1800, after: 5 },
}

export function ReplayViewer({ timestamp, onClose }: ReplayViewerProps) {
  const [frames, setFrames] = useState<Array<{ frame: string; timestamp: number }>>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<LoadRange>("event")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const eventIdxRef = useRef(0)

  // Load frames for the selected range
  const loadRange = useCallback(
    (r: LoadRange) => {
      setRange(r)
      setLoading(true)
      setFrames([])
      setCurrentIdx(0)
      setPlaying(false)

      const cfg = RANGE_CONFIG[r]
      socket.send("get_replay", {
        timestamp: timestamp - cfg.before,
        duration: cfg.before + cfg.after,
      })
    },
    [timestamp],
  )

  // Register listener, then request initial range
  useEffect(() => {
    const unsub = socket.on("replay", (data) => {
      const payload = data as unknown as ReplayPayload
      setLoading(false)
      if (payload.frames.length === 0) return

      setFrames(payload.frames)
      // Find frame closest to the event
      let closest = 0
      let minDiff = Infinity
      payload.frames.forEach((f, i) => {
        const diff = Math.abs(f.timestamp - timestamp)
        if (diff < minDiff) {
          minDiff = diff
          closest = i
        }
      })
      setCurrentIdx(closest)
      eventIdxRef.current = closest
    })

    loadRange("event")
    return unsub
  }, [timestamp, loadRange])

  // Playback
  useEffect(() => {
    if (playing && frames.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIdx((prev) => {
          if (prev >= frames.length - 1) {
            setPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 500)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playing, frames.length])

  const togglePlay = useCallback(() => {
    if (currentIdx >= frames.length - 1) {
      setCurrentIdx(0)
      setPlaying(true)
    } else {
      setPlaying((p) => !p)
    }
  }, [currentIdx, frames.length])

  const stepBack = useCallback(() => {
    setPlaying(false)
    setCurrentIdx((prev) => Math.max(0, prev - 1))
  }, [])

  const stepForward = useCallback(() => {
    setPlaying(false)
    setCurrentIdx((prev) => Math.min(frames.length - 1, prev + 1))
  }, [frames.length])

  const scrubFromX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track || frames.length === 0) return
      const rect = track.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      setCurrentIdx(Math.round(pct * (frames.length - 1)))
      setPlaying(false)
    },
    [frames.length],
  )

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === " ") { e.preventDefault(); togglePlay() }
      if (e.key === "ArrowLeft") stepBack()
      if (e.key === "ArrowRight") stepForward()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose, togglePlay, stepBack, stepForward])

  const currentFrame = frames[currentIdx]
  const progressPct = frames.length > 1 ? (currentIdx / (frames.length - 1)) * 100 : 0
  const eventPct = frames.length > 1 ? (eventIdxRef.current / (frames.length - 1)) * 100 : 0

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-background"
      style={{ isolation: "isolate" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[13px] font-semibold uppercase tracking-wider text-amber-400 shrink-0">
            Replay
          </span>
          {currentFrame && (
            <span className="text-[13px] font-mono text-muted-foreground shrink-0">
              {formatTime(currentFrame.timestamp)}
            </span>
          )}
          {frames.length > 0 && (
            <span className="text-xs font-mono text-muted-foreground/50 shrink-0">
              {currentIdx + 1}/{frames.length}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-[13px] text-muted-foreground hover:text-foreground shrink-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          Close
        </Button>
      </div>

      {/* Video */}
      <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden bg-black/80 dark:bg-black">
        {loading ? (
          <span className="text-[13px] text-muted-foreground font-mono">Loading replay...</span>
        ) : frames.length === 0 ? (
          <span className="text-[13px] text-muted-foreground font-mono">No frames at this time.</span>
        ) : currentFrame ? (
          <img
            src={`data:image/jpeg;base64,${currentFrame.frame}`}
            alt="Replay frame"
            className="max-w-full max-h-full object-contain"
          />
        ) : null}
      </div>

      {/* Controls */}
      {frames.length > 0 && (
        <div className="px-4 py-3 border-t border-border shrink-0">
          {/* Scrub track */}
          <div
            ref={trackRef}
            className="relative h-5 bg-muted/30 rounded-sm cursor-pointer border border-border select-none touch-none mb-3"
            onPointerDown={(e) => {
              setDragging(true)
              ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
              scrubFromX(e.clientX)
            }}
            onPointerMove={(e) => dragging && scrubFromX(e.clientX)}
            onPointerUp={() => setDragging(false)}
          >
            {/* Progress fill */}
            <div
              className="absolute top-0 left-0 bottom-0 bg-cyan-400/10 rounded-sm"
              style={{ width: `${progressPct}%` }}
            />

            {/* Event marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400/70"
              style={{ left: `${eventPct}%`, transform: "translateX(-50%)" }}
              title="Event"
            />

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400"
              style={{ left: `${progressPct}%`, transform: "translateX(-50%)" }}
            >
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-cyan-400 rounded-sm" />
            </div>
          </div>

          {/* Transport centered, range on left */}
          <div className="flex items-center justify-center gap-1 mb-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={stepBack}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={togglePlay}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={stepForward}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Range selector */}
          <div className="flex items-center justify-center gap-1">
            <History className="h-3.5 w-3.5 text-muted-foreground/50 mr-1" />
            {(Object.keys(RANGE_CONFIG) as LoadRange[]).map((r) => (
              <Button
                key={r}
                variant="ghost"
                size="sm"
                className={`h-6 px-2 text-xs ${
                  range === r
                    ? "text-cyan-400 bg-cyan-400/10"
                    : "text-muted-foreground"
                }`}
                onClick={() => loadRange(r)}
                disabled={loading}
              >
                {RANGE_CONFIG[r].label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
