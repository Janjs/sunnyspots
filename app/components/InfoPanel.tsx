"use client"

import { useState } from "react"
import { Star, Sun, Moon, ImageIcon } from "lucide-react"
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
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {}
  )
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  const hasSun = selectedPlace
    ? hasSunlight(
        currentDate,
        selectedPlace.geometry.location.lat,
        selectedPlace.geometry.location.lng
      )
    : false

  const handleImageLoad = (photoRef: string) => {
    setLoadingImages((prev) => ({ ...prev, [photoRef]: false }))
  }

  const handleImageError = (photoRef: string) => {
    setImageErrors((prev) => ({ ...prev, [photoRef]: true }))
    setLoadingImages((prev) => ({ ...prev, [photoRef]: false }))
  }

  return (
    <div className="p-3 rounded-lg bg-white/25 backdrop-blur-md border border-white/20 shadow-lg max-w-xl">
      {selectedPlace ? (
        <div className="text-foreground">
          <h2 className="text-lg font-medium">{selectedPlace.name}</h2>
          <div className="flex flex-row items-center justify-between mt-2">
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

          {selectedPlace.photos ? (
            selectedPlace.photos.length > 0 ? (
              <div className="mt-4 relative w-60">
                <Carousel className="w-full">
                  <CarouselContent>
                    {selectedPlace.photos.map((photo, index) => {
                      const photoRef = photo.photo_reference
                      // Initialize loading state for this image if not already set
                      if (loadingImages[photoRef] === undefined) {
                        setLoadingImages((prev) => ({
                          ...prev,
                          [photoRef]: true,
                        }))
                      }

                      return (
                        <CarouselItem key={index}>
                          <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
                            {imageErrors[photoRef] ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              </div>
                            ) : (
                              <>
                                {loadingImages[photoRef] && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="animate-pulse text-xs text-muted-foreground">
                                      Loading image...
                                    </div>
                                  </div>
                                )}
                                <Image
                                  src={`/api/place/photo?reference=${encodeURIComponent(
                                    photoRef
                                  )}&width=800`}
                                  alt={`${selectedPlace.name} photo ${
                                    index + 1
                                  }`}
                                  fill
                                  sizes="(max-width: 768px) 100vw, 800px"
                                  style={{ objectFit: "cover" }}
                                  className="rounded-md"
                                  priority={index === 0}
                                  onLoad={() => handleImageLoad(photoRef)}
                                  onError={() => handleImageError(photoRef)}
                                />
                              </>
                            )}
                          </div>
                        </CarouselItem>
                      )
                    })}
                  </CarouselContent>
                  {selectedPlace.photos.length > 1 && (
                    <>
                      <CarouselPrevious className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-white/70 hover:bg-white/90" />
                      <CarouselNext className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-white/70 hover:bg-white/90" />
                    </>
                  )}
                </Carousel>
                <div className="text-xs text-muted-foreground mt-1 text-right">
                  {selectedPlace.photos.length} photo
                  {selectedPlace.photos.length !== 1 ? "s" : ""}
                </div>
              </div>
            ) : (
              <div className="mt-4 relative aspect-square w-full flex items-center justify-center bg-muted rounded-md">
                <div className="text-muted-foreground flex flex-col items-center">
                  <ImageIcon className="h-8 w-8 mb-2" />
                  <span className="text-sm">No photos available</span>
                </div>
              </div>
            )
          ) : (
            <div className="mt-4 relative aspect-square w-full flex items-center justify-center bg-muted rounded-md">
              <div className="animate-pulse text-muted-foreground">
                Loading photos...
              </div>
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
