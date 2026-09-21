import type { TokenPair, User } from '../types';
import { api } from './client';

export async function login(username: string, password: string): Promise<TokenPair> {
  const { data } = await api.post<TokenPair>('/api/auth/login', { username, password });
  return data;
}

export async function refreshTokens(refresh_token: string): Promise<TokenPair> {
  const { data } = await api.post<TokenPair>('/api/auth/refresh', { refresh_token });
  return data;
}

export async function me(): Promise<User> {
  const { data } = await api.get<User>('/api/auth/me');
  return data;
}
