"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { CameraGrid } from "@/components/CameraGrid"

export default function Home() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login")
    } else {
      setChecked(true)
    }
  }, [router])

  if (!checked) return null

  return <CameraGrid />
}
