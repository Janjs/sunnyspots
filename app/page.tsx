"use client"

import { useRef, useState } from "react"
import MapView from "@/app/components/MapView"
import { Label } from "@/components/ui/label"
import PlacesAutocomplete, {
  PlaceSelectData,
} from "@/app/components/PlacesAutocomplete"
import { DateTimePicker } from "@/app/components/DateTimePicker"
import TopRatedPlaces from "@/app/components/TopRatedPlaces"
import SunCalc from "suncalc"
import type { PlaceResult } from "@/app/actions/googlePlaces"

const DEFAULT_LOCATION = {
  lat: 52.09178,
  lng: 5.1205,
}

interface MapViewRef {
  addMarker: (
    coordinates: { lat: number; lng: number },
    outdoorSeating: boolean
  ) => void
  setDate: (date: Date) => void
  addMarkers: (
    places: {
      geometry: { location: { lat: number; lng: number } }
      outdoorSeating: boolean
    }[]
  ) => void
  centerOnLocation: (coordinates: { lat: number; lng: number }) => void
  clearMarkers: () => void
}

export default function MapUI() {
  const [loadingPercentage, setLoadingPercentage] = useState(0)
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_LOCATION)
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    const times = SunCalc.getTimes(
      now,
      DEFAULT_LOCATION.lat,
      DEFAULT_LOCATION.lng
    )
    return new Date(times.sunrise.getTime() + 60 * 60 * 1000) // 1 hour after sunrise
  })
  const mapViewRef = useRef<MapViewRef | null>(null)

  const handlePlaceSelect = (place: PlaceSelectData) => {
    if (place.geometry?.location) {
      const coordinates = {
        lng: place.geometry.location.lng,
        lat: place.geometry.location.lat,
      }
      // Update current location for the top rated venues component
      setCurrentLocation(coordinates)
      // Add marker using the ref
      mapViewRef.current?.addMarker(coordinates, place.outdoorSeating)
    }
  }

  const handleDateChange = (date: Date) => {
    setCurrentDate(date)
    mapViewRef.current?.setDate(date)
  }

  const handlePlaceFromListSelect = (place: {
    geometry: { location: { lat: number; lng: number } }
    outdoorSeating: boolean
  }) => {
    const coordinates = {
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
    }
    mapViewRef.current?.centerOnLocation(coordinates)
  }

  const handlePlacesLoaded = (places: PlaceResult[]) => {
    const placesWithOutdoorSeating = places.map((place) => ({
      geometry: place.geometry,
      outdoorSeating: true,
    }))
    mapViewRef.current?.addMarkers(placesWithOutdoorSeating)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left sidebar with controls */}
      <div className="flex w-[350px] flex-col gap-4 bg-white p-4 shadow-md overflow-y-auto">
        <h2 className="text-xl font-semibold">
          Find sunny terraces in Utrecht
        </h2>

        <div className="space-y-2">
          <Label htmlFor="place-search">Search location</Label>
          <PlacesAutocomplete
            onPlaceSelect={handlePlaceSelect}
            defaultLocation={DEFAULT_LOCATION}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date-time">Select date and time</Label>
          <DateTimePicker date={currentDate} setDate={handleDateChange} />
        </div>

        {loadingPercentage > 0 && loadingPercentage < 100 && (
          <div className="mt-4 rounded-md bg-gray-100 px-3 py-2 text-sm">
            Loading map: {loadingPercentage}%
          </div>
        )}

        <div className="mt-2">
          <TopRatedPlaces
            location={currentLocation}
            onPlaceSelect={handlePlaceFromListSelect}
            onPlacesLoaded={handlePlacesLoaded}
          />
        </div>
      </div>

      {/* Map container on the right */}
      <div className="relative flex-1">
        <MapView
          ref={mapViewRef}
          onLoadingProgress={setLoadingPercentage}
          defaultLocation={DEFAULT_LOCATION}
          initialDate={currentDate}
        />
      </div>
    </div>
  )
}
