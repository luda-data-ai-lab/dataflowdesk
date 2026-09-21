import type { User, UserCreate, UserUpdate } from '../types';
import { api } from './client';

export async function listUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>('/api/users');
  return data;
}

export async function createUser(body: UserCreate): Promise<User> {
  const { data } = await api.post<User>('/api/users', body);
  return data;
}

export async function updateUser(id: number, body: UserUpdate): Promise<User> {
  const { data } = await api.put<User>(`/api/users/${id}`, body);
  return data;
}

export async function deactivateUser(id: number): Promise<User> {
  const { data } = await api.patch<User>(`/api/users/${id}/deactivate`);
  return data;
}

export async function activateUser(id: number): Promise<User> {
  const { data } = await api.patch<User>(`/api/users/${id}/activate`);
  return data;
}
