"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, Sun, Moon, Utensils, Martini, Trees } from "lucide-react"
import { searchTopOutdoorPlaces } from "@/app/actions/googlePlaces"
import type { PlaceResult } from "@/app/actions/googlePlaces"
import Image from "next/image"
import { hasSunlight } from "@/utils/sunlight"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { PlaceType } from "@/app/types/places"

interface TopRatedPlacesProps {
  location: { lat: number; lng: number }
  dateTime: Date
  onPlaceSelect: (place: {
    geometry: { location: { lat: number; lng: number } }
    outdoorSeating: boolean
    place_id: string
  }) => void
  onPlacesLoaded?: (places: PlaceResult[]) => void
  selectedPlaceId?: string
}

interface PlaceWithPhoto extends PlaceResult {
  photoUrl?: string
}

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
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&maxheight=400&photo_reference=${encodeURIComponent(
        photoReference
      )}&key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`
    : undefined

  const hasSun = hasSunlight(
    dateTime,
    place.geometry.location.lat,
    place.geometry.location.lng
  )

  const getPlaceIcon = (placeTypes: string[] | undefined) => {
    if (!placeTypes || placeTypes.length === 0) return null
    if (placeTypes.includes(PlaceType.Park))
      return <Trees className="h-4 w-4 text-green-300 ml-1" />
    if (placeTypes.includes(PlaceType.Restaurant))
      return <Utensils className="h-4 w-4 text-orange-300 ml-1" />
    if (placeTypes.includes(PlaceType.Bar))
      return <Martini className="h-4 w-4 text-purple-300 ml-1" />
    return null
  }

  return (
    <Card
      className={`overflow-hidden relative group cursor-pointer transition-all 
        hover:ring-1 hover:shadow-md from-blue-500
        ${isSelected ? "ring-2 ring-primary shadow-lg" : ""}`}
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
                  {getPlaceIcon(place.types)}
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

export default function TopRatedPlaces({
  location,
  onPlaceSelect,
  onPlacesLoaded,
  dateTime,
  selectedPlaceId,
}: TopRatedPlacesProps) {
  const [places, setPlaces] = useState<PlaceWithPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevLocationRef = useRef<{ lat: number; lng: number } | null>(null)

  const hasLocationChanged = () => {
    if (!prevLocationRef.current) return true
    return (
      prevLocationRef.current.lat !== location.lat ||
      prevLocationRef.current.lng !== location.lng
    )
  }

  useEffect(() => {
    const fetchTopPlaces = async () => {
      if (!hasLocationChanged()) return

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
  }, [location, onPlacesLoaded])

  const handlePlaceSelect = (place: PlaceWithPhoto) => {
    onPlaceSelect({
      geometry: place.geometry,
      outdoorSeating: true,
      place_id: place.place_id,
    })
  }

  if (loading) {
    return (
      <div className="p-4 text-muted-foreground">Loading top places...</div>
    )
  }

  if (error) {
    return <div className="p-4 text-destructive">Error: {error}</div>
  }

  return (
    <div>
      {places.length === 0 ? (
        <p className="text-sm text-muted-foreground">No places found nearby</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {places.map((place) => (
            <PlaceCard
              key={place.place_id}
              place={place}
              dateTime={dateTime}
              isSelected={place.place_id === selectedPlaceId}
              onClick={() => handlePlaceSelect(place)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
