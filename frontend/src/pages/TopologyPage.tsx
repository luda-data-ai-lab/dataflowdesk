import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getTopology } from '../api/topology';
import { Alert } from '../components/common/Alert';
import { HubDiagram } from '../components/topology/HubDiagram';
import {
  HUB_SYSTEM_CODE,
  INTERFACE_STATUSES,
  SYSTEM_CATEGORIES,
  SYSTEM_TYPE_FILL,
} from '../constants';
import { useAsync } from '../hooks/useAsync';
import type { TopologyNode } from '../types';

export function TopologyPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<TopologyNode | null>(null);

  const query = useAsync(
    () =>
      getTopology({
        category: category || undefined,
        status: status || undefined,
        hub: HUB_SYSTEM_CODE,
      }),
    [category, status],
  );
  const data = query.data;

  const legendTypes = useMemo(() => {
    const set = new Set<string>();
    data?.nodes.forEach((n) => set.add(n.type));
    return Array.from(set).sort();
  }, [data]);

  const selectedEdges = useMemo(() => {
    if (!data || !selected) return [];
    const byId = new Map(data.nodes.map((n) => [n.id, n]));
    return data.edges
      .filter((e) => e.source_id === selected.id || e.target_id === selected.id)
      .map((e) => ({
        from: byId.get(e.source_id)?.system_code ?? '?',
        to: byId.get(e.target_id)?.system_code ?? '?',
        interfaces: e.interfaces,
      }));
  }, [data, selected]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">구성도</h1>
          <p className="text-sm text-slate-500">
            {HUB_SYSTEM_CODE}를 중심으로 시스템 간 인터페이스 흐름을 표시합니다. 노드를 클릭하면
            상세를 확인하고, 더블클릭하면 해당 시스템의 인터페이스 목록으로 이동합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="input w-32"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="구분"
          >
            <option value="">전체 구분</option>
            {SYSTEM_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            className="input w-36"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="상태"
          >
            <option value="">전체 상태</option>
            {INTERFACE_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </header>

      {query.error && <Alert kind="error" message={query.error} />}
      {data && data.hub_id === null && (
        <Alert
          kind="info"
          message={`시스템코드 '${HUB_SYSTEM_CODE}'가 등록되어 있지 않아 허브 없이 표시합니다. 시스템 관리에서 ${HUB_SYSTEM_CODE}를 추가하면 중앙에 배치됩니다.`}
        />
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="card min-w-0 flex-1 p-2">
          {query.loading && !data && (
            <div className="py-24 text-center text-slate-400">불러오는 중…</div>
          )}
          {data && (
            <HubDiagram
              topology={data}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
              onOpen={(n) => navigate(`/interfaces?system=${encodeURIComponent(n.system_code)}`)}
            />
          )}
          <div className="flex flex-wrap items-center gap-3 px-3 pb-2 text-xs text-slate-600">
            {legendTypes.map((t) => (
              <span key={t} className="flex items-center gap-1">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: SYSTEM_TYPE_FILL[t] ?? '#94a3b8' }}
                />
                {t}
              </span>
            ))}
            <span className="ml-auto text-slate-400">선 두께 = 인터페이스 수 · 화살표 = 방향</span>
          </div>
        </div>

        <aside className="card w-full shrink-0 p-4 text-sm lg:w-80">
          {!selected && <p className="text-slate-400">노드를 선택하면 상세 정보가 표시됩니다.</p>}
          {selected && (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-slate-500">
                  {selected.category} · {selected.type}
                  {selected.is_hub && ' · 허브'}
                </div>
                <div className="text-lg font-bold">{selected.system_name}</div>
                <div className="font-mono text-xs text-slate-500">
                  {selected.system_code}
                  {selected.product_name && ` · ${selected.product_name}`}
                </div>
              </div>
              <div className="text-slate-600">
                연결 인터페이스 <b>{selected.interface_count}</b>건
              </div>
              <ul className="space-y-2">
                {selectedEdges.map((e) => (
                  <li key={`${e.from}-${e.to}`} className="rounded border border-slate-200 p-2">
                    <div className="mb-1 font-mono text-xs font-semibold">
                      {e.from} → {e.to}
                    </div>
                    <ul className="space-y-0.5 text-xs">
                      {e.interfaces.map((i) => (
                        <li key={i.id} className="flex justify-between gap-2">
                          <span className="truncate">
                            <span className="font-mono">{i.interface_id}</span> {i.interface_name}
                          </span>
                          <span className="shrink-0 text-slate-400">{i.cycle}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() =>
                  navigate(`/interfaces?system=${encodeURIComponent(selected.system_code)}`)
                }
              >
                인터페이스 목록 보기
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
