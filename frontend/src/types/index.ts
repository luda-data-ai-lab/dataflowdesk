export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface System {
  id: number;
  category: string;
  type: string;
  system_name: string;
  system_code: string;
  ip: string | null;
  port: number | null;
  account: string | null;
  password: string | null;
  has_password: boolean;
  product_name: string | null;
  description: string | null;
  interface_count: number;
  created_at: string;
  updated_at: string;
}

export interface SystemInput {
  category: string;
  type: string;
  system_name: string;
  system_code: string;
  ip: string | null;
  port: number | null;
  account: string | null;
  password: string | null;
  product_name: string | null;
  description: string | null;
}

export interface SystemRef {
  id: number;
  system_code: string;
  system_name: string;
  type: string;
}

export interface Interface {
  id: number;
  interface_id: string;
  interface_name: string;
  integration_type: string;
  process: string | null;
  source_system_id: number;
  target_system_id: number;
  source_system: SystemRef | null;
  target_system: SystemRef | null;
  cycle: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface InterfaceInput {
  interface_id: string;
  interface_name: string;
  integration_type: string;
  process: string | null;
  source_system_id: number;
  target_system_id: number;
  cycle: string;
  description: string | null;
  status: string;
}

export interface RowError {
  row: number;
  field: string;
  reason: string;
}

export interface UploadResult {
  file_name: string;
  sheet: string;
  success_count: number;
  skipped_count: number;
  errors: RowError[];
}

export interface UploadHistory {
  id: number;
  file_name: string;
  sheet: string;
  uploaded_at: string;
  record_count: number | null;
  skipped_count: number | null;
  user_id: number | null;
  status: string;
}

export interface ApiError {
  detail: string;
}
