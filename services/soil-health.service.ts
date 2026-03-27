import apiClient, { isAbortLikeError } from './api';

export interface GetSoilHealthProps {
    farm_id: string;
    signal?: AbortSignal;
}

export const getSoilHealth = async ({ farm_id, signal }: GetSoilHealthProps) => {
    try {
        const id = encodeURIComponent(farm_id);
        const response = await apiClient.get(`/test/${id}`, { signal });
        return response.data;
    } catch (error) {
        if (!isAbortLikeError(error)) {
            console.error('Error fetching soil health:', error);
        }
        throw error;
    }
};