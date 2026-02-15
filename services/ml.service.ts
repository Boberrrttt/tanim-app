import apiClient from "./api"

export const predict = async (features: number[]) => {
    
    try {
        const response = await apiClient.post('/ml', {
            "features": features  
        }, { timeout: 0 })
        console.log('Response...', response.data);
        return response.data
    } catch (error) {
        console.error('Error predicting:', error)
        throw error
    }
}