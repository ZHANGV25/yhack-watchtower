"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, CheckCircle, User, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FaceSetupProps {
  cameraId: string
}

export function FaceSetup({ cameraId }: FaceSetupProps) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle")
  const [hasReference, setHasReference] = useState(false)
  const [encodingCount, setEncodingCount] = useState(0)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkStatus()
  }, [cameraId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function checkStatus() {
    try {
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/cameras/${cameraId}/face/status`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("wt_token")}`,
          },
        }
      )
      if (resp.ok) {
        const data = await resp.json()
        setHasReference(data.has_reference)
        setEncodingCount(data.encoding_count)
        if (data.has_reference) setStatus("done")
      }
    } catch {
      // ignore
    }
  }

  async function handleUpload(file: File) {
    setStatus("uploading")
    setError("")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/cameras/${cameraId}/face/register`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("wt_token")}`,
          },
          body: formData,
        }
      )

      if (!resp.ok) {
        const body = await resp.json()
        throw new Error(body.detail || "Upload failed")
      }

      const data = await resp.json()
      setHasReference(true)
      setEncodingCount(data.total_references)
      setStatus("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setStatus("error")
    }
  }

  async function handleClear() {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/cameras/${cameraId}/face/reference`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("wt_token")}`,
          },
        }
      )
      setHasReference(false)
      setEncodingCount(0)
      setStatus("idle")
    } catch {
      // ignore
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <User className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold text-foreground">Resident Identification</h3>
      </div>

      {!hasReference ? (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a clear photo of the resident so the system can distinguish them from visitors.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
            }}
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={status === "uploading"}
              className="rounded-xl gap-2"
            >
              {status === "uploading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {status === "uploading" ? "Analyzing..." : "Upload Photo"}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 text-chart-2 mb-2">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Face registered</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {encodingCount} reference photo{encodingCount !== 1 ? "s" : ""} stored.
            The system will identify the resident and label visitors separately.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              className="rounded-xl gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              Add Another Photo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="rounded-xl gap-1.5 text-muted-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
            }}
          />
        </div>
      )}
    </div>
  )
}
