"use client"

import { useEffect, useRef } from "react"
import type { Detection, PolygonPoint, Zone } from "@/lib/types"

interface VideoFeedProps {
  frame: string | null
  detections: Detection[]
  zones: Zone[]
  fps: number
  timestamp: number
}

const CORNER_SIZE = 18
const CORNER_THICKNESS = 3

/** Scale font size relative to display width */
function fontSize(displayW: number, base: number = 18): number {
  return Math.max(base, Math.round(displayW / 35))
}

function fontStr(displayW: number, base: number = 18): string {
  return `600 ${fontSize(displayW, base)}px var(--font-geist-mono), monospace`
}

function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.strokeStyle = color
  ctx.lineWidth = CORNER_THICKNESS

  // Top-left
  ctx.beginPath()
  ctx.moveTo(x, y + CORNER_SIZE)
  ctx.lineTo(x, y)
  ctx.lineTo(x + CORNER_SIZE, y)
  ctx.stroke()

  // Top-right
  ctx.beginPath()
  ctx.moveTo(x + w - CORNER_SIZE, y)
  ctx.lineTo(x + w, y)
  ctx.lineTo(x + w, y + CORNER_SIZE)
  ctx.stroke()

  // Bottom-left
  ctx.beginPath()
  ctx.moveTo(x, y + h - CORNER_SIZE)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x + CORNER_SIZE, y + h)
  ctx.stroke()

  // Bottom-right
  ctx.beginPath()
  ctx.moveTo(x + w - CORNER_SIZE, y + h)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x + w, y + h - CORNER_SIZE)
  ctx.stroke()
}

function buildSmoothPath(
  ctx: CanvasRenderingContext2D,
  mask: PolygonPoint[],
  canvasW: number,
  canvasH: number,
) {
  // Convert percentage coords to canvas pixels
  const pts = mask.map((p) => ({
    x: (p.x / 100) * canvasW,
    y: (p.y / 100) * canvasH,
  }))

  ctx.beginPath()

  if (pts.length < 3) {
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.closePath()
    return
  }

  // Catmull-Rom-style smooth curve through all points
  // Start at the midpoint between last and first point
  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  })

  const start = mid(pts[pts.length - 1], pts[0])
  ctx.moveTo(start.x, start.y)

  for (let i = 0; i < pts.length; i++) {
    const next = pts[(i + 1) % pts.length]
    const m = mid(pts[i], next)
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y)
  }

  ctx.closePath()
}

function drawMaskGlow(
  ctx: CanvasRenderingContext2D,
  mask: PolygonPoint[],
  canvasW: number,
  canvasH: number,
  color: string,
) {
  if (mask.length < 3) return

  // Outer glow
  buildSmoothPath(ctx, mask, canvasW, canvasH)
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = 12
  ctx.strokeStyle = color + "40"
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()

  // Crisp edge
  buildSmoothPath(ctx, mask, canvasW, canvasH)
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = 4
  ctx.strokeStyle = color + "70"
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()

  // Very subtle fill
  buildSmoothPath(ctx, mask, canvasW, canvasH)
  ctx.save()
  ctx.fillStyle = color + "08"
  ctx.fill()
  ctx.restore()
}

function drawZones(
  ctx: CanvasRenderingContext2D,
  zones: Zone[],
  canvasW: number,
  canvasH: number,
) {
  for (const zone of zones) {
    const x = (zone.x / 100) * canvasW
    const y = (zone.y / 100) * canvasH
    const w = (zone.width / 100) * canvasW
    const h = (zone.height / 100) * canvasH

    // Semi-transparent fill
    ctx.fillStyle = zone.color + "15"
    ctx.fillRect(x, y, w, h)

    // Border with glow
    ctx.shadowColor = zone.color
    ctx.shadowBlur = 6
    ctx.strokeStyle = zone.color + "80"
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, w, h)
    ctx.shadowBlur = 0

    // Label
    const zfs = fontSize(canvasW, 13)
    ctx.font = fontStr(canvasW, 13)
    ctx.fillStyle = zone.color
    const textW = ctx.measureText(zone.name).width
    const lh = zfs + 6
    ctx.fillStyle = "#000000aa"
    ctx.fillRect(x, y - lh, textW + 10, lh)
    ctx.fillStyle = zone.color
    ctx.fillText(zone.name, x + 5, y - 5)
  }
}

