import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

interface Location {
  lat: number;
  lng: number;
}

interface StructuredFormat {
  mainText: {
    text: string;
  };
  secondaryText: {
    text: string;
  };
}

interface Place {
  placeId: string;
  structuredFormat: StructuredFormat;
  placePrediction: any; // Google Places API type
}

interface PlaceSelectData {
  name: string;
  geometry: {
    location: Location;
  };
  formatted_address: string;
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
  console.log(body);

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

export default function PlacesAutocomplete({ onPlaceSelect, defaultLocation }: PlacesAutocompleteProps) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);

  const handleSearch = async (input: string) => {
    console.log("handleSearch called with input:", input);
    setValue(input);
    if (!input.length) {
      setPlaces([]);
      return;
    }

    try {
      console.log("Fetching places for input:", input);
      const places = await searchPlaces(input, defaultLocation);
      console.log("Received places:", places);
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

  const handleSelect = async (prediction: any) => {
    try {
      const place = await prediction.fetchFields({
        fields: ["displayName", "formattedAddress", "location"],
      });

      setValue(place.displayName || "");
      setOpen(false);
      onPlaceSelect({
        name: place.displayName,
        geometry: {
          location: place.location,
        },
        formatted_address: place.formattedAddress,
      });
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
        {value && (
          <CommandList>
            <CommandEmpty>No places found.</CommandEmpty>
            <CommandGroup>
              {places.map((place) => (
                <CommandItem
                  key={place.placeId}
                  value={place.structuredFormat.mainText.text}
                  onSelect={() => handleSelect(place.placePrediction)}
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
