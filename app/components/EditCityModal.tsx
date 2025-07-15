"use client"

import { useState, useEffect, useRef } from "react"
import { Search, MapPin } from "lucide-react"
import { CornerDownLeft } from "lucide-react"
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

interface SelectedCityData {
  name: string
  fullName: string
  placeId: string
}

interface EditCityModalProps {
  isOpen: boolean
  currentCity: string
  onClose: () => void
  onSave: (newCityData: { name: string; placeId?: string }) => void
  placeholder?: string
  currentLocationForBias?: { lat: number; lng: number }
  showAbout?: boolean
}

export default function EditCityModal({
  isOpen,
  currentCity,
  onClose,
  onSave,
  placeholder = "Search for a city...",
  currentLocationForBias,
  showAbout = true,
}: EditCityModalProps) {
  const [inputValue, setInputValue] = useState(currentCity)
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen) {
      setInputValue(currentCity)
      setSuggestions([])
      setIsLoading(false)
      // Focus the input and select text when modal opens
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    } else {
      setInputValue("")
      setSuggestions([])
      setIsLoading(false)
    }
  }, [currentCity, isOpen])

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
      return
    }

    setIsLoading(true)

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const citySuggestions = await fetchCitySuggestions(value)
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

    // Automatically save and close like macOS Spotlight
    onSave({ name: cityName.trim(), placeId })
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose()
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (suggestions.length > 0) {
        // Select the first suggestion
        handleSelectSuggestion(suggestions[0])
      } else if (inputValue.trim()) {
        // If no suggestions but there's input, save the current input
        onSave({ name: inputValue.trim() })
        onClose()
      }
    }
  }

  const showCommandList =
    inputValue.trim().length > 0 && suggestions.length > 0 && !isLoading

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center ${
        typeof window !== "undefined" && window.innerWidth <= 768
          ? "pt-4"
          : "pt-20"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl mx-4">
        {/* About Section (shown only once) */}
        {showAbout && (
          <div className="mb-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-6 text-left">
            <h2 className="text-lg font-semibold text-white">SunnySpots ☀️</h2>
            <p className="mt-2 text-lg text-white/80">
              Find the sunniest patios, terraces and parks near you. Select a
              city to begin exploring:
            </p>
          </div>
        )}

        {/* Search Bar */}
        <Command className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
            <CommandPrimitive.Input
              ref={inputRef}
              value={inputValue}
              onValueChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                "flex h-14 w-full bg-transparent px-12 py-4 text-lg text-white placeholder:text-white/60",
                "outline-none appearance-none transition-all duration-200",
                "focus:ring-0 focus:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
            {/* Enter icon button on the right side of the input */}
            <button
              type="button"
              tabIndex={-1}
              aria-label="Press Enter to select"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg border border-transparent bg-transparent transition-all duration-150 hover:border-white/30 hover:bg-white/10 hover:backdrop-blur focus:border-white/30 focus:bg-white/10 focus:backdrop-blur"
              onClick={() => {
                if (suggestions.length > 0) {
                  handleSelectSuggestion(suggestions[0])
                } else if (inputValue.trim()) {
                  onSave({ name: inputValue.trim() })
                  onClose()
                }
              }}
            >
              <CornerDownLeft className="h-5 w-5 text-white/60" />
            </button>
            {isLoading && (
              <div className="absolute right-12 top-1/2 -translate-y-1/2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </div>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showCommandList && (
            <div className="border-t border-white/10 bg-white/5 backdrop-blur-xl">
              <CommandList className="max-h-80 overflow-auto">
                <CommandEmpty className="py-8 text-center text-white/60">
                  No cities found.
                </CommandEmpty>
                <CommandGroup>
                  {suggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion.placePrediction.placeId}
                      value={suggestion.placePrediction.text.text}
                      onSelect={() => handleSelectSuggestion(suggestion)}
                      className="flex items-center gap-3 px-6 py-4 text-white cursor-pointer"
                    >
                      <MapPin className="h-4 w-4 text-white/60 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {
                            suggestion.placePrediction.structuredFormat.mainText
                              .text
                          }
                        </div>
                        {suggestion.placePrediction.structuredFormat
                          .secondaryText && (
                          <div className="text-sm text-white/60 truncate">
                            {
                              suggestion.placePrediction.structuredFormat
                                .secondaryText.text
                            }
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </div>
          )}
        </Command>
      </div>
    </div>
  )
}
