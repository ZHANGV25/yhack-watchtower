"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { seedDemoData } from "@/lib/api"
import { Database, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

type Status = "idle" | "seeding" | "done" | "error"

export default function SeedPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
    }
  }, [router])

  const handleSeed = async () => {
    setStatus("seeding")
    setError("")

    try {
      await seedDemoData()
      setStatus("done")
      setTimeout(() => router.push("/"), 1500)
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "Failed to seed demo data")
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Database className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Seed Demo Data</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Populate your account with sample rooms, activity, and alerts
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {status === "idle" && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                This will replace all existing cameras and data with demo content:
                3 rooms, activity timeline, alerts, and medication rules.
              </p>
              <Button onClick={handleSeed} className="w-full rounded-xl h-10">
                Seed Demo Data
              </Button>
            </>
          )}

          {status === "seeding" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Seeding demo data...</p>
            </div>
          )}

          {status === "done" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <p className="text-sm text-foreground font-medium">Done! Redirecting...</p>
            </div>
          )}

          {status === "error" && (
            <>
              <div className="flex flex-col items-center gap-3 py-4">
                <XCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
              <Button onClick={handleSeed} variant="outline" className="w-full rounded-xl h-10 mt-2">
                Retry
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
