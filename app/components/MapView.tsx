"use client"

import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  Dispatch,
  SetStateAction,
} from "react"
import mapboxgl from "mapbox-gl"
import ShadeMap from "mapbox-gl-shadow-simulator"
import "mapbox-gl/dist/mapbox-gl.css"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { hasSunlight } from "@/utils/sunlight"
import { PlaceType } from "@/app/types/places"

interface Location {
  lat: number
  lng: number
}

interface MapViewProps {
  onLoadingProgress: Dispatch<SetStateAction<number>>
  location: Location
  initialDate: Date
  isMobile?: boolean
  onMarkerSelected?: (
    coordinates:
      | (Location & {
          place_id?: string
          name?: string
          type?: string
        })
      | null
  ) => void
  onZoomLevelChange?: (zoom: number) => void
}

interface MapViewRef {
  addMarker: (
    coordinates: Location,
    outdoorSeating: boolean,
    name?: string,
    type?: PlaceType
  ) => void
  setDate: (date: Date) => void
  clearMarkers: () => void
  addMarkers: (
    places: {
      geometry: { location: Location }
      outdoorSeating: boolean
      place_id?: string
      name?: string
      type: PlaceType
    }[]
  ) => void
  centerOnLocation: (coordinates: Location) => void
  selectMarkerAtLocation: (coordinates: Location) => void
}

const SHADEMAP_API_KEY = process.env.NEXT_PUBLIC_SHADEMAP_API_KEY
const MAPBOX_API_KEY = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

