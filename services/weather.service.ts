import apiClient from "./api"

export const GetWeatherToday = async (lat: number, lon: number) => {
    try {
        const response = await apiClient.get(`/weather?lat=${lat}&lon=${lon}`)
        return response.data
    } catch (error) {
        console.error('Error fetching weather:', error)
        throw error
    }
}