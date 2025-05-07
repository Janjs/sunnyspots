"use client"

import { Pencil } from "lucide-react"

interface CityTitleProps {
  city: string
  onEditRequest: () => void
  placeholder?: string
}

export default function CityTitle({
  city,
  onEditRequest,
  placeholder = "Select City",
}: CityTitleProps) {
  return (
    <h1 className="text-3xl font-semibold text-foreground flex items-center">
      <span>Sunny spots in&nbsp;</span>
      <div className="group relative flex items-center">
        <span
          className="underline underline-offset-4 cursor-pointer hover:text-primary transition-colors duration-150"
          onClick={onEditRequest}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onEditRequest()
            }
          }}
        >
          {city || placeholder}
        </span>
        <button
          onClick={onEditRequest}
          aria-label="Edit city name"
          className="ml-1 p-1 rounded-md hover:bg-accent hover:text-accent-foreground opacity-0 group-hover:opacity-100 transition-all duration-150 focus:opacity-100"
        >
          <Pencil size={18} />
        </button>
      </div>
    </h1>
  )
}
