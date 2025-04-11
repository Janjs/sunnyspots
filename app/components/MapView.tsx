"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle, Dispatch, SetStateAction } from "react";
import mapboxgl from "mapbox-gl";
import ShadeMap from "mapbox-gl-shadow-simulator";
import "mapbox-gl/dist/mapbox-gl.css";

interface Location {
  lat: number;
  lng: number;
}

interface MapViewProps {
  onLoadingProgress: Dispatch<SetStateAction<number>>;
  defaultLocation: Location;
  initialDate: Date;
}

interface MapViewRef {
  addMarker: (coordinates: Location, outdoorSeating: boolean) => void;
  setDate: (date: Date) => void;
}

const SHADEMAP_API_KEY = process.env.NEXT_PUBLIC_SHADEMAP_API_KEY;
const MAPBOX_API_KEY = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const MapView = forwardRef<MapViewRef, MapViewProps>(({ onLoadingProgress, defaultLocation, initialDate }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const shadeMap = useRef<any>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  const addMarker = (coordinates: Location, outdoorSeating: boolean) => {
    if (marker.current) {
      marker.current.remove();
    }

    const markerColor = outdoorSeating ? "#00FF00" : "#FF0000"; // Green if outdoorSeating, red otherwise

    marker.current = new mapboxgl.Marker({ color: markerColor })
      .setLngLat([coordinates.lng, coordinates.lat])
      .addTo(map.current!);

    map.current?.panTo([coordinates.lng, coordinates.lat], {
      duration: 1000,
    });
  };

  const setDate = (date: Date) => {
    if (shadeMap.current) {
      shadeMap.current.setDate(date);
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (event.metaKey) {
      // Check if cmd key is pressed
      const pitchChange = event.movementY * 0.1; // Adjust pitch based on vertical mouse movement
      const newPitch = Math.max(0, Math.min(map.current!.getPitch() - pitchChange, 60));
      map.current?.setPitch(newPitch);
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    addMarker,
    setDate,
  }));

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    // Initialize map with Mapbox style
    map.current = new mapboxgl.Map({
      accessToken: MAPBOX_API_KEY,
      container: mapContainer.current!,
      style: "mapbox://styles/mapbox/streets-v11",
      center: { lat: defaultLocation.lat, lng: defaultLocation.lng },
      zoom: 15,
      minZoom: 15,
      hash: true,
      pitch: 45,
    });

    const mapLoaded = (map: mapboxgl.Map) => {
      return new Promise<void>((res) => {
        function cb() {
          if (!map.loaded()) return;
          map.off("render", cb);
          res();
        }
        map.on("render", cb);
        cb();
      });
    };

    // Add shadow simulator after map loads
    map.current.on("load", async () => {
      // Ensure map is fully loaded before initializing ShadeMap
      await mapLoaded(map.current!);

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
      });

      // Add zoom and rotation controls to the map in the bottom right corner
      map.current!.addControl(new mapboxgl.NavigationControl(), "bottom-right");

      shadeMap.current = new ShadeMap({
        apiKey: SHADEMAP_API_KEY!,
        date: initialDate,
        color: "#01112f",
        opacity: 0.6,
        terrainSource: {
          maxZoom: 15,
          tileSize: 256,
          getSourceUrl: ({ x, y, z }: { x: number; y: number; z: number }) =>
            `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
          getElevation: ({ r, g, b }: { r: number; g: number; b: number }) => r * 256 + g + b / 256 - 32768,
          _overzoom: 18,
        },
        getFeatures: async () => {
          try {
            const buildingData = map
              .current!.querySourceFeatures("composite", { sourceLayer: "building" })
              .filter((feature: any) => {
                return (
                  feature.properties &&
                  feature.properties.underground !== "true" &&
                  (feature.properties.height || feature.properties.render_height)
                );
              });
            return buildingData;
          } catch (error) {
            console.error("Error getting features:", error);
            return [];
          }
        },
        debug: (msg: string) => {
          console.log(new Date().toISOString(), msg);
        },
      }).addTo(map.current!);

      shadeMap.current.on("tileloaded", (loadedTiles: number, totalTiles: number) => {
        const percentage = Math.round((loadedTiles / totalTiles) * 100);
        onLoadingProgress(percentage);
      });
    });

    // Cleanup
    return () => {
      if (shadeMap.current) {
        shadeMap.current.remove();
        shadeMap.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onLoadingProgress, defaultLocation, initialDate]);

  return <div ref={mapContainer} style={{ width: "100%", height: "100vh" }} />;
});

MapView.displayName = "MapView";

export default MapView;
