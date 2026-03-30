"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { apiLogin } from "@/lib/api"
import { setToken, setUser } from "@/lib/auth"
import { Eye, EyeOff, Shield, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const [username, setUsername] = useState("demo@example.com")
  const [password, setPassword] = useState("change-me")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await apiLogin(username, password)
      setToken(result.token)
      setUser({ user_id: result.user_id, username: result.username })
      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 border-2 border-border bg-primary/10 mb-4">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-foreground">WatchTower</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Keeping an eye on the ones you love
          </p>
        </div>

        {/* Login card */}
        <div className="border-2 border-border bg-card p-6" style={{ boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.2), inset -1px -1px 0 rgba(0,0,0,0.1), 2px 2px 0 rgba(0,0,0,0.15)' }}>
          <h2 className="text-base font-semibold text-foreground mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring cursor-text"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring cursor-text"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="rounded-none bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-none h-10"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground/60 text-center mt-6">
          WatchTower Elder Care
        </p>
      </div>
    </div>
  )
}
