"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { searchTopOutdoorPlaces } from "@/app/actions/googlePlaces"
import type { PlaceResult } from "@/app/actions/googlePlaces"
import Image from "next/image"

interface TopRatedPlacesProps {
  location: { lat: number; lng: number }
  onPlaceSelect: (place: {
    geometry: { location: { lat: number; lng: number } }
    outdoorSeating: boolean
  }) => void
}

export default function TopRatedPlaces({
  location,
  onPlaceSelect,
}: TopRatedPlacesProps) {
  const [places, setPlaces] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

        console.log("results", results)

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

  const handlePlaceClick = (place: PlaceResult) => {
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
            {place.photos && place.photos[0] && (
              <div className="absolute inset-0 z-0">
                <Image
                  src={""}
                  alt={place.name}
                  fill
                  className="object-cover opacity-20 group-hover:opacity-30 transition-opacity"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
