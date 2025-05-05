"use client"

import * as React from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ClockIcon } from "lucide-react"
import { formatTimeFromDecimal } from "./TimeSlider"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TimePickerProps {
  value: number
  onChange: (value: number) => void
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const hours = Math.floor(value)
  const minutes = Math.round((value - hours) * 60)

  const displayTime = formatTimeFromDecimal(value)

  const handleHourChange = (hour: string) => {
    const hourNumber = parseInt(hour, 10)
    const newValue = hourNumber + minutes / 60
    onChange(newValue)
  }

  const handleMinuteChange = (minute: string) => {
    const minuteNumber = parseInt(minute, 10)
    const newValue = hours + minuteNumber / 60
    onChange(newValue)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-fit justify-start text-left font-normal border-input bg-background hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <ClockIcon className="mr-2 h-4 w-4 text-foreground" />
          <span>{displayTime}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-fit p-4 border border-border shadow-md"
        align="center"
        side="top"
      >
        <div className="flex flex-col space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="hour">Hour</Label>
              <Select value={String(hours)} onValueChange={handleHourChange}>
                <SelectTrigger id="hour">
                  <SelectValue placeholder="Hour" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i === 0
                        ? "12 AM"
                        : i < 12
                        ? `${i} AM`
                        : i === 12
                        ? "12 PM"
                        : `${i - 12} PM`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="minute">Minute</Label>
              <Select
                value={String(minutes)}
                onValueChange={handleMinuteChange}
              >
                <SelectTrigger id="minute">
                  <SelectValue placeholder="Minute" />
                </SelectTrigger>
                <SelectContent>
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(
                    (minute) => (
                      <SelectItem key={minute} value={String(minute)}>
                        {minute.toString().padStart(2, "0")}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
