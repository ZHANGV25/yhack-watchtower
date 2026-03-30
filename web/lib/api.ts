/**
 * REST API client for WatchTower Lambda backend.
 * All CRUD operations go through here.
 */
import { getToken } from "./auth"
import type { Alert, Camera, Rule, Zone, ActivityEntry, StatusSummary, DailyReport, WeeklyReport } from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const resp = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`API ${resp.status}: ${body}`)
  }
  if (resp.status === 204) return undefined as T
  return resp.json()
}

async function apiFetchRaw(path: string, options?: RequestInit): Promise<Response> {
  const token = getToken()
  const resp = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`API ${resp.status}: ${body}`)
  }
  return resp
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function apiLogin(username: string, password: string) {
  return apiFetch<{ token: string; user_id: string; username: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
}

export async function apiRegister(username: string, password: string) {
  return apiFetch<{ token: string; user_id: string; username: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
}

// ---------------------------------------------------------------------------
// Cameras
// ---------------------------------------------------------------------------

export async function fetchCameras() {
  return apiFetch<{ cameras: Camera[] }>("/api/cameras")
}

export async function createCamera(name: string, location: string = "") {
  return apiFetch<Camera>("/api/cameras", {
    method: "POST",
    body: JSON.stringify({ name, location }),
  })
}

export async function deleteCamera(cameraId: string) {
  return apiFetch(`/api/cameras/${cameraId}`, { method: "DELETE" })
}

export async function fetchCameraHealth(cameraId: string) {
  return apiFetch<{
    camera_id: string
    health: "healthy" | "stale" | "offline" | "never_connected"
    last_seen: number
    seconds_ago: number | null
    webrtc_url: string
    status: string
  }>(`/api/cameras/${cameraId}/health`)
}

export async function generatePairingCode(cameraId: string) {
  return apiFetch<{ code: string; expires_in: number }>(`/api/cameras/${cameraId}/pair`, { method: "POST" })
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

export async function fetchZones(cameraId: string) {
  return apiFetch<{ zones: Zone[] }>(`/api/cameras/${cameraId}/zones`)
}

export async function createZone(cameraId: string, zone: Omit<Zone, "id" | "camera_id">) {
  return apiFetch<Zone>(`/api/cameras/${cameraId}/zones`, {
    method: "POST",
    body: JSON.stringify(zone),
  })
}

export async function deleteZone(cameraId: string, zoneId: string) {
  return apiFetch(`/api/cameras/${cameraId}/zones/${zoneId}`, { method: "DELETE" })
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export async function fetchRules(cameraId: string) {
  return apiFetch<{ rules: Rule[] }>(`/api/cameras/${cameraId}/rules`)
}

export async function deleteRule(cameraId: string, ruleId: string) {
  return apiFetch(`/api/cameras/${cameraId}/rules/${ruleId}`, { method: "DELETE" })
}

export async function toggleRule(cameraId: string, ruleId: string) {
  return apiFetch(`/api/cameras/${cameraId}/rules/${ruleId}/toggle`, { method: "PATCH" })
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export async function fetchAlerts(cameraId: string, limit: number = 50, offset: number = 0) {
  return apiFetch<{ alerts: Alert[]; total: number }>(`/api/cameras/${cameraId}/alerts?limit=${limit}&offset=${offset}`)
}

export async function clearAlerts(cameraId: string) {
  return apiFetch(`/api/cameras/${cameraId}/alerts`, { method: "DELETE" })
}

export async function dismissAlert(alertId: string) {
  return apiFetch(`/api/alerts/${alertId}`, { method: "DELETE" })
}

export async function fetchAlertClip(alertId: string) {
  return apiFetch<{ clip_url: string; s3_key: string }>(`/api/alerts/${alertId}/clip`)
}

// ---------------------------------------------------------------------------
// Elder Care: Activity
// ---------------------------------------------------------------------------

export async function fetchActivity(cameraId: string, date?: string, limit?: number) {
  const params = new URLSearchParams()
  if (date) params.set("date", date)
  if (limit) params.set("limit", limit.toString())
  params.set("tz_offset", new Date().getTimezoneOffset().toString())
  const qs = params.toString()
  return apiFetch<{ entries: ActivityEntry[] }>(`/api/cameras/${cameraId}/activity${qs ? `?${qs}` : ""}`)
}

export async function clearActivity(cameraId: string) {
  return apiFetch(`/api/cameras/${cameraId}/activity`, { method: "DELETE" })
}

// ---------------------------------------------------------------------------
// Elder Care: Status
// ---------------------------------------------------------------------------

export async function fetchStatus(cameraId: string) {
  return apiFetch<StatusSummary>(`/api/cameras/${cameraId}/status`)
}

// ---------------------------------------------------------------------------
// Elder Care: Concerns
// ---------------------------------------------------------------------------

export async function addConcern(cameraId: string, text: string) {
  // Add concern to all cameras so it monitors in every room
  const allIds = await _getAllCameraIds()
  const results = await Promise.allSettled(
    allIds.map(id => apiFetch<Rule>(`/api/cameras/${id}/concerns`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }))
  )
  const first = results.find(r => r.status === "fulfilled") as PromiseFulfilledResult<Rule> | undefined
  return first?.value ?? ({} as Rule)
}

// ---------------------------------------------------------------------------
// Elder Care: Reports
// ---------------------------------------------------------------------------

export async function fetchDailyReport(cameraId: string, date?: string) {
  const params = new URLSearchParams()
  if (date) params.set("date", date)
  const qs = params.toString()
  return apiFetch<DailyReport>(`/api/cameras/${cameraId}/reports/daily${qs ? `?${qs}` : ""}`)
}

export async function fetchWeeklyReport(cameraId: string, startDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.set("start_date", startDate)
  const qs = params.toString()
  return apiFetch<WeeklyReport>(`/api/cameras/${cameraId}/reports/weekly${qs ? `?${qs}` : ""}`)
}

export async function exportReport(cameraId: string, date?: string, format: string = "json") {
  const params = new URLSearchParams()
  if (date) params.set("date", date)
  params.set("format", format)
  const qs = params.toString()
  const resp = await apiFetchRaw(`/api/cameras/${cameraId}/reports/export?${qs}`)
  if (format === "json") {
    return resp.json()
  }
  return resp.blob()
}

// ---------------------------------------------------------------------------
// Elder Care: Medications (shared across all cameras — one resident)
// ---------------------------------------------------------------------------

// Helper: get all camera IDs for fan-out operations
async function _getAllCameraIds(): Promise<string[]> {
  const { cameras } = await fetchCameras()
  return cameras.map(c => c.id)
}

export async function fetchMedications(cameraId: string) {
  return apiFetch<{ medications: Rule[] }>(`/api/cameras/${cameraId}/medications`)
}

export async function addMedication(cameraId: string, name: string, time: string, notes?: string) {
  // Add to all cameras so medication shows regardless of which room you view
  const allIds = await _getAllCameraIds()
  const results = await Promise.allSettled(
    allIds.map(id => apiFetch<Rule>(`/api/cameras/${id}/medications`, {
      method: "POST",
      body: JSON.stringify({ name, time, notes: notes || "" }),
    }))
  )
  const first = results.find(r => r.status === "fulfilled") as PromiseFulfilledResult<Rule> | undefined
  return first?.value ?? ({} as Rule)
}

export async function deleteMedication(cameraId: string, ruleId: string) {
  // Get the medication name, then delete matching meds from all cameras
  const { medications } = await fetchMedications(cameraId)
  const med = medications.find(m => m.id === ruleId)
  const medName = med?.name || ""

  const allIds = await _getAllCameraIds()
  await Promise.allSettled(
    allIds.map(async (id) => {
      const resp = await fetchMedications(id)
      const matches = resp.medications.filter(m => m.name === medName)
      return Promise.allSettled(
        matches.map(m => apiFetch<void>(`/api/cameras/${id}/medications/${m.id}`, { method: "DELETE" }))
      )
    })
  )
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

export async function seedDemoData() {
  return apiFetch<{ cameras: string[] }>("/api/seed", { method: "POST" })
}

// ---------------------------------------------------------------------------
// Elder Care: Investigation (REST-based)
// ---------------------------------------------------------------------------

export async function askAboutRoom(cameraId: string, question: string) {
  return apiFetch<{ answer: string; relevant_frames: Array<{ frame: string; timestamp: number }> }>(
    `/api/cameras/${cameraId}/investigate`,
    {
      method: "POST",
      body: JSON.stringify({ question, tz_offset: new Date().getTimezoneOffset(), time_range_minutes: 1440 }),
    }
  )
}
