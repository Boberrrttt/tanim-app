import AsyncStorage from '@react-native-async-storage/async-storage';

import { isAbortLikeError } from '@/services/api';
import { getFarms } from '@/services/farm.service';
import { getFarmingSession, getFarmingSessionsByFarmer } from '@/services/farming-session.service';
import {
  getPendingSoil,
  type PendingSoilResult,
  type PendingSoilSnapshot,
} from '@/services/ml.service';
import { GetWeatherToday, type WeatherDataShape } from '@/services/weather.service';

const PREFIX = '@tanim/offline/v1';

function farmsKey(farmerId: string): string {
  return `${PREFIX}/farms/${encodeURIComponent(farmerId)}`;
}

function farmingSessionKey(farmId: string): string {
  return `${PREFIX}/farming-session/${encodeURIComponent(farmId)}`;
}

function farmingSessionsByFarmerKey(farmerId: string): string {
  return `${PREFIX}/farming-sessions-by-farmer/${encodeURIComponent(farmerId)}`;
}

function pendingSoilStorageKey(farmId: string): string {
  return `${PREFIX}/pending-soil/${encodeURIComponent(farmId)}`;
}

function weatherByFarmKey(farmId: string): string {
  return `${PREFIX}/weather-by-farm/${encodeURIComponent(farmId)}`;
}

async function saveJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function loadJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null || raw === '') return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

/** True when the ML snapshot is for this farm (matches `coordsFromPendingSnapshot` rules). */
export function pendingSnapshotAppliesToFarm(data: PendingSoilSnapshot, farmId: string): boolean {
  const fid = data.farm_id;
  if (fid != null && String(fid).trim() !== '' && String(fid) !== String(farmId)) {
    return false;
  }
  return true;
}

async function clearAllPendingSoilFarmKeys(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(`${PREFIX}/pending-soil/`));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch (e) {
    console.error('clearAllPendingSoilFarmKeys', e);
  }
}

async function persistPendingSoilForFarm(
  result: PendingSoilResult,
  farmId: string
): Promise<void> {
  if (result.ok && result.data) {
    if (pendingSnapshotAppliesToFarm(result.data, farmId)) {
      await saveJson(pendingSoilStorageKey(farmId), result);
    }
    return;
  }
  if (!result.ok && result.waiting) {
    await clearAllPendingSoilFarmKeys();
  }
}

/** Drop all offline copies (call on sign-out so the next user never sees another account’s data). */
export async function clearOfflineSyncData(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(`${PREFIX}/`));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch (e) {
    console.error('clearOfflineSyncData', e);
  }
}

// --- Pending soil (ML deployed model cache), one persisted snapshot per farm ---

export async function loadPersistedPendingSoil(farmId: string): Promise<PendingSoilResult | null> {
  return loadJson<PendingSoilResult>(pendingSoilStorageKey(farmId));
}

/**
 * Fetches ML `GET /pending/soil`, persists under this `farmId` only when the snapshot is for this
 * farm, and on network failure returns that farm’s last persisted snapshot.
 */
export async function fetchPendingSoilWithOfflinePersist(
  farmId: string,
  options?: { signal?: AbortSignal }
): Promise<PendingSoilResult> {
  try {
    const result = await getPendingSoil(options);
    await persistPendingSoilForFarm(result, farmId);
    return result;
  } catch (e: unknown) {
    if (isAbortLikeError(e)) throw e;
    const cached = await loadPersistedPendingSoil(farmId);
    if (cached?.ok && cached.data) return cached;
    throw e;
  }
}

// --- Farms list ---

export async function fetchFarmsWithOfflinePersist(
  farmerId: string,
  options?: { signal?: AbortSignal }
): Promise<Awaited<ReturnType<typeof getFarms>>> {
  try {
    const data = await getFarms(farmerId, options);
    await saveJson(farmsKey(farmerId), data);
    return data;
  } catch (e: unknown) {
    if (isAbortLikeError(e)) throw e;
    const cached = await loadJson<Awaited<ReturnType<typeof getFarms>>>(farmsKey(farmerId));
    if (cached) return cached;
    throw e;
  }
}

// --- Farming session (per farm) ---

export async function fetchFarmingSessionWithOfflinePersist(
  farmId: string,
  options?: { signal?: AbortSignal }
): Promise<Awaited<ReturnType<typeof getFarmingSession>>> {
  try {
    const data = await getFarmingSession(farmId, options);
    await saveJson(farmingSessionKey(farmId), data);
    return data;
  } catch (e: unknown) {
    if (isAbortLikeError(e)) throw e;
    const cached = await loadJson<Awaited<ReturnType<typeof getFarmingSession>>>(
      farmingSessionKey(farmId)
    );
    if (cached) return cached;
    throw e;
  }
}

// --- Farming sessions by farmer (banner) ---

export async function fetchFarmingSessionsByFarmerWithOfflinePersist(
  farmerId: string,
  options?: { signal?: AbortSignal }
): Promise<Awaited<ReturnType<typeof getFarmingSessionsByFarmer>>> {
  try {
    const data = await getFarmingSessionsByFarmer(farmerId, options);
    await saveJson(farmingSessionsByFarmerKey(farmerId), data);
    return data;
  } catch (e: unknown) {
    if (isAbortLikeError(e)) throw e;
    const cached = await loadJson<Awaited<ReturnType<typeof getFarmingSessionsByFarmer>>>(
      farmingSessionsByFarmerKey(farmerId)
    );
    if (cached) return cached;
    throw e;
  }
}

// --- Weather (stored per farm so two farms don’t share one offline row) ---

export async function fetchWeatherWithOfflinePersist(
  farmId: string,
  lat: number,
  lon: number,
  options?: { signal?: AbortSignal }
): Promise<WeatherDataShape> {
  try {
    const data = await GetWeatherToday(lat, lon, options);
    await saveJson(weatherByFarmKey(farmId), data);
    return data;
  } catch (e: unknown) {
    if (isAbortLikeError(e)) throw e;
    const cached = await loadJson<WeatherDataShape>(weatherByFarmKey(farmId));
    if (cached) return cached;
    throw e;
  }
}
