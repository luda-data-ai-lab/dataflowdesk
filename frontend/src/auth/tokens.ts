import type { TokenPair } from '../types';

const ACCESS_KEY = 'dfd.access_token';
const REFRESH_KEY = 'dfd.refresh_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function storeTokens(pair: TokenPair): void {
  localStorage.setItem(ACCESS_KEY, pair.access_token);
  localStorage.setItem(REFRESH_KEY, pair.refresh_token);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
