import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const REQ_START = '__apiReqStartMs';

function markRequestStart(config: InternalAxiosRequestConfig) {
  (config as InternalAxiosRequestConfig & { [REQ_START]?: number })[REQ_START] = Date.now();
  return config;
}

/** Logs elapsed time for a completed or failed request. */
export function logAxiosResponseTime(
  config: InternalAxiosRequestConfig | undefined,
  label: string,
  failed: boolean
): void {
  if (!config) return;
  const start = (config as InternalAxiosRequestConfig & { [REQ_START]?: number })[REQ_START];
  if (start == null) return;
  const ms = Date.now() - start;
  let url: string;
  try {
    url = axios.getUri(config);
  } catch {
    url = `${config.baseURL ?? ''}${config.url ?? ''}`;
  }
  const method = (config.method ?? 'get').toUpperCase();
  console.log(`[${label}] ${method} ${url} ${ms}ms${failed ? ' (error)' : ''}`);
}

/**
 * Adds response-time logging to any Axios instance (e.g. ML API on a different host).
 */
export function applyResponseTimeLogging(instance: AxiosInstance, label: string) {
  instance.interceptors.request.use(markRequestStart, (e) => Promise.reject(e));
  instance.interceptors.response.use(
    (response) => {
      logAxiosResponseTime(response.config, label, false);
      return response;
    },
    (error) => {
      if (!isAbortLikeError(error)) {
        logAxiosResponseTime(error.config, label, true);
      }
      return Promise.reject(error);
    }
  );
}

/** Axios/fetch abort, navigation unmount, or strict-mode teardown — not a user-visible failure. */
export function isAbortLikeError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const e = error as { name?: string; code?: string; message?: string };
  if (e.name === 'AbortError' || e.name === 'CanceledError') return true;
  if (e.code === 'ERR_CANCELED') return true;
  if (typeof e.message === 'string' && /abort|canceled|cancelled/i.test(e.message)) return true;
  return false;
}

if (__DEV__ && !API_BASE_URL) {
  console.warn(
    'EXPO_PUBLIC_API_URL is missing — API calls will fail. Set it in .env and restart Expo.'
  );
}

// RN defaults to XHR first; XHR + HTTPS/ngrok often surfaces ERR_NETWORK while the server still logs 200.
// Prefer Fetch on native; keep default behavior on web.
const nativeAdapter: ('fetch' | 'xhr')[] = ['fetch', 'xhr'];

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  // Ngrok / mobile links are often >10s; short timeouts surface as AbortError with the fetch adapter.
  timeout: 45000,
  ...(Platform.OS !== 'web' ? { adapter: nativeAdapter } : {}),
  // Cookie-based refresh is a browser concern; credentialed mode can confuse RN's networking stack.
  withCredentials: Platform.OS === 'web',
  headers: {
    'Content-Type': 'application/json',
    // Ngrok free tier interstitial can break non-browser clients; harmless elsewhere.
    'ngrok-skip-browser-warning': 'true',
  },
});

apiClient.interceptors.request.use(markRequestStart, (error) => Promise.reject(error));

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    logAxiosResponseTime(response.config, 'API', false);
    return response;
  },
  (error) => {
    if (isAbortLikeError(error)) {
      return Promise.reject(error);
    }
    logAxiosResponseTime(error.config, 'API', true);
    console.log('Error details:', {
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port,
      response: error.response?.data,
    });
    if (error.response?.status === 401) {
      console.error('Unauthorized access - token expired or invalid');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
