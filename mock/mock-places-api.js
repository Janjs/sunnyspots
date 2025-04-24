const express = require("express")
const app = express()
const port = 3010
const fs = require("fs")
const path = require("path")

app.use(express.json())

// Root path handler
app.get("/", (req, res) => {
  console.log("Request received at root path")
  res.send("Mock API server is running")
})

app.post("/places:autocomplete", (req, res) => {
  console.log("Request received at /places:autocomplete")
  const { input, locationBias, includedRegionCodes, includedPrimaryTypes } =
    req.body
  // Mock response for place suggestions
  const places = [
    {
      placePrediction: {
        placeId: "ChIJP5qdDac0xEcREJOT9Mzv1Dw",
        structuredFormat: {
          mainText: {
            text: "De Beurs",
          },
          secondaryText: {
            text: "Kruiskade, Rotterdam, Netherlands",
          },
        },
      },
    },
  ]
  res.json({ suggestions: places })
})

app.get("/places/:placeId", (req, res) => {
  console.log(`Request received at /places/${req.params.placeId}`)
  const { placeId } = req.params

  // Mock response for place details
  const mockPlaceDetails = {
    formattedAddress: "Neude 37-39, 3512 AG Utrecht, Netherlands",
    location: { latitude: 52.0928754, longitude: 5.119053999999999 },
    outdoorSeating: true,
  }

  res.json(mockPlaceDetails)
})

app.get("/places/nearbysearch", (req, res) => {
  console.log("Request received at /nearbysearch")
  const { location, radius, type, keyword } = req.query
  console.log("location", location)
  console.log("radius", radius)
  console.log("type", type)
  console.log("keyword", keyword)
  // Load mock data from JSON file
  const mockNearbySearch = JSON.parse(
    fs.readFileSync(path.join(__dirname, "mock-nearby.json"), "utf8")
  )
  console.log("mockNearbySearch", mockNearbySearch)

  res.json(mockNearbySearch)
})

app.listen(port, () => {
  console.log(`Mock API server running at http://localhost:${port}`)
})
