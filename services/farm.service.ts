import apiClient, { isAbortLikeError } from './api';

export type FarmRequestOptions = { signal?: AbortSignal };

export const getFarms = async (farmerId: string, options?: FarmRequestOptions) => {
    try {
        const response = await apiClient.get(`/farm/${farmerId}`, {
            signal: options?.signal,
        });
        return response.data;
    } catch (error) {
        if (!isAbortLikeError(error)) {
            console.error('Error fetching farms:', error);
        }
        throw error;
    }
};