import apiClient from "./api"

export const predict = async (features: number[], farmId?: string) => {
    
    try {
        const body: { features: number[]; farm_id?: string } = { features }
        if (farmId) body.farm_id = farmId
        const response = await apiClient.post('/ml', body, { timeout: 0 })
        console.log('Response...', response.data);
        return response.data
    } catch (error) {
        console.error('Error predicting:', error)
        throw error
    }
}