import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

interface Location {
  lat: number;
  lng: number;
}

interface Place {
  placeId: string;
  structuredFormat: {
    mainText: {
      text: string;
    };
    secondaryText: {
      text: string;
    };
  };
  placePrediction: any;
}

export interface PlaceSelectData {
  name: string;
  geometry: {
    location: Location;
  };
  formatted_address: string;
  outdoorSeating: boolean;
}

interface PlacesAutocompleteProps {
  onPlaceSelect: (place: PlaceSelectData) => void;
  defaultLocation: Location;
}

const searchPlaces = async (query: string, location: Location) => {
  const url = "https://places.googleapis.com/v1/places:autocomplete";
  const body = {
    input: query,
    locationBias: {
      circle: {
        center: {
          latitude: location.lat,
          longitude: location.lng,
        },
        radius: 5000,
      },
    },
    includedRegionCodes: ["nl"],
    includedPrimaryTypes: ["restaurant", "bar"],
  };

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY as string,
    },
    body: JSON.stringify(body),
  })
    .then((res) => res.json())
    .then((data) => data.suggestions || []); // Add fallback empty array
};

// TODO: Add debounce and all that
export default function PlacesAutocomplete({ onPlaceSelect, defaultLocation }: PlacesAutocompleteProps) {
  const [value, setValue] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);

  const handleSearch = async (input: string) => {
    setValue(input);
    if (!input.length) {
      setPlaces([]);
      return;
    }

    try {
      const places = await searchPlaces(input, defaultLocation);
      if (Array.isArray(places)) {
        // Check if places is an array
        setPlaces(places.map((p: any) => p.placePrediction));
      } else {
        setPlaces([]);
      }
    } catch (error) {
      console.error("Error fetching predictions:", error);
      setPlaces([]);
    }
  };

  const handleSelect = async (place: Place) => {
    try {
      // Fetch detailed place information using Place Details API
      const detailsUrl = `https://places.googleapis.com/v1/places/${place.placeId}?fields=location,formattedAddress,outdoorSeating`;
      const response = await fetch(detailsUrl, {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": GOOGLE_API_KEY as string,
          "Content-Type": "application/json",
        },
      });
      const placeDetails = await response.json();
      console.log("placeDetails", placeDetails);
      onPlaceSelect({
        name: place.structuredFormat.mainText.text,
        geometry: {
          location: {
            lat: placeDetails.location.latitude,
            lng: placeDetails.location.longitude,
          },
        },
        formatted_address: placeDetails.formattedAddress,
        outdoorSeating: placeDetails.outdoorSeating,
      } as PlaceSelectData);
    } catch (error) {
      console.error("Error fetching place details:", error);
    }
  };

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
                    setPlaces([]);
                    setValue(place.structuredFormat.mainText.text);
                    handleSelect(place);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === place.structuredFormat.mainText.text ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>{place.structuredFormat.mainText.text}</span>
                  <span className="ml-2 text-muted-foreground">{place.structuredFormat.secondaryText.text}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        )}
      </Command>
    </div>
  );
}
