import type { Metadata } from "next"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

export const metadata: Metadata = {
  title: "WatchTower - Elder Care",
  description: "Keeping an eye on the ones you love",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/tree-192.png", sizes: "192x192", type: "image/png" },
      { url: "/tree-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-background text-foreground font-sans">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}
