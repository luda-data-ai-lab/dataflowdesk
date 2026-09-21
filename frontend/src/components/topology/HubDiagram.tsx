import { useMemo } from 'react';

import { SYSTEM_TYPE_FILL } from '../../constants';
import type { Topology, TopologyEdge, TopologyNode } from '../../types';

interface HubDiagramProps {
  topology: Topology;
  selectedId: number | null;
  onSelect: (node: TopologyNode) => void;
  onOpen: (node: TopologyNode) => void;
}

interface Placed {
  node: TopologyNode;
  x: number;
  y: number;
  r: number;
}

const WIDTH = 900;
const HEIGHT = 600;
const CY_OFFSET = -40;
const CX = WIDTH / 2;
const CY = HEIGHT / 2 + CY_OFFSET;
const HUB_R = 46;
const NODE_R = 30;
const RING_R = 175;
const ISOLATED_Y = HEIGHT - 60;

/** Radial layout: hub at the centre, connected systems on a ring, isolated ones outside. */
function layout(topology: Topology): Placed[] {
  const { nodes, edges, hub_id } = topology;
  const connected = new Set<number>();
  edges.forEach((e) => {
    connected.add(e.source_id);
    connected.add(e.target_id);
  });
  const hub = nodes.find((n) => n.id === hub_id) ?? null;
  const ring = nodes.filter((n) => n.id !== hub_id && connected.has(n.id));
  const isolated = nodes.filter((n) => n.id !== hub_id && !connected.has(n.id));

  const placed: Placed[] = [];
  if (hub) placed.push({ node: hub, x: CX, y: CY, r: HUB_R });

  const ringItems = hub ? ring : [...ring];
  const ringRadius = hub ? RING_R : RING_R * 0.9;
  ringItems.forEach((node, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(ringItems.length, 1);
    placed.push({
      node,
      x: CX + ringRadius * Math.cos(angle),
      y: CY + ringRadius * Math.sin(angle),
      r: NODE_R,
    });
  });

  const gap = Math.min(140, (WIDTH - 80) / Math.max(isolated.length, 1));
  isolated.forEach((node, i) => {
    placed.push({
      node,
      x: CX + gap * (i - (isolated.length - 1) / 2),
      y: ISOLATED_Y,
      r: NODE_R * 0.8,
    });
  });
  return placed;
}

/** Shorten the line so the arrowhead ends at the target circle edge. */
function trim(a: Placed, b: Placed, pad = 6) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: a.x + ux * (a.r + 2),
    y1: a.y + uy * (a.r + 2),
    x2: b.x - ux * (b.r + pad),
    y2: b.y - uy * (b.r + pad),
  };
}

/** Offset opposite-direction edges between the same pair so they do not overlap. */
function offsetFor(edge: TopologyEdge, edges: TopologyEdge[]): number {
  const reverse = edges.some(
    (e) => e.source_id === edge.target_id && e.target_id === edge.source_id,
  );
  return reverse ? 7 : 0;
}

export function HubDiagram({ topology, selectedId, onSelect, onOpen }: HubDiagramProps) {
  const placed = useMemo(() => layout(topology), [topology]);
  const byId = useMemo(() => new Map(placed.map((p) => [p.node.id, p])), [placed]);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full select-none"
      role="img"
      aria-label={`${topology.hub_code} 중심 구성도`}
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="12"
          markerHeight="12"
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
        </marker>
      </defs>

      {topology.edges.map((e) => {
        const a = byId.get(e.source_id);
        const b = byId.get(e.target_id);
        if (!a || !b) return null;
        const { x1, y1, x2, y2 } = trim(a, b);
        const off = offsetFor(e, topology.edges);
        const nx = -(y2 - y1);
        const ny = x2 - x1;
        const nl = Math.hypot(nx, ny) || 1;
        const ox = (nx / nl) * off;
        const oy = (ny / nl) * off;
        const width = Math.min(1.5 + e.interfaces.length * 1.5, 8);
        const active = selectedId === e.source_id || selectedId === e.target_id;
        const title = e.interfaces.map((i) => `${i.interface_id} ${i.interface_name}`).join('\n');
        return (
          <g key={`${e.source_id}-${e.target_id}`}>
            <title>{title}</title>
            <line
              x1={x1 + ox}
              y1={y1 + oy}
              x2={x2 + ox}
              y2={y2 + oy}
              stroke={active ? '#1d4ed8' : '#64748b'}
              strokeWidth={width}
              strokeOpacity={selectedId && !active ? 0.25 : 0.9}
              markerEnd="url(#arrow)"
            />
            <text
              x={(x1 + x2) / 2 + ox * 2}
              y={(y1 + y2) / 2 + oy * 2 - 4}
              textAnchor="middle"
              fontSize="11"
              fill="#334155"
              className="pointer-events-none"
            >
              {e.interfaces.length}
            </text>
          </g>
        );
      })}

      {placed.some((p) => p.y === ISOLATED_Y) && (
        <text x={CX} y={ISOLATED_Y - 48} textAnchor="middle" fontSize="11" fill="#94a3b8">
          연결된 인터페이스가 없는 시스템
        </text>
      )}

      {placed.map(({ node, x, y, r }) => {
        const fill = SYSTEM_TYPE_FILL[node.type] ?? '#94a3b8';
        const selected = node.id === selectedId;
        const above = !node.is_hub && y < CY - 1 && y !== ISOLATED_Y;
        const labelY = above ? -(r + 8) : r + 16;
        const subY = above ? -(r + 22) : r + 30;
        return (
          <g
            key={node.id}
            transform={`translate(${x} ${y})`}
            className="cursor-pointer"
            style={{ outline: 'none' }}
            onClick={() => onSelect(node)}
            onDoubleClick={() => onOpen(node)}
            tabIndex={0}
            role="button"
            aria-label={`${node.system_name} (${node.system_code})`}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') onOpen(node);
              if (ev.key === ' ') {
                ev.preventDefault();
                onSelect(node);
              }
            }}
          >
            <title>
              {`${node.system_name} (${node.system_code})\n${node.type}${
                node.product_name ? ` · ${node.product_name}` : ''
              }\n인터페이스 ${node.interface_count}건`}
            </title>
            {node.is_hub && (
              <circle r={r + 10} fill="none" stroke={fill} strokeOpacity="0.35" strokeWidth="6" />
            )}
            <circle
              r={r}
              fill={fill}
              stroke={selected ? '#0f172a' : '#ffffff'}
              strokeWidth={selected ? 4 : 2}
            />
            <text
              textAnchor="middle"
              dy={node.is_hub ? -2 : 4}
              fontSize={node.is_hub ? 15 : node.system_code.length > 5 ? 9 : 12}
              fontWeight="700"
              fill="#fff"
              className="pointer-events-none"
            >
              {node.system_code}
            </text>
            {node.is_hub && (
              <text
                textAnchor="middle"
                dy={14}
                fontSize="10"
                fill="#fff"
                className="pointer-events-none"
              >
                {node.product_name ?? node.type}
              </text>
            )}
            <text
              textAnchor="middle"
              y={labelY}
              fontSize="12"
              fill="#0f172a"
              className="pointer-events-none"
            >
              {node.system_name}
            </text>
            {node.product_name && !node.is_hub && (
              <text
                textAnchor="middle"
                y={subY}
                fontSize="10"
                fill="#64748b"
                className="pointer-events-none"
              >
                {node.product_name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
