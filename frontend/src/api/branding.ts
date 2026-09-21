import type { Branding, BrandingInput } from '../types';
import { api } from './client';

const BASE = '/api/settings/branding';

export async function getBranding(): Promise<Branding> {
  const { data } = await api.get<Branding>(BASE);
  return data;
}

export async function updateBranding(input: BrandingInput): Promise<Branding> {
  const { data } = await api.put<Branding>(BASE, input);
  return data;
}

export async function uploadLogo(file: File): Promise<Branding> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<Branding>(`${BASE}/logo`, form);
  return data;
}

export async function deleteLogo(): Promise<Branding> {
  const { data } = await api.delete<Branding>(`${BASE}/logo`);
  return data;
}

/** Absolute URL for `<img src>`; honours VITE_API_BASE_URL when the API is on another origin. */
export function logoSrc(branding: Branding): string | null {
  if (!branding.logo_url) return null;
  return `${api.defaults.baseURL ?? ''}${branding.logo_url}`;
}
