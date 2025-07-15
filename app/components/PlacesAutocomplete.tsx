import { useState, useRef, useEffect } from "react"
import { Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  fetchPlaceSuggestions,
  fetchPlaceDetails,
} from "@/actions/googlePlaces"
import { PlaceType } from "@/app/types/places"

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
  type: PlaceType
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
  type: PlaceType
}

interface PlacesAutocompleteProps {
  onPlaceSelect: (place: PlaceSelectData) => void
  onSearchResults: (results: Place[]) => void
  onSearchStateChange: (isSearching: boolean) => void
  defaultLocation: Location
}

export default function PlacesAutocomplete({
  onPlaceSelect,
  onSearchResults,
  onSearchStateChange,
  defaultLocation,
}: PlacesAutocompleteProps) {
  const [value, setValue] = useState("")
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
      onSearchResults([])
      onSearchStateChange(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    onSearchStateChange(true)

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const fetchedPlaces = await fetchPlaceSuggestions(
          inputValue,
          defaultLocation
        )
        console.log("places suggestions:", fetchedPlaces)
        onSearchResults(fetchedPlaces)
      } catch (error) {
        console.error("Error fetching place predictions:", error)
        onSearchResults([])
      } finally {
        setIsLoading(false)
      }
    }, DEBOUNCE_DELAY)
  }

  const clearSearch = () => {
    setValue("")
    onSearchResults([])
    onSearchStateChange(false)
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    setIsLoading(false)
  }

  return (
    <div>
      <div className="relative bg-white/25 hover:bg-white/50 transition-all duration-200 backdrop-blur-md border border-white/20 rounded-md overflow-visible shadow-lg">
        <div className="flex items-center px-3" cmdk-input-wrapper="">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search bars, restaurants, parks..."
            className={cn(
              "flex h-9 w-full rounded-md bg-transparent py-2 text-sm outline-none appearance-none",
              "placeholder:text-muted-foreground text-foreground",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "border-0 focus:border-0 focus:outline-none focus:ring-0"
            )}
          />
        </div>

        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
