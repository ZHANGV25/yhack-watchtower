"use client"

import { useState, useEffect } from "react"
import { Video, Copy, Check, Terminal, Loader2, QrCode, ScanLine } from "lucide-react"
import { generatePairingCode } from "@/lib/api"
import QRCode from "react-qr-code"

const API_SERVER = "<your-api-host>"
const RELAY_URL = "ws://localhost:8081"

interface CameraSetupProps {
  cameraId: string
  roomName: string
  onConnect: (url: string) => void
}

export function CameraSetup({ cameraId, roomName, onConnect }: CameraSetupProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [pairingLoading, setPairingLoading] = useState(false)
  const [tab, setTab] = useState<"qr" | "command">("qr")

  // Auto-generate pairing code on mount
  useEffect(() => {
    let cancelled = false
    async function generate() {
      setPairingLoading(true)
      try {
        const resp = await generatePairingCode(cameraId)
        if (!cancelled) setPairingCode(resp.code)
      } catch {
        if (!cancelled) setTab("command")
      } finally {
        if (!cancelled) setPairingLoading(false)
      }
    }
    generate()
    return () => { cancelled = true }
  }, [cameraId])

  const qrData = pairingCode ? JSON.stringify({
    server: API_SERVER,
    relay: RELAY_URL,
    code: pairingCode,
  }) : ""

  const pairCommand = pairingCode
    ? `python3 camera_client.py --pair ${pairingCode} \\\n  --server ${API_SERVER} \\\n  --relay ${RELAY_URL}`
    : ""

  const fullSetup = `# Install (one-time)
sudo apt update && sudo apt install -y python3-pip python3-opencv git
git clone https://github.com/ZHANGV25/watchtower-camera.git
cd watchtower-camera
pip3 install -r requirements.txt
pip3 install aiortc aiohttp

# Set environment (get credentials from your team)
export AWS_ACCESS_KEY_ID=<your-key>
export AWS_SECRET_ACCESS_KEY=<your-secret>
export AWS_DEFAULT_REGION=us-east-1

# Scan QR code to pair
python3 camera_client.py --scan`

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 h-full">
      <Video className="h-10 w-10 text-muted-foreground/30 mb-3" />
      <p className="text-base font-semibold text-foreground mb-1">Connect a camera to {roomName}</p>
      <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
        Point the camera at this QR code, or copy the command below
      </p>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 rounded-lg border border-border p-0.5 bg-muted/30">
        <button
          onClick={() => setTab("qr")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === "qr" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <QrCode className="h-3.5 w-3.5" />
          QR Code
        </button>
        <button
          onClick={() => setTab("command")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === "command" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Terminal className="h-3.5 w-3.5" />
          Command
        </button>
      </div>

      <div className="w-full max-w-lg">
        {pairingLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating pairing code...
          </div>
        ) : !pairingCode ? (
          <p className="text-sm text-destructive text-center py-4">Failed to generate pairing code. Refresh to retry.</p>
        ) : tab === "qr" ? (
          /* QR Code tab */
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-xl">
              <QRCode value={qrData} size={180} level="M" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">
                On the camera device, run:
              </p>
              <div className="flex items-center gap-2 justify-center">
                <code className="text-sm font-mono font-semibold text-foreground bg-muted/50 px-2 py-1 rounded-lg border border-border">
                  python3 camera_client.py --scan
                </code>
                <button
                  onClick={() => handleCopy("python3 camera_client.py --scan", "scan")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {copied === "scan" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground/70">
                Hold the camera up to this screen to pair automatically
              </p>
            </div>
          </div>
        ) : (
          /* Command tab */
          <div className="space-y-4">
            {/* Pairing code display */}
            <div className="flex flex-col items-center gap-1 py-2">
              <p className="text-xs text-muted-foreground">Pairing code (expires in 10 min)</p>
              <span className="text-3xl font-mono font-bold tracking-[0.3em] text-foreground">
                {pairingCode}
              </span>
            </div>

            {/* Pair command */}
            <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Terminal className="h-3 w-3" />
                  Run on the camera device
                </div>
                <button
                  onClick={() => handleCopy(pairCommand.replace(/\\\n\s*/g, " "), "pair")}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {copied === "pair" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {copied === "pair" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="px-3 py-2.5 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all">
                {pairCommand}
              </pre>
            </div>

            {/* Full setup */}
            <details className="group">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                First time? Full setup instructions
              </summary>
              <div className="mt-2 rounded-xl border border-border bg-muted/30 overflow-hidden">
                <div className="flex items-center justify-end px-3 py-1.5 border-b border-border bg-muted/50">
                  <button
                    onClick={() => handleCopy(fullSetup, "full")}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {copied === "full" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    {copied === "full" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="px-3 py-2.5 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                  {fullSetup}
                </pre>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}
