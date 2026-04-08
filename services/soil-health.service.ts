import apiClient, { isAbortLikeError } from './api';

export interface GetSoilHealthProps {
    farm_id: string;
    signal?: AbortSignal;
}

export const getSoilHealth = async ({ farm_id, signal }: GetSoilHealthProps) => {
    try {
        const id = encodeURIComponent(farm_id);
        const response = await apiClient.get(`/test/${id}`, { signal });
        if (__DEV__) {
            const rows = (response.data as { data?: unknown[] })?.data;
            const n = Array.isArray(rows) ? rows.length : -1;
            console.log(
                `[SoilHealth] GET /test/${farm_id} → ${n} record(s).`,
                n > 0 ? response.data : '(empty — farm detail "Soil Health" cards use this API, not ML /pending/soil)',
            );
        }
        return response.data;
    } catch (error) {
        if (!isAbortLikeError(error)) {
            console.error('Error fetching soil health:', error);
        }
        throw error;
    }
};