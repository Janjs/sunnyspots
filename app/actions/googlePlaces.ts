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
  console.log("placeDetails", placeDetails)
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
