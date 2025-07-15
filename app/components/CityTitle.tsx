"use client"

import { useIsMobile } from "@/components/ui/use-mobile"
import { Pencil } from "lucide-react"
import { Command as CommandIcon } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
      } text-foreground flex`}
      role="button"
      tabIndex={0}
      onClick={onEditRequest}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onEditRequest()
        }
      }}
    >
      {isMobile ? (
        <>
          <span className="text-sm text-foreground/70">Sunny spots in</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group relative flex items-center">
                  <span className="font-semibold cursor-pointer hover:text-primary transition-colors duration-150">
                    {city || placeholder}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" align="center" className="text-xs">
                Open city search (⌘+K)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      ) : (
        <>
          <span>Sunny spots in&nbsp;</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group relative flex items-center">
                  <span className="font-semibold cursor-pointer hover:text-primary transition-colors duration-150">
                    {city || placeholder}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" align="center" className="text-xs">
                Open city search (⌘+K)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}
    </h1>
  )
}
