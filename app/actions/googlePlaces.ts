"use server"

import { Place, PlaceSelectData } from "../components/PlacesAutocomplete"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const placesApiUrl = "https://places.googleapis.com/v1/places"
// const placesApiUrl = "http://localhost:3010/places"

export async function fetchPlaceSuggestions(
  query: string,
  location: { lat: number; lng: number }
): Promise<Place[]> {
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
    includedRegionCodes: ["nl"],
    includedPrimaryTypes: ["restaurant", "bar"],
  }

  const response = await fetch(`${placesApiUrl}:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY as string,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  console.log("data", data)
  return data.suggestions
    ? (data.suggestions.map((p: any) => p.placePrediction) as Place[])
    : []
}

export async function fetchPlaceDetails(
  placeId: string
): Promise<PlaceSelectData> {
  const detailsUrl = `${placesApiUrl}/${placeId}?fields=location,formattedAddress,outdoorSeating`
  const response = await fetch(detailsUrl, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": GOOGLE_API_KEY as string,
      "Content-Type": "application/json",
    },
  })

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
  const baseUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

  const params = new URLSearchParams({
    location: `${location.lat},${location.lng}`,
    radius: radius.toString(),
    type,
    keyword,
    key: GOOGLE_API_KEY as string,
  })
  console.log(`${baseUrl}?${params}`)
  try {
    const response = await fetch(`${baseUrl}?${params}`)

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
      opening_hours: place.opening_hours,
      price_level: place.price_level,
      user_ratings_total: place.user_ratings_total,
      business_status: place.business_status,
    }))
  } catch (error) {
    console.error("Error fetching nearby places:", error)
    throw error
  }
}
