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
import { fetchPlaceDetails } from "@/actions/googlePlaces"
import CityTitle from "@/app/components/CityTitle"
import EditCityModal from "@/app/components/EditCityModal"
import WeatherDisplay from "@/app/components/WeatherDisplay"

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
    outdoorSeating: boolean,
    name?: string
  ) => void
  setDate: (date: Date) => void
  addMarkers: (
    places: {
      geometry: { location: { lat: number; lng: number } }
      outdoorSeating: boolean
      place_id?: string
      name?: string
    }[]
  ) => void
  centerOnLocation: (coordinates: { lat: number; lng: number }) => void
  clearMarkers: () => void
  selectMarkerAtLocation: (coordinates: { lat: number; lng: number }) => void
}

export default function MapUI() {
  const [loadingPercentage, setLoadingPercentage] = useState(0)
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_LOCATION)
  const [currentCity, setCurrentCity] = useState("Utrecht")
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>()
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null)
  const [coordinatesPlaceIdMap, setCoordinatesPlaceIdMap] = useState<
    Map<string, string>
  >(new Map())
  const [placesData, setPlacesData] = useState<PlaceResult[]>([])
  const mapViewRef = useRef<MapViewRef | null>(null)
  const [isEditCityModalOpen, setIsEditCityModalOpen] = useState(false)

  const handlePlaceSelect = (
    place: PlaceSelectData & { address_components?: any[] }
  ) => {
    if (place.geometry?.location) {
      const coordinates = {
        lng: place.geometry.location.lng,
        lat: place.geometry.location.lat,
      }
      setCurrentLocation(coordinates)
      mapViewRef.current?.addMarker(
        coordinates,
        place.outdoorSeating,
        place.name
      )
      setSelectedPlaceId(undefined)
      setSelectedPlace(null)
      if (place.address_components) {
        const cityComponent = place.address_components.find((component) =>
          component.types.includes("locality")
        )
        if (cityComponent) {
          setCurrentCity(cityComponent.long_name)
        }
      }
    }
  }

  const handleCityNameChange = (newCity: string) => {
    setCurrentCity(newCity)
    // Potentially, you might want to clear current location or search results
    // if the city is manually changed, as the existing results might be for the old city.
    // For now, just updating the city name.
  }

  const handleDateChange = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const updatedDateTime = new Date(currentDate)
      updatedDateTime.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      )
      setCurrentDate(updatedDateTime)
      mapViewRef.current?.setDate(updatedDateTime)
    }
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
    mapViewRef.current?.selectMarkerAtLocation(coordinates)
    setSelectedPlaceId(place.place_id)
    if (place.place_id) {
      const fullPlace = placesData.find((p) => p.place_id === place.place_id)
      setSelectedPlace(fullPlace || null)
    }
  }

  const handleMarkerSelected = (
    coordinates: {
      lat: number
      lng: number
      place_id?: string
      name?: string
    } | null
  ) => {
    if (coordinates) {
      if (coordinates.place_id) {
        setSelectedPlaceId(coordinates.place_id)
        const fullPlace = placesData.find(
          (p) => p.place_id === coordinates.place_id
        )
        setSelectedPlace(fullPlace || null)
        return
      }
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
    setPlacesData(places)
    const newCoordinatesPlaceIdMap = new Map<string, string>()
    places.forEach((place) => {
      const coords = place.geometry.location
      const coordKey = `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`
      newCoordinatesPlaceIdMap.set(coordKey, place.place_id)
    })
    setCoordinatesPlaceIdMap(newCoordinatesPlaceIdMap)
    const placesWithOutdoorSeatingAndName = places.map((place) => ({
      geometry: place.geometry,
      outdoorSeating: true,
      place_id: place.place_id,
      name: place.name,
    }))
    mapViewRef.current?.addMarkers(placesWithOutdoorSeatingAndName)
  }

  const times = SunCalc.getTimes(
    currentDate,
    currentLocation.lat,
    currentLocation.lng
  )
  const sunriseDecimal =
    times.sunrise.getHours() + times.sunrise.getMinutes() / 60
  const sunsetDecimal = times.sunset.getHours() + times.sunset.getMinutes() / 60

  const openEditCityModal = () => setIsEditCityModalOpen(true)
  const closeEditCityModal = () => setIsEditCityModalOpen(false)

  const handleSaveCity = async (newCityData: {
    name: string
    placeId?: string
  }) => {
    const newCityName = newCityData.name.trim()
    if (newCityName) {
      setCurrentCity(newCityName)

      mapViewRef.current?.clearMarkers()
      setPlacesData([])
      setSelectedPlace(null)
      setSelectedPlaceId(undefined)

      if (newCityData.placeId) {
        try {
          const placeDetails = await fetchPlaceDetails(newCityData.placeId)
          if (placeDetails.geometry && placeDetails.geometry.location) {
            const newCoords = {
              lat: placeDetails.geometry.location.lat,
              lng: placeDetails.geometry.location.lng,
            }
            setCurrentLocation(newCoords)
            mapViewRef.current?.centerOnLocation(newCoords)
          } else {
            console.warn(
              "New city selected from autocomplete lacked geometry. Resetting location."
            )
            setCurrentLocation(DEFAULT_LOCATION)
            mapViewRef.current?.centerOnLocation(DEFAULT_LOCATION)
          }
        } catch (error) {
          console.error(
            "Error fetching place details for new city, resetting location:",
            error
          )
          setCurrentLocation(DEFAULT_LOCATION)
          mapViewRef.current?.centerOnLocation(DEFAULT_LOCATION)
        }
      } else {
        console.warn(
          "New city typed manually. Map location reset to default. Consider implementing name-based geocoding."
        )
        setCurrentLocation(DEFAULT_LOCATION)
        mapViewRef.current?.centerOnLocation(DEFAULT_LOCATION)
      }
    }
    closeEditCityModal()
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="w-1/2 flex-shrink-0 bg-background overflow-y-auto">
        <div className="flex-col gap-4 p-6">
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
      <div className="relative flex-1 bg-background">
        <div className="absolute top-4 left-4 z-10 px-4 py-3 rounded-lg bg-white/25 backdrop-blur-md border border-white/20 shadow-lg flex justify-between items-center">
          <CityTitle city={currentCity} onEditRequest={openEditCityModal} />
          <div className="ml-4">
            <WeatherDisplay
              latitude={currentLocation.lat}
              longitude={currentLocation.lng}
            />
          </div>
        </div>
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
        <MapView
          ref={mapViewRef}
          onLoadingProgress={setLoadingPercentage}
          defaultLocation={currentLocation}
          initialDate={currentDate}
          onMarkerSelected={handleMarkerSelected}
        />
        {loadingPercentage > 0 && loadingPercentage < 100 && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 rounded-md bg-white/25 backdrop-blur-md px-3 py-2 text-sm shadow-lg border border-white/20">
            Loading map: {loadingPercentage}%
          </div>
        )}
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
                const safeHour = Math.floor(h) % 24
                updatedDateTime.setHours(safeHour, mins, 0, 0)
                setCurrentDate(updatedDateTime)
                mapViewRef.current?.setDate(updatedDateTime)
              }}
            />
          </div>
        </div>
      </div>
      <EditCityModal
        isOpen={isEditCityModalOpen}
        currentCity={currentCity}
        onClose={closeEditCityModal}
        onSave={handleSaveCity}
        placeholder="Enter city name e.g. Amsterdam"
        currentLocationForBias={currentLocation}
      />
    </div>
  )
}
