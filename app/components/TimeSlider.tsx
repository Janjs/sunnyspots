"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"

interface TimeSliderProps {
  /** Hour of sunrise (0–23) */
  sunriseHour?: number
  /** Hour of sunset (0–23) */
  sunsetHour?: number
  /** Starting hour for the slider (0–24) */
  initialHour?: number
  /** Controlled current hour (0–24) */
  value?: number
  /** Callback when hour changes */
  onChange?: (decimal: number) => void
  /** Additional container classes */
  className?: string
}

export function TimeSlider({
  sunriseHour = 6,
  sunsetHour = 18,
  initialHour = 12,
  value,
  onChange,
  className,
}: TimeSliderProps) {
  const [internalHour, setInternalHour] = useState<number>(initialHour)
  // use controlled value if provided, otherwise internal state
  const hour = value !== undefined ? value : internalHour

  // Format decimal hour to h:mm AM/PM
  const formatTime = (decimal: number): string => {
    const h = Math.floor(decimal)
    const m = Math.floor((decimal - h) * 60)
    const ampm = h >= 12 ? "PM" : "AM"
    const displayH = h % 12 || 12
    return `${displayH}:${m.toString().padStart(2, "0")} ${ampm}`
  }

  // Positions in percentage (0–100)
  const pct = (h: number) => (h / 24) * 100
  const sunrisePos = pct(sunriseHour)
  const sunsetPos = pct(sunsetHour)
  const thumbPos = pct(hour)

  // Gradient track: gray → day color → gray
  const trackBackground = `linear-gradient(to right, #e5e7eb 0%, #e5e7eb ${sunrisePos}%, #93c5fd ${sunrisePos}%, #93c5fd ${sunsetPos}%, #e5e7eb ${sunsetPos}%, #e5e7eb 100%)`

  const handleTimeChange = (newValue: number) => {
    // Only update the time without affecting the date
    if (onChange) {
      onChange(newValue)
    } else {
      setInternalHour(newValue)
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* Track background */}
        <div
          className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-md"
          style={{ background: trackBackground }}
        />

        {/* Invisible native input */}
        <input
          type="range"
          min={0}
          max={24}
          step={0.5}
          value={hour}
          onChange={(e) => {
            const newVal = parseFloat(e.target.value)
            handleTimeChange(newVal)
          }}
          className="absolute z-10 h-2 w-full cursor-pointer opacity-0"
          style={{ top: "calc(50% - 1px)" }}
        />

        {/* Custom thumb */}
        <div
          className="pointer-events-none absolute top-1/2 z-20 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black shadow-md"
          style={{ left: `${thumbPos}%` }}
        />
      </div>

      {/* Tick labels */}
      <div className="flex justify-between text-xs text-muted-foreground pt-3">
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>12 AM</span>
      </div>
    </div>
  )
}

// Utility function to format time
export function formatTimeFromDecimal(decimal: number): string {
  const h = Math.floor(decimal)
  const m = Math.floor((decimal - h) * 60)
  const ampm = h >= 12 ? "PM" : "AM"
  const displayH = h % 12 || 12
  return `${displayH}:${m.toString().padStart(2, "0")} ${ampm}`
}
