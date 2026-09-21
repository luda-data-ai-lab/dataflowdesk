import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getTopology } from '../api/topology';
import { Alert } from '../components/common/Alert';
import { LayeredDiagram } from '../components/topology/LayeredDiagram';
import { buildFlows, methodColor } from '../components/topology/flows';
import { HUB_SYSTEM_CODE, INTERFACE_STATUSES, SYSTEM_CATEGORIES } from '../constants';
import { useAsync } from '../hooks/useAsync';
import type { TopologyNode } from '../types';

export function TopologyPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<TopologyNode | null>(null);
  const [showDirect, setShowDirect] = useState(true);

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

  const flows = useMemo(() => (data ? buildFlows(data) : []), [data]);
  const methods = useMemo(
    () =>
      Array.from(
        new Set(flows.filter((f) => f.method !== null).map((f) => f.method as string)),
      ).sort(),
    [flows],
  );
  const hasDirect = flows.some((f) => f.method === null);

  /** Connected systems for the selected node: one row per partner, methods aggregated. */
  const partners = useMemo(() => {
    if (!selected) return [];
    const acc = new Map<
      number,
      {
        partner: TopologyNode;
        outbound: boolean;
        inbound: boolean;
        methods: Map<string | null, number>;
        count: number;
      }
    >();
    flows
      .filter((f) => f.source.id === selected.id || f.target.id === selected.id)
      .forEach((f) => {
        const outbound = f.source.id === selected.id;
        const partner = outbound ? f.target : f.source;
        const row = acc.get(partner.id) ?? {
          partner,
          outbound: false,
          inbound: false,
          methods: new Map<string | null, number>(),
          count: 0,
        };
        row.outbound = row.outbound || outbound;
        row.inbound = row.inbound || !outbound;
        row.methods.set(f.method, (row.methods.get(f.method) ?? 0) + f.count);
        row.count += f.count;
        acc.set(partner.id, row);
      });
    return Array.from(acc.values()).sort((a, b) =>
      a.partner.system_code.localeCompare(b.partner.system_code),
    );
  }, [flows, selected]);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-xl font-bold">구성도</h1>
          <p className="text-sm text-slate-500">
            소스 시스템 → {HUB_SYSTEM_CODE}(연동방식) → 타겟 시스템의 연결 관계를 시스템 단위로
            표시합니다. 시스템을 클릭하면 연결된 시스템을 확인하고, 더블클릭하면 인터페이스 목록으로
            이동합니다.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label className="flex items-center gap-1.5 whitespace-nowrap text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showDirect}
              onChange={(e) => setShowDirect(e.target.checked)}
            />
            직접 연동 표시
          </label>
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
            <div className="max-h-[78vh] overflow-auto">
              <LayeredDiagram
                topology={data}
                selectedId={selected?.id ?? null}
                showDirect={showDirect}
                onSelect={setSelected}
                onOpen={(n) => navigate(`/interfaces?system=${encodeURIComponent(n.system_code)}`)}
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 px-3 pb-2 text-xs text-slate-600">
            {methods.map((m) => (
              <span key={m} className="flex items-center gap-1">
                <span
                  className="inline-block h-0.5 w-5"
                  style={{ background: methodColor(m, methods) }}
                />
                {m}
              </span>
            ))}
            {hasDirect && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-5 border-t border-dashed border-slate-400" />
                직접 연동
              </span>
            )}
            <span className="ml-auto text-slate-400">선 색상 = 연동방식</span>
          </div>
        </div>

        <aside className="card w-full shrink-0 self-start p-4 text-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-80 lg:overflow-y-auto">
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
                연결 시스템 <b>{partners.length}</b>개 · 인터페이스{' '}
                <b>{selected.interface_count}</b>건
              </div>
              <ul className="divide-y divide-slate-100 rounded border border-slate-200">
                {partners.map((p) => (
                  <li key={p.partner.id} className="px-2 py-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-slate-400">
                        {p.outbound && p.inbound ? '↔' : p.outbound ? '→' : '←'}
                      </span>
                      <span className="truncate font-medium">{p.partner.system_name}</span>
                      <span className="font-mono text-slate-400">{p.partner.system_code}</span>
                      <span className="ml-auto shrink-0 text-slate-500">{p.count}건</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 pl-7">
                      {Array.from(p.methods.entries()).map(([m, c]) => (
                        <span
                          key={m ?? 'direct'}
                          className="flex items-center gap-1 text-slate-500"
                        >
                          <span
                            className="inline-block h-0.5 w-3"
                            style={{ background: methodColor(m, methods) }}
                          />
                          {m ?? '직접'} {c}
                        </span>
                      ))}
                    </div>
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
