"use client"

import { useState, useEffect } from "react"
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
import { fetchPlaceDetails } from "@/app/actions/googlePlaces"
import { useIsMobile } from "@/components/ui/use-mobile"
import { Button } from "@/components/ui/button"

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
  const [displayData, setDisplayData] = useState<PlaceResult | null>(
    selectedPlace
  )
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {}
  )
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  const isMobile = useIsMobile()

  useEffect(() => {
    setDisplayData(selectedPlace)

    if (selectedPlace?.place_id) {
      setIsLoadingDetails(true)
      fetchPlaceDetails(selectedPlace.place_id)
        .then((fetchedDetails) => {
          if (fetchedDetails) {
            setDisplayData({
              ...selectedPlace,
              photos: fetchedDetails.photos,
            })
          }
        })
        .catch((err) => {
          console.error(
            `Error fetching details for InfoPanel, place_id: ${selectedPlace.place_id}:`,
            err
          )
        })
        .finally(() => {
          setIsLoadingDetails(false)
        })
    } else {
      setDisplayData(null)
      setIsLoadingDetails(false)
    }
  }, [selectedPlace?.place_id])

  const hasSun = displayData
    ? hasSunlight(
        currentDate,
        displayData.geometry.location.lat,
        displayData.geometry.location.lng
      )
    : false

  const handleImageLoad = (photoRef: string) => {
    setLoadingImages((prev) => ({ ...prev, [photoRef]: false }))
  }

  const handleImageError = (photoRef: string) => {
    setImageErrors((prev) => ({ ...prev, [photoRef]: true }))
    setLoadingImages((prev) => ({ ...prev, [photoRef]: false }))
  }

  useEffect(() => {
    setLoadingImages({})
    setImageErrors({})
  }, [displayData?.place_id])

  return (
    <div
      className="relative flex p-3 rounded-lg bg-white/25 backdrop-blur-md border border-white/20 shadow-lg"
      style={{
        width: isMobile ? "100%" : "20rem",
        minHeight: isMobile ? "auto" : "10rem",
        marginTop: isMobile ? "6rem" : "0",
      }}
    >
      {displayData ? (
        <div
          className={`flex w-full ${isMobile ? "flex-row gap-3" : "flex-col"}`}
        >
          {/* Text Column */}
          <div
            className={`flex ${
              isMobile
                ? "flex-col flex-grow"
                : "flex-row justify-between w-full"
            }`}
          >
            <div className="flex flex-col">
              <h2 className="text-lg font-medium line-clamp-2">
                {displayData.name}
              </h2>
              <div className="flex flex-row items-center gap-2 mt-1 sm:mt-2">
                {hasSun ? (
                  <Sun className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
                ) : (
                  <Moon className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
                )}
                {displayData.rating && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-3 w-3 fill-foreground" />
                    <span>{displayData.rating}</span>
                    {displayData.user_ratings_total && (
                      <span className="text-xs text-muted-foreground">
                        ({displayData.user_ratings_total})
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
                className={`h-8 w-8 rounded-full hover:bg-white/30 flex-shrink-0 z-10 ${
                  isMobile ? "absolute top-2 right-2" : "ml-2"
                }`}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            )}
          </div>

          {isLoadingDetails &&
            (!displayData.photos || displayData.photos.length === 0) && (
              <div className="w-full aspect-square flex items-center justify-center bg-muted/50 rounded-md mt-2 animate-pulse text-xs text-muted-foreground">
                Loading images...
              </div>
            )}

          {/* Image Column / Carousel */}
          {displayData.photos && displayData.photos.length > 0 && (
            <div
              className={`flex flex-col ${
                isMobile ? "w-24 h-24 flex-shrink-0" : "w-full mt-3"
              }`}
            >
              <Carousel className="w-full h-full">
                <CarouselContent>
                  {displayData.photos.map((photo, index) => {
                    const photoRef = photo.photo_reference
                    if (loadingImages[photoRef] === undefined && photoRef) {
                      setLoadingImages((prev) => ({
                        ...prev,
                        [photoRef]: true,
                      }))
                    }

                    if (!photoRef) return null

                    return (
                      <CarouselItem key={index}>
                        <div className="relative aspect-square w-full h-full overflow-hidden rounded-md bg-muted/30">
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
                                  src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&maxheight=800&photo_reference=${encodeURIComponent(
                                    photoRef
                                  )}&key=${
                                    process.env.NEXT_PUBLIC_GOOGLE_API_KEY
                                  }`}
                                  alt={`${displayData.name} photo ${index + 1}`}
                                  width={800}
                                  height={800}
                                  style={{
                                    objectFit: "cover",
                                    width: "100%",
                                    height: "100%",
                                    aspectRatio: "1/1",
                                  }}
                                  className={`rounded-md ${
                                    loadingImages[photoRef]
                                      ? "opacity-0"
                                      : "opacity-100"
                                  } transition-opacity duration-300`}
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
                {displayData.photos.length > 1 && (
                  <>
                    <CarouselPrevious className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 bg-white/70 hover:bg-white/90" />
                    <CarouselNext className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 bg-white/70 hover:bg-white/90" />
                  </>
                )}
              </Carousel>
              {displayData.photos.length > 0 && (
                <div className="flex justify-end text-xs text-muted-foreground mt-1">
                  {displayData.photos.length} photo
                  {displayData.photos.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          )}
          {/* Placeholder if no photos and not loading photos */}
          {(!displayData.photos || displayData.photos.length === 0) &&
            !isLoadingDetails && (
              <div
                className={`flex items-center justify-center bg-muted/30 rounded-md ${
                  isMobile
                    ? "w-24 h-24 flex-shrink-0"
                    : "w-full aspect-video mt-3"
                }`}
              >
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
        </div>
      ) : (
        <div className="flex w-full items-center justify-center text-base text-foreground/70 italic">
          Select a place to see details
        </div>
      )}
    </div>
  )
}
