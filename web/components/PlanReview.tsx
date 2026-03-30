"use client"

import { Zap, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { MonitoringPlan } from "@/lib/types"

interface PlanReviewProps {
  plan: MonitoringPlan
  onApply: () => void
  onDismiss: () => void
}

export function PlanReview({ plan, onApply, onDismiss }: PlanReviewProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content: header + zones + rules */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-400 shrink-0" />
            <span className="text-[13px] font-semibold uppercase tracking-wider text-cyan-400">
              {plan.name}
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground mt-1">
            {plan.description}
          </p>
          <p className="text-[11px] text-muted-foreground/60 font-mono mt-1">
            {plan.scenario}
          </p>
        </div>

        {plan.zones.length > 0 && (
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-1.5 mb-1.5">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Detected Zones
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {plan.zones.map((zone) => (
                <span
                  key={zone.id}
                  className="text-[11px] font-mono px-1.5 py-0.5 border rounded-sm"
                  style={{
                    color: zone.color,
                    borderColor: zone.color + "40",
                    backgroundColor: zone.color + "10",
                  }}
                >
                  {zone.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="p-2 space-y-1.5">
          {plan.rules.map((rule, i) => (
            <div
              key={rule.id}
              className="px-2.5 py-2 border border-border rounded-sm bg-muted/20"
            >
              <div className="flex items-start gap-2">
                <span className="text-[11px] font-mono text-muted-foreground/50 mt-0.5 shrink-0">
                  {i + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-tight">
                    {rule.name}
                  </p>
                  {rule.natural_language && (
                    <p className="text-[11px] text-muted-foreground font-mono mt-1 leading-snug">
                      {rule.natural_language}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {rule.conditions.map((c, j) => (
                      <span
                        key={j}
                        className="text-[10px] font-mono px-1 py-0.5 bg-cyan-400/10 text-cyan-400/80 border border-cyan-400/20 rounded-sm"
                      >
                        {c.type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="p-3 border-t border-border space-y-2">
        <Button
          className="w-full h-9 text-[13px] font-medium bg-cyan-400 text-slate-950 hover:bg-cyan-300"
          onClick={onApply}
        >
          Apply All ({plan.rules.length} rules{plan.zones.length > 0 ? ` + ${plan.zones.length} zones` : ""})
        </Button>
        <button
          className="w-full text-[13px] text-muted-foreground hover:text-foreground py-1 transition-colors"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
