import apiClient from "./api"

/** Payload inside tanim-api `success_response(..., data=processed_data)` for GET /weather. */
export interface WeatherDataShape {
  city: string
  country: string
  latitude: number
  longitude: number
  temperature: number
  feels_like: number
  humidity: number
  pressure: number
  description: string
  wind_speed: number
  wind_direction: number
  visibility: number
  timestamp: number
}

type WeatherApiEnvelope = {
  status: string
  message?: string
  data?: WeatherDataShape
}

export const GetWeatherToday = async (
  lat: number,
  lon: number,
  options?: { signal?: AbortSignal }
): Promise<WeatherDataShape> => {
  try {
    const response = await apiClient.get<WeatherApiEnvelope>(`/weather?lat=${lat}&lon=${lon}`, {
      signal: options?.signal,
    })
    const body = response.data
    if (body?.status === "success" && body.data) {
      return body.data
    }
    throw new Error(body?.message ?? "Weather request failed")
  } catch (error) {
    console.error("Error fetching weather:", error)
    throw error
  }
}