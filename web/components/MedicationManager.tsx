"use client"

import { useState, useEffect, useCallback } from "react"
import { Pill, Plus, Trash2, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchMedications, addMedication, deleteMedication } from "@/lib/api"
import type { Rule } from "@/lib/types"

interface MedicationManagerProps {
  cameraId: string
}

export function MedicationManager({ cameraId }: MedicationManagerProps) {
  const [medications, setMedications] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState("")
  const [time, setTime] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      const resp = await fetchMedications(cameraId)
      setMedications(resp.medications)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [cameraId])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!name.trim() || !time.trim() || submitting) return
    setSubmitting(true)
    try {
      await addMedication(cameraId, name.trim(), time.trim(), notes.trim() || undefined)
      setName("")
      setTime("")
      setNotes("")
      setShowAdd(false)
      load()
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (ruleId: string) => {
    try {
      await deleteMedication(cameraId, ruleId)
      setMedications(prev => prev.filter(m => m.id !== ruleId))
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Pill className="h-4 w-4 text-rose-500" />
          Medication Reminders
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          className="gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Medication name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Blood pressure pill"
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Scheduled time</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g., Take with food"
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!name.trim() || !time.trim() || submitting}
              className="rounded-xl"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* Medication list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : medications.length === 0 && !showAdd ? (
        <div className="text-center py-6">
          <Pill className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No medications set up</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Add medication reminders to track compliance
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {medications.map(med => (
            <div
              key={med.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 group"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30">
                <Pill className="h-4 w-4 text-rose-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{med.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{(med as any).time || (med as any).notes || med.natural_language || ""}</span>
                </div>
              </div>
              <button
                className="shrink-0 p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => handleDelete(med.id)}
                title="Remove medication"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
