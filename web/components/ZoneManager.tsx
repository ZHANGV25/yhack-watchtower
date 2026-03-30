"use client"

import { ScanSearch, Trash2, Pencil, Plus, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Zone } from "@/lib/types"

interface ZoneManagerProps {
  zones: Zone[]
  onUpdateZones: (zones: Zone[]) => void
  onAutoGenerate: () => void
}

const ZONE_COLORS = [
  "#22d3ee", "#a78bfa", "#34d399", "#fb923c",
  "#f472b6", "#facc15", "#60a5fa", "#e879f9",
]

export function ZoneManager({ zones, onUpdateZones, onAutoGenerate }: ZoneManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")

  const handleDelete = (id: string) => {
    onUpdateZones(zones.filter((z) => z.id !== id))
  }

  const handleStartEdit = (zone: Zone) => {
    setEditingId(zone.id)
    setEditName(zone.name)
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    onUpdateZones(
      zones.map((z) =>
        z.id === editingId ? { ...z, name: editName } : z
      )
    )
    setEditingId(null)
    setEditName("")
  }

  const handleAddZone = () => {
    const name = newName.trim()
    if (!name) return
    const color = ZONE_COLORS[zones.length % ZONE_COLORS.length]
    // Default to center of frame, 20% size
    const newZone: Zone = {
      id: Math.random().toString(36).slice(2, 10),
      name,
      x: 30 + Math.random() * 20,
      y: 30 + Math.random() * 20,
      width: 20,
      height: 20,
      color,
    }
    onUpdateZones([...zones, newZone])
    setNewName("")
    setAdding(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          Zones
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setAdding(!adding)}
            title="Add zone manually"
          >
            {adding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAutoGenerate}
            className="h-7 text-[13px] gap-1.5"
          >
            <ScanSearch className="h-3.5 w-3.5" />
            Auto-detect
          </Button>
        </div>
      </div>

      {/* Manual add zone input */}
      {adding && (
        <div className="flex gap-1.5 px-3 py-2 border-b border-border">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddZone()
              if (e.key === "Escape") setAdding(false)
            }}
            placeholder="Zone name..."
            className="h-7 text-[13px] px-2"
            autoFocus
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[13px] shrink-0"
            onClick={handleAddZone}
            disabled={!newName.trim()}
          >
            Add
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {zones.length === 0 && (
            <div className="text-[13px] text-muted-foreground px-2 py-4 text-center">
              No zones defined. Click Auto-detect or + to add manually.
            </div>
          )}
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted/50 group"
            >
              <div
                className="w-3 h-3 rounded-sm shrink-0 border"
                style={{
                  backgroundColor: zone.color + "30",
                  borderColor: zone.color,
                }}
              />

              {editingId === zone.id ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit()
                    if (e.key === "Escape") setEditingId(null)
                  }}
                  onBlur={handleSaveEdit}
                  className="h-6 text-[13px] px-1"
                  autoFocus
                />
              ) : (
                <span className="text-[13px] font-mono truncate flex-1">
                  {zone.name}
                </span>
              )}

              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleStartEdit(zone)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive"
                  onClick={() => handleDelete(zone.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
