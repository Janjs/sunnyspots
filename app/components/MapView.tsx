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

interface Location {
  lat: number
  lng: number
}

interface MapViewProps {
  onLoadingProgress: Dispatch<SetStateAction<number>>
  defaultLocation: Location
  initialDate: Date
  isMobile?: boolean
  onMarkerSelected?: (
    coordinates: (Location & { place_id?: string; name?: string }) | null
  ) => void
}

interface MapViewRef {
  addMarker: (
    coordinates: Location,
    outdoorSeating: boolean,
    name?: string
  ) => void
  setDate: (date: Date) => void
  clearMarkers: () => void
  addMarkers: (
    places: {
      geometry: { location: Location }
      outdoorSeating: boolean
      place_id?: string
      name?: string
    }[]
  ) => void
  centerOnLocation: (coordinates: Location) => void
  selectMarkerAtLocation: (coordinates: Location) => void
}

const SHADEMAP_API_KEY = process.env.NEXT_PUBLIC_SHADEMAP_API_KEY
const MAPBOX_API_KEY = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

const MapView = forwardRef<MapViewRef, MapViewProps>(
  (
    {
      onLoadingProgress,
      defaultLocation,
      initialDate,
      isMobile = false,
      onMarkerSelected,
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
      Map<string, { name?: string; place_id?: string }>
    >(new Map())

    useEffect(() => {
      if (map.current) {
        map.current.flyTo({
          center: [defaultLocation.lng, defaultLocation.lat],
          zoom: 15, // Or current zoom level if you want to preserve it
          essential: true,
          duration: 1500,
        })
      }
    }, [defaultLocation]) // Re-run effect when defaultLocation changes

    const createMarkerElement = (coordinates: Location, name?: string) => {
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

      iconContainer.className = cn(
        buttonVariants({ variant: "secondary", size: "icon" }),
        "rounded-full shadow-md hover:bg-white/90 relative",
        hasSun ? "bg-blue-500" : "bg-gray-700"
      )
      iconContainer.style.width = "1.5rem"
      iconContainer.style.height = "1.5rem"
      iconContainer.style.padding = "0.15rem"
      iconContainer.style.display = "flex"
      iconContainer.style.justifyContent = "center"
      iconContainer.style.alignItems = "center"
      // iconContainer.style.transform = "translate(-50%, -50%)"; // Already handled by Mapbox for the marker element itself if centered

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

      iconContainer.appendChild(iconElement)

      // Store original colors for flipping
      const originalBgColor = hasSun ? "rgb(59, 130, 246)" : "rgb(55, 65, 81)" // blue-500 or gray-700
      const originalIconColor = hasSun ? "#fef9c3" : "#94a3b8" // yellow or slate

      // Add hover event to flip colors
      iconContainer.addEventListener("mouseenter", () => {
        iconContainer.style.backgroundColor = originalIconColor
        iconElement.style.color = originalBgColor
      })

      iconContainer.addEventListener("mouseleave", () => {
        // Only reset if not selected
        if (!iconContainer.classList.contains("marker-selected")) {
          iconContainer.style.backgroundColor = originalBgColor
          iconElement.style.color = originalIconColor
        }
      })

      // Store sunlight status as data attribute for later reference
      iconContainer.dataset.hasSun = hasSun.toString()
      iconContainer.dataset.bgColor = originalBgColor
      iconContainer.dataset.iconColor = originalIconColor

      el.appendChild(iconContainer)

      // Set a data attribute for the entire element for easy access
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
      }[]
    ) => {
      clearMarkers()
      places.forEach((place) => {
        const markerElement = createMarkerElement(
          place.geometry.location,
          place.name
        )

        // Store place_id and name as data attribute for reference
        const coords = place.geometry.location
        const coordKey = `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`
        markerElement.dataset.coordKey = coordKey
        if (place.place_id) {
          markerElement.dataset.placeId = place.place_id
          markerData.current.set(coordKey, {
            name: place.name,
            place_id: place.place_id,
          })
        } else {
          markerData.current.set(coordKey, { name: place.name })
        }

        const marker = new mapboxgl.Marker({
          element: markerElement,
          anchor: "bottom", // Anchor to the bottom-center of the element
          offset: [0, isMobile ? 180 : 0], // Add offset on mobile to account for InfoPanel
        })
          .setLngLat([place.geometry.location.lng, place.geometry.location.lat])
          .addTo(map.current!)

        // Add click handler to marker
        const iconContainer = markerElement.querySelector(
          "div[data-has-sun]"
        ) as HTMLElement
        if (iconContainer) {
          iconContainer.addEventListener("click", () => {
            if (selectedMarker.current === marker) {
              // Deselect if already selected
              unselectMarker(selectedMarker.current)
              selectedMarker.current = null
              // Notify parent component
              onMarkerSelected?.(null)
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

              // Notify parent component with precise coordinates and place_id if available
              const placeId = marker.getElement().dataset.placeId
              const placeName = marker.getElement().dataset.placeName

              onMarkerSelected?.({
                lat: parseFloat(lngLat.lat.toFixed(6)),
                lng: parseFloat(lngLat.lng.toFixed(6)),
                place_id: placeId,
                name: placeName,
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
      el.style.zIndex = "1000" // Bring to front

      const iconContainer = el.querySelector("div[data-has-sun]") as HTMLElement
      if (!iconContainer) return

      const iconElement = iconContainer.querySelector("div") as HTMLElement
      iconContainer.classList.add("marker-selected")

      const bgColor = iconContainer.dataset.iconColor || ""
      const iconColor = iconContainer.dataset.bgColor || ""

      iconContainer.style.backgroundColor = bgColor
      if (iconElement) iconElement.style.color = iconColor

      // Ensure selected marker's label is visible and update others
      const nameElement = el.querySelector(
        '[data-is-name-label="true"]'
      ) as HTMLElement | null
      if (nameElement) {
        nameElement.style.visibility = "visible"
      }
      selectedMarker.current = marker // Set selectedMarker before calling updateLabelVisibility
      updateLabelVisibility() // Update all labels based on new selection
    }

    const unselectMarker = (marker: mapboxgl.Marker) => {
      const el = marker.getElement()
      el.style.zIndex = "0" // Reset z-index

      const iconContainer = el.querySelector("div[data-has-sun]") as HTMLElement
      if (!iconContainer) return

      const iconElement = iconContainer.querySelector("div") as HTMLElement
      iconContainer.classList.remove("marker-selected")

      const bgColor = iconContainer.dataset.bgColor || ""
      const iconColor = iconContainer.dataset.iconColor || ""

      iconContainer.style.backgroundColor = bgColor
      if (iconElement) iconElement.style.color = iconColor
      // No need to explicitly set selectedMarker.current to null here if another selection handles it or parent deselects
      // updateLabelVisibility will handle the change when it's called (e.g. on next selection or map move)
      updateLabelVisibility() // Update labels when a marker is deselected
    }

    const addMarker = (
      coordinates: Location,
      outdoorSeating: boolean,
      name?: string
    ) => {
      clearMarkers()
      const markerElement = createMarkerElement(coordinates, name)
      const coordKey = `${coordinates.lat.toFixed(6)},${coordinates.lng.toFixed(
        6
      )}`
      markerData.current.set(coordKey, { name })
      if (name) markerElement.dataset.placeName = name

      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: "bottom", // Anchor to the bottom-center
        offset: [0, isMobile ? -60 : 0], // Add offset on mobile to account for InfoPanel
      })
        .setLngLat([coordinates.lng, coordinates.lat])
        .addTo(map.current!)

      // Add click handler to marker icon
      const iconContainer = markerElement.querySelector(
        "div[data-has-sun]"
      ) as HTMLElement
      if (iconContainer) {
        iconContainer.addEventListener("click", () => {
          if (selectedMarker.current === marker) {
            // Deselect if already selected
            unselectMarker(selectedMarker.current)
            selectedMarker.current = null
            // Notify parent component
            onMarkerSelected?.(null)
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
            const placeName = marker.getElement().dataset.placeName
            onMarkerSelected?.({
              lat: parseFloat(lngLat.lat.toFixed(6)),
              lng: parseFloat(lngLat.lng.toFixed(6)),
              name: placeName,
            })
          }
        })
      }

      markers.current.push(marker)
      centerOnLocation(coordinates)
      // Defer to ensure DOM elements are rendered for accurate bounding box calculation
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
      // Defer marker updates to avoid conflict with ShadeMap update
      setTimeout(() => {
        const existingMarkersData: {
          coords: { lat: number; lng: number }
          name?: string
          place_id?: string
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
            isSelected: selectedMarker.current === marker,
          })
          marker.remove() // Remove old marker
        })

        markers.current = []
        selectedMarker.current = null
        // markerData.current remains as it was, just used for lookup

        existingMarkersData.forEach((data) => {
          const newElement = createMarkerElement(data.coords, data.name)
          if (data.place_id) newElement.dataset.placeId = data.place_id
          if (data.name) newElement.dataset.placeName = data.name
          const coordKey = `${data.coords.lat.toFixed(
            6
          )},${data.coords.lng.toFixed(6)}`
          newElement.dataset.coordKey = coordKey

          const newMarker = new mapboxgl.Marker({
            element: newElement,
            anchor: "bottom", // Anchor to the bottom-center
            offset: [0, isMobile ? -60 : 0], // Add offset on mobile to account for InfoPanel
          })
            .setLngLat([data.coords.lng, data.coords.lat])
            .addTo(map.current!)

          const iconContainer = newElement.querySelector(
            "div[data-has-sun]"
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
                onMarkerSelected?.({
                  lat: parseFloat(lngLat.lat.toFixed(6)),
                  lng: parseFloat(lngLat.lng.toFixed(6)),
                  place_id: placeId,
                  name: placeName,
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
        updateLabelVisibility() // Update labels after date change
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

        // Get place_id if available
        const placeId = marker.getElement().dataset.placeId
        const placeName = marker.getElement().dataset.placeName

        // Notify parent component with precise coordinates
        onMarkerSelected?.({
          lat: parseFloat(lngLat.lat.toFixed(6)),
          lng: parseFloat(lngLat.lng.toFixed(6)),
          place_id: placeId,
          name: placeName,
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

        // Call updateLabelVisibility after initial markers (if any) are added via addMarkers
        // which should happen after 'load' if placesData is available early.
        // Also, listen for map movements.
        if (map.current) {
          map.current.on("moveend", updateLabelVisibility)
          map.current.on("zoomend", updateLabelVisibility)
        }
        // Attempt to update label visibility after everything in 'load' is done
        setTimeout(updateLabelVisibility, 0)
      })

      // Update labels once the map is truly idle for the first time
      map.current.once("idle", updateLabelVisibility)

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
    }, [onLoadingProgress])

    // Update ShadeMap and markers when initialDate prop changes, without reinitializing the map
    useEffect(() => {
      if (shadeMap.current) {
        setDate(initialDate)
      }
    }, [initialDate])

    // Helper function to check for overlap between two rectangles
    const checkOverlap = (rect1: DOMRect, rect2: DOMRect): boolean => {
      return !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
      )
    }

    // Function to update label visibility based on overlaps
    const updateLabelVisibility = () => {
      if (!map.current || !map.current.isStyleLoaded()) return

      const visibleLabelRects: DOMRect[] = []

      // First pass: Ensure selected marker's label is visible and accounted for
      if (selectedMarker.current) {
        const selectedEl = selectedMarker.current.getElement()
        const selectedNameElement = selectedEl.querySelector(
          '[data-is-name-label="true"]'
        ) as HTMLElement | null

        if (selectedNameElement) {
          selectedNameElement.style.visibility = "visible" // Ensure it's visible
          const rect = selectedNameElement.getBoundingClientRect()
          // Only add to visibleLabelRects if it has actual dimensions (not 0x0)
          if (rect.width > 0 && rect.height > 0) {
            visibleLabelRects.push(rect)
          }
        }
      }

      // Second pass: Process all other markers
      markers.current.forEach((marker) => {
        // Skip the selected marker as it's already handled and forced visible
        if (marker === selectedMarker.current) {
          return
        }

        const el = marker.getElement()
        const nameElement = el.querySelector(
          '[data-is-name-label="true"]'
        ) as HTMLElement | null

        if (nameElement) {
          // Temporarily make it visible to get correct dimensions if it was hidden
          const originalVisibility = nameElement.style.visibility
          nameElement.style.visibility = "visible"
          const rect = nameElement.getBoundingClientRect()
          nameElement.style.visibility = originalVisibility // Revert immediately

          // Skip if the rect has no dimensions (can happen if element or map not fully ready)
          if (rect.width === 0 || rect.height === 0) {
            nameElement.style.visibility = "hidden" // Ensure it's hidden if no valid rect
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

    return <div ref={mapContainer} style={{ width: "100%", height: "100vh" }} />
  }
)

MapView.displayName = "MapView"

export default MapView
