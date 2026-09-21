import type { ChangeLog, Page } from '../types';
import { api } from './client';
import { downloadXlsx } from './xlsx';

export interface ChangeLogQuery {
  table?: string;
  action?: string;
  user_id?: number;
  record_id?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  size?: number;
}

export async function listChangeLog(params: ChangeLogQuery): Promise<Page<ChangeLog>> {
  const { data } = await api.get<Page<ChangeLog>>('/api/changelog', { params });
  return data;
}

export type ChangeLogExportQuery = Omit<ChangeLogQuery, 'page' | 'size'>;

export function exportChangeLog(params: ChangeLogExportQuery): Promise<void> {
  return downloadXlsx('/api/changelog/export', 'dataflowdesk_changelog.xlsx', { ...params });
}
