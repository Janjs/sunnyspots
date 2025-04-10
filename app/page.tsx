"use client";

import { useRef, useState } from "react";
import MapView from "@/app/components/MapView";
import { Label } from "@/components/ui/label";
import PlacesAutocomplete, { PlaceSelectData } from "@/app/components/PlacesAutocomplete";
import { DateTimePicker } from "@/app/components/DateTimePicker";
import SunCalc from "suncalc";

const DEFAULT_LOCATION = {
  lat: 52.09178,
  lng: 5.1205,
};

export default function MapUI() {
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    const times = SunCalc.getTimes(now, DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
    return new Date(times.sunrise.getTime() + 60 * 60 * 1000); // 1 hour after sunrise
  });
  const mapViewRef = useRef<{
    addMarker: (coordinates: { lat: number; lng: number }) => void;
    setDate: (date: Date) => void;
  } | null>(null);

  const handlePlaceSelect = (place: PlaceSelectData) => {
    if (place.geometry?.location) {
      const coordinates = {
        lng: place.geometry.location.lng,
        lat: place.geometry.location.lat,
      };
      console.log(coordinates);
      // Add marker using the ref
      mapViewRef.current?.addMarker(coordinates);
    }
  };

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
    mapViewRef.current?.setDate(date);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <MapView
        ref={mapViewRef}
        onLoadingProgress={setLoadingPercentage}
        defaultLocation={DEFAULT_LOCATION}
        initialDate={currentDate}
      />

      {/* Search bar container */}
      <div className="absolute left-4 top-4 z-10 w-full max-w-md">
        <PlacesAutocomplete onPlaceSelect={handlePlaceSelect} defaultLocation={DEFAULT_LOCATION} />
      </div>

      {/* Date picker and loading indicator container */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <div className="w-[300px]">
          <DateTimePicker date={currentDate} setDate={handleDateChange} />
        </div>
        {loadingPercentage > 0 && loadingPercentage < 100 && (
          <Label className="rounded-md bg-white/90 px-3 py-1 text-sm font-medium shadow-sm">
            Loading: {loadingPercentage}%
          </Label>
        )}
      </div>
    </div>
  );
}
