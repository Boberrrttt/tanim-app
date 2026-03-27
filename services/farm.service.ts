import apiClient, { isAbortLikeError } from './api';

export type FarmRequestOptions = { signal?: AbortSignal };

export const getFarms = async (options?: FarmRequestOptions) => {
    try {
        const response = await apiClient.get('/farm/', {
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