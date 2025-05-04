"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateTimePickerProps {
  date: Date
  setDate: (date: Date) => void
}

export function DateTimePicker({ date, setDate }: DateTimePickerProps) {
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i)
  const hourOptions = Array.from({ length: 24 }, (_, i) => i)

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const newDate = new Date(selectedDate)
      newDate.setHours(date.getHours(), date.getMinutes())
      setDate(newDate)
    }
  }

  const handleHourChange = (hour: string) => {
    const newDate = new Date(date)
    newDate.setHours(parseInt(hour))
    setDate(newDate)
  }

  const handleMinuteChange = (minute: string) => {
    const newDate = new Date(date)
    newDate.setMinutes(parseInt(minute))
    setDate(newDate)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal border-input bg-background hover:bg-accent hover:text-accent-foreground",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-foreground" />
          {date ? format(date, "PPP p") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border border-border shadow-md bg-white"
        align="start"
      >
        <div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            className="rounded-t-md"
          />
          <div className="border-t border-border p-3 flex items-center gap-2 rounded-b-md">
            <Clock className="h-4 w-4 text-foreground" />
            <Select
              value={date.getHours().toString()}
              onValueChange={handleHourChange}
            >
              <SelectTrigger className="w-[70px] border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border">
                {hourOptions.map((hour) => (
                  <SelectItem
                    key={hour}
                    value={hour.toString()}
                    className="text-popover-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                  >
                    {hour.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-foreground">:</span>
            <Select
              value={date.getMinutes().toString()}
              onValueChange={handleMinuteChange}
            >
              <SelectTrigger className="w-[70px] border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border">
                {minuteOptions.map((minute) => (
                  <SelectItem
                    key={minute}
                    value={minute.toString()}
                    className="text-popover-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                  >
                    {minute.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
