"use client"

import * as React from "react"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

interface TimePickerProps {
  date: Date
  setDate: (date: Date) => void
}

export function TimePicker({ date, setDate }: TimePickerProps) {
  const handleHourChange = (value: number[]) => {
    const newDate = new Date(date)
    newDate.setHours(value[0])
    setDate(newDate)
  }

  const handleMinuteChange = (value: number[]) => {
    const newDate = new Date(date)
    newDate.setMinutes(value[0])
    setDate(newDate)
  }

  return (
    <div className="grid gap-4 p-3 border-t border-border rounded-b-md">
      <div className="grid gap-2">
        <Label htmlFor="hours" className="text-sm text-foreground">
          Hour: {date.getHours().toString().padStart(2, "0")}
        </Label>
        <Slider
          id="hours"
          min={0}
          max={23}
          step={1}
          value={[date.getHours()]}
          onValueChange={handleHourChange}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="minutes" className="text-sm text-foreground">
          Minute: {date.getMinutes().toString().padStart(2, "0")}
        </Label>
        <Slider
          id="minutes"
          min={0}
          max={59}
          step={1}
          value={[date.getMinutes()]}
          onValueChange={handleMinuteChange}
        />
      </div>
    </div>
  )
}
