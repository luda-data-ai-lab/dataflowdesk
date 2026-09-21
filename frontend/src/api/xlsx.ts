import { downloadBlob } from '../utils/download';
import { api } from './client';

/** GET an xlsx endpoint and trigger a browser download (filename from Content-Disposition). */
export async function downloadXlsx(
  url: string,
  fallbackName: string,
  params?: Record<string, string | number | undefined>,
): Promise<void> {
  const res = await api.get<Blob>(url, { responseType: 'blob', params });
  downloadBlob(res.data, res.headers['content-disposition'], fallbackName);
}
