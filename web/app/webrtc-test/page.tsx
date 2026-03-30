"use client"

import { WebRTCPlayer } from "@/components/WebRTCPlayer"
import { useState } from "react"

export default function WebRTCTest() {
  const [url, setUrl] = useState("http://localhost:8080/offer")
  const [active, setActive] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 bg-background text-foreground">
      <h1 className="text-xl font-semibold">WebRTC Test</h1>
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="px-3 py-2 border border-border bg-background text-sm font-mono w-80"
          placeholder="Signaling URL"
        />
        <button
          onClick={() => setActive(!active)}
          className="px-4 py-2 bg-cyan-400 text-black text-sm font-medium"
        >
          {active ? "Stop" : "Connect"}
        </button>
      </div>
      {active && (
        <div className="w-[640px] h-[480px] border border-border">
          <WebRTCPlayer signalingUrl={url} className="w-full h-full" />
        </div>
      )}
    </div>
  )
}
