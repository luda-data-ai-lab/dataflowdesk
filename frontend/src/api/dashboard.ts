import type { DashboardSummary, LabelCount, SystemCount } from '../types';
import { api } from './client';

export async function getSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>('/api/dashboard/summary');
  return data;
}

export async function getBySystem(): Promise<SystemCount[]> {
  const { data } = await api.get<SystemCount[]>('/api/dashboard/by-system');
  return data;
}

export async function getByType(): Promise<LabelCount[]> {
  const { data } = await api.get<LabelCount[]>('/api/dashboard/by-type');
  return data;
}

export async function getByCycle(): Promise<LabelCount[]> {
  const { data } = await api.get<LabelCount[]>('/api/dashboard/by-cycle');
  return data;
}
