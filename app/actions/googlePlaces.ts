"use server"

import { Place, PlaceSelectData } from "../components/PlacesAutocomplete"
import { PlaceType } from "@/app/types/places"

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
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
  types: string[] = [PlaceType.Restaurant, PlaceType.Bar, PlaceType.Park] // Allow types to be passed
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
  outdoorSeating?: boolean // Added field
  types?: string[] // Added to store place types
}

export async function fetchPlaceDetails(
  placeId: string
): Promise<PlaceSelectData | null> {
  const startTime = Date.now()
  console.log(
    `[Places API] Fetching details for place (for PlaceSelectData): ${placeId}`
  )

  const detailsUrl = `${placesApiUrl}/${placeId}?fields=name,id,location,formattedAddress,outdoorSeating,photos&languageCode=en-US`

  const response = await fetch(detailsUrl, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": GOOGLE_API_KEY as string,
      "Content-Type": "application/json",
    },
    next: { revalidate: ONE_DAY_IN_SECONDS },
  })

  const endTime = Date.now()
  const responseTime = endTime - startTime
  console.log(
    `[Places API] PlaceSelectData details request completed in ${responseTime}ms (${
      wasResponseCached(responseTime) ? "CACHE HIT" : "CACHE MISS"
    }) for place: ${placeId}`
  )

  if (!response.ok) {
    console.error(
      `[Places API] Error fetching details for ${placeId} (PlaceSelectData). Status: ${response.status}`
    )
    const errorBody = await response.text()
    console.error(`[Places API] Error body: ${errorBody}`)
    return null
  }

  const placeDetails = await response.json()

  if (!placeDetails || placeDetails.error) {
    console.error(
      `[Places API] Error in fetched data for ${placeId} (PlaceSelectData):`,
      placeDetails.error
    )
    return null
  }

  // Map API response to PlaceSelectData
  const placeSelectData: PlaceSelectData = {
    place_id: placeDetails.id,
    name: placeDetails.name || placeDetails.displayName || "Name not available",
    geometry: {
      location: {
        lat: placeDetails.location?.latitude || 0,
        lng: placeDetails.location?.longitude || 0,
      },
    },
    formatted_address: placeDetails.formattedAddress || "",
    outdoorSeating: !!placeDetails.outdoorSeating, // Ensure boolean
    photos: (placeDetails.photos || [])
      .map((photo: any) => ({
        photo_reference: photo.name ? photo.name.split("/").pop() : "",
        height: photo.heightPx || 0,
        width: photo.widthPx || 0,
        html_attributions: (photo.authorAttributions || []).map(
          (attr: any) => attr.displayName || ""
        ),
      }))
      .filter((p: any) => p.photo_reference), // Ensure photo_reference is valid
  }
  return placeSelectData
}

interface NearbySearchParams {
  location: { lat: number; lng: number }
  type?: string
  keyword?: string
  radius?: number
}

export async function searchTopOutdoorPlaces({
  location,
  type = `${PlaceType.Restaurant},${PlaceType.Bar},${PlaceType.Park}`,
  keyword = "outdoor seating", // This keyword might not be ideal for parks. We may need to adjust this.
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

    // Add the main type of the place to the result for icon display
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
      types: place.types, // Store the types from the API response
    }))
  } catch (error) {
    console.error("Error fetching nearby places:", error)
    throw error
  }
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
