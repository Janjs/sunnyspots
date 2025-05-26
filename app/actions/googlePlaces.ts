"use server"

import { Place, PlaceSelectData } from "../components/PlacesAutocomplete"
import { PlaceType } from "@/app/types/places"
import { fetchWithCache } from "@/app/utils/fetchWithCache"

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
const placesApiUrl = "https://places.googleapis.com/v1/places"
const mapsApiUrl =
  "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

// Helper to determine if response was likely cached based on timing
const wasResponseCached = (responseTime: number) => responseTime < 10 // If response took less than 20ms, it was likely cached

async function fetchNearbyPlacesByType(
  location: { lat: number; lng: number },
  type: string,
  keyword?: string, // Keyword is now optional
  radius: number = 1500
): Promise<PlaceResult[]> {
  const startTime = Date.now()
  const paramsObj: Record<string, string> = {
    location: `${location.lat},${location.lng}`,
    radius: radius.toString(),
    type,
    rankby: "prominence",
    key: GOOGLE_API_KEY as string,
  }
  if (keyword) {
    paramsObj.keyword = keyword
  }
  const params = new URLSearchParams(paramsObj)

  console.log(
    `[Places API] Searching nearby places at location: ${location.lat},${
      location.lng
    } with type: ${type}${keyword ? `, keyword: ${keyword}` : ""}`
  )
  try {
    const response = await fetchWithCache(`${mapsApiUrl}?${params}`, {
      // next: { revalidate: ONE_DAY_IN_SECONDS }, // Cache for 1 day
    })
    const endTime = Date.now()
    const responseTime = endTime - startTime

    console.log(
      `[Places API] Nearby search for type ${type} completed in ${responseTime}ms (${
        wasResponseCached(responseTime) ? "CACHE HIT" : "CACHE MISS"
      })`
    )

    if (!response.ok) {
      throw new Error(
        `Failed to fetch nearby places (type: ${type}): ${response.statusText}`
      )
    }

    const data = await response.json()
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(
        `Places API Error (type: ${type}): ${data.status} ${
          data.error_message || ""
        }`
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
      type: mapToPlaceType(place.types),
    }))
  } catch (error) {
    console.error(`Error fetching nearby places (type: ${type}):`, error)
    // Don't rethrow, allow other searches to proceed if one fails
    return []
  }
}

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
  const response = await fetchWithCache(`${placesApiUrl}:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY as string,
    },
    body: JSON.stringify(body),
    // next: { revalidate: ONE_DAY_IN_SECONDS }, // Cache for 1 day
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
  type: PlaceType // Only one type per place
}

function mapToPlaceType(types: string[] | undefined): PlaceType {
  if (!types || types.length === 0) return PlaceType.Restaurant
  const t = types[0].toLowerCase()
  if (t.includes("park")) return PlaceType.Park
  if (t.includes("restaurant")) return PlaceType.Restaurant
  if (t.includes("bar") || t.includes("pub")) return PlaceType.Bar
  if (t.includes("cafe") || t.includes("coffee")) return PlaceType.Cafe
  return PlaceType.Restaurant
}

export async function fetchPlaceDetails(
  placeId: string
): Promise<PlaceSelectData | null> {
  const startTime = Date.now()
  console.log(
    `[Places API] Fetching details for place (for PlaceSelectData): ${placeId}`
  )

  const detailsUrl = `${placesApiUrl}/${placeId}?fields=name,id,location,formattedAddress,outdoorSeating,photos,types&languageCode=en-US`

  const response = await fetchWithCache(detailsUrl, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": GOOGLE_API_KEY as string,
      "Content-Type": "application/json",
    },
    // next: { revalidate: ONE_DAY_IN_SECONDS }, // DELETED
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
    type: mapToPlaceType(placeDetails.types),
  }
  return placeSelectData
}

interface NearbySearchParams {
  location: { lat: number; lng: number }
  // type and keyword are no longer direct params here, managed internally
  radius?: number
}

export async function searchTopOutdoorPlaces({
  location,
  radius = 1500,
}: NearbySearchParams): Promise<PlaceResult[]> {
  try {
    const restaurantAndBarTypes = `${PlaceType.Restaurant}|${PlaceType.Bar}|${PlaceType.Cafe}`
    const parkType = PlaceType.Park

    // Fetch restaurants and bars with "outdoor seating" keyword
    const restaurantAndBarPromise = fetchNearbyPlacesByType(
      location,
      restaurantAndBarTypes,
      "outdoor seating", // Specific keyword for these types
      radius
    )
    // Fetch parks (no specific keyword, type is sufficient)
    // We can request more results for parks if desired by adjusting API parameters if available,
    // but Nearby Search usually returns up to 20 results, or 60 with pagination.
    // For simplicity, we'll rely on the default for now.
    const parkPromise = fetchNearbyPlacesByType(
      location,
      parkType,
      undefined,
      radius
    ) // No keyword for parks

    const [restaurantAndBarResults, parkResults] = await Promise.all([
      restaurantAndBarPromise,
      parkPromise,
    ])

    // Combine results, ensuring no duplicates if a place somehow fits both queries
    const combinedResults: PlaceResult[] = []
    const placeIds = new Set<string>()

    const addPlaces = (places: PlaceResult[]) => {
      for (const place of places) {
        if (!placeIds.has(place.place_id)) {
          combinedResults.push(place)
          placeIds.add(place.place_id)
        }
      }
    }

    // Add parks first, then restaurants/bars
    addPlaces(parkResults)
    addPlaces(restaurantAndBarResults)

    // The requirement for "atleast 5 parks" is tricky with API limits.
    // This current implementation adds all found parks first.
    // If you need to strictly enforce 5 parks or a different sorting/prioritization,
    // that logic would go here, potentially involving more complex fetching or filtering.

    console.log(
      `[Places API] Combined search: ${parkResults.length} parks, ${restaurantAndBarResults.length} restaurants/bars. Total unique: ${combinedResults.length}`
    )

    return combinedResults
  } catch (error) {
    console.error("Error in searchTopOutdoorPlaces combining results:", error)
    throw error // Re-throw if the overall process fails critically
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
  const response = await fetchWithCache(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY as string,
    },
    body: bodyString,
    // next: { revalidate: ONE_DAY_IN_SECONDS }, // Cache for 1 day
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
