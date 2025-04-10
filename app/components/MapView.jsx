"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import ShadeMap from "mapbox-gl-shadow-simulator";
import "mapbox-gl/dist/mapbox-gl.css";
import SunCalc from "suncalc";

const SHADEMAP_API_KEY = process.env.NEXT_PUBLIC_SHADEMAP_API_KEY;
const MAPBOX_API_KEY = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const INITIAL_COORDINATES = { lat: 52.095, lng: 5.127 };

export default function MapView() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const shadeMap = useRef(null);

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    // Initialize map with Mapbox style
    map.current = new mapboxgl.Map({
      accessToken: MAPBOX_API_KEY,
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: { lat: INITIAL_COORDINATES.lat, lng: INITIAL_COORDINATES.lng },
      zoom: 8,
      hash: true,
    });

    const mapLoaded = (map) => {
      return new Promise((res) => {
        function cb() {
          if (!map.loaded()) return;
          map.off("render", cb);
          res();
        }
        map.on("render", cb);
        cb();
      });
    };

    let now = new Date(
      SunCalc.getTimes(new Date(), INITIAL_COORDINATES.lat, INITIAL_COORDINATES.lng).sunrise.getTime() + 60 * 60 * 1000
    );

    // Add shadow simulator after map loads
    map.current.on("load", () => {
      shadeMap.current = new ShadeMap({
        apiKey: SHADEMAP_API_KEY,
        date: now,
        color: "#01112f",
        opacity: 0.7,
        terrainSource: {
          maxZoom: 15,
          tileSize: 256,
          getSourceUrl: ({ x, y, z }) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
          getElevation: ({ r, g, b, a }) => r * 256 + g + b / 256 - 32768,
          _overzoom: 18,
        },
        getFeatures: async () => {
          await mapLoaded(map.current);
          const buildingData = map.current
            .querySourceFeatures("composite", { sourceLayer: "building" })
            .filter((feature) => {
              return (
                feature.properties &&
                feature.properties.underground !== "true" &&
                (feature.properties.height || feature.properties.render_height)
              );
            });
          return buildingData;
        },
        debug: (msg) => {
          console.log(new Date().toISOString(), msg);
        },
      }).addTo(map.current);

      shadeMap.current.on("tileloaded", (loadedTiles, totalTiles) => {
        console.log(`Loading: ${((loadedTiles / totalTiles) * 100).toFixed(0)}%`);
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
  }, []);

  return <div ref={mapContainer} style={{ width: "100%", height: "100vh" }} />;
}
