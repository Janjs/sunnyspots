"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, Sun, Moon } from "lucide-react"
import { searchTopOutdoorPlaces } from "@/app/actions/googlePlaces"
import type { PlaceResult } from "@/app/actions/googlePlaces"
import Image from "next/image"
import { hasSunlight } from "@/utils/sunlight"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { useIsMobile } from "@/hooks/use-mobile"

interface TopRatedPlacesProps {
  location: { lat: number; lng: number }
  dateTime: Date
  onPlaceSelect: (place: {
    geometry: { location: { lat: number; lng: number } }
    outdoorSeating: boolean
  }) => void
  onPlacesLoaded?: (places: PlaceResult[]) => void
}

interface PlaceWithPhoto extends PlaceResult {
  photoUrl?: string
}

const PlaceCard = ({
  place,
  onClick,
  dateTime,
}: {
  place: PlaceWithPhoto
  onClick: () => void
  dateTime: Date
}) => {
  const photoReference = place.photos?.[0]?.photo_reference
  const photoUrl = photoReference
    ? `/api/place/photo?reference=${encodeURIComponent(
        photoReference
      )}&width=400`
    : undefined

  const hasSun = hasSunlight(
    dateTime,
    place.geometry.location.lat,
    place.geometry.location.lng
  )

  return (
    <Card
      className="overflow-hidden relative group cursor-pointer transition-all hover:ring-1 hover:shadow-md from-blue-500 h-64"
      onClick={onClick}
    >
      <div className="absolute inset-0 z-0">
        {photoUrl && (
          <>
            {" "}
            <Image
              src={photoUrl}
              alt={place.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={false}
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
                <CardTitle className="text-base font-bold text-white transition-colors">
                  {place.name}
                </CardTitle>
                <p className="text-xs text-blue-100 mt-0.5">{place.vicinity}</p>
              </div>
              <div className="min-w-4 min-h-4">
                {hasSun ? (
                  <Sun className="h-4 w-4 text-yellow-100" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </div>
    </Card>
  )
}

export default function TopRatedPlaces({
  location,
  onPlaceSelect,
  onPlacesLoaded,
  dateTime,
}: TopRatedPlacesProps) {
  const [places, setPlaces] = useState<PlaceWithPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevLocationRef = useRef<{ lat: number; lng: number } | null>(null)
  const isMobile = useIsMobile()

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
          type: "restaurant,bar",
          keyword: "outdoor seating",
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

  if (loading) {
    return (
      <div className="p-4 text-muted-foreground">Loading top places...</div>
    )
  }

  if (error) {
    return <div className="p-4 text-destructive">Error: {error}</div>
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-foreground">Top Rated Outdoor Places</h3>
      {places.length === 0 ? (
        <p className="text-sm text-muted-foreground">No places found nearby</p>
      ) : (
        <div
          className={`grid grid-cols-2 gap-6 ${
            isMobile ? "grid-cols-2" : "grid-cols-3"
          }`}
        >
          {places.map((place) => (
            <PlaceCard
              key={place.place_id}
              place={place}
              dateTime={dateTime}
              onClick={() =>
                onPlaceSelect({
                  geometry: place.geometry,
                  outdoorSeating: true,
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
