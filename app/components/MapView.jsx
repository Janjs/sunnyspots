"use client";

import { useEffect, useRef } from "react";
import Map from "react-map-gl/maplibre";
import ShadeMap from "mapbox-gl-shadow-simulator";
import "maplibre-gl/dist/maplibre-gl.css";

const SHADEMAP_API_KEY = process.env.NEXT_PUBLIC_SHADEMAP_API_KEY;
const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

export default function MapView() {
  const mapRef = useRef(null);
  const shadeMap = useRef(null);

  useEffect(() => {
    if (!mapRef.current) {
      console.log("No map ref yet");
      return;
    }

    // Get the map instance
    const map = mapRef.current.getMap();
    console.log("Map instance:", map);

    // Add shadow simulator after map loads
    map.on("load", () => {
      console.log("Map loaded, adding ShadeMap");
      try {
        shadeMap.current = new ShadeMap({
          date: new Date(),
          color: "#01112f",
          opacity: 0.7,
          apiKey: SHADEMAP_API_KEY,
          terrainSource: {
            tileSize: 256,
            maxZoom: 15,
            getSourceUrl: ({ x, y, z }) => {
              return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
            },
            getElevation: ({ r, g, b, a }) => {
              return r * 256 + g + b / 256 - 32768;
            },
          },
        });
        console.log("ShadeMap instance created:", shadeMap.current);
        shadeMap.current.addTo(map);
        console.log("ShadeMap added to map");
      } catch (error) {
        console.error("Error setting up ShadeMap:", error);
      }
    });

    // Also listen for style.load event as a backup
    map.on("style.load", () => {
      console.log("Map style loaded");
    });

    // Cleanup
    return () => {
      if (shadeMap.current) {
        console.log("Cleaning up ShadeMap");
        shadeMap.current.remove();
      }
    };
  }, []);

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: 5.127,
        latitude: 52.095,
        zoom: 12,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={`https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_API_KEY}`}
    />
  );
}
