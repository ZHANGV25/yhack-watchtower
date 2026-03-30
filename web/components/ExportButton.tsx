"use client"

import { useState } from "react"
import { Download, Copy, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { exportReport } from "@/lib/api"

interface ExportButtonProps {
  cameraId: string
  date?: string
}

export function ExportButton({ cameraId, date }: ExportButtonProps) {
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const data = await exportReport(cameraId, date, "json")
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `watchtower-report-${date || "today"}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    } finally {
      setDownloading(false)
    }
  }

  const handleCopy = async () => {
    try {
      const data = await exportReport(cameraId, date, "json")
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="gap-1.5 rounded-xl"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy Report"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={downloading}
        className="gap-1.5 rounded-xl"
      >
        {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Export
      </Button>
    </div>
  )
}
