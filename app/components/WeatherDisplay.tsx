"use client"

import { useEffect, useState } from "react"
import { getWeather, ProcessedWeatherData } from "@/app/actions/openWeather"
import Image from "next/image"

interface WeatherDisplayProps {
  latitude: number
  longitude: number
}

export default function WeatherDisplay({
  latitude,
  longitude,
}: WeatherDisplayProps) {
  const [weatherData, setWeatherData] = useState<ProcessedWeatherData | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof latitude === "number" && typeof longitude === "number") {
      setLoading(true)
      setError(null)
      getWeather(latitude, longitude)
        .then((data) => {
          if (data) {
            setWeatherData(data)
          } else {
            setError(
              "Could not fetch weather data. Ensure API key is set and location is valid."
            )
          }
        })
        .catch((err) => {
          console.error("Weather fetch error:", err)
          setError("Failed to load weather information.")
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      // Handle cases where lat/lon might not be immediately available or are invalid
      setLoading(false)
      setError("Invalid location coordinates for weather.")
    }
  }, [latitude, longitude])

  if (loading) {
    return <></>
  }

  if (error) {
    return <div className="mt-2 p-2 text-sm text-red-500">{error}</div>
  }

  if (!weatherData) {
    return (
      <div className="mt-2 p-2 text-sm text-foreground/70">
        Weather data not available.
      </div>
    )
  }

  const iconUrl = `https://openweathermap.org/img/wn/${weatherData.icon}@2x.png`

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center">
        <Image
          src={iconUrl}
          alt={weatherData.description}
          width={40} // Reduced size slightly
          height={40} // Reduced size slightly
          className="rounded-full" // Added a subtle background to icon
        />
        <span className="ml-2 text-xl font-semibold text-foreground">
          {Math.round(weatherData.temp)}°C
        </span>
      </div>
      <div className="text-xs text-foreground/80">
        {" "}
        {/* Adjusted text size for compactness */}
        <p>
          UV Index: <span className="font-bold">{weatherData.uvi}</span>
        </p>
        <p className="capitalize">{weatherData.description}</p>
      </div>
    </div>
  )
}
