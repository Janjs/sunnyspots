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
}

interface MapViewRef {
  addMarker: (coordinates: Location, outdoorSeating: boolean) => void
  setDate: (date: Date) => void
  clearMarkers: () => void
  addMarkers: (
    places: { geometry: { location: Location }; outdoorSeating: boolean }[]
  ) => void
  centerOnLocation: (coordinates: Location) => void
}

const SHADEMAP_API_KEY = process.env.NEXT_PUBLIC_SHADEMAP_API_KEY
const MAPBOX_API_KEY = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

const MapView = forwardRef<MapViewRef, MapViewProps>(
  ({ onLoadingProgress, defaultLocation, initialDate }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<mapboxgl.Map | null>(null)
    const shadeMap = useRef<any>(null)
    const markers = useRef<mapboxgl.Marker[]>([])
    const currentDate = useRef<Date>(initialDate)

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
      el.style.width = "2rem"
      el.style.height = "2rem"
      return el
    }

    const clearMarkers = () => {
      markers.current.forEach((marker) => marker.remove())
      markers.current = []
    }

    const addMarkers = (
      places: { geometry: { location: Location }; outdoorSeating: boolean }[]
    ) => {
      clearMarkers()
      places.forEach((place) => {
        const marker = new mapboxgl.Marker({
          element: createMarkerElement(place.geometry.location),
        })
          .setLngLat([place.geometry.location.lng, place.geometry.location.lat])
          .addTo(map.current!)
        markers.current.push(marker)
      })
    }

    const addMarker = (coordinates: Location, outdoorSeating: boolean) => {
      clearMarkers()
      const marker = new mapboxgl.Marker({
        element: createMarkerElement(coordinates),
      })
        .setLngLat([coordinates.lng, coordinates.lat])
        .addTo(map.current!)
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
        markers.current = []

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

          console.log(`[setDate] Pushing new marker ${index} to ref array.`)
          markers.current.push(newMarker)

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

    useImperativeHandle(ref, () => ({
      addMarker,
      setDate,
      clearMarkers,
      addMarkers,
      centerOnLocation,
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
        minZoom: 15,
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
