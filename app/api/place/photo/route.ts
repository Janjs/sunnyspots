import { NextRequest, NextResponse } from "next/server"

const CACHE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const photoReference = searchParams.get("photoReference")
    const maxWidth = searchParams.get("maxwidth") || "800"
    const maxHeight = searchParams.get("maxheight") || "800"

    if (!photoReference) {
      return new NextResponse("Missing photo reference", { status: 400 })
    }

    // In development mode, return a local placeholder image instead of calling Google Maps API
    const isDevelopment =
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === undefined
    if (isDevelopment) {
      const placeholderImagePath = "/placeholder.jpg"

      // Read the placeholder image from the public directory
      const fs = await import("fs")
      const path = await import("path")

      try {
        const imagePath = path.join(process.cwd(), "public", "placeholder.jpg")
        const imageBuffer = fs.readFileSync(imagePath)

        return new NextResponse(imageBuffer, {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": `public, max-age=${CACHE_MAX_AGE}`,
          },
          status: 200,
        })
      } catch (error) {
        console.error("Error reading placeholder image:", error)
        return new NextResponse("Failed to load placeholder image", {
          status: 500,
        })
      }
    }

    // Production mode - fetch from Google Maps API
    const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&maxheight=${maxHeight}&photo_reference=${photoReference}&key=${process.env.GOOGLE_API_KEY}`

    const response = await fetch(googlePhotoUrl, {
      cache: "force-cache",
      next: {
        revalidate: 60 * 60 * 24 * 7, // 7 days
      },
    })

    if (!response.ok) {
      return new NextResponse("Failed to fetch photo", {
        status: response.status,
      })
    }

    const headers = new Headers(response.headers)
    headers.set("Cache-Control", `public, max-age=${CACHE_MAX_AGE}`)

    return new NextResponse(response.body, {
      headers,
      status: response.status,
    })
  } catch (error) {
    console.error("Error fetching place photo:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
