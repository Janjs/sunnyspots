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
import { Sun, Moon } from "lucide-react"
import "mapbox-gl/dist/mapbox-gl.css"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { hasSunlight } from "@/utils/sunlight"

interface Location {
  lat: number
  lng: number
}

interface MapViewProps {
  onLoadingProgress: Dispatch<SetStateAction<number>>
  defaultLocation: Location
  initialDate: Date
  onMarkerSelected?: (coordinates: Location) => void
}

interface MapViewRef {
  addMarker: (coordinates: Location, outdoorSeating: boolean) => void
  setDate: (date: Date) => void
  clearMarkers: () => void
  addMarkers: (
    places: { geometry: { location: Location }; outdoorSeating: boolean }[]
  ) => void
  centerOnLocation: (coordinates: Location) => void
  selectMarkerAtLocation: (coordinates: Location) => void
}

const SHADEMAP_API_KEY = process.env.NEXT_PUBLIC_SHADEMAP_API_KEY
const MAPBOX_API_KEY = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

const MapView = forwardRef<MapViewRef, MapViewProps>(
  (
    { onLoadingProgress, defaultLocation, initialDate, onMarkerSelected },
    ref
  ) => {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<mapboxgl.Map | null>(null)
    const shadeMap = useRef<any>(null)
    const markers = useRef<mapboxgl.Marker[]>([])
    const currentDate = useRef<Date>(initialDate)
    const selectedMarker = useRef<mapboxgl.Marker | null>(null)

    const createMarkerElement = (coordinates: Location) => {
      console.log("[createMarkerElement] Creating element for:", coordinates)
      console.log(
        "[createMarkerElement] Current date ref:",
        currentDate.current
      )
      const el = document.createElement("div")
      const hasSun = hasSunlight(
        currentDate.current,
        coordinates.lat,
        coordinates.lng
      )
      console.log("[createMarkerElement] Has sun:", hasSun)

      el.className = cn(
        buttonVariants({ variant: "secondary", size: "icon" }),
        "rounded-full shadow-md hover:bg-white/90 relative",
        hasSun ? "bg-blue-500" : "bg-gray-700"
      )

      // Add icon based on sunlight status
      const iconElement = document.createElement("div")
      iconElement.innerHTML = hasSun
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun">
            <circle cx="12" cy="12" r="5"/>
            <path d="M12 2v2"/>
            <path d="M12 20v2"/>
            <path d="M4.93 4.93l1.41 1.41"/>
            <path d="M17.66 17.66l1.41 1.41"/>
            <path d="M2 12h2"/>
            <path d="M20 12h2"/>
            <path d="M4.93 19.07l1.41-1.41"/>
            <path d="M17.66 6.34l1.41-1.41"/>
          </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
          </svg>`

      iconElement.style.color = hasSun ? "#fef9c3" : "#94a3b8"
      iconElement.style.display = "flex"
      iconElement.style.justifyContent = "center"
      iconElement.style.alignItems = "center"

      el.appendChild(iconElement)
      el.style.cursor = "pointer"
      el.style.transform = "translate(-50%, -50%)"
      el.style.width = "1.5rem"
      el.style.height = "1.5rem"
      el.style.padding = "0.15rem"

      // Store original colors for flipping
      const originalBgColor = hasSun ? "rgb(59, 130, 246)" : "rgb(55, 65, 81)" // blue-500 or gray-700
      const originalIconColor = hasSun ? "#fef9c3" : "#94a3b8" // yellow or slate

      // Add hover event to flip colors
      el.addEventListener("mouseenter", () => {
        el.style.backgroundColor = originalIconColor
        iconElement.style.color = originalBgColor
      })

      el.addEventListener("mouseleave", () => {
        // Only reset if not selected
        if (!el.classList.contains("marker-selected")) {
          el.style.backgroundColor = originalBgColor
          iconElement.style.color = originalIconColor
        }
      })

      // Store sunlight status as data attribute for later reference
      el.dataset.hasSun = hasSun.toString()
      el.dataset.bgColor = originalBgColor
      el.dataset.iconColor = originalIconColor

      return el
    }

    const clearMarkers = () => {
      markers.current.forEach((marker) => marker.remove())
      markers.current = []
      selectedMarker.current = null
    }

    const addMarkers = (
      places: { geometry: { location: Location }; outdoorSeating: boolean }[]
    ) => {
      clearMarkers()
      places.forEach((place) => {
        const markerElement = createMarkerElement(place.geometry.location)
        const marker = new mapboxgl.Marker({
          element: markerElement,
        })
          .setLngLat([place.geometry.location.lng, place.geometry.location.lat])
          .addTo(map.current!)

        // Add click handler to marker
        marker.getElement().addEventListener("click", () => {
          if (selectedMarker.current === marker) {
            // Deselect if already selected
            unselectMarker(selectedMarker.current)
            selectedMarker.current = null
            // Notify parent component
            onMarkerSelected?.(null as any)
          } else {
            // Unselect previous marker if any
            if (selectedMarker.current) {
              unselectMarker(selectedMarker.current)
            }

            // Select this marker
            selectMarker(marker)
            selectedMarker.current = marker

            // Center the map on the marker
            const lngLat = marker.getLngLat()
            map.current?.panTo([lngLat.lng, lngLat.lat], {
              duration: 1000,
            })

            // Notify parent component with precise coordinates
            onMarkerSelected?.({
              lat: parseFloat(lngLat.lat.toFixed(6)),
              lng: parseFloat(lngLat.lng.toFixed(6)),
            })
          }
        })

        markers.current.push(marker)
      })
    }

    const selectMarker = (marker: mapboxgl.Marker) => {
      const el = marker.getElement()
      const iconElement = el.querySelector("div") as HTMLElement
      el.classList.add("marker-selected")

      const bgColor = el.dataset.iconColor || ""
      const iconColor = el.dataset.bgColor || ""

      el.style.backgroundColor = bgColor
      iconElement.style.color = iconColor
    }

    const unselectMarker = (marker: mapboxgl.Marker) => {
      const el = marker.getElement()
      const iconElement = el.querySelector("div") as HTMLElement
      el.classList.remove("marker-selected")

      const bgColor = el.dataset.bgColor || ""
      const iconColor = el.dataset.iconColor || ""

      el.style.backgroundColor = bgColor
      iconElement.style.color = iconColor
    }

    const addMarker = (coordinates: Location, outdoorSeating: boolean) => {
      clearMarkers()
      const markerElement = createMarkerElement(coordinates)
      const marker = new mapboxgl.Marker({
        element: markerElement,
      })
        .setLngLat([coordinates.lng, coordinates.lat])
        .addTo(map.current!)

      // Add click handler to marker
      marker.getElement().addEventListener("click", () => {
        if (selectedMarker.current === marker) {
          // Deselect if already selected
          unselectMarker(selectedMarker.current)
          selectedMarker.current = null
          // Notify parent component
          onMarkerSelected?.(null as any)
        } else {
          // Unselect previous marker if any
          if (selectedMarker.current) {
            unselectMarker(selectedMarker.current)
          }

          // Select this marker
          selectMarker(marker)
          selectedMarker.current = marker

          // Center the map on the marker
          const lngLat = marker.getLngLat()
          map.current?.panTo([lngLat.lng, lngLat.lat], {
            duration: 1000,
          })

          // Notify parent component with precise coordinates
          onMarkerSelected?.({
            lat: parseFloat(lngLat.lat.toFixed(6)),
            lng: parseFloat(lngLat.lng.toFixed(6)),
          })
        }
      })

      markers.current.push(marker)
      centerOnLocation(coordinates)
    }

    const centerOnLocation = (coordinates: Location) => {
      map.current?.panTo([coordinates.lng, coordinates.lat], {
        duration: 1000,
      })
    }

    const setDate = (date: Date) => {
      console.log("[setDate] Received new date:", date)
      console.log("[setDate] Previous currentDate ref:", currentDate.current)
      currentDate.current = date
      console.log("[setDate] Updated currentDate ref:", currentDate.current)
      if (shadeMap.current) {
        console.log("[setDate] Updating ShadeMap date.")
        shadeMap.current.setDate(date)
      }
      // Update all existing markers to reflect new sunlight status
      console.log(
        `[setDate] Clearing and re-adding ${markers.current.length} markers (deferred).`
      )

      // Defer marker updates to avoid conflict with ShadeMap update
      setTimeout(() => {
        const existingMarkers = markers.current
        const previouslySelectedMarker = selectedMarker.current
        let previouslySelectedCoords = null

        if (previouslySelectedMarker) {
          const lngLat = previouslySelectedMarker.getLngLat()
          previouslySelectedCoords = { lng: lngLat.lng, lat: lngLat.lat }
        }

        markers.current = []
        selectedMarker.current = null

        existingMarkers.forEach((marker, index) => {
          const coordinates = marker.getLngLat()
          console.log(
            `[setDate] Re-creating marker ${index} for coords:`,
            coordinates
          )

          const newElement = createMarkerElement({
            lat: coordinates.lat,
            lng: coordinates.lng,
          })

          console.log(`[setDate] Creating new mapboxgl.Marker ${index}`)
          const newMarker = new mapboxgl.Marker({ element: newElement })
            .setLngLat([coordinates.lng, coordinates.lat])
            .addTo(map.current!)

          // Add click handler to marker
          newMarker.getElement().addEventListener("click", () => {
            if (selectedMarker.current === newMarker) {
              // Deselect if already selected
              unselectMarker(selectedMarker.current)
              selectedMarker.current = null
            } else {
              // Unselect previous marker if any
              if (selectedMarker.current) {
                unselectMarker(selectedMarker.current)
              }

              // Select this marker
              selectMarker(newMarker)
              selectedMarker.current = newMarker
            }
          })

          console.log(`[setDate] Pushing new marker ${index} to ref array.`)
          markers.current.push(newMarker)

          // Check if this was the previously selected marker
          if (
            previouslySelectedCoords &&
            coordinates.lng === previouslySelectedCoords.lng &&
            coordinates.lat === previouslySelectedCoords.lat
          ) {
            selectMarker(newMarker)
            selectedMarker.current = newMarker
          }

          console.log(`[setDate] Removing old marker ${index}`)
          marker.remove()
        })
        console.log("[setDate] Finished re-adding markers.")
      }, 0)
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (event.metaKey) {
        // Check if cmd key is pressed
        const pitchChange = event.movementY * 0.1 // Adjust pitch based on vertical mouse movement
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
      // Find the marker closest to the given coordinates
      let foundMarker: mapboxgl.Marker | null = null

      markers.current.forEach((marker) => {
        const markerPos = marker.getLngLat()

        // Use a more precise comparison by comparing rounded values
        // This ensures consistency between the marker selection and the coordinate mapping
        if (
          markerPos.lng.toFixed(6) === coordinates.lng.toFixed(6) &&
          markerPos.lat.toFixed(6) === coordinates.lat.toFixed(6)
        ) {
          foundMarker = marker
        }
      })

      if (foundMarker) {
        // Unselect previous marker if any
        if (selectedMarker.current && selectedMarker.current !== foundMarker) {
          unselectMarker(selectedMarker.current)
        }

        // Select the found marker
        selectMarker(foundMarker)
        selectedMarker.current = foundMarker

        // Center the map on the marker
        const marker = foundMarker as mapboxgl.Marker
        const lngLat = marker.getLngLat()
        map.current?.panTo([lngLat.lng, lngLat.lat], {
          duration: 1000,
        })

        // Notify parent component with precise coordinates - use non-null assertion since we've already checked it exists
        onMarkerSelected?.({
          lat: parseFloat(lngLat.lat.toFixed(6)),
          lng: parseFloat(lngLat.lng.toFixed(6)),
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

      // Initialize map with Mapbox style
      map.current = new mapboxgl.Map({
        accessToken: MAPBOX_API_KEY,
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v11",
        center: { lat: defaultLocation.lat, lng: defaultLocation.lng },
        zoom: 15,
        hash: true,
        pitch: 0,
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

      // Add shadow simulator after map loads
      map.current.on("load", async () => {
        // Ensure map is fully loaded before initializing ShadeMap
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

        // Add zoom and rotation controls to the map in the bottom right corner
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
      })

      // Cleanup
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
    }, [onLoadingProgress, defaultLocation])

    // Update ShadeMap and markers when initialDate prop changes, without reinitializing the map
    useEffect(() => {
      if (shadeMap.current) {
        setDate(initialDate)
      }
    }, [initialDate])

    return <div ref={mapContainer} style={{ width: "100%", height: "100vh" }} />
  }
)

MapView.displayName = "MapView"

export default MapView
