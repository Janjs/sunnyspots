const express = require("express")
const app = express()
const port = 3010

app.use(express.json())

app.post("/places:autocomplete", (req, res) => {
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
  const { placeId } = req.params

  // Mock response for place details
  const mockPlaceDetails = {
    formattedAddress: "Neude 37-39, 3512 AG Utrecht, Netherlands",
    location: { latitude: 52.0928754, longitude: 5.119053999999999 },
    outdoorSeating: true,
  }

  res.json(mockPlaceDetails)
})

app.listen(port, () => {
  console.log(`Mock API server running at http://localhost:${port}`)
})