function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: Detection[],
  canvasW: number,
  canvasH: number,
) {
  for (const det of detections) {
    const x = (det.bbox.x / 100) * canvasW
    const y = (det.bbox.y / 100) * canvasH
    const w = (det.bbox.width / 100) * canvasW
    const h = (det.bbox.height / 100) * canvasH

    const color = "#22d3ee"

    // Draw segmentation mask glow if available, otherwise corner brackets
    if (det.mask && det.mask.length >= 3) {
      drawMaskGlow(ctx, det.mask, canvasW, canvasH, color)
    } else {
      ctx.shadowColor = color
      ctx.shadowBlur = 4
      drawCornerBrackets(ctx, x, y, w, h, color)
      ctx.shadowBlur = 0
    }

    // Label background
    const label = `${det.class_name} ${Math.round(det.confidence * 100)}%`
    const dfs = fontSize(canvasW)
    ctx.font = fontStr(canvasW)
    const textW = ctx.measureText(label).width
    const dlh = dfs + 6
    ctx.fillStyle = "#000000cc"
    ctx.fillRect(x, y - dlh - 2, textW + 10, dlh)

    // Label text
    ctx.fillStyle = color
    ctx.fillText(label, x + 5, y - 7)
  }
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
) {
  // Crosshair (very subtle)
  ctx.strokeStyle = "#22d3ee10"
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(canvasW / 2, 0)
  ctx.lineTo(canvasW / 2, canvasH)
  ctx.moveTo(0, canvasH / 2)
  ctx.lineTo(canvasW, canvasH / 2)
  ctx.stroke()
}

export function VideoFeed({ frame, detections, zones, fps, timestamp }: VideoFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!frame) return

    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (!imgRef.current) {
      imgRef.current = new Image()
    }

    const img = imgRef.current
    img.onload = () => {
      // Render at the container's display size (CSS pixels) so text is crisp
      const dpr = window.devicePixelRatio || 1
      const containerW = container.clientWidth
      const containerH = container.clientHeight

      // Fit image aspect ratio within container
      const imgAspect = img.naturalWidth / img.naturalHeight
      const containerAspect = containerW / containerH
      let drawW: number, drawH: number
      if (imgAspect > containerAspect) {
        drawW = containerW
        drawH = containerW / imgAspect
      } else {
        drawH = containerH
        drawW = containerH * imgAspect
      }

      // Set canvas to display-resolution (scaled by DPR for retina)
      canvas.width = drawW * dpr
      canvas.height = drawH * dpr
      canvas.style.width = `${drawW}px`
      canvas.style.height = `${drawH}px`
      ctx.scale(dpr, dpr)

      // Draw image scaled to display size
      ctx.drawImage(img, 0, 0, drawW, drawH)
      drawZones(ctx, zones, drawW, drawH)
      drawDetections(ctx, detections, drawW, drawH)
      drawHUD(ctx, drawW, drawH)
    }
    img.src = `data:image/jpeg;base64,${frame}`
  }, [frame, detections, zones, fps, timestamp])

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black flex items-center justify-center">
      {!frame && (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-16 h-16 border border-muted-foreground/20 rounded-sm flex items-center justify-center">
            <svg className="w-8 h-8 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <span className="font-mono text-sm">No camera feed</span>
          <span className="font-mono text-[13px] text-muted-foreground/50">Rules, zones, and alerts still functional</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={!frame ? "hidden" : ""}
      />
    </div>
  )
}
