"use client"

import { useRef, useState } from "react"
import MapView from "@/app/components/MapView"
import { Label } from "@/components/ui/label"
import PlacesAutocomplete, {
  PlaceSelectData,
} from "@/app/components/PlacesAutocomplete"
import { DatePicker } from "@/app/components/DatePicker"
import { TimeSlider, formatTimeFromDecimal } from "@/app/components/TimeSlider"
import { TimePicker } from "@/app/components/TimePicker"
import TopRatedPlaces from "@/app/components/TopRatedPlaces"
import SunCalc from "suncalc"
import type { PlaceResult } from "@/app/actions/googlePlaces"

// Extend PlaceResult for our needs
interface ExtendedPlaceResult extends PlaceResult {
  place_id: string
}

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
  selectMarkerAtLocation: (coordinates: { lat: number; lng: number }) => void
}

export default function MapUI() {
  const [loadingPercentage, setLoadingPercentage] = useState(0)
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_LOCATION)
  const [currentDate, setCurrentDate] = useState(() => {
    return new Date() // 1 hour after sunrise: times.sunrise.getTime() + 60 * 60 * 1000
  })
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>()
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null)
  const [coordinatesPlaceIdMap, setCoordinatesPlaceIdMap] = useState<
    Map<string, string>
  >(new Map())
  const [placesData, setPlacesData] = useState<PlaceResult[]>([])
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

      // Unselect any selected place
      setSelectedPlaceId(undefined)
      setSelectedPlace(null)
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
    place_id?: string
  }) => {
    const coordinates = {
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
    }
    // selectMarkerAtLocation now handles centering
    mapViewRef.current?.selectMarkerAtLocation(coordinates)
    setSelectedPlaceId(place.place_id)

    // Find the full place data from our cached places
    if (place.place_id) {
      const fullPlace = placesData.find((p) => p.place_id === place.place_id)
      setSelectedPlace(fullPlace || null)
    }
  }

  const handleMarkerSelected = (
    coordinates: { lat: number; lng: number; place_id?: string } | null
  ) => {
    if (coordinates) {
      // If place_id is directly available from the marker, use it
      if (coordinates.place_id) {
        setSelectedPlaceId(coordinates.place_id)
        const fullPlace = placesData.find(
          (p) => p.place_id === coordinates.place_id
        )
        setSelectedPlace(fullPlace || null)
        return
      }

      // Otherwise, try to look it up from the coordinates map
      const coordKey = `${coordinates.lat.toFixed(6)},${coordinates.lng.toFixed(
        6
      )}`

      const placeId = coordinatesPlaceIdMap.get(coordKey)
      setSelectedPlaceId(placeId)

      if (placeId) {
        const fullPlace = placesData.find((p) => p.place_id === placeId)
        setSelectedPlace(fullPlace || null)
      } else {
        setSelectedPlace(null)
      }
    } else {
      setSelectedPlaceId(undefined)
      setSelectedPlace(null)
    }
  }

  const handlePlacesLoaded = (places: PlaceResult[]) => {
    // Store the full places data for later reference
    setPlacesData(places)

    // Create mappings between coordinates and place IDs
    const newCoordinatesPlaceIdMap = new Map<string, string>()

    places.forEach((place) => {
      const coords = place.geometry.location
      const coordKey = `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`
      newCoordinatesPlaceIdMap.set(coordKey, place.place_id)
    })
    setCoordinatesPlaceIdMap(newCoordinatesPlaceIdMap)

    const placesWithOutdoorSeating = places.map((place) => ({
      geometry: place.geometry,
      outdoorSeating: true,
      place_id: place.place_id, // Pass place_id to ensure it's available in marker data
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
      {/* Left sidebar with search and top rated places */}
      <div className="w-1/2 flex-shrink-0 bg-background overflow-y-auto">
        <div className="flex-col gap-4 p-6">
          <h1 className="text-xl font-semibold text-foreground mb-4">
            Sunny spots in Utrecht
          </h1>

          <div className="space-y-2">
            <PlacesAutocomplete
              onPlaceSelect={handlePlaceSelect}
              defaultLocation={DEFAULT_LOCATION}
            />
          </div>

          <div className="mt-4">
            <TopRatedPlaces
              location={currentLocation}
              dateTime={currentDate}
              onPlaceSelect={handlePlaceFromListSelect}
              onPlacesLoaded={handlePlacesLoaded}
              selectedPlaceId={selectedPlaceId}
            />
          </div>
        </div>
      </div>

      {/* Map container on the right with overlays */}
      <div className="relative flex-1 bg-background">
        {/* Selected place overlay at the top with glassmorphism */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-6 py-2 rounded-lg bg-white/25 backdrop-blur-md border border-white/20 shadow-lg">
          {selectedPlace ? (
            <div className="text-foreground">
              <h2 className="text-lg font-semibold">{selectedPlace.name}</h2>
              {selectedPlace.rating && (
                <div className="flex items-center gap-1 text-sm">
                  <span>Rating: {selectedPlace.rating}</span>
                  {selectedPlace.user_ratings_total && (
                    <span>({selectedPlace.user_ratings_total} reviews)</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-foreground/70 italic">
              Select a place to see details
            </div>
          )}
        </div>

        {/* MapView component */}
        <MapView
          ref={mapViewRef}
          onLoadingProgress={setLoadingPercentage}
          defaultLocation={DEFAULT_LOCATION}
          initialDate={currentDate}
          onMarkerSelected={handleMarkerSelected}
        />

        {/* Loading indicator overlay */}
        {loadingPercentage > 0 && loadingPercentage < 100 && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 rounded-md bg-white/25 backdrop-blur-md px-3 py-2 text-sm shadow-lg border border-white/20">
            Loading map: {loadingPercentage}%
          </div>
        )}

        {/* Date and time controls overlay at the bottom with glassmorphism */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 px-6 py-4 rounded-lg bg-white/25 backdrop-blur-md border border-white/20 shadow-lg w-4/5 max-w-3xl">
          <div className="space-y-4">
            <div className="flex flex-row items-center justify-between gap-4">
              <DatePicker date={currentDate} setDate={handleDateChange} />
              <TimePicker
                value={currentDate.getHours() + currentDate.getMinutes() / 60}
                onChange={(h: number) => {
                  const updatedDateTime = new Date(currentDate)
                  const whole = Math.floor(h)
                  const mins = Math.round((h - whole) * 60)
                  // Preserve the current date, only update hours and minutes
                  const safeHour = Math.floor(h) % 24
                  updatedDateTime.setHours(safeHour, mins, 0, 0)
                  setCurrentDate(updatedDateTime)
                  mapViewRef.current?.setDate(updatedDateTime)
                }}
              />
            </div>
            <TimeSlider
              sunriseHour={sunriseDecimal}
              sunsetHour={sunsetDecimal}
              value={currentDate.getHours() + currentDate.getMinutes() / 60}
              onChange={(h: number) => {
                const updatedDateTime = new Date(currentDate)
                const whole = Math.floor(h)
                console.log("whole", whole)
                const mins = Math.round((h - whole) * 60)
                // Preserve the current date, only update hours and minutes
                const safeHour = Math.floor(h) % 24
                updatedDateTime.setHours(safeHour, mins, 0, 0)
                setCurrentDate(updatedDateTime)
                mapViewRef.current?.setDate(updatedDateTime)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
