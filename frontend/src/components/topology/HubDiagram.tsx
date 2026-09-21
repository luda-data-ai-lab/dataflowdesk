import { useMemo } from 'react';

import { SYSTEM_TYPE_FILL } from '../../constants';
import type { Topology, TopologyEdge, TopologyNode } from '../../types';

interface HubDiagramProps {
  topology: Topology;
  selectedId: number | null;
  /** Draw source→target edges that bypass the hub (curved, outside the ring). */
  showDirect: boolean;
  onSelect: (node: TopologyNode) => void;
  onOpen: (node: TopologyNode) => void;
}

interface Placed {
  node: TopologyNode;
  x: number;
  y: number;
  r: number;
  /** Polar angle for ring nodes (labels are placed radially outward); undefined otherwise. */
  angle?: number;
  isolated?: boolean;
}

interface Layout {
  width: number;
  height: number;
  cx: number;
  cy: number;
  ringR: number;
  placed: Placed[];
  dense: boolean;
}

const HUB_R = 46;
const MIN_WIDTH = 900;
const MIN_RING_R = 175;
const LABEL_SPACE = 95;
const ISOLATED_GAP = 110;

/**
 * Radial layout that grows with the number of systems: the ring radius is chosen so nodes never
 * overlap, and the canvas (viewBox) expands accordingly. Systems without interfaces go in rows
 * below the ring.
 */
function layout(topology: Topology, showDirect: boolean): Layout {
  const { nodes, edges, hub_id } = topology;
  const connected = new Set<number>();
  edges.forEach((e) => {
    connected.add(e.source_id);
    connected.add(e.target_id);
  });
  const hub = nodes.find((n) => n.id === hub_id) ?? null;
  const ring = nodes.filter((n) => n.id !== hub_id && connected.has(n.id));
  const isolated = nodes.filter((n) => n.id !== hub_id && !connected.has(n.id));

  const dense = ring.length > 14;
  const nodeR = dense ? 24 : 30;
  const minSpacing = nodeR * 2 + (dense ? 12 : 20);
  const ringR = Math.max(MIN_RING_R, (ring.length * minSpacing) / (2 * Math.PI));

  const hasDirect =
    showDirect && edges.some((e) => e.source_id !== hub_id && e.target_id !== hub_id);
  const margin = LABEL_SPACE + (hasDirect ? ringR * 0.4 : 0);
  const width = Math.max(MIN_WIDTH, 2 * (ringR + nodeR + margin));
  const cx = width / 2;
  const cy = ringR + nodeR + margin - 20;

  const placed: Placed[] = [];
  if (hub) placed.push({ node: hub, x: cx, y: cy, r: HUB_R });

  ring.forEach((node, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(ring.length, 1);
    placed.push({
      node,
      x: cx + ringR * Math.cos(angle),
      y: cy + ringR * Math.sin(angle),
      r: nodeR,
      angle,
    });
  });

  const perRow = Math.max(1, Math.floor((width - 80) / ISOLATED_GAP));
  const rows = Math.ceil(isolated.length / perRow);
  const isolatedTop = cy + ringR + nodeR + margin;
  isolated.forEach((node, i) => {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, isolated.length - row * perRow);
    const col = i % perRow;
    placed.push({
      node,
      x: cx + ISOLATED_GAP * (col - (inRow - 1) / 2),
      y: isolatedTop + row * 95,
      r: nodeR * 0.8,
      isolated: true,
    });
  });

  const height = rows ? isolatedTop + rows * 95 - 20 : cy + ringR + nodeR + margin - 30;
  return { width, height, cx, cy, ringR, placed, dense };
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
function hasReverse(edge: TopologyEdge, edges: TopologyEdge[]): boolean {
  return edges.some((e) => e.source_id === edge.target_id && e.target_id === edge.source_id);
}

/**
 * Direct (non-hub) edges are drawn as a quadratic curve bowed outside the ring so they never
 * cross the hub; the bow grows with the angular distance between the two systems.
 */
function directPath(a: Placed, b: Placed, l: Layout, flip: boolean): string {
  const aa = a.angle ?? 0;
  const ba = b.angle ?? 0;
  let mid = (aa + ba) / 2;
  let span = Math.abs(aa - ba);
  if (span > Math.PI) {
    span = 2 * Math.PI - span;
    mid += Math.PI;
  }
  // Choose the control point so the curve's midpoint lands at `outR` from the centre.
  const outR = l.ringR * (1.1 + (0.3 * span) / Math.PI) + (flip ? 16 : 0);
  const mx = l.cx + outR * Math.cos(mid);
  const my = l.cy + outR * Math.sin(mid);
  const qx = 2 * mx - (a.x + b.x) / 2;
  const qy = 2 * my - (a.y + b.y) / 2;
  // Trim endpoints toward the control point so arrowheads sit on the circle edge.
  const start = trimToward(a, qx, qy, 2);
  const end = trimToward(b, qx, qy, 7);
  return `M ${start.x} ${start.y} Q ${qx} ${qy} ${end.x} ${end.y}`;
}

function trimToward(p: Placed, tx: number, ty: number, pad: number) {
  const dx = tx - p.x;
  const dy = ty - p.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: p.x + (dx / len) * (p.r + pad), y: p.y + (dy / len) * (p.r + pad) };
}

