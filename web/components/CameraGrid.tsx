"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Loader2,
  Home,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Bell,
  LogOut,
  X,
  Link2,
  Copy,
  Check,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import type { Camera, StatusSummary } from "@/lib/types"
import { fetchCameras, createCamera, deleteCamera, fetchStatus, generatePairingCode } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { timeAgo } from "@/lib/utils"

function CameraHealthDot({ camera }: { camera: Camera }) {
  const now = Date.now() / 1000
  const lastSeen = camera.last_seen || 0
  const secondsAgo = lastSeen > 0 ? now - lastSeen : null

  let color = "bg-muted-foreground/40" // never connected / offline
  let title = "Camera never connected"
  if (secondsAgo !== null) {
    if (secondsAgo < 120) {
      color = "bg-chart-2"
      title = "Camera online"
    } else if (secondsAgo < 600) {
      color = "bg-amber-500"
      title = "Camera stale"
    } else {
      color = "bg-muted-foreground/40"
      title = "Camera offline"
    }
  }

  return (
    <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${color}`} title={title} />
  )
}

function StatusDot({ level }: { level: StatusSummary["status_level"] | undefined }) {
  if (!level || level === "good") {
    return <CheckCircle className="h-5 w-5 text-chart-2 shrink-0" />
  }
  if (level === "warning") {
    return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
  }
  return <AlertOctagon className="h-5 w-5 text-destructive shrink-0" />
}

function getCardStyle(level: StatusSummary["status_level"] | undefined) {
  if (level === "critical") {
    return "border-l-4 border-l-destructive bg-destructive/5"
  }
  if (level === "alert") {
    return "border-l-4 border-l-destructive/70 bg-destructive/[0.03]"
  }
  if (level === "warning") {
    return "border-l-4 border-l-amber-400 dark:border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10"
  }
  return ""
}

interface RoomStatus {
  camera: Camera
  status: StatusSummary | null
}

export function CameraGrid() {
  const [rooms, setRooms] = useState<RoomStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newLocation, setNewLocation] = useState("")
  const [creating, setCreating] = useState(false)
  const [pairingCamera, setPairingCamera] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [pairingLoading, setPairingLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const router = useRouter()

  const load = useCallback(async () => {
    try {
      const { cameras } = await fetchCameras()
      // Fetch status for each camera in parallel
      const statuses = await Promise.allSettled(
        cameras.map(cam => fetchStatus(cam.id))
      )
      const roomData: RoomStatus[] = cameras.map((cam, i) => ({
        camera: cam,
        status: statuses[i].status === "fulfilled" ? (statuses[i] as PromiseFulfilledResult<StatusSummary>).value : null,
      }))
      setRooms(roomData)
    } catch (err) {
      console.error("Failed to load rooms:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Poll every 15 seconds
  useEffect(() => {
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  const handleAdd = async () => {
    if (!newName.trim() || creating) return
    setCreating(true)
    try {
      await createCamera(newName.trim(), newLocation.trim())
      setNewName("")
      setNewLocation("")
      setAdding(false)
      load()
    } catch (err) {
      console.error("Failed to add room:", err)
    } finally {
      setCreating(false)
    }
  }

  const handlePairCamera = async (e: React.MouseEvent, cameraId: string) => {
    e.stopPropagation()
    setPairingCamera(cameraId)
    setPairingCode(null)
    setPairingLoading(true)
    setCopied(false)
    try {
      const resp = await generatePairingCode(cameraId)
      setPairingCode(resp.code)
    } catch (err) {
      console.error("Failed to generate pairing code:", err)
    } finally {
      setPairingLoading(false)
    }
  }

  const handleCopyCommand = () => {
    if (!pairingCode) return
    navigator.clipboard.writeText(`python camera_client.py --pair ${pairingCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = () => {
    clearToken()
    router.push("/login")
  }

  // Compute overall status message
  const hasAlerts = rooms.some(r => r.status && (r.status.status_level === "alert" || r.status.status_level === "critical"))
  const hasWarnings = rooms.some(r => r.status?.status_level === "warning")

  const overallMessage = hasAlerts
    ? "Something needs your attention"
    : hasWarnings
    ? "There are a few things to note"
    : rooms.length === 0
    ? "Welcome to WatchTower"
    : "All is well"

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading rooms...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-foreground tracking-tight">WatchTower</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdding(true)}
                className="gap-1.5 rounded-xl"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Room</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overall status */}
        <p className="text-2xl font-semibold text-foreground mb-6">
          {overallMessage}
        </p>

        {/* Add room dialog (inline) */}
        {adding && (
          <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Add a new room</h2>
              <Button variant="ghost" size="icon-sm" onClick={() => setAdding(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Room name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Mom's Living Room"
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Location (optional)</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g., Downstairs, 123 Main St"
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={!newName.trim() || creating} className="rounded-xl">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Room"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Pairing dialog */}
        {pairingCamera && (
          <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Pair Camera</h2>
              <Button variant="ghost" size="icon-sm" onClick={() => { setPairingCamera(null); setPairingCode(null) }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {pairingLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating code...
              </div>
            ) : pairingCode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <span className="text-4xl font-mono font-bold tracking-[0.3em] text-foreground">
                    {pairingCode}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  On the camera device, run:
                </p>
                <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
                  <code className="text-sm font-mono flex-1 text-foreground">
                    python camera_client.py --pair {pairingCode}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleCopyCommand}
                    title="Copy command"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-chart-2" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground/70 text-center">
                  This code expires in 10 minutes.
                </p>
              </div>
            ) : (
              <p className="text-sm text-destructive">Failed to generate pairing code. Try again.</p>
            )}
          </div>
        )}

        {/* Room grid */}
        {rooms.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No rooms set up yet</h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Add a room to start monitoring. Each room connects to a camera
              that watches over your loved one.
            </p>
            <Button onClick={() => setAdding(true)} className="rounded-xl gap-1.5">
              <Plus className="h-4 w-4" />
              Add Your First Room
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(({ camera, status }) => (
              <div
                key={camera.id}
                onClick={() => router.push(`/camera/${camera.id}`)}
                className={`rounded-xl border-2 border-border bg-card p-5 text-left cursor-pointer shadow-[inset_-1px_-1px_0_rgba(0,0,0,0.1),inset_1px_1px_0_rgba(255,255,255,0.3),2px_3px_0_rgba(0,0,0,0.15)] hover:shadow-[inset_-1px_-1px_0_rgba(0,0,0,0.1),inset_1px_1px_0_rgba(255,255,255,0.4),2px_3px_0_rgba(0,0,0,0.15)] hover:brightness-[1.02] active:translate-x-[1px] active:translate-y-[2px] active:!shadow-[inset_2px_2px_0_rgba(0,0,0,0.15)] ${getCardStyle(status?.status_level)}`}
                style={{ transition: 'transform 0.05s ease, box-shadow 0.05s ease' }}
              >
                {/* Camera preview thumbnail */}
                {(camera as any).latest_frame && (
                  <div className="mb-3 -mx-5 -mt-5 overflow-hidden rounded-t-xl">
                    <img
                      src={(camera as any).latest_frame}
                      alt={camera.name}
                      className="w-full h-32 object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Room header */}
                <div className="flex items-start gap-3 mb-3">
                  <StatusDot level={status?.status_level} />
                  <h3 className="text-xl font-semibold text-foreground leading-tight flex-1">
                    {camera.name}
                  </h3>
                </div>

                {/* Status text */}
                <p className="text-sm text-muted-foreground mb-4 min-h-[2.5rem] line-clamp-2">
                  {status?.status_text || (camera.status === "online" ? "Monitoring..." : "Camera offline")}
                </p>

                {/* Footer info */}
                <div className="flex items-center justify-between text-xs text-muted-foreground/70 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {camera.last_seen
                        ? `Last: ${timeAgo(camera.last_seen)}`
                        : "No activity"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bell className="h-3 w-3" />
                    <span>
                      {(status?.alert_count_today ?? camera.alert_count ?? 0)} alert{(status?.alert_count_today ?? camera.alert_count ?? 0) !== 1 ? "s" : ""} today
                    </span>
                  </div>
                </div>

                {/* Actions — consistent for all cards */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => { e.stopPropagation(); handlePairCamera(e, camera.id) }}
                    title="Pair / reconnect camera"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget({ id: camera.id, name: camera.name })
                    }}
                    title="Delete room"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Room"
        message={`Delete "${deleteTarget?.name}"? All alerts, rules, and activity data for this room will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            const id = deleteTarget.id
            // Optimistically remove from UI immediately
            setRooms(prev => prev.filter(r => r.camera.id !== id))
            setDeleteTarget(null)
            try {
              await deleteCamera(id)
            } catch {
              // If delete fails, reload to restore
              load()
            }
          }
        }}
      />
    </div>
  )
}
