import apiClient from './api';

interface getSoilHealthProps {
    farm_id: string
}

export const getSoilHealth = async ({ farm_id }: getSoilHealthProps) => {
    try {   
        const response = await apiClient.get(`/test/${farm_id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching soil health:', error);
        throw error;
    }
}