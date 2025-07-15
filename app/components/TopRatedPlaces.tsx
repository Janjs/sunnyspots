"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Star,
  Sun,
  Moon,
  Utensils,
  Martini,
  Trees,
  Info,
  TriangleAlert,
} from "lucide-react"
import {
  searchTopOutdoorPlaces,
  fetchPlaceDetails,
} from "@/app/actions/googlePlaces"
import type { PlaceResult } from "@/app/actions/googlePlaces"
import Image from "next/image"
import { hasSunlight } from "@/utils/sunlight"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { PlaceType } from "@/app/types/places"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Place, PlaceSelectData } from "./PlacesAutocomplete"

interface TopRatedPlacesProps {
  location: { lat: number; lng: number }
  dateTime: Date
  onPlaceSelect: (place: {
    geometry: { location: { lat: number; lng: number } }
    outdoorSeating: boolean
    place_id: string
    name?: string
    type: PlaceType
  }) => void
  onPlacesLoaded?: (places: PlaceResult[]) => void
  selectedPlaceId?: string
  searchResults?: Place[]
  isSearchMode?: boolean
  onSearchPlaceSelect?: (place: any) => void
  onAddToTopPlaces?: (place: PlaceWithPhoto) => void
  allPlacesData?: PlaceResult[]
}

interface PlaceWithPhoto extends PlaceResult {
  photoUrl?: string
  type: PlaceType
}

const PLACE_TYPE_TABS: { label: string; value: PlaceType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Restaurant", value: PlaceType.Restaurant },
  { label: "Bar", value: PlaceType.Bar },
  { label: "Park", value: PlaceType.Park },
  { label: "Cafe", value: PlaceType.Cafe },
]

