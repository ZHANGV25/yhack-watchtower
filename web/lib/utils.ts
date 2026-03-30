import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createElement, type ReactNode } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Render inline markdown (**bold**) as React elements.
 * Returns an array of strings and <strong> elements.
 */
export function renderInlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const regex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(createElement("strong", { key: match.index, className: "font-semibold text-foreground" }, match[1]))
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

/**
 * Human-friendly relative time, e.g. "5 minutes ago", "2 hours ago", "Just now"
 */
export function timeAgo(timestamp: number | string): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : new Date(timestamp * 1000)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "Just now"
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} min${minutes === 1 ? "" : "s"} ago`
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    return `${hours} hour${hours === 1 ? "" : "s"} ago`
  }
  const days = Math.floor(seconds / 86400)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/**
 * Format timestamp for display: "Today at 3:15 PM" or "Mar 28 at 3:15 PM"
 */
export function formatFriendlyTime(timestamp: number | string): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : new Date(timestamp * 1000)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })

  if (isToday) return `Today at ${time}`
  if (isYesterday) return `Yesterday at ${time}`
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${time}`
}

/**
 * Format just the time portion: "7:15 AM"
 */
export function formatTime(timestamp: number | string): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : new Date(timestamp * 1000)
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

/**
 * Format date as YYYY-MM-DD for API calls
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0]
}

/**
 * Get a friendly room name by stripping common prefixes
 */
export function getRoomDisplayName(name: string): string {
  return name || "Room"
}

/**
 * Extract a first name from a room name for personal messaging.
 * e.g. "Mom's Living Room" -> "Mom", "Dad's Bedroom" -> "Dad"
 */
export function extractPersonName(roomName: string): string {
  const possessiveMatch = roomName.match(/^(\w+)'s\s/i)
  if (possessiveMatch) return possessiveMatch[1]
  return "them"
}
