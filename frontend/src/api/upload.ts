import type { Page, UploadHistory, UploadResult } from '../types';
import { downloadBlob } from '../utils/download';
import { api } from './client';

async function downloadXlsx(url: string, fallbackName: string): Promise<void> {
  const res = await api.get<Blob>(url, { responseType: 'blob' });
  downloadBlob(res.data, res.headers['content-disposition'], fallbackName);
}

export function downloadTemplate(): Promise<void> {
  return downloadXlsx('/api/upload/template', 'if_manager_template.xlsx');
}

export function exportAll(): Promise<void> {
  return downloadXlsx('/api/upload/export', 'if_manager_export.xlsx');
}

export async function uploadSheet(
  kind: 'interfaces' | 'systems',
  file: File,
): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<UploadResult>(`/api/upload/${kind}`, form);
  return data;
}

export async function listUploadHistory(page = 1, size = 10): Promise<Page<UploadHistory>> {
  const { data } = await api.get<Page<UploadHistory>>('/api/upload/history', {
    params: { page, size },
  });
  return data;
}
