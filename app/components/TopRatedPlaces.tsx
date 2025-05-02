"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getPlacePhotoUrl,
  searchTopOutdoorPlaces,
} from "@/app/actions/googlePlaces"
import type { PlaceResult } from "@/app/actions/googlePlaces"

interface TopRatedPlacesProps {
  location: { lat: number; lng: number }
  onPlaceSelect: (place: {
    geometry: { location: { lat: number; lng: number } }
    outdoorSeating: boolean
  }) => void
}

interface PlaceWithPhoto extends PlaceResult {
  photoDataUrl?: string
  isLoadingPhoto?: boolean
}

export default function TopRatedPlaces({
  location,
  onPlaceSelect,
}: TopRatedPlacesProps) {
  const [places, setPlaces] = useState<PlaceWithPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Separate effect for loading photos
  useEffect(() => {
    const loadPhotos = async () => {
      const updatedPlaces = await Promise.all(
        places.map(async (place) => {
          if (
            place.photos?.[0] &&
            !place.photoDataUrl &&
            !place.isLoadingPhoto
          ) {
            try {
              // Mark as loading
              setPlaces((current) =>
                current.map((p) =>
                  p.place_id === place.place_id
                    ? { ...p, isLoadingPhoto: true }
                    : p
                )
              )

              const photoDataUrl = await getPlacePhotoUrl(
                place.photos[0].photo_reference
              )
              return { ...place, photoDataUrl, isLoadingPhoto: false }
            } catch (err) {
              console.error("Error fetching photo for place:", place.name, err)
              return { ...place, isLoadingPhoto: false }
            }
          }
          return place
        })
      )
      setPlaces(updatedPlaces)
    }

    if (places.length > 0) {
      loadPhotos()
    }
  }, [places.length]) // Only run when places are initially loaded

  useEffect(() => {
    const fetchTopPlaces = async () => {
      setLoading(true)
      setError(null)

      try {
        const results = await searchTopOutdoorPlaces({
          location,
          type: "restaurant,bar",
          keyword: "outdoor seating",
        })

        setPlaces(results.slice(0, 5))
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchTopPlaces()
  }, [location])

  const handlePlaceClick = (place: PlaceWithPhoto) => {
    onPlaceSelect({
      geometry: place.geometry,
      outdoorSeating: true,
    })
  }

  if (loading) {
    return <div className="p-4">Loading top places...</div>
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium">Top Rated Outdoor Places</h3>
      {places.length === 0 ? (
        <p className="text-sm text-muted-foreground">No places found nearby</p>
      ) : (
        places.map((place) => (
          <Card key={place.place_id} className="overflow-hidden relative group">
            {place.photoDataUrl && (
              <div className="absolute inset-0 z-0">
                <img
                  src={place.photoDataUrl}
                  alt={place.name}
                  className="object-cover w-full h-full opacity-20 group-hover:opacity-30 transition-opacity"
                />
              </div>
            )}
            <div className="relative z-10">
              <CardHeader className="p-3 pb-1">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">
                      {place.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {place.vicinity}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Sun className="h-4 w-4 text-amber-500" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs bg-background/80 backdrop-blur-sm hover:bg-background/90"
                  onClick={() => handlePlaceClick(place)}
                >
                  Add to Map
                </Button>
              </CardContent>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
