"use client"

import { useRef, useState, useEffect } from "react"
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
import InfoPanel from "@/app/components/InfoPanel"
import DynamicFavicon from "@/app/components/DynamicFavicon"
import { useIsMobile } from "@/components/ui/use-mobile"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { PlaceType } from "./types/places"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

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
      type: PlaceType
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
  const [isEditCityOpen, setEditCityOpen] = useState(false)
  const [layoutReady, setLayoutReady] = useState(false)
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [infoPanelVisible, setInfoPanelVisible] = useState(true)
  const [currentZoom, setCurrentZoom] = useState(15)

  // Only set layout state once we've detected device type
  useEffect(() => {
    if (isMobile !== undefined) {
      setSidebarOpen(!isMobile)
      setLayoutReady(true)
    }
  }, [isMobile])

  // Reset InfoPanel visibility when selectedPlace changes
  useEffect(() => {
    if (selectedPlace) {
      setInfoPanelVisible(true)
    }
  }, [selectedPlace])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setEditCityOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

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
    setInfoPanelVisible(true)

    if (place.place_id) {
      const existingPlace = placesData.find(
        (p) => p.place_id === place.place_id
      )
      setSelectedPlace(existingPlace || null)
    }

    // Close sidebar when a place is selected
    if (isMobile) {
      setSidebarOpen(false)
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
      let placeId = coordinates.place_id

      // If no direct place_id, try to find it from coordinates
      if (!placeId) {
        const coordKey = `${coordinates.lat.toFixed(
          6
        )},${coordinates.lng.toFixed(6)}`
        placeId = coordinatesPlaceIdMap.get(coordKey)
      }

      setSelectedPlaceId(placeId)
      setInfoPanelVisible(true)

      if (placeId) {
        const existingPlace = placesData.find((p) => p.place_id === placeId)
        setSelectedPlace(existingPlace || null)
      } else {
        setSelectedPlace(null)
      }

      // Close sidebar when a marker is selected on mobile
      if (isMobile) {
        setSidebarOpen(false)
      }
    } else {
      setSelectedPlaceId(undefined)
      setSelectedPlace(null)
    }
  }

  const handleCloseInfoPanel = () => {
    setInfoPanelVisible(false)
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
      type: place.type,
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
          if (
            placeDetails &&
            placeDetails.geometry &&
            placeDetails.geometry.location
          ) {
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
    setEditCityOpen(false)
  }

  // Don't render anything layout-dependent until we know the device type
  if (!layoutReady) {
    return (
      <div className="h-[100dvh] w-full overflow-hidden">
        <div className="relative h-full w-full bg-background">
          {/* MapView as the base layer - this always renders */}
          <div className="absolute inset-0 z-0">
            <MapView
              ref={mapViewRef}
              onLoadingProgress={setLoadingPercentage}
              defaultLocation={currentLocation}
              initialDate={currentDate}
              onMarkerSelected={handleMarkerSelected}
              isMobile={isMobile}
              onZoomLevelChange={setCurrentZoom}
            />
          </div>

          {loadingPercentage > 0 && loadingPercentage < 100 && (
            <div className="absolute top-28 left-1/2 -translate-x-1/2 z-10 rounded-md bg-white/25 backdrop-blur-md px-3 py-2 text-sm shadow-lg border border-white/20">
              Loading map: {loadingPercentage}%
            </div>
          )}

          {loadingPercentage >= 100 && currentZoom < 15 && (
            <div className="absolute top-28 left-1/2 -translate-x-1/2 z-10 rounded-md bg-white/25 backdrop-blur-md px-3 py-2 text-sm shadow-lg border border-white/20">
              Zoom in to see building shadows
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] w-full overflow-hidden">
      <div className="relative h-full w-full bg-background">
        {/* MapView as the base layer */}
        <div className="absolute inset-0 z-0">
          <MapView
            ref={mapViewRef}
            onLoadingProgress={setLoadingPercentage}
            defaultLocation={currentLocation}
            initialDate={currentDate}
            onMarkerSelected={handleMarkerSelected}
            isMobile={isMobile}
            onZoomLevelChange={setCurrentZoom}
          />
        </div>

        {/* City Title and Weather Display */}
        <div
          className={`absolute top-4 z-10 px-4 py-4 rounded-lg bg-white/25 backdrop-blur-md border border-white/20 shadow-lg ${
            isMobile ? "left-4 right-4 w-auto" : "left-1/2 -translate-x-1/2"
          }`}
        >
          <div className="flex justify-between items-center">
            <div className={isMobile ? "ml-12" : ""}>
              <CityTitle
                city={currentCity}
                onEditRequest={() => setEditCityOpen(true)}
              />
            </div>
            <div className={isMobile ? "" : "ml-4"}>
              <WeatherDisplay
                latitude={currentLocation.lat}
                longitude={currentLocation.lng}
              />
            </div>
          </div>
        </div>

        {/* Mobile sidebar with Sheet component */}
        {isMobile && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-8 top-[2.35rem] z-20 bg-white/20 backdrop-blur-sm rounded-lg shadow-sm overflow-hidden group"
              >
                <Menu className="h-5 w-5 transition-all duration-300 ease-in-out group-hover:scale-110" />
                <span className="sr-only">Open places menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="p-0 w-[85%] max-w-[350px] [&>button]:hidden"
            >
              <SheetTitle className="sr-only">Places Navigation</SheetTitle>
              <div className="h-full flex p-4 gap-3 flex-col bg-white/25 backdrop-blur-md relative">
                {/* Custom close button positioned outside the sidebar */}
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute -right-14 top-4 bg-white/80 backdrop-blur-md rounded-lg shadow-sm overflow-hidden group"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-5 w-5 transition-all duration-300 ease-in-out group-hover:rotate-90 group-hover:scale-110" />
                  <span className="sr-only">Close menu</span>
                </Button>
                <div className="p-1">
                  <PlacesAutocomplete
                    onPlaceSelect={handlePlaceSelect}
                    defaultLocation={DEFAULT_LOCATION}
                  />
                </div>
                <div className="flex-1 overflow-y-auto p-1">
                  <TopRatedPlaces
                    location={currentLocation}
                    dateTime={currentDate}
                    onPlaceSelect={handlePlaceFromListSelect}
                    onPlacesLoaded={handlePlacesLoaded}
                    selectedPlaceId={selectedPlaceId}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Desktop sidebar */}
        {!isMobile && (
          <div className="absolute left-4 top-4 bottom-4 z-10 flex flex-col gap-4 w-96">
            <div className="h-full flex p-4 gap-3 flex-col rounded-lg bg-white/25 backdrop-blur-md border border-white/20 shadow-lg">
              <div className="p-1">
                <PlacesAutocomplete
                  onPlaceSelect={handlePlaceSelect}
                  defaultLocation={DEFAULT_LOCATION}
                />
              </div>
              <div className="flex-1 overflow-y-auto p-1">
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
        )}

        {/* Selected place info panel */}
        <div
          className={`absolute top-4 z-10 ${
            isMobile ? "left-0 right-0 px-4" : "right-4"
          }`}
        >
          {infoPanelVisible && selectedPlace && (
            <InfoPanel
              selectedPlace={selectedPlace}
              currentDate={currentDate}
              onClose={handleCloseInfoPanel}
            />
          )}
        </div>

        {loadingPercentage > 0 && loadingPercentage < 100 && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 z-10 rounded-md bg-white/25 backdrop-blur-md px-3 py-2 text-sm shadow-lg border border-white/20">
            Loading map: {loadingPercentage}%
          </div>
        )}

        {loadingPercentage >= 100 && currentZoom < 15 && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 z-10 rounded-md bg-white/25 backdrop-blur-md px-3 py-2 text-sm shadow-lg border border-white/20">
            Zoom in to see building shadows
          </div>
        )}

        {/* Time controls panel at bottom */}
        <div
          className={`absolute bottom-8 z-10 p-4 rounded-lg bg-white/15 backdrop-blur-md border border-white/20 shadow-lg ${
            isMobile
              ? "left-4 right-4 w-auto"
              : "left-1/2 -translate-x-1/2 w-4/5 max-w-lg"
          }`}
        >
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
        isOpen={isEditCityOpen}
        currentCity={currentCity}
        onClose={() => setEditCityOpen(false)}
        onSave={handleSaveCity}
        placeholder="Enter city name e.g. Amsterdam"
        currentLocationForBias={currentLocation}
      />

      {/* Dynamic favicon that changes based on sunlight status */}
      <DynamicFavicon
        currentDate={currentDate}
        latitude={currentLocation.lat}
        longitude={currentLocation.lng}
      />
    </div>
  )
}
