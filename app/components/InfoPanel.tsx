"use client"

import { Star, Sun, Moon } from "lucide-react"
import Image from "next/image"
import { hasSunlight } from "@/utils/sunlight"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import type { PlaceResult } from "@/app/actions/googlePlaces"

interface InfoPanelProps {
  selectedPlace: PlaceResult | null
  currentDate: Date
}

export default function InfoPanel({
  selectedPlace,
  currentDate,
}: InfoPanelProps) {
  const hasSun = selectedPlace
    ? hasSunlight(
        currentDate,
        selectedPlace.geometry.location.lat,
        selectedPlace.geometry.location.lng
      )
    : false

  return (
    <div className="px-6 py-4 rounded-lg bg-white/25 backdrop-blur-md border border-white/20 shadow-lg max-w-md">
      {selectedPlace ? (
        <div className="text-foreground">
          <h2 className="text-xl font-semibold">{selectedPlace.name}</h2>
          <div className="flex items-center justify-between mt-2">
            {selectedPlace.rating && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                <span className="text-base">{selectedPlace.rating}</span>
                {selectedPlace.user_ratings_total && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedPlace.user_ratings_total})
                  </span>
                )}
              </div>
            )}
            <div>
              {hasSun ? (
                <Sun className="h-6 w-6 text-yellow-400" />
              ) : (
                <Moon className="h-6 w-6 text-slate-400" />
              )}
            </div>
          </div>

          {selectedPlace.photos && selectedPlace.photos.length > 0 && (
            <div className="mt-4 relative">
              <Carousel className="w-full">
                <CarouselContent>
                  {selectedPlace.photos.map((photo, index) => (
                    <CarouselItem key={index}>
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md">
                        <Image
                          src={`/api/place/photo?reference=${encodeURIComponent(
                            photo.photo_reference
                          )}&width=600`}
                          alt={`${selectedPlace.name} photo ${index + 1}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 600px"
                          style={{ objectFit: "cover" }}
                          className="rounded-md"
                          priority={index === 0}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {selectedPlace.photos.length > 1 && (
                  <>
                    <CarouselPrevious className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-white/70 hover:bg-white/90" />
                    <CarouselNext className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-white/70 hover:bg-white/90" />
                  </>
                )}
              </Carousel>
            </div>
          )}
        </div>
      ) : (
        <div className="text-base text-foreground/70 italic">
          Select a place to see details
        </div>
      )}
    </div>
  )
}
