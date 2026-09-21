import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { clearTokens, getAccessToken, getRefreshToken, storeTokens } from '../auth/tokens';
import type { ApiError, TokenPair } from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 30_000,
});

/** Fired (once) when the session can no longer be recovered; AuthContext redirects to /login. */
export const SESSION_EXPIRED_EVENT = 'dfd:session-expired';

const AUTH_PATHS = ['/api/auth/login', '/api/auth/refresh'];

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string> | null = null;

/** Exchange the stored refresh token for a new pair; shared between concurrent 401s. */
function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    const refresh_token = getRefreshToken();
    refreshing = (
      refresh_token
        ? axios
            .post<TokenPair>(`${api.defaults.baseURL ?? ''}/api/auth/refresh`, { refresh_token })
            .then(({ data }) => {
              storeTokens(data);
              return data.access_token;
            })
        : Promise.reject(new Error('no refresh token'))
    ).finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RetriableConfig | undefined;
  const isAuthCall = AUTH_PATHS.some((p) => config?.url?.includes(p));
  if (error.response?.status !== 401 || !config || config._retried || isAuthCall) {
    throw error;
  }
  config._retried = true;
  try {
    const token = await refreshAccessToken();
    config.headers.Authorization = `Bearer ${token}`;
    return api.request(config);
  } catch {
    clearTokens();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw error;
  }
});

/** Extract a human readable message from an Axios error (FastAPI `{detail}` bodies). */
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<ApiError | { detail: { msg: string }[] }>;
    const detail = axiosErr.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d) => d.msg).join(', ');
    return axiosErr.message;
  }
  return err instanceof Error ? err.message : String(err);
}
