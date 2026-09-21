import type { Topology } from '../types';
import { api } from './client';

export interface TopologyQuery {
  category?: string;
  status?: string;
  hub?: string;
}

export async function getTopology(params: TopologyQuery): Promise<Topology> {
  const { data } = await api.get<Topology>('/api/topology', { params });
  return data;
}