const PlaceCard = ({
  place,
  onClick,
  dateTime,
  isSelected,
}: {
  place: PlaceWithPhoto
  onClick: () => void
  dateTime: Date
  isSelected?: boolean
}) => {
  const photoReference = place.photos?.[0]?.photo_reference
  const photoUrl = photoReference
    ? `/api/place/photo?photoReference=${encodeURIComponent(
        photoReference
      )}&maxwidth=400&maxheight=400`
    : null

  const hasSun = hasSunlight(
    dateTime,
    place.geometry.location.lat,
    place.geometry.location.lng
  )

  const getPlaceIcon = (placeType: PlaceType | undefined) => {
    if (!placeType) return null
    if (placeType === PlaceType.Park)
      return <Trees className="h-4 w-4 text-green-300 ml-1" />
    if (placeType === PlaceType.Restaurant)
      return <Utensils className="h-4 w-4 text-orange-300 ml-1" />
    if (placeType === PlaceType.Bar)
      return <Martini className="h-4 w-4 text-purple-300 ml-1" />
    return null
  }

  return (
    <Card
      className={`overflow-hidden relative group cursor-pointer transition-all ${
        isSelected
          ? "ring-2 ring-primary shadow-lg"
          : "hover:ring-1 hover:shadow-md"
      } ${
        !photoUrl
          ? "bg-slate-800/60 backdrop-blur-lg border border-slate-700/50"
          : ""
      }`}
      onClick={onClick}
      data-place-id={place.place_id}
      data-place-lat={place.geometry.location.lat}
      data-place-lng={place.geometry.location.lng}
    >
      <AspectRatio ratio={1}>
        <div className="absolute inset-0 z-0">
          {photoUrl && (
            <>
              <Image
                src={photoUrl}
                alt={place.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={false}
                className="object-cover object-center"
                style={{
                  objectPosition: "center center",
                }}
              />
              <div
                className={`absolute inset-0 bg-gradient-to-t ${
                  hasSun
                    ? "from-blue-500 from-10% via-35% via-blue-500/40"
                    : "from-gray-700 from-10% via-35% via-gray-700/40"
                }`}
              />
            </>
          )}
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <CardHeader className="p-3 flex-1">
            <div className="flex flex-col h-full justify-between">
              <div></div>
              <div className="flex justify-between items-end w-full">
                <div>
                  <CardTitle className="text-base font-bold text-white transition-colors line-clamp-3">
                    {place.name}
                  </CardTitle>
                  <p className="text-xs text-blue-100 mt-0.5">
                    {place.vicinity}
                  </p>
                </div>
                <div className="min-w-4 min-h-4 flex items-center">
                  {getPlaceIcon(place.type)}
                  {hasSun ? (
                    <Sun className="h-4 w-4 text-yellow-100 ml-1" />
                  ) : (
                    <Moon className="h-4 w-4 text-slate-400 ml-1" />
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </div>
      </AspectRatio>
    </Card>
  )
}

const SearchPlaceCard = ({
  place,
  onClick,
  isSelected,
  dateTime,
}: {
  place: Place
  onClick: () => void
  isSelected?: boolean
  dateTime: Date
}) => {
  const [placeDetails, setPlaceDetails] = useState<PlaceSelectData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true)
      try {
        const details = await fetchPlaceDetails(place.placeId)
        if (details) {
          setPlaceDetails(details)
        }
      } catch (error) {
        console.error("Error fetching place details for search result:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [place.placeId])

  const photoReference = placeDetails?.photos?.[0]?.photo_reference
  const photoUrl = photoReference
    ? `/api/place/photo?photoReference=${encodeURIComponent(
        photoReference
      )}&maxwidth=400&maxheight=400`
    : null

  const hasSun = placeDetails?.geometry?.location
    ? hasSunlight(
        dateTime,
        placeDetails.geometry.location.lat,
        placeDetails.geometry.location.lng
      )
    : false

  const getPlaceIcon = (placeType: PlaceType | undefined) => {
    if (!placeType) return null
    if (placeType === PlaceType.Park)
      return <Trees className="h-4 w-4 text-green-300 ml-1" />
    if (placeType === PlaceType.Restaurant)
      return <Utensils className="h-4 w-4 text-orange-300 ml-1" />
    if (placeType === PlaceType.Bar)
      return <Martini className="h-4 w-4 text-purple-300 ml-1" />
    return null
  }

  return (
    <Card
      className={`overflow-hidden relative group cursor-pointer transition-all ${
        isSelected
          ? "ring-2 ring-primary shadow-lg"
          : "hover:ring-1 hover:shadow-md"
      } ${
        !photoUrl
          ? "bg-slate-800/60 backdrop-blur-lg border border-slate-700/50"
          : ""
      }`}
      onClick={onClick}
      data-place-id={place.placeId}
    >
      <AspectRatio ratio={1}>
        <div className="absolute inset-0 z-0">
          {photoUrl && (
            <>
              <Image
                src={photoUrl}
                alt={place.structuredFormat.mainText.text}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={false}
                className="object-cover object-center"
                style={{
                  objectPosition: "center center",
                }}
              />
              <div
                className={`absolute inset-0 bg-gradient-to-t ${
                  hasSun
                    ? "from-blue-500 from-10% via-35% via-blue-500/40"
                    : "from-gray-700 from-10% via-35% via-gray-700/40"
                }`}
              />
            </>
          )}
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <CardHeader className="p-3 flex-1">
            <div className="flex flex-col h-full justify-between">
              <div></div>
              <div className="flex justify-between items-end w-full">
                <div>
                  <CardTitle className="text-base font-bold text-white transition-colors line-clamp-3">
                    {place.structuredFormat.mainText.text}
                  </CardTitle>
                  <p className="text-xs text-blue-100 mt-0.5">
                    {place.structuredFormat.secondaryText.text}
                  </p>
                </div>
                <div className="min-w-4 min-h-4 flex items-center">
                  {getPlaceIcon(place.type)}
                  {placeDetails?.geometry?.location &&
                    (hasSun ? (
                      <Sun className="h-4 w-4 text-yellow-100 ml-1" />
                    ) : (
                      <Moon className="h-4 w-4 text-slate-400 ml-1" />
                    ))}
                </div>
              </div>
            </div>
          </CardHeader>
        </div>
      </AspectRatio>
    </Card>
  )
}

export default function TopRatedPlaces({
  location,
  onPlaceSelect,
  onPlacesLoaded,
  dateTime,
  selectedPlaceId,
  searchResults,
  isSearchMode,
  onSearchPlaceSelect,
  onAddToTopPlaces,
  allPlacesData,
}: TopRatedPlacesProps) {
  const [selectedPlaceType, setSelectedPlaceType] = useState<PlaceType | "all">(
    "all"
  )
  const [places, setPlaces] = useState<PlaceWithPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevLocationRef = useRef<{ lat: number; lng: number } | null>(null)
  const prevSearchModeRef = useRef<boolean | null>(null)

  const hasLocationChanged = () => {
    if (!prevLocationRef.current) return true
    return (
      prevLocationRef.current.lat !== location.lat ||
      prevLocationRef.current.lng !== location.lng
    )
  }

  useEffect(() => {
    const fetchTopPlaces = async () => {
      // Don't fetch if we're currently in search mode
      if (isSearchMode) return

      // Check if we're transitioning from search mode to non-search mode
      const exitingSearchMode =
        prevSearchModeRef.current === true && !isSearchMode

      // Don't fetch if location hasn't changed and we're not exiting search mode
      if (!hasLocationChanged() && !exitingSearchMode) return

      setLoading(true)
      setError(null)

      try {
        const results = await searchTopOutdoorPlaces({
          location,
        })

        const topPlaces = results.map((place) => ({
          ...place,
        }))

        setPlaces(topPlaces)
        onPlacesLoaded?.(topPlaces)
        prevLocationRef.current = location
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchTopPlaces()
    prevSearchModeRef.current = isSearchMode ?? false
  }, [location, onPlacesLoaded, isSearchMode])

  const handlePlaceSelect = (place: PlaceWithPhoto) => {
    onPlaceSelect({
      geometry: place.geometry,
      outdoorSeating: true,
      place_id: place.place_id,
      name: place.name,
      type: place.type,
    })
  }

  const handleSearchPlaceSelect = async (place: Place) => {
    try {
      const placeDetails = await fetchPlaceDetails(place.placeId)
      if (placeDetails) {
        // Use the name from the search result, not from API response which might be an ID
        const properName = place.structuredFormat.mainText.text

        // Convert to PlaceWithPhoto format
        const placeWithPhoto: PlaceWithPhoto = {
          place_id: placeDetails.place_id,
          name: properName,
          geometry: placeDetails.geometry,
          photos: placeDetails.photos,
          rating: (placeDetails as any).rating,
          user_ratings_total: (placeDetails as any).user_ratings_total,
          vicinity: placeDetails.formatted_address || "", // Use formatted_address as vicinity fallback
          type: placeDetails.type,
        }

        // Add to top places list if not already there
        onAddToTopPlaces?.(placeWithPhoto)

        // Create corrected place details with proper name for InfoPanel
        const correctedPlaceDetails: PlaceSelectData = {
          place_id: placeDetails.place_id,
          name: properName,
          geometry: placeDetails.geometry,
          formatted_address: placeDetails.formatted_address,
          outdoorSeating: true,
          photos: placeDetails.photos,
          type: placeDetails.type,
        }

        // Call the original onSearchPlaceSelect with corrected name
        onSearchPlaceSelect?.(correctedPlaceDetails)
      } else {
        console.error(
          "Failed to fetch place details for:",
          place.structuredFormat.mainText.text
        )
      }
    } catch (error) {
      console.error(
        "Error in handleSearchPlaceSelect after fetching place details:",
        error
      )
    }
  }

  // Filter places by selected type - use allPlacesData when not in search mode
  const displayPlaces =
    allPlacesData && !isSearchMode
      ? (allPlacesData as PlaceWithPhoto[])
      : places
  const filteredPlaces =
    selectedPlaceType === "all"
      ? displayPlaces
      : displayPlaces.filter((p) => p.type === selectedPlaceType)

  // Filter search results by selected type - simplify the logic
  const hasSearchResults = searchResults && searchResults.length > 0
  const filteredSearchResults = hasSearchResults
    ? selectedPlaceType === "all"
      ? searchResults
      : searchResults.filter((p) => p.type === selectedPlaceType)
    : []

  // Determine what to display - prioritize search results when available
  const displayedPlaces = hasSearchResults
    ? filteredSearchResults
    : filteredPlaces
  const showEmptyState = displayedPlaces.length === 0 && !loading && !error
  const currentlyInSearchMode = hasSearchResults || isSearchMode

  if (loading && !isSearchMode) {
    return (
      <div className="px-3">
        <Alert>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <AlertDescription>Loading...</AlertDescription>
          </div>
        </Alert>
      </div>
    )
  }

  if (error && !isSearchMode) {
    return (
      <div className="px-3">
        <Alert variant="destructive">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4" />
            <AlertDescription>Error: {error}</AlertDescription>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-x-hidden">
      <div className="flex gap-2 pb-3 px-2 flex-shrink-0 overflow-x-auto tab-scrollbar-hide">
        {PLACE_TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`px-4 py-1 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap backdrop-blur-md bg-transparent border border-transparent
              ${
                selectedPlaceType === tab.value
                  ? "bg-white/80 text-primary border-primary/60"
                  : "text-muted-foreground hover:bg-white/80 hover:text-foreground"
              }
              `}
            onClick={() => setSelectedPlaceType(tab.value)}
            aria-pressed={selectedPlaceType === tab.value}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {showEmptyState ? (
        <div className="px-3">
          <Alert>
            <div className="flex items-center gap-2 ">
              <Info className="h-4 w-4" />
              <AlertDescription>
                {currentlyInSearchMode
                  ? "No search results found"
                  : "No places found nearby"}
              </AlertDescription>
            </div>
          </Alert>
        </div>
      ) : (
        <div
          className="flex-1 w-full overflow-y-auto relative  tab-scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="grid gap-4 grid-cols-1 px-3 pb-4 pt-1">
            {hasSearchResults
              ? filteredSearchResults.map((place) => (
                  <div key={place.placeId} className="w-full">
                    <SearchPlaceCard
                      place={place}
                      isSelected={place.placeId === selectedPlaceId}
                      onClick={() => handleSearchPlaceSelect(place)}
                      dateTime={dateTime}
                    />
                  </div>
                ))
              : filteredPlaces.map((place) => (
                  <div key={place.place_id} className="w-full">
                    <PlaceCard
                      place={place}
                      dateTime={dateTime}
                      isSelected={place.place_id === selectedPlaceId}
                      onClick={() => handlePlaceSelect(place)}
                    />
                  </div>
                ))}
          </div>
        </div>
      )}
    </div>
  )
}
