"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      confirmRef.current?.focus()
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Dialog */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative border-2 border-border bg-card p-6 max-w-sm w-full mx-4"
        style={{
          boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.2), inset -1px -1px 0 rgba(0,0,0,0.1), 3px 3px 0 rgba(0,0,0,0.25)",
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          {destructive && (
            <div className="flex items-center justify-center w-8 h-8 border-2 border-destructive/30 bg-destructive/10 shrink-0">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={destructive ? "destructive" : "default"}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
