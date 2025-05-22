export enum PlaceType {
  Restaurant = "restaurant",
  Bar = "bar",
  Park = "park",
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
  types?: string[]
}
