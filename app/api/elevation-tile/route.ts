import { NextResponse } from "next/server"

export const runtime = "edge"
// Revalidate very infrequently, terrain data changes rarely. Cache for 1 year.
export const revalidate = 31536000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const z = searchParams.get("z")
  const x = searchParams.get("x")
  const y = searchParams.get("y")

  if (!z || !x || !y) {
    return new NextResponse("Missing tile coordinates (z, x, y)", {
      status: 400,
    })
  }

  const tileUrl = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`

  try {
    const response = await fetch(tileUrl, {
      // Use Next.js fetch caching if desired, though revalidate handles server-side
      // next: { revalidate: 31536000 }
    })

    if (!response.ok) {
      // Pass through the status code from the S3 fetch if it's an error
      return new NextResponse(response.statusText, { status: response.status })
    }

    const imageBuffer = await response.arrayBuffer()

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        // Tell browsers/CDNs to cache for 1 year
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Error fetching elevation tile:", error)
    return new NextResponse("Failed to fetch elevation tile", { status: 500 })
  }
}
