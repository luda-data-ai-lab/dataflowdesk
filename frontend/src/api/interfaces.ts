import type { Interface, InterfaceInput, Page } from '../types';
import { api } from './client';
import { downloadXlsx } from './xlsx';

export interface InterfaceQuery {
  integration_type?: string;
  source?: string;
  target?: string;
  system?: string;
  via?: string;
  cycle?: string;
  status?: string;
  keyword?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export async function listInterfaces(params: InterfaceQuery): Promise<Page<Interface>> {
  const { data } = await api.get<Page<Interface>>('/api/interfaces', { params });
  return data;
}

export type InterfaceExportQuery = Omit<InterfaceQuery, 'page' | 'size'>;

/** Download the interface list matching `params` as xlsx (all pages). */
export function exportInterfaces(params: InterfaceExportQuery): Promise<void> {
  return downloadXlsx('/api/interfaces/export', 'dataflowdesk_interfaces.xlsx', { ...params });
}

export async function createInterface(body: InterfaceInput): Promise<Interface> {
  const { data } = await api.post<Interface>('/api/interfaces', body);
  return data;
}

export async function updateInterface(id: number, body: InterfaceInput): Promise<Interface> {
  const { data } = await api.put<Interface>(`/api/interfaces/${id}`, body);
  return data;
}

export async function deleteInterface(id: number): Promise<void> {
  await api.delete(`/api/interfaces/${id}`);
}
