"use server"

import { Place, PlaceSelectData } from "../components/PlacesAutocomplete"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const placesApiUrl = "https://places.googleapis.com/v1/places"
const mapsApiUrl =
  "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

// Cache durations in seconds
const ONE_DAY_IN_SECONDS = 86400
const ONE_HOUR_IN_SECONDS = 3600

// Helper to determine if response was likely cached based on timing
const wasResponseCached = (responseTime: number) => responseTime < 20 // If response took less than 20ms, it was likely cached

export async function fetchPlaceSuggestions(
  query: string,
  location: { lat: number; lng: number },
  types: string[] = ["restaurant", "bar"] // Allow types to be passed
): Promise<Place[]> {
  const startTime = Date.now()
  const body = {
    input: query,
    locationBias: {
      circle: {
        center: {
          latitude: location.lat,
          longitude: location.lng,
        },
        radius: 5000,
      },
    },
    includedPrimaryTypes: types, // Use passed types
    languageCode: "en-US",
  }
  console.log(
    `[Places API] Fetching suggestions for query: "${query}" at location: ${
      location.lat
    },${location.lng} with types: ${types.join(",")}`
  )
  const response = await fetch(`${placesApiUrl}:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY as string,
    },
    body: JSON.stringify(body),
    next: { revalidate: ONE_DAY_IN_SECONDS }, // Cache for 1 day
  })
  const endTime = Date.now()
  const responseTime = endTime - startTime
  console.log(
    `[Places API] Suggestions request completed in ${responseTime}ms (${
      wasResponseCached(responseTime) ? "CACHE HIT" : "CACHE MISS"
    })`
  )

  const data = await response.json()
  return data.suggestions
    ? (data.suggestions.map((p: any) => p.placePrediction) as Place[])
    : []
}

export async function fetchPlaceDetails(
  placeId: string
): Promise<PlaceSelectData> {
  const startTime = Date.now()
  console.log(`[Places API] Fetching details for place: ${placeId}`)
  const detailsUrl = `${placesApiUrl}/${placeId}?fields=location,formattedAddress,outdoorSeating`
  const response = await fetch(detailsUrl, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": GOOGLE_API_KEY as string,
      "Content-Type": "application/json",
    },
    next: { revalidate: ONE_DAY_IN_SECONDS }, // Cache for 1 day
  })
  const endTime = Date.now()
  const responseTime = endTime - startTime
  console.log(
    `[Places API] Details request completed in ${responseTime}ms (${
      wasResponseCached(responseTime) ? "CACHE HIT" : "CACHE MISS"
    })`
  )

  const placeDetails = await response.json()
  const placeSelectData: PlaceSelectData = {
    name: placeDetails.name,
    geometry: {
      location: {
        lat: placeDetails.location.latitude,
        lng: placeDetails.location.longitude,
      },
    },
    formatted_address: placeDetails.formattedAddress,
    outdoorSeating: placeDetails.outdoorSeating,
  }
  return placeSelectData
}

interface NearbySearchParams {
  location: { lat: number; lng: number }
  type?: string
  keyword?: string
  radius?: number
}

export interface PlaceResult {
  place_id: string
  name: string
  rating?: number
  vicinity: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  photos?: {
    photo_reference: string
    height: number
    width: number
    html_attributions: string[]
  }[]
  opening_hours?: {
    open_now: boolean
  }
  price_level?: number
  user_ratings_total?: number
  business_status?: string
}

export async function searchTopOutdoorPlaces({
  location,
  type = "restaurant",
  keyword = "outdoor seating",
  radius = 1500,
}: NearbySearchParams): Promise<PlaceResult[]> {
  const startTime = Date.now()
  const params = new URLSearchParams({
    location: `${location.lat},${location.lng}`,
    radius: radius.toString(),
    type,
    keyword,
    rankby: "prominence",
    key: GOOGLE_API_KEY as string,
  })
  console.log(
    `[Places API] Searching nearby places at location: ${location.lat},${location.lng} with type: ${type}, keyword: ${keyword}`
  )
  try {
    const response = await fetch(`${mapsApiUrl}?${params}`, {
      next: { revalidate: ONE_DAY_IN_SECONDS }, // Cache for 1 day
    })
    const endTime = Date.now()
    const responseTime = endTime - startTime
    console.log(
      `[Places API] Nearby search completed in ${responseTime}ms (${
        wasResponseCached(responseTime) ? "CACHE HIT" : "CACHE MISS"
      })`
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch nearby places: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(
        `Places API Error: ${data.status} ${data.error_message || ""}`
      )
    }

    return (data.results || []).map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      rating: place.rating,
      vicinity: place.vicinity,
      geometry: {
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
      },
      photos: place.photos,
      user_ratings_total: place.user_ratings_total,
      business_status: place.business_status,
    }))
  } catch (error) {
    console.error("Error fetching nearby places:", error)
    throw error
  }
}

export async function getPlacePhotoUrl(
  photoReference: string,
  maxWidth: number = 400
): Promise<string> {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`,
    {
      next: { revalidate: ONE_DAY_IN_SECONDS },
      cache: "force-cache",
    }
  )

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const base64Image = buffer.toString("base64")
  const contentType = response.headers.get("content-type") || "image/jpeg"
  return `data:${contentType};base64,${base64Image}`
}

// Add new interface for CitySuggestion
export interface CitySuggestion {
  placePrediction: {
    placeId: string
    text: {
      text: string // Full city name, e.g., "Amsterdam, Netherlands"
    }
    structuredFormat: {
      mainText: {
        text: string // e.g., "Amsterdam"
      }
      secondaryText?: {
        text: string // e.g., "Netherlands"
      }
    }
  }
}

// New function to fetch city suggestions
export async function fetchCitySuggestions(
  query: string,
  location?: { lat: number; lng: number } // Optional location for bias
): Promise<CitySuggestion[]> {
  const startTime = Date.now()
  const body: any = {
    input: query,
    languageCode: "en-US",
    // Reverting to array based on common usage for (cities) type collection with v1 endpoint
    // The new API might still use `types` for these broad collections, and an array is typical for multi-value params.
    includedPrimaryTypes: ["(cities)"],
  }

  if (location) {
    body.locationBias = {
      circle: {
        center: {
          latitude: location.lat,
          longitude: location.lng,
        },
        radius: 50000, // Larger radius for city search bias
      },
    }
  }

  const url = `${placesApiUrl}:autocomplete`
  const bodyString = JSON.stringify(body)

  console.log(
    `[Places API] Fetching city suggestions for query: "${query}"${
      location ? ` biased around: ${location.lat},${location.lng}` : ""
    }`
  )
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY as string,
    },
    body: bodyString,
    next: { revalidate: ONE_DAY_IN_SECONDS }, // Cache for 1 day
  })

  const endTime = Date.now()
  const responseTime = endTime - startTime
  console.log(
    `[Places API] City suggestions request completed in ${responseTime}ms (${
      wasResponseCached(responseTime) ? "CACHE HIT" : "CACHE MISS"
    })`
  )

  const data = await response.json()
  return data.suggestions ? (data.suggestions as CitySuggestion[]) : []
}
