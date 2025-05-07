"use server"

const OPEN_WEATHER_API_KEY = process.env.OPEN_WEATHER_API_KEY

// Cache duration in seconds
const ONE_HOUR_IN_SECONDS = 3600

// Helper to determine if response was likely cached based on timing
const wasResponseCached = (responseTime: number) => responseTime < 20 // If response took less than 20ms, it was likely cached

interface WeatherData {
  current: {
    temp: number
    uvi: number
    weather: {
      icon: string
      main: string
      description: string
    }[]
  }
}

export interface ProcessedWeatherData {
  temp: number
  uvi: number
  icon: string
  description: string
  main: string
}

export async function getWeather(
  lat: number,
  lon: number
): Promise<ProcessedWeatherData | null> {
  const startTime = Date.now()
  console.log(`[OpenWeather API] Fetching weather for lat: ${lat}, lon: ${lon}`)

  const apiUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily,alerts&appid=${OPEN_WEATHER_API_KEY}`
  try {
    const response = await fetch(apiUrl, {
      next: { revalidate: ONE_HOUR_IN_SECONDS }, // Cache for 1 hour
    })
    const endTime = Date.now()
    const responseTime = endTime - startTime
    console.log(
      `[OpenWeather API] Weather request completed in ${responseTime}ms (${
        wasResponseCached(responseTime) ? "CACHE HIT" : "CACHE MISS"
      })`
    )

    if (!response.ok) {
      console.error(`Error fetching weather data: ${response.statusText}`)
      return null
    }

    const data: WeatherData = await response.json()

    if (
      data &&
      data.current &&
      data.current.weather &&
      data.current.weather.length > 0
    ) {
      return {
        temp: data.current.temp,
        uvi: data.current.uvi,
        icon: data.current.weather[0].icon,
        description: data.current.weather[0].description,
        main: data.current.weather[0].main,
      }
    } else {
      console.error("Weather data is not in the expected format:", data)
      return null
    }
  } catch (error) {
    console.error("Failed to fetch or parse weather data:", error)
    return null
  }
}
