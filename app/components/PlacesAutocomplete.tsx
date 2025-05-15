import { useState, useRef, useEffect } from "react"
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
import {
  fetchPlaceSuggestions,
  fetchPlaceDetails,
} from "@/actions/googlePlaces"

const DEBOUNCE_DELAY = 300

interface Location {
  lat: number
  lng: number
}

export interface Place {
  placeId: string
  structuredFormat: {
    mainText: {
      text: string
    }
    secondaryText: {
      text: string
    }
  }
}

export interface PlaceSelectData {
  place_id: string
  name: string
  geometry: {
    location: Location
  }
  formatted_address: string
  outdoorSeating: boolean
  photos?: {
    photo_reference: string
    height: number
    width: number
    html_attributions: string[]
  }[]
}

interface PlacesAutocompleteProps {
  onPlaceSelect: (place: PlaceSelectData) => void
  defaultLocation: Location
}

export default function PlacesAutocomplete({
  onPlaceSelect,
  defaultLocation,
}: PlacesAutocompleteProps) {
  const [value, setValue] = useState("")
  const [places, setPlaces] = useState<Place[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const handleSearch = async (inputValue: string) => {
    setValue(inputValue)

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (!inputValue.trim()) {
      setPlaces([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const fetchedPlaces = await fetchPlaceSuggestions(
          inputValue,
          defaultLocation
        )
        console.log("places suggestions:", fetchedPlaces)
        setPlaces(fetchedPlaces)
      } catch (error) {
        console.error("Error fetching place predictions:", error)
        setPlaces([])
      } finally {
        setIsLoading(false)
      }
    }, DEBOUNCE_DELAY)
  }

  const handleSelect = async (place: Place) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    setIsLoading(false)
    setValue(place.structuredFormat.mainText.text)
    setPlaces([])

    try {
      const placeDetails = await fetchPlaceDetails(place.placeId)
      if (placeDetails) {
        onPlaceSelect(placeDetails)
      } else {
        console.error(
          "Failed to fetch place details for:",
          place.structuredFormat.mainText.text
        )
      }
    } catch (error) {
      console.error(
        "Error in handleSelect after fetching place details:",
        error
      )
    }
  }

  return (
    <div>
      <Command className="relative bg-background border border-input rounded-md overflow-visible">
        <div className="flex items-center px-3" cmdk-input-wrapper="">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <CommandPrimitive.Input
            ref={inputRef}
            value={value}
            onValueChange={handleSearch}
            placeholder="Search bars and restaurants..."
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

        {value.trim().length > 0 && places.length > 0 && (
          <CommandList className="bg-popover">
            <CommandEmpty className="text-muted-foreground">
              No places found.
            </CommandEmpty>
            <CommandGroup>
              {places.map((place: Place) => (
                <CommandItem
                  key={place.placeId}
                  value={place.structuredFormat.mainText.text}
                  onSelect={() => {
                    handleSelect(place)
                  }}
                  className="text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-primary",
                      value === place.structuredFormat.mainText.text
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <span>{place.structuredFormat.mainText.text}</span>
                  <span className="ml-2 text-muted-foreground">
                    {place.structuredFormat.secondaryText.text}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        )}
      </Command>
    </div>
  )
}
