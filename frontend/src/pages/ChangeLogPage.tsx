import { useState } from 'react';

import { exportChangeLog, listChangeLog } from '../api/changelog';
import { errorMessage } from '../api/client';
import { listUsers } from '../api/users';
import { Alert } from '../components/common/Alert';
import { Badge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import { PAGE_SIZE } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useAsync } from '../hooks/useAsync';
import type { ChangeLog } from '../types';

const TABLE_LABELS: Record<string, string> = { systems: '시스템', interfaces: '인터페이스' };
const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { hour12: false });
}

function parseSnapshot(value: string): [string, string][] | null {
  try {
    const obj = JSON.parse(value) as Record<string, unknown>;
    return Object.entries(obj)
      .filter(([, v]) => v !== null && v !== '')
      .map(([k, v]) => [k, String(v)]);
  } catch {
    return null;
  }
}

/** CREATE/DELETE rows carry a JSON snapshot; render it as `key: value` lines. */
function Snapshot({ value }: { value: string | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  const entries = parseSnapshot(value);
  if (entries === null) return <span className="break-all">{value}</span>;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-brand-700">{entries.length}개 필드</summary>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2">
        {entries.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-500">{k}</dt>
            <dd className="break-all">{v}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function ValueCell({ row, which }: { row: ChangeLog; which: 'old' | 'new' }) {
  const value = which === 'old' ? row.old_value : row.new_value;
  if (row.action === 'UPDATE') {
    return <span className="break-all">{value ?? <span className="text-slate-400">—</span>}</span>;
  }
  return <Snapshot value={value} />;
}

export function ChangeLogPage() {
  const { isAdmin } = useAuth();
  const [table, setTable] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const filters = {
    table: table || undefined,
    action: action || undefined,
    user_id: userId ? Number(userId) : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  const query = useAsync(
    () => listChangeLog({ ...filters, page, size: PAGE_SIZE }),
    [table, action, userId, dateFrom, dateTo, page],
  );
  const users = useAsync(() => (isAdmin ? listUsers() : Promise.resolve([])), [isAdmin]);

  const reset =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPage(1);
    };

  const download = async () => {
    setDownloading(true);
    try {
      await exportChangeLog(filters);
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  const data = query.data;
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">변경 이력</h1>
          <p className="text-sm text-slate-500">
            시스템·인터페이스의 등록/수정/삭제 내역이 자동으로 기록됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={query.reload}>
            새로고침
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={download}
            disabled={downloading}
            title="현재 필터 조건의 이력을 Excel로 다운로드"
          >
            {downloading ? '다운로드 중…' : 'Excel 다운로드'}
          </button>
        </div>
      </header>

      {notice && <Alert kind="error" message={notice} onClose={() => setNotice(null)} />}
      {query.error && <Alert kind="error" message={query.error} />}

      <div className="card">
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <label className="label" htmlFor="cl-table">
              대상
            </label>
            <select
              id="cl-table"
              className="input"
              value={table}
              onChange={(e) => reset(setTable)(e.target.value)}
            >
              <option value="">전체</option>
              <option value="systems">시스템</option>
              <option value="interfaces">인터페이스</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cl-action">
              작업
            </label>
            <select
              id="cl-action"
              className="input"
              value={action}
              onChange={(e) => reset(setAction)(e.target.value)}
            >
              <option value="">전체</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          {isAdmin && (
            <div>
              <label className="label" htmlFor="cl-user">
                사용자
              </label>
              <select
                id="cl-user"
                className="input"
                value={userId}
                onChange={(e) => reset(setUserId)(e.target.value)}
              >
                <option value="">전체</option>
                {(users.data ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name ? `${u.display_name} (${u.username})` : u.username}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label" htmlFor="cl-from">
              시작일
            </label>
            <input
              id="cl-from"
              type="date"
              className="input"
              value={dateFrom}
              onChange={(e) => reset(setDateFrom)(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="cl-to">
              종료일
            </label>
            <input
              id="cl-to"
              type="date"
              className="input"
              value={dateTo}
              onChange={(e) => reset(setDateTo)(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">변경일시</th>
                <th className="px-4 py-2">대상</th>
                <th className="px-4 py-2">레코드</th>
                <th className="px-4 py-2">작업</th>
                <th className="px-4 py-2">필드</th>
                <th className="px-4 py-2">이전 값</th>
                <th className="px-4 py-2">변경 값</th>
                <th className="px-4 py-2">사용자</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.items.map((row) => (
                <tr key={row.id} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                    {fmtDate(row.changed_at)}
                  </td>
                  <td className="px-4 py-2">{TABLE_LABELS[row.table_name] ?? row.table_name}</td>
                  <td className="px-4 py-2 font-medium">
                    {row.record_label ?? `#${row.record_id}`}
                  </td>
                  <td className="px-4 py-2">
                    <Badge label={row.action} colors={ACTION_COLORS} />
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{row.field_name ?? '—'}</td>
                  <td className="max-w-xs px-4 py-2">
                    <ValueCell row={row} which="old" />
                  </td>
                  <td className="max-w-xs px-4 py-2">
                    <ValueCell row={row} which="new" />
                  </td>
                  <td className="px-4 py-2 text-slate-600">{row.username ?? '—'}</td>
                </tr>
              ))}
              {data && data.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    조건에 맞는 변경 이력이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && (
          <Pagination page={data.page} size={data.size} total={data.total} onChange={setPage} />
        )}
      </div>
    </div>
  );
}
