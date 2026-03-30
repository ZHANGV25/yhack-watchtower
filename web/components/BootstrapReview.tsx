"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, Sparkles, MapPin, Shield } from "lucide-react"
import type { SceneAnalysisPayload } from "@/lib/types"
import { SEVERITY_COLORS } from "@/lib/types"

interface BootstrapReviewProps {
  analysis: SceneAnalysisPayload
  onApprove: (
    zones: SceneAnalysisPayload["zones"],
    rules: SceneAnalysisPayload["suggested_rules"],
  ) => void
  onDismiss: () => void
}

export function BootstrapReview({ analysis, onApprove, onDismiss }: BootstrapReviewProps) {
  const [selectedZones, setSelectedZones] = useState<Set<number>>(
    new Set(analysis.zones.map((_, i) => i))
  )
  const [selectedRules, setSelectedRules] = useState<Set<number>>(
    new Set(analysis.suggested_rules.map((_, i) => i))
  )

  const toggleZone = (index: number) => {
    setSelectedZones((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const toggleRule = (index: number) => {
    setSelectedRules((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleApprove = () => {
    const zones = analysis.zones.filter((_, i) => selectedZones.has(i))
    const rules = analysis.suggested_rules.filter((_, i) => selectedRules.has(i))
    onApprove(zones, rules)
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-[520px] max-h-[80vh] border border-border bg-card flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-semibold tracking-tight">SCENE ANALYSIS</span>
          <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={onDismiss}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Description */}
        <div className="px-4 py-3 border-b border-border">
          <Badge variant="outline" className="text-xs mb-2">{analysis.scene_type}</Badge>
          <p className="text-sm text-muted-foreground">{analysis.scene_description}</p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Zones */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Zones ({selectedZones.size}/{analysis.zones.length})
                </span>
              </div>
              <div className="space-y-1">
                {analysis.zones.map((zone, i) => (
                  <button
                    key={i}
                    onClick={() => toggleZone(i)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm border transition-colors ${
                      selectedZones.has(i)
                        ? "border-cyan-400/30 bg-cyan-400/5"
                        : "border-border bg-transparent opacity-50"
                    }`}
                  >
                    <div className={`w-3 h-3 border flex items-center justify-center ${
                      selectedZones.has(i) ? "border-cyan-400 bg-cyan-400" : "border-muted-foreground"
                    }`}>
                      {selectedZones.has(i) && <Check className="h-2 w-2 text-background" />}
                    </div>
                    <span className="font-mono text-[13px]">{zone.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Shield className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Rules ({selectedRules.size}/{analysis.suggested_rules.length})
                </span>
              </div>
              <div className="space-y-1">
                {analysis.suggested_rules.map((rule, i) => (
                  <button
                    key={i}
                    onClick={() => toggleRule(i)}
                    className={`w-full flex items-start gap-2 px-2.5 py-2 text-left border transition-colors ${
                      selectedRules.has(i)
                        ? "border-cyan-400/30 bg-cyan-400/5"
                        : "border-border bg-transparent opacity-50"
                    }`}
                  >
                    <div className={`w-3 h-3 mt-0.5 border flex items-center justify-center shrink-0 ${
                      selectedRules.has(i) ? "border-cyan-400 bg-cyan-400" : "border-muted-foreground"
                    }`}>
                      {selectedRules.has(i) && <Check className="h-2 w-2 text-background" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{rule.name}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 h-3.5 shrink-0"
                          style={{
                            color: SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.medium,
                            borderColor: (SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.medium) + "50",
                          }}
                        >
                          {rule.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {rule.natural_language}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer — pinned at bottom */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between shrink-0 bg-card">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Skip
          </Button>
          <Button size="sm" onClick={handleApprove} disabled={selectedZones.size === 0}>
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Apply {selectedZones.size} zones, {selectedRules.size} rules
          </Button>
        </div>
      </div>
    </div>
  )
}
