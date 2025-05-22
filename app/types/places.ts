export enum PlaceType {
  Restaurant = "restaurant",
  Bar = "bar",
  Park = "park",
  Cafe = "cafe",
}

export interface Place {
  placeId: string
  structuredFormat: {
    mainText: {
      text: string
    }
    secondaryText: {
      text: string
    }
  }
  type: PlaceType
}
