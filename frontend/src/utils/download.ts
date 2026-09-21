/** Parse `filename*=UTF-8''...` or `filename="..."` from a Content-Disposition header. */
export function filenameFromDisposition(header: string | undefined): string | null {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8) return decodeURIComponent(utf8[1]);
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1] : null;
}

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob: Blob, disposition: string | undefined, fallback: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filenameFromDisposition(disposition) ?? fallback;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
