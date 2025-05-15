"use client"

import { useIsMobile } from "@/components/ui/use-mobile"
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
  const isMobile = useIsMobile()
  return (
    <h1
      className={`${
        isMobile ? "text-base flex-col items-start" : "text-xl items-center"
      } font-semibold text-foreground flex`}
    >
      {isMobile ? (
        <>
          <span className="text-sm text-foreground/70">Sunny spots in</span>
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
              className="ml-1 p-1 rounded-md hover:bg-accent hover:text-accent-foreground opacity-100 transition-all duration-150"
            >
              <Pencil size={16} />
            </button>
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
    </h1>
  )
}
