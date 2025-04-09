"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import ShadeMap from "mapbox-gl-shadow-simulator";
import "maplibre-gl/dist/maplibre-gl.css";

const SHADEMAP_API_KEY = process.env.NEXT_PUBLIC_SHADEMAP_API_KEY;
const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

export default function MapView() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const shadeMap = useRef(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize the map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_API_KEY}`,
      center: [5.127, 52.095],
      zoom: 16,
    });

    // Add shadow simulator after map loads
    map.current.on("load", () => {
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
      shadeMap.current.addTo(map.current);
    });

    // Cleanup
    return () => {
      if (shadeMap.current) shadeMap.current.remove();
      if (map.current) map.current.remove();
    };
  }, []);

  return <div ref={mapContainer} style={{ width: "100%", height: "100vh" }} />;
}
