"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, Shield, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { fetchRules, addConcern, deleteRule, toggleRule } from "@/lib/api"
import type { Rule } from "@/lib/types"
import { extractPersonName } from "@/lib/utils"

interface ConcernInputProps {
  cameraId: string
  roomName: string
}

const PRESET_CONCERNS = [
  "Hasn't eaten in a while",
  "Not drinking enough water",
  "Looks confused or disoriented",
  "Wandering at night",
  "Hasn't moved much today",
  "Seems unsteady on feet",
]

export function ConcernInput({ cameraId, roomName }: ConcernInputProps) {
  const [concerns, setConcerns] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const personName = extractPersonName(roomName)

  const load = useCallback(async () => {
    try {
      const resp = await fetchRules(cameraId)
      // Only show user-created concerns — filter presets and medications
      const PRESET_RULES = ["Fall Detection", "Inactivity Alert", "Night Wandering", "Visitor Detection", "Emergency - Prolonged Immobility", "Person Detected"]
      setConcerns(resp.rules.filter(r => !PRESET_RULES.includes(r.name) && !r.name.startsWith("MED:")))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [cameraId])

  useEffect(() => { load() }, [load])

  const handleAdd = async (text: string) => {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    try {
      await addConcern(cameraId, text.trim())
      setInput("")
      load()
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (ruleId: string) => {
    try {
      await deleteRule(cameraId, ruleId)
      setConcerns(prev => prev.filter(r => r.id !== ruleId))
    } catch {
      // ignore
    }
  }

  const handleToggle = async (ruleId: string) => {
    try {
      await toggleRule(cameraId, ruleId)
      setConcerns(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      {/* Active concerns */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Active Concerns
        </h3>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : concerns.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No concerns set up yet. Add one below.
          </p>
        ) : (
          <div className="space-y-2">
            {concerns.map(rule => (
              <div
                key={rule.id}
                className="flex items-center gap-3 border border-border/60 bg-card px-3 py-2.5 group"
              >
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={() => handleToggle(rule.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${rule.enabled ? "text-foreground" : "text-muted-foreground"}`}>
                    {rule.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {rule.natural_language}
                  </p>
                </div>
                <button
                  className="shrink-0 p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => handleDelete(rule.id)}
                  title="Remove concern"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add new concern */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Add a concern about {personName}
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`e.g., ${personName} forgets to take medication`}
            className="flex-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
            onKeyDown={e => e.key === "Enter" && handleAdd(input)}
            disabled={submitting}
          />
          <Button
            onClick={() => handleAdd(input)}
            disabled={!input.trim() || submitting}
            size="default"
            className="rounded-xl"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Preset suggestions */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Common concerns:</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_CONCERNS.map(preset => (
            <button
              key={preset}
              onClick={() => handleAdd(preset)}
              disabled={submitting}
              className="px-3 py-1.5 border border-border bg-card text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
