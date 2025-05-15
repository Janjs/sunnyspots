import { NextResponse } from "next/server"
import { getPlacePhotoUrl } from "@/app/actions/googlePlaces"

export const runtime = "edge"
export const revalidate = 86400 // Cache for 24 hours

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const photoReference = searchParams.get("reference")
  const size = searchParams.get("size") || "400"

  console.log(
    `[Place Photo API] Received request for photo: ${photoReference}, size: ${size}`
  )

  if (!photoReference) {
    return new NextResponse("Missing photo reference", { status: 400 })
  }

  try {
    const imageDataUrl = await getPlacePhotoUrl(photoReference, parseInt(size))

    // Convert base64 to binary
    const base64Data = imageDataUrl.split(",")[1]
    const binaryData = Buffer.from(base64Data, "base64")

    // Get content type from data URL
    const contentType = imageDataUrl.split(";")[0].split(":")[1]

    // Log the image size and other details
    console.log(`[Place Photo API] Image details:`, {
      size: binaryData.length,
      contentType,
      base64Length: base64Data.length,
    })

    return new NextResponse(binaryData, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (error) {
    console.error("Error fetching place photo:", error)
    return new NextResponse("Failed to fetch photo", { status: 500 })
  }
}
