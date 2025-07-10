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
      } font-semibold text-foreground flex`}
    >
      {isMobile ? (
        <>
          <span className="text-sm text-foreground/70">Sunny spots in</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
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
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" align="center" className="text-xs">
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
