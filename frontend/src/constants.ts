// Editable UI constants — kept in one place (DEVIN.md rule 4).
export const SYSTEM_CATEGORIES = ['운영', '개발', '스테이징'] as const;
export const SYSTEM_TYPES = ['ERP', 'DB', 'REST', 'FTP', 'MQ'] as const;
export const INTERFACE_CYCLES = ['Real Time', 'Batch'] as const;
export const INTERFACE_STATUSES = ['Active', 'Inactive', 'Deprecated'] as const;
export const PAGE_SIZE = 20;

export const SYSTEM_TYPE_COLORS: Record<string, string> = {
  ERP: 'bg-blue-100 text-blue-800',
  DB: 'bg-green-100 text-green-800',
  REST: 'bg-orange-100 text-orange-800',
  FTP: 'bg-slate-200 text-slate-700',
  MQ: 'bg-purple-100 text-purple-800',
};

export const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-800',
  Inactive: 'bg-slate-200 text-slate-700',
  Deprecated: 'bg-red-100 text-red-800',
};
