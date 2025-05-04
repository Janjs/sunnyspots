"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, Sun } from "lucide-react"
import { searchTopOutdoorPlaces } from "@/app/actions/googlePlaces"
import type { PlaceResult } from "@/app/actions/googlePlaces"
import Image from "next/image"

interface TopRatedPlacesProps {
  location: { lat: number; lng: number }
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
}: {
  place: PlaceWithPhoto
  onClick: () => void
}) => {
  const photoReference = place.photos?.[0]?.photo_reference
  const photoUrl = photoReference
    ? `/api/place/photo?reference=${encodeURIComponent(
        photoReference
      )}&width=400`
    : undefined

  return (
    <Card
      className="overflow-hidden relative group cursor-pointer transition-all hover:ring-1 hover:shadow-md from-blue-500 h-64"
      onClick={onClick}
    >
      <div className="absolute inset-0 z-0">
        {photoUrl && (
          <>
            <Image
              src={photoUrl}
              alt={place.name}
              className="object-cover opacity-100 group-hover:shadow-lg transition-opacity"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-500 from-20% via-40% via-blue-500/50" />
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
                <Sun className="h-4 w-4 text-yellow-300" />
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
        <div className="grid grid-cols-2 gap-6">
          {places.map((place) => (
            <PlaceCard
              key={place.place_id}
              place={place}
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
