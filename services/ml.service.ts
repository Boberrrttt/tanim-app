import apiClient from "./api"

export const predict = async (features: number[]) => {
    try {
        const response = await apiClient.post('/predict', {
            "features": features  
        })
        return response.data
    } catch (error) {
        console.error('Error predicting:', error)
        throw error
    }
}