"use client"

import { SendHorizontal, CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { Rule } from "@/lib/types"

interface RuleChatProps {
  onSubmit: (text: string) => void
  lastAddedRule: Rule | null
}

type FeedbackState =
  | { status: "idle" }
  | { status: "processing"; text: string }
  | { status: "success"; rule: Rule }
  | { status: "error"; text: string }

export function RuleChat({ onSubmit, lastAddedRule }: RuleChatProps) {
  const [text, setText] = useState("")
  const [feedback, setFeedback] = useState<FeedbackState>({ status: "idle" })
  const pendingRef = useRef<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const autoResize = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }, [])

  useEffect(() => {
    if (
      lastAddedRule &&
      feedback.status === "processing" &&
      pendingRef.current
    ) {
      pendingRef.current = null
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setFeedback({ status: "success", rule: lastAddedRule })
      timeoutRef.current = setTimeout(() => setFeedback({ status: "idle" }), 4000)
    }
  }, [lastAddedRule, feedback.status])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || feedback.status === "processing") return

    pendingRef.current = trimmed
    setFeedback({ status: "processing", text: trimmed })
    onSubmit(trimmed)
    setText("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (pendingRef.current) {
        pendingRef.current = null
        setFeedback({ status: "error", text: "Request timed out. Try again." })
        setTimeout(() => setFeedback({ status: "idle" }), 3000)
      }
    }, 30000)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <div className="flex flex-col gap-2 p-3 border-t border-border">
      <span className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
        Add Rule or Describe Scenario
      </span>

      {feedback.status === "processing" && (
        <div className="flex items-center gap-2 px-2.5 py-2 bg-muted/50 border border-border rounded-sm">
          <Loader2 className="h-3.5 w-3.5 shrink-0 text-cyan-400 animate-spin" />
          <div className="min-w-0">
            <p className="text-[13px] text-cyan-400 font-medium">Processing</p>
            <p className="text-[13px] text-muted-foreground font-mono truncate">
              {feedback.text}
            </p>
          </div>
        </div>
      )}

      {feedback.status === "success" && (
        <div className="flex items-start gap-2 px-2.5 py-2 bg-muted/50 border border-border rounded-sm">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-foreground truncate">
              {feedback.rule.name}
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              {feedback.rule.conditions.map((c, i) => (
                <span
                  key={i}
                  className="text-[11px] font-mono px-1.5 py-0.5 bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 rounded-sm"
                >
                  {c.type}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {feedback.status === "error" && (
        <div className="flex items-center gap-2 px-2.5 py-2 bg-muted/50 border border-destructive/30 rounded-sm">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
          <p className="text-[13px] text-destructive">{feedback.text}</p>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            autoResize()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          placeholder='e.g. "alert if person enters"'
          rows={2}
          className="flex-1 min-h-[36px] max-h-[120px] resize-none rounded-sm border border-border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
          disabled={feedback.status === "processing"}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleSubmit}
          disabled={!text.trim() || feedback.status === "processing"}
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
