import apiClient from './api';

export const getFarms = async () => {
    try {
        const response = await apiClient.get('/farm');
        return response.data;
    } catch (error) {
        console.error('Error fetching farms:', error);
        throw error;
    }
};