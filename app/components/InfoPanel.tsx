"use client"

import { useState } from "react"
import { Star, Sun, Moon, ImageIcon, X } from "lucide-react"
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
import { useIsMobile } from "@/components/ui/use-mobile"
import { Button } from "@/components/ui/button"
import { AspectRatio } from "@/components/ui/aspect-ratio"

interface InfoPanelProps {
  selectedPlace: PlaceResult | null
  currentDate: Date
  onClose?: () => void
}

export default function InfoPanel({
  selectedPlace,
  currentDate,
  onClose,
}: InfoPanelProps) {
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {}
  )
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  const isMobile = useIsMobile()
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
    <div
      className="relative flex  p-3 rounded-lg bg-white/25 backdrop-blur-md border border-white/20 shadow-lg"
      style={{
        width: isMobile ? "100%" : "20rem",
        marginTop: isMobile ? "6rem" : "0",
      }}
    >
      {selectedPlace ? (
        <div className={`flex ${isMobile ? "flex-row" : "flex-col"}`}>
          {/* Text Column */}
          <div className="flex flex-row flex-1 justify-between">
            <div className="flex flex-col">
              <h2 className="text-lg font-medium line-clamp-2">
                {selectedPlace.name}
              </h2>
              <div className="flex flex-row  gap-2 mt-2">
                {hasSun ? (
                  <Sun className="h-6 w-6 text-yellow-400" />
                ) : (
                  <Moon className="h-6 w-6 text-slate-400" />
                )}
                {selectedPlace.rating && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-3 w-3 fill-foreground" />
                    <span>{selectedPlace.rating}</span>
                    {selectedPlace.user_ratings_total && (
                      <span className="text-xs text-muted-foreground">
                        ({selectedPlace.user_ratings_total})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-full hover:bg-white/30 flex-shrink-0 z-10"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            )}
          </div>
          {/* Image Column */}
          {selectedPlace.photos && selectedPlace.photos.length > 0 && (
            <div
              className={`flex flex-col ${
                isMobile ? "w-24 h-24 flex-shrink-0" : "w-full"
              }`}
              style={{ marginTop: isMobile ? "0" : "1rem" }}
            >
              <Carousel className="w-full h-full">
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
                        <div className="relative aspect-square w-full h-full overflow-hidden rounded-md bg-muted">
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
                              <div className="w-full h-full flex items-center justify-center">
                                <Image
                                  src={`/api/place/photo?reference=${encodeURIComponent(
                                    photoRef
                                  )}&size=800`}
                                  alt={`${selectedPlace.name} photo ${
                                    index + 1
                                  }`}
                                  width={800}
                                  height={800}
                                  style={{
                                    objectFit: "cover",
                                    width: "100%",
                                    height: "100%",
                                    aspectRatio: "1/1",
                                  }}
                                  className="rounded-md"
                                  priority={index === 0}
                                  onLoad={() => handleImageLoad(photoRef)}
                                  onError={() => handleImageError(photoRef)}
                                />
                              </div>
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
              <div className="flex justify-end text-xs text-muted-foreground mt-1">
                {selectedPlace.photos.length} photo
                {selectedPlace.photos.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center text-base text-foreground/70 italic">
          Select a place to see details
        </div>
      )}
    </div>
  )
}
