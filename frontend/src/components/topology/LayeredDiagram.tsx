import { useMemo } from 'react';

import type { Topology, TopologyNode } from '../../types';
import { buildFlows, methodColor, type FlowLink } from './flows';

interface LayeredDiagramProps {
  topology: Topology;
  selectedId: number | null;
  showDirect: boolean;
  onSelect: (node: TopologyNode) => void;
  onOpen: (node: TopologyNode) => void;
}

const DIRECT_COLOR = '#94a3b8';

const WIDTH = 1000;
const BOX_W = 170;
const BOX_H = 44;
const ROW = 60;
const PAD_TOP = 70;
const PAD_BOTTOM = 40;
const LEFT_X = 30;
const RIGHT_X = WIDTH - BOX_W - 30;
const MID_X = WIDTH / 2 - BOX_W / 2;

function boxY(index: number): number {
  return PAD_TOP + index * ROW;
}

function centre(rows: number, total: number, index: number): number {
  // Vertically centre a shorter column against the tallest one.
  return boxY(index) + ((total - rows) * ROW) / 2;
}

export function LayeredDiagram({
  topology,
  selectedId,
  showDirect,
  onSelect,
  onOpen,
}: LayeredDiagramProps) {
  const flows = useMemo(() => buildFlows(topology), [topology]);
  const visible = flows.filter((f) => showDirect || f.method !== null);

  const methods = useMemo(
    () =>
      Array.from(
        new Set(flows.filter((f) => f.method !== null).map((f) => f.method as string)),
      ).sort(),
    [flows],
  );
  const sources = useMemo(() => uniqueNodes(visible.map((f) => f.source)).sort(byCode), [visible]);
  const targets = useMemo(() => uniqueNodes(visible.map((f) => f.target)).sort(byCode), [visible]);
  const hub = topology.nodes.find((n) => n.id === topology.hub_id) ?? null;

  const rows = Math.max(sources.length, targets.length, methods.length, 1);
  const height = PAD_TOP + rows * ROW + PAD_BOTTOM;

  const srcY = new Map(sources.map((n, i) => [n.id, centre(sources.length, rows, i)]));
  const tgtY = new Map(targets.map((n, i) => [n.id, centre(targets.length, rows, i)]));
  const midY = new Map(methods.map((m, i) => [m, centre(methods.length, rows, i)]));

  const isActive = (f: FlowLink) =>
    selectedId !== null && (f.source.id === selectedId || f.target.id === selectedId);
  const anySelected = selectedId !== null;

  // Draw each (source, method) and (method, target) segment once.
  const leftSegs = new Map<
    string,
    { y1: number; y2: number; method: string; active: boolean; count: number }
  >();
  const rightSegs = new Map<
    string,
    { y1: number; y2: number; method: string; active: boolean; count: number }
  >();
  const directSegs: { f: FlowLink; y1: number; y2: number; active: boolean }[] = [];
  visible.forEach((f) => {
    const active = isActive(f);
    const y1 = srcY.get(f.source.id);
    const y2 = tgtY.get(f.target.id);
    if (y1 === undefined || y2 === undefined) return;
    if (f.method === null) {
      directSegs.push({ f, y1, y2, active });
      return;
    }
    const ym = midY.get(f.method) ?? 0;
    const lk = `${f.source.id}|${f.method}`;
    const l = leftSegs.get(lk);
    if (l) {
      l.active = l.active || active;
      l.count += f.count;
    } else leftSegs.set(lk, { y1, y2: ym, method: f.method, active, count: f.count });
    const rk = `${f.method}|${f.target.id}`;
    const r = rightSegs.get(rk);
    if (r) {
      r.active = r.active || active;
      r.count += f.count;
    } else rightSegs.set(rk, { y1: ym, y2, method: f.method, active, count: f.count });
  });

  const opacity = (active: boolean) => (anySelected && !active ? 0.15 : 0.9);

  const renderBox = (node: TopologyNode, x: number, y: number, side: 'source' | 'target') => {
    const selected = node.id === selectedId;
    const dimmed =
      anySelected &&
      !selected &&
      !visible.some(
        (f) =>
          (f.source.id === selectedId && f.target.id === node.id) ||
          (f.target.id === selectedId && f.source.id === node.id),
      );
    return (
      <g
        key={`${side}-${node.id}`}
        transform={`translate(${x} ${y})`}
        className="cursor-pointer"
        style={{ outline: 'none' }}
        opacity={dimmed ? 0.35 : 1}
        tabIndex={0}
        role="button"
        aria-label={`${node.system_name} (${node.system_code})`}
        onClick={() => onSelect(node)}
        onDoubleClick={() => onOpen(node)}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter') onOpen(node);
          if (ev.key === ' ') {
            ev.preventDefault();
            onSelect(node);
          }
        }}
      >
        <title>{`${node.system_name} (${node.system_code})\n${node.type}${
          node.product_name ? ` · ${node.product_name}` : ''
        }\n인터페이스 ${node.interface_count}건`}</title>
        <rect
          width={BOX_W}
          height={BOX_H}
          rx={3}
          fill={selected ? '#eff6ff' : '#ffffff'}
          stroke={selected ? '#1d4ed8' : '#1e293b'}
          strokeWidth={selected ? 2.5 : 1.5}
        />
        <text
          x={BOX_W / 2}
          y={BOX_H / 2 - 3}
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          fill="#0f172a"
          className="pointer-events-none"
        >
          {node.system_name.length > 14 ? `${node.system_name.slice(0, 13)}…` : node.system_name}
        </text>
        <text
          x={BOX_W / 2}
          y={BOX_H / 2 + 12}
          textAnchor="middle"
          fontSize="10"
          fill="#64748b"
          className="pointer-events-none"
        >
          {node.system_code}
          {node.product_name ? ` · ${node.product_name}` : ''}
        </text>
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      width={WIDTH}
      height={height}
      className="mx-auto block max-w-full select-none"
      style={{ height: 'auto' }}
      role="img"
      aria-label={`${topology.hub_code} 연동 구성도`}
    >
      {/* EAI container */}
      {methods.length > 0 && (
        <g>
          <rect
            x={MID_X - 30}
            y={PAD_TOP - 20}
            width={BOX_W + 60}
            height={rows * ROW + 10}
            fill="#f8fafc"
            stroke="#1e293b"
            strokeWidth={1.5}
          />
          <rect
            x={MID_X}
            y={PAD_TOP - 58}
            width={BOX_W}
            height={BOX_H}
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth={1.5}
          />
          <text
            x={WIDTH / 2}
            y={PAD_TOP - 58 + BOX_H / 2 - (hub ? 3 : -5)}
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill="#0f172a"
          >
            {hub?.product_name ?? hub?.type ?? topology.hub_code}
          </text>
          {hub && (
            <text
              x={WIDTH / 2}
              y={PAD_TOP - 58 + BOX_H / 2 + 12}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
            >
              {hub.system_name} · {hub.system_code}
            </text>
          )}
        </g>
      )}

      {/* left segments: source → method */}
      {Array.from(leftSegs.entries()).map(([k, s]) => (
        <line
          key={`l-${k}`}
          x1={LEFT_X + BOX_W}
          y1={s.y1 + BOX_H / 2}
          x2={MID_X}
          y2={s.y2 + BOX_H / 2}
          stroke={methodColor(s.method, methods)}
          strokeWidth={s.active ? 2.5 : 1.5}
          strokeOpacity={opacity(s.active)}
        >
          <title>{`${s.method} · ${s.count}건`}</title>
        </line>
      ))}
      {/* right segments: method → target */}
      {Array.from(rightSegs.entries()).map(([k, s]) => (
        <line
          key={`r-${k}`}
          x1={MID_X + BOX_W}
          y1={s.y1 + BOX_H / 2}
          x2={RIGHT_X}
          y2={s.y2 + BOX_H / 2}
          stroke={methodColor(s.method, methods)}
          strokeWidth={s.active ? 2.5 : 1.5}
          strokeOpacity={opacity(s.active)}
        >
          <title>{`${s.method} · ${s.count}건`}</title>
        </line>
      ))}
      {/* direct: source → target, routed below/above the EAI box as a straight dashed line */}
      {directSegs.map(({ f, y1, y2, active }) => (
        <line
          key={`d-${f.source.id}-${f.target.id}`}
          x1={LEFT_X + BOX_W}
          y1={y1 + BOX_H / 2}
          x2={RIGHT_X}
          y2={y2 + BOX_H / 2}
          stroke={active ? '#334155' : DIRECT_COLOR}
          strokeWidth={active ? 2 : 1.2}
          strokeDasharray="6 4"
          strokeOpacity={opacity(active)}
        >
          <title>{`직접 연동 · ${f.count}건`}</title>
        </line>
      ))}

      {/* method boxes */}
      {methods.map((m) => {
        const y = midY.get(m) ?? 0;
        const active = anySelected && visible.some((f) => f.method === m && isActive(f));
        return (
          <g
            key={`m-${m}`}
            transform={`translate(${MID_X} ${y})`}
            opacity={anySelected && !active ? 0.4 : 1}
          >
            <rect
              width={BOX_W}
              height={BOX_H}
              rx={3}
              fill="#ffffff"
              stroke={methodColor(m, methods)}
              strokeWidth={2}
            />
            <text
              x={BOX_W / 2}
              y={BOX_H / 2 + 5}
              textAnchor="middle"
              fontSize="13"
              fontWeight="600"
              fill="#0f172a"
            >
              {m}
            </text>
          </g>
        );
      })}

      {sources.map((n) => renderBox(n, LEFT_X, srcY.get(n.id) ?? 0, 'source'))}
      {targets.map((n) => renderBox(n, RIGHT_X, tgtY.get(n.id) ?? 0, 'target'))}

      <text
        x={LEFT_X + BOX_W / 2}
        y={PAD_TOP - 30}
        textAnchor="middle"
        fontSize="11"
        fill="#94a3b8"
      >
        소스 시스템
      </text>
      <text
        x={RIGHT_X + BOX_W / 2}
        y={PAD_TOP - 30}
        textAnchor="middle"
        fontSize="11"
        fill="#94a3b8"
      >
        타겟 시스템
      </text>
    </svg>
  );
}

function uniqueNodes(list: TopologyNode[]): TopologyNode[] {
  const m = new Map<number, TopologyNode>();
  list.forEach((n) => m.set(n.id, n));
  return Array.from(m.values());
}

function byCode(a: TopologyNode, b: TopologyNode): number {
  return a.system_code.localeCompare(b.system_code);
}
