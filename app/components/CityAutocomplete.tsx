"use client"

import { useState, useEffect, useRef } from "react"
import { Check, Loader2, Search } from "lucide-react"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { fetchCitySuggestions, CitySuggestion } from "@/actions/googlePlaces"

const DEBOUNCE_DELAY = 300

interface CityAutocompleteProps {
  onCitySelect: (
    citySelection: {
      name: string
      fullName: string
      placeId: string
    } | null
  ) => void
  initialValue?: string
  placeholder?: string
  currentLocationForBias?: { lat: number; lng: number }
}

export default function CityAutocomplete({
  onCitySelect,
  initialValue = "",
  placeholder = "Search city...",
  currentLocationForBias,
}: CityAutocompleteProps) {
  const [inputValue, setInputValue] = useState(initialValue)
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setInputValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const handleInputChange = async (value: string) => {
    setInputValue(value)

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (!value.trim()) {
      setSuggestions([])
      setIsLoading(false)
      onCitySelect(null)
      return
    }

    setIsLoading(true)

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const citySuggestions = await fetchCitySuggestions(
          value,
          currentLocationForBias
        )
        setSuggestions(citySuggestions)
      } catch (error) {
        console.error("Error fetching city suggestions:", error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, DEBOUNCE_DELAY)
  }

  const handleSelectSuggestion = (suggestion: CitySuggestion) => {
    const cityName = suggestion.placePrediction.structuredFormat.mainText.text
    const fullText = suggestion.placePrediction.text.text
    const placeId = suggestion.placePrediction.placeId

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    setIsLoading(false)

    setInputValue(cityName)
    setSuggestions([])
    onCitySelect({ name: cityName, fullName: fullText, placeId })
  }

  const showCommandList =
    inputValue.trim().length > 0 && (isLoading || suggestions.length > 0)

  return (
    <Command className="relative w-full bg-background border border-input rounded-md overflow-visible">
      <div className="flex items-center px-3" cmdk-input-wrapper="">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <CommandPrimitive.Input
          ref={inputRef}
          value={inputValue}
          onValueChange={handleInputChange}
          placeholder={placeholder}
          className={cn(
            "flex h-9 w-full rounded-md bg-transparent py-2 text-sm outline-none appearance-none",
            "placeholder:text-muted-foreground text-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "border-0 shadow-none focus-visible:ring-0 focus-visible:outline-none"
          )}
        />
      </div>

      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}

      {showCommandList && (
        <CommandList className="absolute top-full mt-1 w-full bg-popover border border-input rounded-md shadow-lg z-50">
          {isLoading && suggestions.length === 0 && (
            <CommandItem
              disabled
              className="text-muted-foreground justify-center"
            >
              Loading...
            </CommandItem>
          )}

          {!isLoading && suggestions.length > 0 && (
            <CommandGroup>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.placePrediction.placeId}
                  value={suggestion.placePrediction.text.text}
                  onSelect={() => handleSelectSuggestion(suggestion)}
                  className="text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-primary",
                      inputValue ===
                        suggestion.placePrediction.structuredFormat.mainText
                          .text
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <span>
                    {suggestion.placePrediction.structuredFormat.mainText.text}
                  </span>
                  {suggestion.placePrediction.structuredFormat
                    .secondaryText && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {
                        suggestion.placePrediction.structuredFormat
                          .secondaryText.text
                      }
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      )}
    </Command>
  )
}
