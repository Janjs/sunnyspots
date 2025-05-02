"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, Sun } from "lucide-react"
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
  onPlacesLoaded?: (places: PlaceResult[]) => void
}

interface PlaceWithPhoto extends PlaceResult {
  photoDataUrl?: string
  isLoadingPhoto?: boolean
}

export default function TopRatedPlaces({
  location,
  onPlaceSelect,
  onPlacesLoaded,
}: TopRatedPlacesProps) {
  const [places, setPlaces] = useState<PlaceWithPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load photos for a single place
  const loadPlacePhoto = async (
    place: PlaceWithPhoto
  ): Promise<PlaceWithPhoto> => {
    if (!place.photos?.[0] || place.photoDataUrl || place.isLoadingPhoto) {
      return place
    }

    try {
      const photoDataUrl = await getPlacePhotoUrl(
        place.photos[0].photo_reference
      )
      console.log("response", photoDataUrl)
      return { ...place, photoDataUrl, isLoadingPhoto: false }
    } catch (err) {
      console.error("Error fetching photo for place:", place.name, err)
      return { ...place, isLoadingPhoto: false }
    }
  }

  // Effect to load photos when places change
  useEffect(() => {
    if (places.length === 0) return

    const loadPhotos = async () => {
      // Mark all places as loading that need photos
      setPlaces((current) =>
        current.map((place) =>
          place.photos?.[0] && !place.photoDataUrl && !place.isLoadingPhoto
            ? { ...place, isLoadingPhoto: true }
            : place
        )
      )

      // Load photos for all places
      const updatedPlaces = await Promise.all(places.map(loadPlacePhoto))

      setPlaces(updatedPlaces)
    }

    loadPhotos()
  }, [places.length])

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

        // Map the results without depending on current places state
        const topPlaces = results.slice(0, 5).map((place) => ({
          ...place,
          isLoadingPhoto: false,
          photoDataUrl: undefined,
        }))

        // Use the setter function form to access current places state
        setPlaces((currentPlaces) => {
          return topPlaces.map((place) => {
            const existingPlace = currentPlaces.find(
              (p) => p.place_id === place.place_id
            )
            return {
              ...place,
              photoDataUrl: existingPlace?.photoDataUrl,
              isLoadingPhoto: false,
            }
          })
        })

        onPlacesLoaded?.(topPlaces)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchTopPlaces()
  }, [location, onPlacesLoaded])

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
        places.map((place) => {
          console.log(place.photoDataUrl)
          return (
            <Card
              key={place.place_id}
              className="overflow-hidden relative group cursor-pointer transition-all hover:ring-1 hover:ring-border hover:shadow-lg"
              onClick={() => handlePlaceClick(place)}
            >
              {place.photoDataUrl && (
                <div className="absolute inset-0 z-0">
                  <img
                    src={place.photoDataUrl}
                    alt={place.name}
                    className="object-cover w-full h-full opacity-50 group-hover:opacity-50 transition-opacity"
                  />
                </div>
              )}
              <div className="relative z-10 bg-background/60 backdrop-blur-[2px]">
                <CardHeader className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-medium transition-colors">
                        {place.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {place.vicinity}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Sun className="h-4 w-4 text-accent-foreground" />
                    </div>
                  </div>
                </CardHeader>
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}
