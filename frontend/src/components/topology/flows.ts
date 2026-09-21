import type { Topology, TopologyNode } from '../../types';

/** One integration path at system granularity: source → (method via hub | direct) → target. */
export interface FlowLink {
  source: TopologyNode;
  target: TopologyNode;
  /** Integration method (연동방식) when routed through the hub; null for direct links. */
  method: string | null;
  count: number;
}

const METHOD_COLORS = ['#dc2626', '#4d7c0f', '#7e22ce', '#0369a1', '#c2410c', '#0f766e', '#be185d'];
const DIRECT_COLOR = '#94a3b8';

/**
 * Rebuild system-level flows from the hop-split topology edges. Interfaces routed through the hub
 * appear once on a source→hub edge and once on a hub→target edge; matching them by interface id
 * yields (source, method, target). Direct edges map 1:1.
 */
export function buildFlows(topology: Topology): FlowLink[] {
  const nodes = new Map(topology.nodes.map((n) => [n.id, n]));
  const hub = topology.hub_id;
  const inbound = new Map<number, { source: TopologyNode; method: string }>();
  topology.edges
    .filter((e) => e.target_id === hub)
    .forEach((e) => {
      const source = nodes.get(e.source_id);
      if (source)
        e.interfaces.forEach((i) => inbound.set(i.id, { source, method: i.integration_type }));
    });

  const acc = new Map<string, FlowLink>();
  const add = (source: TopologyNode, target: TopologyNode, method: string | null) => {
    const key = `${source.id}|${method ?? ''}|${target.id}`;
    const cur = acc.get(key);
    if (cur) cur.count += 1;
    else acc.set(key, { source, target, method, count: 1 });
  };

  topology.edges.forEach((e) => {
    if (e.target_id === hub) return;
    const target = nodes.get(e.target_id);
    if (!target) return;
    if (e.source_id === hub) {
      e.interfaces.forEach((i) => {
        const inb = inbound.get(i.id);
        if (inb) add(inb.source, target, inb.method);
      });
    } else {
      const source = nodes.get(e.source_id);
      if (source) e.interfaces.forEach(() => add(source, target, null));
    }
  });
  return Array.from(acc.values());
}

export function methodColor(method: string | null, methods: string[]): string {
  if (method === null) return DIRECT_COLOR;
  return METHOD_COLORS[methods.indexOf(method) % METHOD_COLORS.length];
}
