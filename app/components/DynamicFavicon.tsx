"use client"

import { useEffect } from "react"
import { hasSunlight } from "@/utils/sunlight"

interface DynamicFaviconProps {
  currentDate: Date
  latitude: number
  longitude: number
}

export default function DynamicFavicon({
  currentDate,
  latitude,
  longitude,
}: DynamicFaviconProps) {
  useEffect(() => {
    // Check if the current location has sunlight
    const hasSun = hasSunlight(currentDate, latitude, longitude)

    // Create link element for favicon if it doesn't exist
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }

    // Set the appropriate emoji favicon based on sunlight status
    const emoji = hasSun ? "☀️" : "🌙"

    // Convert emoji to data URL
    const canvas = document.createElement("canvas")
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.font = "54px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(emoji, 32, 32)
      link.href = canvas.toDataURL("image/png")
    }
  }, [currentDate, latitude, longitude])

  // This component doesn't render anything visible
  return null
}
