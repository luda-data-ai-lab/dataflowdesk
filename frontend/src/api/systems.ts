import type { Page, System, SystemInput } from '../types';
import { api } from './client';

export interface SystemQuery {
  category?: string;
  type?: string;
  keyword?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export async function listSystems(params: SystemQuery): Promise<Page<System>> {
  const { data } = await api.get<Page<System>>('/api/systems', { params });
  return data;
}

export async function getSystem(id: number, includePassword = false): Promise<System> {
  const { data } = await api.get<System>(`/api/systems/${id}`, {
    params: includePassword ? { include_password: true } : undefined,
  });
  return data;
}

export async function createSystem(body: SystemInput): Promise<System> {
  const { data } = await api.post<System>('/api/systems', body);
  return data;
}

export async function updateSystem(id: number, body: SystemInput): Promise<System> {
  const { data } = await api.put<System>(`/api/systems/${id}`, body);
  return data;
}

export async function deleteSystem(id: number): Promise<void> {
  await api.delete(`/api/systems/${id}`);
}
