"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { searchTopOutdoorPlaces } from "@/app/actions/googlePlaces"
import type { PlaceResult } from "@/app/actions/googlePlaces"

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
          <Card key={place.place_id} className="overflow-hidden">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm font-medium flex justify-between">
                <span className="truncate">{place.name}</span>
                <span className="flex items-center text-amber-500">
                  {place.rating} <Star className="ml-1 h-3 w-3 fill-current" />
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-xs text-muted-foreground mb-2 truncate">
                {place.vicinity}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => handlePlaceClick(place)}
              >
                Add to Map
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
