"use client"

import { useRef, useState } from "react"
import MapView from "@/app/components/MapView"
import { Label } from "@/components/ui/label"
import PlacesAutocomplete, {
  PlaceSelectData,
} from "@/app/components/PlacesAutocomplete"
import { DatePicker } from "@/app/components/DatePicker"
import { TimeSlider } from "@/app/components/TimeSlider"
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
    return new Date() // 1 hour after sunrise: times.sunrise.getTime() + 60 * 60 * 1000
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

  const handleDateChange = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Create a new date object based on the existing state
      const updatedDateTime = new Date(currentDate)

      // Update only the year, month, and day from the selected date
      updatedDateTime.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      )

      // Update the state with the combined date and time
      setCurrentDate(updatedDateTime)
      mapViewRef.current?.setDate(updatedDateTime)
    }
    // If selectedDate is undefined, do nothing, keep the current date & time
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

  // Compute sunrise/sunset for current date & location
  const times = SunCalc.getTimes(
    currentDate,
    currentLocation.lat,
    currentLocation.lng
  )
  const sunriseDecimal =
    times.sunrise.getHours() + times.sunrise.getMinutes() / 60
  const sunsetDecimal = times.sunset.getHours() + times.sunset.getMinutes() / 60

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left sidebar with controls */}
      <div className="flex-1 flex justify-center">
        <div className="max-w-xl flex-col gap-4 bg-background p-6 overflow-y-auto">
          <h2 className="text-xl font-semibold text-foreground">
            Find sunny terraces in Utrecht
          </h2>

          <div className="space-y-2">
            <Label htmlFor="place-search" className="text-foreground">
              Search location
            </Label>
            <PlacesAutocomplete
              onPlaceSelect={handlePlaceSelect}
              defaultLocation={DEFAULT_LOCATION}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-time" className="text-foreground">
              Select date and time
            </Label>
            <div className="flex flex-col gap-2">
              <DatePicker date={currentDate} setDate={handleDateChange} />
              <TimeSlider
                sunriseHour={sunriseDecimal}
                sunsetHour={sunsetDecimal}
                value={currentDate.getHours() + currentDate.getMinutes() / 60}
                onChange={(h: number) => {
                  const updatedDateTime = new Date(currentDate)
                  const whole = Math.floor(h)
                  const mins = Math.round((h - whole) * 60)
                  updatedDateTime.setHours(whole, mins)
                  setCurrentDate(updatedDateTime)
                  mapViewRef.current?.setDate(updatedDateTime)
                }}
              />
            </div>
          </div>

          {loadingPercentage > 0 && loadingPercentage < 100 && (
            <div className="mt-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Loading map: {loadingPercentage}%
            </div>
          )}

          <div className="mt-2">
            <TopRatedPlaces
              location={currentLocation}
              dateTime={currentDate}
              onPlaceSelect={handlePlaceFromListSelect}
              onPlacesLoaded={handlePlacesLoaded}
            />
          </div>
        </div>
      </div>
      {/* Map container on the right */}
      <div className="relative flex-1  bg-background">
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
