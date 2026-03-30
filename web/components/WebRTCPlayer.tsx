"use client"

import { useEffect, useRef, useState } from "react"
import { VideoOff, Loader2 } from "lucide-react"

// Default ICE servers (STUN only). TURN is fetched from the camera server.
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
]

interface WebRTCPlayerProps {
  signalingUrl: string // e.g. "http://192.168.1.100:8080/offer"
  className?: string
}

export function WebRTCPlayer({ signalingUrl, className = "" }: WebRTCPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const [status, setStatus] = useState<"connecting" | "connected" | "failed">("connecting")

  useEffect(() => {
    let cancelled = false

    async function connect() {
      setStatus("connecting")

      // Fetch ICE config. Use API proxy for HTTPS compatibility.
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      let iceServers: RTCIceServer[] = DEFAULT_ICE_SERVERS
      try {
        const res = await fetch(`${API_URL}/api/webrtc/ice-config`)
        if (res.ok) {
          const cfg = await res.json()
          if (cfg.iceServers?.length) {
            iceServers = cfg.iceServers
          }
        }
      } catch {
        console.warn("Could not fetch ICE config, using STUN only")
      }

      const pc = new RTCPeerConnection({ iceServers })
      pcRef.current = pc

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0]
          setStatus("connected")
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setStatus("connected")
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setStatus("failed")
        }
      }

      // We want to receive video, so add a transceiver
      pc.addTransceiver("video", { direction: "recvonly" })

      // Create offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Wait for ICE gathering to complete (or timeout)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") {
          resolve()
          return
        }
        const timeout = setTimeout(resolve, 2000)
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === "complete") {
            clearTimeout(timeout)
            resolve()
          }
        }
      })

      if (cancelled) {
        pc.close()
        return
      }

      // Send offer to signaling server, get answer
      try {
        const resp = await fetch(signalingUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sdp: pc.localDescription?.sdp,
            type: pc.localDescription?.type,
          }),
        })

        if (!resp.ok) {
          setStatus("failed")
          return
        }

        const answer = await resp.json()
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
      } catch (e) {
        console.error("WebRTC signaling failed:", e)
        setStatus("failed")
      }
    }

    connect()

    return () => {
      cancelled = true
      if (pcRef.current) {
        pcRef.current.close()
        pcRef.current = null
      }
    }
  }, [signalingUrl])

  return (
    <div className={`relative bg-[#2a1f14] rounded-xl overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />
      {status === "connecting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <span className="text-sm text-slate-400">Connecting to camera...</span>
        </div>
      )}
      {status === "failed" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <VideoOff className="h-8 w-8 text-slate-500" />
          <span className="text-sm text-slate-400">Unable to connect</span>
          <span className="text-xs text-slate-500">Check the camera URL and try again</span>
        </div>
      )}
    </div>
  )
}
