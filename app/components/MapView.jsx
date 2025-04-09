"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import ShadeMap from "mapbox-gl-shadow-simulator";
import "maplibre-gl/dist/maplibre-gl.css";
import SunCalc from "suncalc";

const SHADEMAP_API_KEY = process.env.NEXT_PUBLIC_SHADEMAP_API_KEY;

export default function MapView() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const shadeMap = useRef(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Set RTL text plugin
    maplibregl.setRTLTextPlugin("https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js", true);

    // Initialize the map with Protomaps style
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
        sources: {
          protomaps: {
            type: "vector",
            tiles: ["https://cfw.shademap.app/planet/{z}/{x}/{y}.pbf"],
            attribution:
              '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
            maxzoom: 15,
          },
        },
        layers: protomaps_themes_base.default("protomaps", "light", "en"),
      },
      center: [2.189, 41.787], // utrecht: [5.127, 52.095],
      zoom: 7,
      hash: true,
    });

    const mapLoaded = (map) => {
      return new Promise((res, rej) => {
        function cb() {
          if (!map.loaded()) {
            return;
          }
          map.off("render", cb);
          res();
        }
        map.on("render", cb);
        cb();
      });
    };

    // Add shadow simulator after map loads
    map.current.on("load", async () => {
      shadeMap.current = new ShadeMap({
        date: new Date(Date.now() + 1 * 60 * 60 * 1000),
        color: "#01112f",
        opacity: 0.7,
        apiKey: SHADEMAP_API_KEY,
        terrainSource: {
          maxZoom: 15,
          tileSize: 256,
          getSourceUrl: ({ x, y, z }) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
          getElevation: ({ r, g, b, a }) => r * 256 + g + b / 256 - 32768,
          _overzoom: 18,
        },
        getFeatures: async () => {
          if (map.current.getZoom() >= 12) {
            await mapLoaded(map.current);
            const buildingData = map.current.querySourceFeatures("protomaps", { sourceLayer: "buildings" });

            buildingData.forEach((feature) => {
              feature.properties.height = feature.properties.height || 3.1;
            });

            buildingData.sort((a, b) => {
              return a.properties.height - b.properties.height;
            });
            return buildingData;
          }
          return [];
        },
        debug: (msg) => {
          console.log(new Date().toISOString(), msg);
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