// SVG Icons
const parkIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trees"><path d="M10 10v.2A3 3 0 0 1 7 13H4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2h-3a3 3 0 0 1-3-2.8V10a2 2 0 0 0-4 0z"/><path d="M7 14h0"/><path d="M17 14h0"/></svg>`
const restaurantIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-utensils"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z"/></svg>`
const barIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-martini"><path d="M8 22h8"/><path d="M12 11v11"/><path d="m19 3-7 8-7-8Z"/></svg>`
const cafeIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-coffee"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>`
const sunIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.93 19.07 1.41-1.41"/><path d="m17.66 6.34 1.41-1.41"/></svg>`
const moonIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`

const MapView = forwardRef<MapViewRef, MapViewProps>(
  (
    {
      onLoadingProgress,
      location,
      initialDate,
      isMobile = false,
      onMarkerSelected,
      onZoomLevelChange,
    },
    ref
  ) => {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<mapboxgl.Map | null>(null)
    const shadeMap = useRef<any>(null)
    const markers = useRef<mapboxgl.Marker[]>([])
    const currentDate = useRef<Date>(initialDate)
    const selectedMarker = useRef<mapboxgl.Marker | null>(null)
    const markerData = useRef<
      Map<string, { name?: string; place_id?: string; type?: string }>
    >(new Map())

    const createMarkerElement = (
      coordinates: Location,
      name?: string,
      type?: PlaceType
    ) => {
      const el = document.createElement("div")
      el.style.display = "flex"
      el.style.flexDirection = "column" // Stack name and icon vertically
      el.style.alignItems = "center" // Center items horizontally
      el.style.cursor = "pointer"

      // Name element first, if present
      if (name) {
        const nameElement = document.createElement("span")
        nameElement.textContent = name
        nameElement.style.marginBottom = "4px" // Space between name and icon
        nameElement.style.padding = "3px 6px"
        nameElement.style.backgroundColor = "rgba(255, 255, 255, 0.1)"
        nameElement.style.backdropFilter = "blur(5px)"
        ;(nameElement.style as any).webkitBackdropFilter = "blur(5px)" // Safari vendor prefix
        nameElement.style.borderRadius = "6px"
        nameElement.style.fontSize = "12px"
        nameElement.style.fontWeight = "500"
        nameElement.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)"
        nameElement.style.color = hasSunlight(
          currentDate.current,
          coordinates.lat,
          coordinates.lng
        )
          ? "#000000"
          : "#E5E7EB"

        nameElement.style.whiteSpace = "normal"
        nameElement.style.wordBreak = "break-word"
        nameElement.style.maxWidth = "120px"
        nameElement.style.textAlign = "center"

        nameElement.style.display = "-webkit-box"
        nameElement.style.webkitLineClamp = "2"
        nameElement.style.webkitBoxOrient = "vertical"
        nameElement.style.overflow = "hidden"
        nameElement.style.textOverflow = "ellipsis"

        nameElement.style.visibility = "hidden" // Initially hide the label
        nameElement.dataset.isNameLabel = "true" // Add data attribute for querying

        el.appendChild(nameElement)
        el.dataset.placeName = name
      }

      const iconContainer = document.createElement("div")
      const hasSun = hasSunlight(
        currentDate.current,
        coordinates.lat,
        coordinates.lng
      )

      let iconSVG = ""
      let bgColor = hasSun ? "rgb(59, 130, 246)" : "rgb(55, 65, 81)" // blue-500 or gray-700
      let iconColor = hasSun ? "#fef9c3" : "#94a3b8" // yellow-100 or slate-400

      if (type) {
        el.dataset.placeType = type
        const normalizedType = type.toLowerCase()

        // Check against more inclusive patterns
        if (
          normalizedType === PlaceType.Park.toLowerCase() ||
          normalizedType === "park" ||
          normalizedType.includes("park")
        ) {
          iconSVG = parkIconSVG
          bgColor = "rgb(34, 197, 94)" // green-500
          iconColor = "#dcfce7" // green-100
        } else if (
          normalizedType === PlaceType.Restaurant.toLowerCase() ||
          normalizedType === "restaurant" ||
          normalizedType.includes("restaurant") ||
          normalizedType.includes("food")
        ) {
          iconSVG = restaurantIconSVG
          bgColor = "rgb(249, 115, 22)" // orange-500
          iconColor = "#ffedd5" // orange-100
        } else if (
          normalizedType === PlaceType.Bar.toLowerCase() ||
          normalizedType === "bar" ||
          normalizedType.includes("bar") ||
          normalizedType.includes("pub")
        ) {
          iconSVG = barIconSVG
          bgColor = "rgb(168, 85, 247)" // purple-500
          iconColor = "#f3e8ff" // purple-100
        } else if (
          normalizedType === PlaceType.Cafe.toLowerCase() ||
          normalizedType === "cafe" ||
          normalizedType.includes("cafe") ||
          normalizedType.includes("coffee")
        ) {
          iconSVG = cafeIconSVG
          bgColor = "rgb(161, 98, 7)" // yellow-700
          iconColor = "#fefce8" // yellow-50
        }
      } else if (
        name?.toLowerCase().includes("restaurant") ||
        name?.toLowerCase().includes("kitchen") ||
        name?.toLowerCase().includes("eatery") ||
        name?.toLowerCase().includes("dining")
      ) {
        el.dataset.placeType = PlaceType.Restaurant
        iconSVG = restaurantIconSVG
        bgColor = "rgb(249, 115, 22)" // orange-500
        iconColor = "#ffedd5" // orange-100
      }

      if (!iconSVG) {
        // Default icon if no type matched
        iconSVG = hasSun ? sunIconSVG : moonIconSVG
      }

      iconContainer.className = cn(
        buttonVariants({ variant: "secondary", size: "icon" }),
        "rounded-full shadow-md hover:bg-white/90 relative"
      )
      iconContainer.style.backgroundColor = bgColor
      iconContainer.style.width = "1.5rem"
      iconContainer.style.height = "1.5rem"
      iconContainer.style.padding = "0.15rem"
      iconContainer.style.display = "flex"
      iconContainer.style.justifyContent = "center"
      iconContainer.style.alignItems = "center"

      const iconElement = document.createElement("div")
      iconElement.innerHTML = iconSVG
      iconElement.style.color = iconColor
      iconElement.style.display = "flex"
      iconElement.style.justifyContent = "center"
      iconElement.style.alignItems = "center"

      iconContainer.appendChild(iconElement)

      const originalBgColor = bgColor
      const originalIconColor = iconColor

      iconContainer.addEventListener("mouseenter", () => {
        iconContainer.style.backgroundColor = originalIconColor
        iconElement.style.color = originalBgColor
      })

      iconContainer.addEventListener("mouseleave", () => {
        if (!iconContainer.classList.contains("marker-selected")) {
          iconContainer.style.backgroundColor = originalBgColor
          iconElement.style.color = originalIconColor
        }
      })

      iconContainer.dataset.hasSun = hasSun.toString() // Still useful for generic sun/moon state if no type
      iconContainer.dataset.bgColor = originalBgColor
      iconContainer.dataset.iconColor = originalIconColor
      if (type) {
        iconContainer.dataset.type = type
      }

      el.appendChild(iconContainer)
      el.dataset.markerElement = "true"

      return el
    }

    const clearMarkers = () => {
      markers.current.forEach((marker) => marker.remove())
      markers.current = []
      selectedMarker.current = null
      markerData.current.clear()
    }

    const addMarkers = (
      places: {
        geometry: { location: Location }
        outdoorSeating: boolean
        place_id?: string
        name?: string
        type: PlaceType
      }[]
    ) => {
      clearMarkers()
      places.forEach((place) => {
        const markerElement = createMarkerElement(
          place.geometry.location,
          place.name,
          place.type
        )

        const coords = place.geometry.location
        const coordKey = `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`
        markerElement.dataset.coordKey = coordKey
        const currentMarkerData: {
          name?: string
          place_id?: string
          type?: string
        } = { name: place.name, type: place.type }
        if (place.place_id) {
          markerElement.dataset.placeId = place.place_id
          currentMarkerData.place_id = place.place_id
        }
        markerData.current.set(coordKey, currentMarkerData)

        const marker = new mapboxgl.Marker({
          element: markerElement,
          anchor: "bottom",
          offset: [0, isMobile ? 180 : 0],
        })
          .setLngLat([place.geometry.location.lng, place.geometry.location.lat])
          .addTo(map.current!)

        const iconContainer = markerElement.querySelector(
          "div[data-bg-color]"
        ) as HTMLElement // Use a more generic selector like data-bg-color
        if (iconContainer) {
          iconContainer.addEventListener("click", () => {
            if (selectedMarker.current === marker) {
              unselectMarker(selectedMarker.current)
              selectedMarker.current = null
              onMarkerSelected?.(null)
            } else {
              if (selectedMarker.current) {
                unselectMarker(selectedMarker.current)
              }
              selectMarker(marker)
              selectedMarker.current = marker
              const lngLat = marker.getLngLat()
              map.current?.panTo([lngLat.lng, lngLat.lat], {
                duration: 1000,
              })
              const placeId = marker.getElement().dataset.placeId
              const placeName = marker.getElement().dataset.placeName
              const placeType = (
                marker.getElement().querySelector("[data-type]") as HTMLElement
              )?.dataset.type

              onMarkerSelected?.({
                lat: parseFloat(lngLat.lat.toFixed(6)),
                lng: parseFloat(lngLat.lng.toFixed(6)),
                place_id: placeId,
                name: placeName,
                type: placeType,
              })
            }
          })
        }
        markers.current.push(marker)
      })
      updateLabelVisibility()
    }

    const selectMarker = (marker: mapboxgl.Marker) => {
      const el = marker.getElement()
      el.style.zIndex = "1000"

      const iconContainer = el.querySelector(
        "div[data-bg-color]"
      ) as HTMLElement
      if (!iconContainer) return

      const iconElement = iconContainer.querySelector("div svg")
        ?.parentElement as HTMLElement // target the div containing svg
      iconContainer.classList.add("marker-selected")

      const bgColor = iconContainer.dataset.iconColor || ""
      const iconColor = iconContainer.dataset.bgColor || ""

      iconContainer.style.backgroundColor = bgColor
      if (iconElement) iconElement.style.color = iconColor

      const nameElement = el.querySelector(
        '[data-is-name-label="true"]'
      ) as HTMLElement | null
      if (nameElement) {
        nameElement.style.visibility = "visible"
      }
      selectedMarker.current = marker
      updateLabelVisibility()
    }

    const unselectMarker = (marker: mapboxgl.Marker) => {
      const el = marker.getElement()
      el.style.zIndex = "0"

      const iconContainer = el.querySelector(
        "div[data-bg-color]"
      ) as HTMLElement
      if (!iconContainer) return

      const iconElement = iconContainer.querySelector("div svg")
        ?.parentElement as HTMLElement
      iconContainer.classList.remove("marker-selected")

      const bgColor = iconContainer.dataset.bgColor || ""
      const iconColor = iconContainer.dataset.iconColor || ""

      iconContainer.style.backgroundColor = bgColor
      if (iconElement) iconElement.style.color = iconColor
      updateLabelVisibility()
    }

    const addMarker = (
      coordinates: Location,
      outdoorSeating: boolean,
      name?: string,
      type?: PlaceType
    ) => {
      clearMarkers()
      const markerElement = createMarkerElement(coordinates, name, type)
      const coordKey = `${coordinates.lat.toFixed(6)},${coordinates.lng.toFixed(
        6
      )}`
      markerData.current.set(coordKey, { name, type })
      if (name) markerElement.dataset.placeName = name
      // place_id is not available in this specific addMarker function, only name and type

      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: "bottom",
        offset: [0, isMobile ? -60 : 0],
      })
        .setLngLat([coordinates.lng, coordinates.lat])
        .addTo(map.current!)

      const iconContainer = markerElement.querySelector(
        "div[data-bg-color]"
      ) as HTMLElement
      if (iconContainer) {
        iconContainer.addEventListener("click", () => {
          if (selectedMarker.current === marker) {
            unselectMarker(selectedMarker.current)
            selectedMarker.current = null
            onMarkerSelected?.(null)
          } else {
            if (selectedMarker.current) {
              unselectMarker(selectedMarker.current)
            }
            selectMarker(marker)
            selectedMarker.current = marker
            const lngLat = marker.getLngLat()
            map.current?.panTo([lngLat.lng, lngLat.lat], {
              duration: 1000,
            })
            const placeName = marker.getElement().dataset.placeName
            const placeType = (
              marker.getElement().querySelector("[data-type]") as HTMLElement
            )?.dataset.type

            onMarkerSelected?.({
              lat: parseFloat(lngLat.lat.toFixed(6)),
              lng: parseFloat(lngLat.lng.toFixed(6)),
              name: placeName,
              type: placeType,
              // place_id is not available here
            })
          }
        })
      }

      markers.current.push(marker)
      centerOnLocation(coordinates)
      setTimeout(updateLabelVisibility, 0)
    }

    const centerOnLocation = (coordinates: Location) => {
      map.current?.panTo([coordinates.lng, coordinates.lat], {
        duration: 1000,
      })
    }

    const setDate = (date: Date) => {
      currentDate.current = date
      if (shadeMap.current) {
        shadeMap.current.setDate(date)
      }
      setTimeout(() => {
        const existingMarkersData: {
          coords: { lat: number; lng: number }
          name?: string
          place_id?: string
          type?: string
          isSelected: boolean
        }[] = []

        markers.current.forEach((marker) => {
          const lngLat = marker.getLngLat()
          const coordKey = `${lngLat.lat.toFixed(6)},${lngLat.lng.toFixed(6)}`
          const data = markerData.current.get(coordKey)
          existingMarkersData.push({
            coords: { lat: lngLat.lat, lng: lngLat.lng },
            name: data?.name,
            place_id: data?.place_id,
            type: data?.type,
            isSelected: selectedMarker.current === marker,
          })
          marker.remove()
        })

        markers.current = []
        selectedMarker.current = null

        existingMarkersData.forEach((data) => {
          const newElement = createMarkerElement(
            data.coords,
            data.name,
            data.type as PlaceType | undefined
          )
          if (data.place_id) newElement.dataset.placeId = data.place_id
          if (data.name) newElement.dataset.placeName = data.name
          // type is intrinsically handled by createMarkerElement and stored if needed by data-type attribute
          const coordKey = `${data.coords.lat.toFixed(
            6
          )},${data.coords.lng.toFixed(6)}`
          newElement.dataset.coordKey = coordKey

          const newMarker = new mapboxgl.Marker({
            element: newElement,
            anchor: "bottom",
            offset: [0, isMobile ? -60 : 0],
          })
            .setLngLat([data.coords.lng, data.coords.lat])
            .addTo(map.current!)

          const iconContainer = newElement.querySelector(
            "div[data-bg-color]"
          ) as HTMLElement
          if (iconContainer) {
            iconContainer.addEventListener("click", () => {
              if (selectedMarker.current === newMarker) {
                unselectMarker(selectedMarker.current)
                selectedMarker.current = null
                onMarkerSelected?.(null)
              } else {
                if (selectedMarker.current) {
                  unselectMarker(selectedMarker.current)
                }
                selectMarker(newMarker)
                selectedMarker.current = newMarker
                const lngLat = newMarker.getLngLat()
                const placeId = newElement.dataset.placeId
                const placeName = newElement.dataset.placeName
                const placeType = (
                  newElement.querySelector("[data-type]") as HTMLElement
                )?.dataset.type

                onMarkerSelected?.({
                  lat: parseFloat(lngLat.lat.toFixed(6)),
                  lng: parseFloat(lngLat.lng.toFixed(6)),
                  place_id: placeId,
                  name: placeName,
                  type: placeType,
                })
              }
            })
          }

          markers.current.push(newMarker)

          if (data.isSelected) {
            selectMarker(newMarker)
            selectedMarker.current = newMarker
          }
        })
        updateLabelVisibility()
      }, 0)
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (event.metaKey) {
        const pitchChange = event.movementY * 0.1
        const newPitch = Math.max(
          0,
          Math.min(map.current!.getPitch() - pitchChange, 60)
        )
        map.current?.setPitch(newPitch)
      }
    }

    useEffect(() => {
      window.addEventListener("mousemove", handleMouseMove)
      return () => {
        window.removeEventListener("mousemove", handleMouseMove)
      }
    }, [])

    const selectMarkerAtLocation = (coordinates: Location) => {
      let foundMarker: mapboxgl.Marker | null = null

      markers.current.forEach((marker) => {
        const markerPos = marker.getLngLat()
        if (
          markerPos.lng.toFixed(6) === coordinates.lng.toFixed(6) &&
          markerPos.lat.toFixed(6) === coordinates.lat.toFixed(6)
        ) {
          foundMarker = marker
        }
      })

      if (foundMarker) {
        if (selectedMarker.current && selectedMarker.current !== foundMarker) {
          unselectMarker(selectedMarker.current)
        }
        selectMarker(foundMarker)
        selectedMarker.current = foundMarker
        const marker = foundMarker as mapboxgl.Marker
        const lngLat = marker.getLngLat()
        map.current?.panTo([lngLat.lng, lngLat.lat], {
          duration: 1000,
        })

        const placeId = marker.getElement().dataset.placeId
        const placeName = marker.getElement().dataset.placeName
        const placeType = (
          marker.getElement().querySelector("[data-type]") as HTMLElement
        )?.dataset.type

        onMarkerSelected?.({
          lat: parseFloat(lngLat.lat.toFixed(6)),
          lng: parseFloat(lngLat.lng.toFixed(6)),
          place_id: placeId,
          name: placeName,
          type: placeType,
        })
      }
    }

    useImperativeHandle(ref, () => ({
      addMarker,
      setDate,
      clearMarkers,
      addMarkers,
      centerOnLocation,
      selectMarkerAtLocation,
    }))

    useEffect(() => {
      if (map.current) return // Initialize map only once
      console.log("location", location)
      map.current = new mapboxgl.Map({
        accessToken: MAPBOX_API_KEY,
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v11",
        center: { lat: location.lat, lng: location.lng },
        zoom: 15,
        hash: true,
        pitch: 45,
      })

      const mapLoaded = (map: mapboxgl.Map) => {
        return new Promise<void>((res) => {
          function cb() {
            if (!map.loaded()) return
            map.off("render", cb)
            res()
          }
          map.on("render", cb)
          cb()
        })
      }

      map.current.on("load", async () => {
        await mapLoaded(map.current!)

        map.current!.addLayer({
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 15,
          paint: {
            "fill-extrusion-color": "#aaa",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 1,
          },
        })

        map.current!.addControl(
          new mapboxgl.NavigationControl(),
          "bottom-right"
        )

        shadeMap.current = new ShadeMap({
          apiKey: SHADEMAP_API_KEY!,
          date: initialDate,
          color: "#01112f",
          opacity: 0.6,
          terrainSource: {
            maxZoom: 15,
            tileSize: 256,
            getSourceUrl: ({ x, y, z }: { x: number; y: number; z: number }) =>
              `/api/elevation-tile?z=${z}&x=${x}&y=${y}`,
            getElevation: ({ r, g, b }: { r: number; g: number; b: number }) =>
              r * 256 + g + b / 256 - 32768,
            _overzoom: 18,
          },
          getFeatures: async () => {
            try {
              const buildingData = map
                .current!.querySourceFeatures("composite", {
                  sourceLayer: "building",
                })
                .filter((feature: any) => {
                  return (
                    feature.properties &&
                    feature.properties.underground !== "true" &&
                    (feature.properties.height ||
                      feature.properties.render_height)
                  )
                })
              return buildingData
            } catch (error) {
              console.error("Error getting features:", error)
              return []
            }
          },
          debug: (msg: string) => {
            console.log(new Date().toISOString(), msg)
          },
        }).addTo(map.current!)

        shadeMap.current.on(
          "tileloaded",
          (loadedTiles: number, totalTiles: number) => {
            const percentage = Math.round((loadedTiles / totalTiles) * 100)
            onLoadingProgress(percentage)
          }
        )

        if (map.current) {
          map.current.on("moveend", updateLabelVisibility)
          map.current.on("zoomend", () => {
            updateLabelVisibility()
            onZoomLevelChange?.(map.current!.getZoom())
          })
        }
        // Emit initial zoom level after the map is ready
        onZoomLevelChange?.(map.current!.getZoom())
        setTimeout(updateLabelVisibility, 0)
      })

      map.current.once("idle", updateLabelVisibility)

      return () => {
        if (shadeMap.current) {
          shadeMap.current.remove()
          shadeMap.current = null
        }
        if (map.current) {
          map.current.remove()
          map.current = null
        }
      }
    }, [onLoadingProgress, initialDate, onZoomLevelChange])

    useEffect(() => {
      if (shadeMap.current) {
        setDate(initialDate)
      }
    }, [initialDate])

    useEffect(() => {
      if (map.current) {
        map.current.flyTo({
          center: [location.lng, location.lat],
          zoom: 15, // Or current zoom level if you want to preserve it
          essential: true,
          duration: 1500,
        })
      }
    }, [location]) // Re-run effect when location changes

    const checkOverlap = (rect1: DOMRect, rect2: DOMRect): boolean => {
      return !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
      )
    }

    const updateLabelVisibility = () => {
      if (!map.current || !map.current.isStyleLoaded()) return

      const visibleLabelRects: DOMRect[] = []

      if (selectedMarker.current) {
        const selectedEl = selectedMarker.current.getElement()
        const selectedNameElement = selectedEl.querySelector(
          '[data-is-name-label="true"]'
        ) as HTMLElement | null

        if (selectedNameElement) {
          selectedNameElement.style.visibility = "visible"
          const rect = selectedNameElement.getBoundingClientRect()
          if (rect.width > 0 && rect.height > 0) {
            visibleLabelRects.push(rect)
          }
        }
      }

      markers.current.forEach((marker) => {
        if (marker === selectedMarker.current) {
          return
        }

        const el = marker.getElement()
        const nameElement = el.querySelector(
          '[data-is-name-label="true"]'
        ) as HTMLElement | null

        if (nameElement) {
          const originalVisibility = nameElement.style.visibility
          nameElement.style.visibility = "visible"
          const rect = nameElement.getBoundingClientRect()
          nameElement.style.visibility = originalVisibility

          if (rect.width === 0 || rect.height === 0) {
            nameElement.style.visibility = "hidden"
            return
          }

          let hasOverlap = false
          for (const visibleRect of visibleLabelRects) {
            if (checkOverlap(rect, visibleRect)) {
              hasOverlap = true
              break
            }
          }

          if (!hasOverlap) {
            nameElement.style.visibility = "visible"
            visibleLabelRects.push(rect)
          } else {
            nameElement.style.visibility = "hidden"
          }
        }
      })
    }

    return (
      <div ref={mapContainer} style={{ width: "100%", height: "100dvh" }} />
    )
  }
)

MapView.displayName = "MapView"

export default MapView
