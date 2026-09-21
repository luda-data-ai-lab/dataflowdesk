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
  via_system_id: number | null;
  via_system: SystemRef | null;
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
  via_system_id: number | null;
  cycle: string;
  description: string | null;
  status: string;
}

export interface TopologyNode {
  id: number;
  system_code: string;
  system_name: string;
  type: string;
  category: string;
  product_name: string | null;
  is_hub: boolean;
  interface_count: number;
}

export interface TopologyInterface {
  id: number;
  interface_id: string;
  interface_name: string;
  integration_type: string;
  cycle: string;
  status: string;
}

export interface TopologyEdge {
  source_id: number;
  target_id: number;
  interfaces: TopologyInterface[];
}

export interface Topology {
  hub_id: number | null;
  hub_code: string;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
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

export interface Branding {
  company_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  logo_mime: string | null;
  logo_size: number | null;
  updated_at: string;
}

export interface BrandingInput {
  company_name: string | null;
  tagline: string | null;
}

export interface DashboardSummary {
  total_interfaces: number;
  total_systems: number;
  active_interfaces: number;
  realtime_ratio: number;
  recent_changes: number;
}

export interface SystemCount {
  system_id: number;
  system_code: string;
  system_name: string;
  type: string;
  source_count: number;
  target_count: number;
  total: number;
}

export interface LabelCount {
  label: string;
  count: number;
}

export type Role = 'admin' | 'user';

export interface User {
  id: number;
  username: string;
  display_name: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface UserCreate {
  username: string;
  password: string;
  display_name: string | null;
  role: Role;
}

export interface UserUpdate {
  display_name: string | null;
  role: Role;
  password: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ChangeLog {
  id: number;
  table_name: string;
  record_id: number;
  record_label: string | null;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  user_id: number | null;
  username: string | null;
}
