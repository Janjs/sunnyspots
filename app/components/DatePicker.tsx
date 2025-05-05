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
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

interface DatePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
}

export function DatePicker({ date, setDate }: DatePickerProps) {
  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-fit justify-start text-left font-normal bg-white/25 backdrop-blur-md border border-white/20 text-foreground hover:bg-white/30",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-foreground" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-fit p-0 border border-border shadow-md"
        align="center"
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
          className="rounded-md"
        />
      </PopoverContent>
    </Popover>
  )
}
