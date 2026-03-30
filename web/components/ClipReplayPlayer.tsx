"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  Play,
  Pause,
  X,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Maximize2,
  Minimize2,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ClipReplayPlayerProps {
  clipUrl: string
  alertName: string
  alertSeverity: string
  alertNarration?: string
  alertTimestamp?: number
  onClose: () => void
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "#3b82f6",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
}

const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2]

export function ClipReplayPlayer({
  clipUrl,
  alertName,
  alertSeverity,
  alertNarration,
  onClose,
}: ClipReplayPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Alert marker position (alert fires near end of clip due to post-buffer)
  const alertMarkerPct = duration > 0 ? Math.max(0, Math.min(100, ((duration - 10) / duration) * 100)) : 80

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }, [])

  const stepFrame = useCallback((dir: number) => {
    const v = videoRef.current
    if (!v) return
    v.pause()
    setPlaying(false)
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + dir * (1 / 15)))
  }, [])

  const skip = useCallback((seconds: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + seconds))
  }, [])

  const cycleSpeed = useCallback(() => {
    const idx = SPEED_OPTIONS.indexOf(speed)
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]
    setSpeed(next)
    if (videoRef.current) videoRef.current.playbackRate = next
  }, [speed])

  const seekTo = useCallback((pct: number) => {
    const v = videoRef.current
    if (!v || !duration) return
    v.currentTime = (pct / 100) * duration
  }, [duration])

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    seekTo(pct)
  }

  const handleTimelineHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    setHoverTime((pct / 100) * duration)
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
      setFullscreen(false)
    } else {
      containerRef.current.requestFullscreen()
      setFullscreen(true)
    }
  }

  // Seek to alert moment on load
  const handleLoaded = () => {
    const v = videoRef.current
    if (!v) return
    setDuration(v.duration)
    // Seek to ~5s before the alert moment (near end of clip)
    if (v.duration > 15) {
      v.currentTime = Math.max(0, v.duration - 15)
    }
    v.playbackRate = speed
    v.play()
  }

  // Time update loop
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const handler = () => setCurrentTime(v.currentTime)
    v.addEventListener("timeupdate", handler)
    return () => v.removeEventListener("timeupdate", handler)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay() }
      if (e.key === "ArrowLeft") { e.preventDefault(); skip(-5) }
      if (e.key === "ArrowRight") { e.preventDefault(); skip(5) }
      if (e.key === "," || e.key === "<") { e.preventDefault(); stepFrame(-1) }
      if (e.key === "." || e.key === ">") { e.preventDefault(); stepFrame(1) }
      if (e.key === "Escape") onClose()
      if (e.key === "f") toggleFullscreen()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [togglePlay, skip, stepFrame, onClose, toggleFullscreen])

  const formatTimestamp = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    const ms = Math.floor((t % 1) * 10)
    return `${m}:${s.toString().padStart(2, "0")}.${ms}`
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0
  const sevColor = SEVERITY_COLORS[alertSeverity] || SEVERITY_COLORS.medium

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" ref={containerRef}>
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white p-2"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Alert info banner */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" style={{ color: sevColor }} />
        <span className="text-white text-sm font-semibold">{alertName}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: sevColor + "30", color: sevColor }}
        >
          {alertSeverity}
        </span>
      </div>

      {/* Narration */}
      {alertNarration && (
        <div className="absolute top-12 left-4 z-10 max-w-md">
          <p className="text-white/60 text-xs">{alertNarration}</p>
        </div>
      )}

      {/* Video */}
      <video
        ref={videoRef}
        src={clipUrl}
        className="w-full h-full object-contain"
        onLoadedMetadata={handleLoaded}
        onEnded={() => setPlaying(false)}
        onClick={togglePlay}
        playsInline
      />

      {/* Timestamp overlay */}
      <div className="absolute top-4 right-16 z-10 font-mono text-white/80 text-sm bg-black/50 px-2 py-1 rounded">
        {formatTimestamp(currentTime)}
      </div>

      {/* Speed indicator */}
      {speed !== 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 font-mono text-white/80 text-sm bg-black/50 px-2 py-1 rounded">
          {speed}x
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 to-transparent pt-12 pb-4 px-4">
        {/* Timeline scrubber */}
        <div
          ref={timelineRef}
          className="relative h-8 cursor-pointer group mb-3"
          onClick={handleTimelineClick}
          onMouseMove={handleTimelineHover}
          onMouseLeave={() => setHoverTime(null)}
        >
          {/* Track background */}
          <div className="absolute top-3 left-0 right-0 h-2 bg-white/20 rounded-full">
            {/* Progress */}
            <div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ width: `${progressPct}%`, backgroundColor: sevColor }}
            />
            {/* Alert marker */}
            <div
              className="absolute top-0 h-full w-1 rounded-full"
              style={{ left: `${alertMarkerPct}%`, backgroundColor: sevColor }}
              title="Alert triggered here"
            >
              <div
                className="absolute -top-1.5 -left-1 w-3 h-3 rounded-full border-2 border-black"
                style={{ backgroundColor: sevColor }}
              />
            </div>
          </div>
          {/* Playhead */}
          <div
            className="absolute top-1.5 w-4 h-4 bg-white rounded-full shadow-md -translate-x-1/2 transition-none"
            style={{ left: `${progressPct}%` }}
          />
          {/* Hover tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-6 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono -translate-x-1/2 pointer-events-none"
              style={{ left: `${(hoverTime / (duration || 1)) * 100}%` }}
            >
              {formatTimestamp(hoverTime)}
            </div>
          )}
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Frame step back */}
            <Button variant="ghost" size="icon-sm" onClick={() => stepFrame(-1)} title="Previous frame (,)">
              <SkipBack className="h-4 w-4 text-white" />
            </Button>
            {/* Skip back 5s */}
            <Button variant="ghost" size="icon-sm" onClick={() => skip(-5)} title="Back 5s">
              <Rewind className="h-4 w-4 text-white" />
            </Button>
            {/* Play/pause */}
            <Button variant="ghost" size="sm" onClick={togglePlay} className="text-white mx-1">
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            {/* Skip forward 5s */}
            <Button variant="ghost" size="icon-sm" onClick={() => skip(5)} title="Forward 5s">
              <FastForward className="h-4 w-4 text-white" />
            </Button>
            {/* Frame step forward */}
            <Button variant="ghost" size="icon-sm" onClick={() => stepFrame(1)} title="Next frame (.)">
              <SkipForward className="h-4 w-4 text-white" />
            </Button>
          </div>

          {/* Center: time */}
          <div className="font-mono text-white/80 text-sm">
            {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
          </div>

          {/* Right: speed + fullscreen */}
          <div className="flex items-center gap-1">
            <button
              onClick={cycleSpeed}
              className="text-white/70 hover:text-white text-xs font-mono px-2 py-1 rounded hover:bg-white/10"
              title="Playback speed"
            >
              {speed}x
            </button>
            <Button variant="ghost" size="icon-sm" onClick={toggleFullscreen}>
              {fullscreen ? <Minimize2 className="h-4 w-4 text-white" /> : <Maximize2 className="h-4 w-4 text-white" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
