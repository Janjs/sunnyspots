import SunCalc from "suncalc"

/**
 * Checks if a given location has sunlight at a specific datetime.
 *
 * @param dateTime - The date and time to check.
 * @param latitude - The latitude of the location.
 * @param longitude - The longitude of the location.
 * @returns True if the sun is above the horizon (sunlight), false otherwise.
 */
export function hasSunlight(
  dateTime: Date,
  latitude: number,
  longitude: number
): boolean {
  const position = SunCalc.getPosition(dateTime, latitude, longitude)
  // Check if the sun's altitude is greater than 0 (above the horizon)
  return position.altitude > 0
}
