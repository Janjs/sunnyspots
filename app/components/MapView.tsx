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
  addMarker: (coordinates: Location) => void;
  setDate: (date: Date) => void;
  toggle3D: () => void;
}

const SHADEMAP_API_KEY = process.env.NEXT_PUBLIC_SHADEMAP_API_KEY;
const MAPBOX_API_KEY = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const MapView = forwardRef<MapViewRef, MapViewProps>(({ onLoadingProgress, defaultLocation, initialDate }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const shadeMap = useRef<any>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const is3DActive = useRef(false);

  const addMarker = (coordinates: Location) => {
    if (marker.current) {
      marker.current.remove();
    }

    marker.current = new mapboxgl.Marker().setLngLat([coordinates.lng, coordinates.lat]).addTo(map.current!);

    map.current?.panTo([coordinates.lng, coordinates.lat], {
      duration: 1000,
    });
  };

  const setDate = (date: Date) => {
    if (shadeMap.current) {
      shadeMap.current.setDate(date);
    }
  };

  const toggle3D = () => {
    if (!map.current) return;

    is3DActive.current = !is3DActive.current;

    console.log("is3DActive", is3DActive.current);

    if (is3DActive.current) {
      map.current.setPitch(45);
      // Add terrain source if it doesn't exist
      if (!map.current.getSource("mapbox-dem")) {
        map.current.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }

      map.current.addLayer({
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
          "fill-extrusion-opacity": 0.9,
        },
      });
    } else {
      map.current.setPitch(0);
      map.current.removeLayer("3d-buildings");
    }
  };

  useImperativeHandle(ref, () => ({
    addMarker,
    setDate,
    toggle3D,
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
    map.current.on("load", () => {
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
          await mapLoaded(map.current!);
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