function edgeTitle(e: TopologyEdge): string {
  const shown = e.interfaces.slice(0, 12).map((i) => `${i.interface_id} ${i.interface_name}`);
  if (e.interfaces.length > shown.length)
    shown.push(`… 외 ${e.interfaces.length - shown.length}건`);
  return `${e.interfaces.length}건\n${shown.join('\n')}`;
}

export function HubDiagram({
  topology,
  selectedId,
  showDirect,
  onSelect,
  onOpen,
}: HubDiagramProps) {
  const l = useMemo(() => layout(topology, showDirect), [topology, showDirect]);
  const byId = useMemo(() => new Map(l.placed.map((p) => [p.node.id, p])), [l]);
  const hubId = topology.hub_id;

  const edges = topology.edges.filter(
    (e) => showDirect || e.source_id === hubId || e.target_id === hubId,
  );

  return (
    <svg
      viewBox={`0 0 ${l.width} ${l.height}`}
      className="h-auto w-full select-none"
      style={{ maxHeight: '75vh' }}
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
        <marker
          id="arrow-direct"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="10"
          markerHeight="10"
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
        </marker>
      </defs>

      {edges.map((e) => {
        const a = byId.get(e.source_id);
        const b = byId.get(e.target_id);
        if (!a || !b) return null;
        const active = selectedId === e.source_id || selectedId === e.target_id;
        const dimmed = selectedId !== null && !active;
        const width = Math.min(1.5 + e.interfaces.length * 0.8, 8);
        const viaHub = e.source_id === hubId || e.target_id === hubId;
        const reverse = hasReverse(e, topology.edges);
        const key = `${e.source_id}-${e.target_id}`;

        if (!viaHub && a.angle !== undefined && b.angle !== undefined) {
          return (
            <g key={key}>
              <title>{edgeTitle(e)}</title>
              <path
                d={directPath(a, b, l, reverse && e.source_id > e.target_id)}
                fill="none"
                stroke={active ? '#1d4ed8' : '#94a3b8'}
                strokeWidth={Math.max(1, width * 0.7)}
                strokeOpacity={dimmed ? 0.1 : l.dense ? 0.4 : 0.7}
                markerEnd={active ? 'url(#arrow)' : 'url(#arrow-direct)'}
              />
            </g>
          );
        }

        const { x1, y1, x2, y2 } = trim(a, b);
        const off = reverse ? 7 : 0;
        const nx = -(y2 - y1);
        const ny = x2 - x1;
        const nl = Math.hypot(nx, ny) || 1;
        const ox = (nx / nl) * off;
        const oy = (ny / nl) * off;
        const showCount = !l.dense || active;
        // Put the count near the outer (non-hub) end so labels do not pile up around the hub.
        const t = a.node.is_hub ? 0.7 : b.node.is_hub ? 0.3 : 0.5;
        const lx = x1 + (x2 - x1) * t + ox * 2;
        const ly = y1 + (y2 - y1) * t + oy * 2 - 4;
        return (
          <g key={key}>
            <title>{edgeTitle(e)}</title>
            <line
              x1={x1 + ox}
              y1={y1 + oy}
              x2={x2 + ox}
              y2={y2 + oy}
              stroke={active ? '#1d4ed8' : '#64748b'}
              strokeWidth={width}
              strokeOpacity={dimmed ? 0.2 : 0.85}
              markerEnd="url(#arrow)"
            />
            {showCount && (
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                fontSize="11"
                fontWeight={active ? 700 : 400}
                fill="#334155"
                className="pointer-events-none"
              >
                {e.interfaces.length}
              </text>
            )}
          </g>
        );
      })}

      {l.placed.some((p) => p.isolated) && (
        <text
          x={l.cx}
          y={(l.placed.find((p) => p.isolated)?.y ?? 0) - 50}
          textAnchor="middle"
          fontSize="11"
          fill="#94a3b8"
        >
          연결된 인터페이스가 없는 시스템
        </text>
      )}

      {l.placed.map(({ node, x, y, r, angle }) => {
        const fill = SYSTEM_TYPE_FILL[node.type] ?? '#94a3b8';
        const selected = node.id === selectedId;
        const dimmed = selectedId !== null && !selected && !node.is_hub;

        // Ring nodes: label sits outside the ring along the radial direction.
        let labelX = 0;
        let labelY = r + 16;
        let anchor: 'start' | 'middle' | 'end' = 'middle';
        if (angle !== undefined) {
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          if (Math.abs(cos) < 0.35) {
            labelY = sin < 0 ? -(r + 8) : r + 16;
          } else {
            labelX = cos * (r + 6);
            labelY = sin * (r + 6) + 4;
            anchor = cos > 0 ? 'start' : 'end';
          }
        }
        const showProduct = node.product_name && !node.is_hub && !l.dense;

        return (
          <g
            key={node.id}
            transform={`translate(${x} ${y})`}
            className="cursor-pointer"
            style={{ outline: 'none' }}
            opacity={dimmed ? 0.45 : 1}
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
              fontSize={node.is_hub ? 15 : node.system_code.length > 5 ? 9 : r < 28 ? 10 : 12}
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
            {!(node.is_hub && l.dense) && (
              <text
                x={labelX}
                y={labelY}
                textAnchor={anchor}
                fontSize={l.dense ? 11 : 12}
                fill="#0f172a"
                className="pointer-events-none"
              >
                {node.system_name}
              </text>
            )}
            {showProduct && (
              <text
                x={labelX}
                y={labelY + 14}
                textAnchor={anchor}
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
