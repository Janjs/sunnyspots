import { useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  fetchPlaceSuggestions,
  fetchPlaceDetails,
} from "@/actions/googlePlaces"

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
  name: string
  geometry: {
    location: Location
  }
  formatted_address: string
  outdoorSeating: boolean
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

  const handleSearch = async (input: string) => {
    setValue(input)
    if (!input.length) {
      setPlaces([])
      return
    }

    try {
      const places = await fetchPlaceSuggestions(input, defaultLocation)
      console.log("places", places)
      setPlaces(places)
    } catch (error) {
      console.error("Error fetching predictions:", error)
      setPlaces([])
    }
  }

  const handleSelect = async (place: Place) => {
    try {
      const placeDetails = await fetchPlaceDetails(place.placeId)
      onPlaceSelect(placeDetails)
    } catch (error) {
      console.error("Error fetching place details:", error)
    }
  }

  return (
    <div>
      <Command>
        <CommandInput
          placeholder="Search bars and restaurants..."
          value={value}
          onValueChange={handleSearch}
          className="h-9"
        />
        {value && places.length > 0 && (
          <CommandList>
            <CommandEmpty>No places found.</CommandEmpty>
            <CommandGroup>
              {places.map((place: Place) => (
                <CommandItem
                  key={place.placeId}
                  value={place.structuredFormat.mainText.text}
                  onSelect={() => {
                    setPlaces([])
                    setValue(place.structuredFormat.mainText.text)
                    handleSelect(place)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
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
