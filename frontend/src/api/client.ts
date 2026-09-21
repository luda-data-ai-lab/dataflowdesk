import axios, { AxiosError } from 'axios';

import type { ApiError } from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 30_000,
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
