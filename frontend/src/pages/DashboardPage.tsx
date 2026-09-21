import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getByCycle, getBySystem, getByType, getSummary } from '../api/dashboard';
import { getTopology } from '../api/topology';
import { Alert } from '../components/common/Alert';
import { ChartCard, EmptyChart } from '../components/dashboard/ChartCard';
import { StatCard } from '../components/dashboard/StatCard';
import { LayeredDiagram } from '../components/topology/LayeredDiagram';
import { BAR_SOURCE_COLOR, BAR_TARGET_COLOR, CHART_COLORS } from '../constants';
import { useAsync } from '../hooks/useAsync';
import type { LabelCount } from '../types';

const BAR_ROW_HEIGHT = 28;

function toInterfaces(params: Record<string, string>): string {
  return `/interfaces?${new URLSearchParams(params).toString()}`;
}

interface DistributionChartProps {
  data: LabelCount[];
  innerRadius?: number | string;
  onSelect: (label: string) => void;
}

function DistributionChart({ data, innerRadius = 0, onSelect }: DistributionChartProps) {
  if (data.length === 0) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          innerRadius={innerRadius}
          outerRadius="80%"
          paddingAngle={data.length > 1 ? 2 : 0}
          onClick={(entry: LabelCount) => onSelect(entry.label)}
          className="cursor-pointer"
          label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
        >
          {data.map((d, i) => (
            <Cell key={d.label} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [`${value}건`, '']} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const summary = useAsync(getSummary, [tick]);
  const bySystem = useAsync(getBySystem, [tick]);
  const byType = useAsync(getByType, [tick]);
  const byCycle = useAsync(getByCycle, [tick]);
  const topology = useAsync(() => getTopology({}), [tick]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const error = summary.error ?? bySystem.error ?? byType.error ?? byCycle.error ?? topology.error;
  const loading = [summary, bySystem, byType, byCycle, topology].some((q) => q.loading);
  const s = summary.data;
  const systems = (bySystem.data ?? []).filter((r) => r.total > 0);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">대시보드</h1>
          <p className="text-sm text-slate-500">시스템·인터페이스 현황 요약</p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setTick((t) => t + 1)}
          disabled={loading}
        >
          {loading ? '불러오는 중…' : '새로고침'}
        </button>
      </header>

      {error && <Alert kind="error" message={error} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="전체 인터페이스"
          value={s ? s.total_interfaces.toLocaleString() : '–'}
          hint={s ? `Active ${s.active_interfaces.toLocaleString()}건` : undefined}
          onClick={() => navigate('/interfaces')}
        />
        <StatCard
          label="등록 시스템"
          value={s ? s.total_systems.toLocaleString() : '–'}
          onClick={() => navigate('/systems')}
        />
        <StatCard
          label="실시간 연동 비율"
          value={s ? `${s.realtime_ratio.toFixed(1)}%` : '–'}
          hint="연동주기 = Real Time"
          onClick={() => navigate(toInterfaces({ cycle: 'Real Time' }))}
        />
        <StatCard
          label="최근 7일 변경"
          value={s ? s.recent_changes.toLocaleString() : '–'}
          hint="변경 이력은 Phase 3에서 기록됩니다"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="시스템별 인터페이스 수"
          subtitle="소스 + 타겟 합계, 많은 순 (막대 클릭 시 목록 이동)"
          className="lg:col-span-1"
        >
          {bySystem.data && systems.length === 0 ? (
            <div className="h-64">
              <EmptyChart />
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              <div style={{ height: Math.max(160, systems.length * BAR_ROW_HEIGHT + 40) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={systems}
                    layout="vertical"
                    margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
                    onClick={(state) => {
                      const code = state?.activeLabel;
                      if (typeof code === 'string') navigate(toInterfaces({ system: code }));
                    }}
                    className="cursor-pointer"
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} fontSize={11} />
                    <YAxis
                      type="category"
                      dataKey="system_code"
                      width={72}
                      fontSize={11}
                      interval={0}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value}건`, name]}
                      labelFormatter={(code) => {
                        const row = systems.find((r) => r.system_code === code);
                        return row ? `${row.system_name} (${row.system_code})` : String(code);
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="source_count" name="소스" stackId="a" fill={BAR_SOURCE_COLOR} />
                    <Bar
                      dataKey="target_count"
                      name="타겟"
                      stackId="a"
                      fill={BAR_TARGET_COLOR}
                      radius={[0, 3, 3, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="연동방식별 분포" subtitle="integration_type (조각 클릭 시 목록 이동)">
          <div className="h-64">
            {byType.data && (
              <DistributionChart
                data={byType.data}
                innerRadius="55%"
                onSelect={(label) => navigate(toInterfaces({ integration_type: label }))}
              />
            )}
          </div>
        </ChartCard>

        <ChartCard title="연동주기별 분포" subtitle="Real Time / Batch (조각 클릭 시 목록 이동)">
          <div className="h-64">
            {byCycle.data && (
              <DistributionChart
                data={byCycle.data}
                onSelect={(label) => navigate(toInterfaces({ cycle: label }))}
              />
            )}
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="시스템 구성도"
        subtitle="시스템 클릭: 선택 · 더블클릭: 인터페이스 목록"
        action={
          <Link to="/topology" className="text-xs font-medium text-brand-600 hover:underline">
            구성도 전체 보기 →
          </Link>
        }
      >
        {topology.data ? (
          <div className="max-h-[60vh] overflow-auto">
            <LayeredDiagram
              topology={topology.data}
              selectedId={selectedId}
              showDirect
              onSelect={(n) => setSelectedId(n.id)}
              onOpen={(n) => navigate(toInterfaces({ system: n.system_code }))}
            />
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-slate-400">
            {topology.loading ? '불러오는 중…' : '구성도를 표시할 수 없습니다.'}
          </div>
        )}
      </ChartCard>
    </div>
  );
}
