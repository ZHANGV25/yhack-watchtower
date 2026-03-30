"use client"

import { Brain, AlertTriangle, TrendingUp } from "lucide-react"
import type { Insight } from "@/lib/types"
import { SEVERITY_COLORS } from "@/lib/types"
import { renderInlineMarkdown } from "@/lib/utils"

interface InsightsPanelProps {
  insight: Insight | null
  enabled: boolean
}

export function InsightsPanel({ insight, enabled }: InsightsPanelProps) {
  if (!enabled) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-[13px] text-muted-foreground">
        <Brain className="h-3.5 w-3.5 shrink-0 opacity-40" />
        <span className="font-mono opacity-60">Reasoning disabled</span>
      </div>
    )
  }

  if (!insight) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-[13px] text-muted-foreground">
        <Brain className="h-3.5 w-3.5 shrink-0 text-cyan-400 animate-pulse" />
        <span className="font-mono">Analyzing scene...</span>
      </div>
    )
  }

  return (
    <div className="px-4 py-2 space-y-1.5">
      {/* Observation */}
      <div className="flex items-start gap-2">
        <Brain className="h-3.5 w-3.5 mt-0.5 shrink-0 text-cyan-400" />
        <p className="text-sm leading-snug">{renderInlineMarkdown(insight.observation)}</p>
      </div>

      {/* Concerns */}
      {insight.concerns.length > 0 && (
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400" />
          <div className="space-y-0.5">
            {insight.concerns.map((concern, i) => (
              <p key={i} className="text-xs text-amber-400/80 leading-snug">{concern}</p>
            ))}
          </div>
        </div>
      )}

      {/* Prediction */}
      {insight.prediction && (
        <div className="flex items-start gap-2">
          <TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground leading-snug">{insight.prediction}</p>
        </div>
      )}

      {/* Suggested alerts */}
      {insight.suggested_alerts.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {insight.suggested_alerts.map((sa, i) => (
            <span
              key={i}
              className="text-[10px] font-mono px-1.5 py-0.5 border"
              style={{
                color: SEVERITY_COLORS[sa.severity] || SEVERITY_COLORS.medium,
                borderColor: (SEVERITY_COLORS[sa.severity] || SEVERITY_COLORS.medium) + "40",
              }}
            >
              {sa.reason}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
