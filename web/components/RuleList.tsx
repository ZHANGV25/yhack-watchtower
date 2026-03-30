"use client"

import { Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import type { Rule } from "@/lib/types"
import { SEVERITY_COLORS } from "@/lib/types"

interface RuleListProps {
  rules: Rule[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

export function RuleList({ rules, onToggle, onDelete, onClearAll }: RuleListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          Rules
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground font-mono">
            {rules.filter((r) => r.enabled).length}/{rules.length} active
          </span>
          {rules.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-destructive"
              onClick={onClearAll}
              title="Clear all rules"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-2 space-y-1">
          {rules.length === 0 && (
            <div className="text-[13px] text-muted-foreground px-2 py-4 text-center">
              No rules defined. Type a rule below to get started.
            </div>
          )}
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-start gap-2 px-2 py-2 rounded-sm hover:bg-muted/50 group"
            >
              <Switch
                checked={rule.enabled}
                onCheckedChange={() => onToggle(rule.id)}
                className="mt-0.5 scale-75"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium leading-tight ${!rule.enabled ? "text-muted-foreground" : ""}`}>
                    {rule.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[11px] px-1.5 py-0 h-4 shrink-0 border"
                    style={{
                      color: SEVERITY_COLORS[rule.severity],
                      borderColor: SEVERITY_COLORS[rule.severity] + "50",
                    }}
                  >
                    {rule.severity}
                  </Badge>
                </div>
                <p className="text-[13px] text-muted-foreground font-mono mt-1 leading-snug">
                  {rule.natural_language}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {rule.conditions.map((c, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-mono px-1 py-0.5 bg-cyan-400/10 text-cyan-400/80 border border-cyan-400/20 rounded-sm"
                    >
                      {c.type}
                    </span>
                  ))}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0"
                onClick={() => onDelete(rule.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
