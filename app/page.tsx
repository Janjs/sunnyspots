"use client";

import { useRef } from "react";
import MapView from "@/app/components/MapView";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import PlacesAutocomplete, { PlaceSelectData } from "@/app/components/PlacesAutocomplete";

const DEFAULT_LOCATION = {
  lat: 52.09178,
  lng: 5.1205,
};

export default function MapUI() {
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const mapViewRef = useRef(null);

  const handlePlaceSelect = (place: PlaceSelectData) => {
    console.log(place);
    if (place.geometry?.location) {
      const coordinates = {
        lng: place.geometry.location.lng,
        lat: place.geometry.location.lat,
      };
      console.log(coordinates);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <MapView ref={mapViewRef} onLoadingProgress={setLoadingPercentage} defaultLocation={DEFAULT_LOCATION} />

      {/* Search bar positioned in the top left corner */}
      <div className="absolute left-4 top-4 z-10 w-full max-w-md">
        <PlacesAutocomplete onPlaceSelect={handlePlaceSelect} defaultLocation={DEFAULT_LOCATION} />
      </div>

      {/* Loading percentage indicator */}
      <div className="absolute right-4 top-4 z-10">
        {loadingPercentage > 0 && loadingPercentage < 100 && (
          <Label className="rounded-md bg-white/90 px-3 py-1 text-sm font-medium shadow-sm">
            Loading: {loadingPercentage}%
          </Label>
        )}
      </div>
    </div>
  );
}
