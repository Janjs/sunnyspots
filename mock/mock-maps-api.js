const express = require("express")
const app = express()
const port = 3020
const fs = require("fs")
const path = require("path")

app.use(express.json())

app.get("/places/nearbysearch", (req, res) => {
  console.log("Request received at /nearbysearch")
  const { location, radius, type, keyword } = req.query
  console.log("location", location)
  console.log("radius", radius)
  console.log("type", type)
  console.log("keyword", keyword)
  // Load mock data from JSON file
  const mockNearbySearch = JSON.parse(
    fs.readFileSync(path.join(__dirname, "files/mock-nearby.json"), "utf8")
  )
  console.log("mockNearbySearch", mockNearbySearch)

  res.json(mockNearbySearch)
})

app.listen(port, () => {
  console.log(`Mock API server running at http://localhost:${port}`)
})
