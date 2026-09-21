import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { errorMessage } from '../api/client';
import { deleteInterface, exportInterfaces, listInterfaces } from '../api/interfaces';
import { listSystems } from '../api/systems';
import { downloadTemplate, exportAll } from '../api/upload';
import { Alert } from '../components/common/Alert';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Pagination } from '../components/common/Pagination';
import { InterfaceFormModal } from '../components/interfaces/InterfaceFormModal';
import { UploadModal } from '../components/interfaces/UploadModal';
import { INTERFACE_CYCLES, INTERFACE_STATUSES, PAGE_SIZE, STATUS_COLORS } from '../constants';
import { useAsync } from '../hooks/useAsync';
import type { Interface, UploadResult } from '../types';

interface Filters {
  keyword: string;
  integration_type: string;
  system: string;
  cycle: string;
  status: string;
}

const EMPTY_FILTERS: Filters = {
  keyword: '',
  integration_type: '',
  system: '',
  cycle: '',
  status: '',
};

export function InterfaceListPage() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => ({
    ...EMPTY_FILTERS,
    system: searchParams.get('system') ?? '',
    integration_type: searchParams.get('integration_type') ?? '',
    cycle: searchParams.get('cycle') ?? '',
    status: searchParams.get('status') ?? '',
  }));
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Interface | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState<Interface | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'info' | 'error' | 'success'; text: string } | null>(
    null,
  );
  const [downloading, setDownloading] = useState<'template' | 'export' | 'list' | null>(null);

  const systemsQuery = useAsync(() => listSystems({ size: 200, sort: 'system_name' }), []);
  const systems = useMemo(() => systemsQuery.data?.items ?? [], [systemsQuery.data]);

  const query = useAsync(
    () =>
      listInterfaces({
        keyword: filters.keyword || undefined,
        integration_type: filters.integration_type || undefined,
        system: filters.system || undefined,
        cycle: filters.cycle || undefined,
        status: filters.status || undefined,
        page,
        size: PAGE_SIZE,
      }),
    [filters, page],
  );

  const integrationTypes = useMemo(() => {
    const set = new Set<string>();
    query.data?.items.forEach((i) => set.add(i.integration_type));
    if (filters.integration_type) set.add(filters.integration_type);
    return Array.from(set).sort();
  }, [query.data, filters.integration_type]);

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const reloadAll = () => {
    query.reload();
    systemsQuery.reload();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteInterface(deleting.id);
      setDeleting(null);
      setNotice({ kind: 'info', text: `'${deleting.interface_id}' 인터페이스가 삭제되었습니다.` });
      reloadAll();
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  const download = async (kind: 'template' | 'export' | 'list') => {
    setDownloading(kind);
    try {
      if (kind === 'template') await downloadTemplate();
      else if (kind === 'export') await exportAll();
      else
        await exportInterfaces({
          keyword: filters.keyword || undefined,
          integration_type: filters.integration_type || undefined,
          system: filters.system || undefined,
          cycle: filters.cycle || undefined,
          status: filters.status || undefined,
        });
    } catch (err) {
      setNotice({ kind: 'error', text: errorMessage(err) });
    } finally {
      setDownloading(null);
    }
  };

  const onUploaded = (res: UploadResult) => {
    setNotice({
      kind: res.skipped_count > 0 ? 'info' : 'success',
      text: `업로드 완료: 성공 ${res.success_count}건, 건너뜀 ${res.skipped_count}건 (${res.sheet})`,
    });
    reloadAll();
  };

  const data = query.data;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">인터페이스 목록</h1>
          <p className="text-sm text-slate-500">
            시스템 간 인터페이스를 검색·관리하고 Excel로 업로드/내보내기합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => download('template')}
            disabled={downloading !== null}
          >
            {downloading === 'template' ? '다운로드 중…' : '템플릿 다운로드'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setUploadOpen(true)}>
            Excel 업로드
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => download('export')}
            disabled={downloading !== null}
          >
            {downloading === 'export' ? '내보내는 중…' : '전체 백업(양식)'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => download('list')}
            disabled={downloading !== null}
            title="현재 검색·필터 조건의 목록을 Excel로 다운로드"
          >
            {downloading === 'list' ? '다운로드 중…' : 'Excel 다운로드'}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + 인터페이스 추가
          </button>
        </div>
      </header>

      {notice && <Alert kind={notice.kind} message={notice.text} onClose={() => setNotice(null)} />}
      {query.error && <Alert kind="error" message={query.error} />}
      {systemsQuery.error && <Alert kind="error" message={systemsQuery.error} />}

      <div className="card">
        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 px-4 py-3 md:grid-cols-6">
          <input
            className="input md:col-span-2"
            placeholder="ID / 이름 / 설명 / Process 검색"
            value={filters.keyword}
            onChange={(e) => setFilter('keyword', e.target.value)}
          />
          <select
            className="input"
            value={filters.integration_type}
            onChange={(e) => setFilter('integration_type', e.target.value)}
            aria-label="연동방식"
          >
            <option value="">연동방식: 전체</option>
            {integrationTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            className="input"
            value={filters.system}
            onChange={(e) => setFilter('system', e.target.value)}
            aria-label="시스템"
          >
            <option value="">시스템: 전체</option>
            {systems.map((s) => (
              <option key={s.id} value={s.system_code}>
                {s.system_name} ({s.system_code})
              </option>
            ))}
          </select>
          <select
            className="input"
            value={filters.cycle}
            onChange={(e) => setFilter('cycle', e.target.value)}
            aria-label="연동주기"
          >
            <option value="">연동주기: 전체</option>
            {INTERFACE_CYCLES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            className="input"
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value)}
            aria-label="상태"
          >
            <option value="">상태: 전체</option>
            {INTERFACE_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">인터페이스 ID</th>
                <th className="px-4 py-2">인터페이스 이름</th>
                <th className="px-4 py-2">연동방식</th>
                <th className="px-4 py-2">소스시스템</th>
                <th className="px-4 py-2">타켓시스템</th>
                <th className="px-4 py-2">경유</th>
                <th className="px-4 py-2">연동주기</th>
                <th className="px-4 py-2">상태</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {query.loading && !data && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    불러오는 중…
                  </td>
                </tr>
              )}
              {data && data.items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    조건에 맞는 인터페이스가 없습니다.
                  </td>
                </tr>
              )}
              {data?.items.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs">{i.interface_id}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{i.interface_name}</div>
                    {i.process && <div className="text-xs text-slate-500">{i.process}</div>}
                  </td>
                  <td className="px-4 py-2">{i.integration_type}</td>
                  <td className="px-4 py-2">
                    <SystemCell
                      name={i.source_system?.system_name}
                      code={i.source_system?.system_code}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <SystemCell
                      name={i.target_system?.system_name}
                      code={i.target_system?.system_code}
                    />
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">
                    {i.via_system?.system_code ?? '-'}
                  </td>
                  <td className="px-4 py-2">{i.cycle}</td>
                  <td className="px-4 py-2">
                    <Badge label={i.status} colors={STATUS_COLORS} />
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      className="text-brand-600 hover:underline"
                      onClick={() => {
                        setEditing(i);
                        setFormOpen(true);
                      }}
                    >
                      수정
                    </button>
                    <span className="mx-1 text-slate-300">|</span>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleting(i);
                      }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && (
          <Pagination page={data.page} size={data.size} total={data.total} onChange={setPage} />
        )}
      </div>

      <InterfaceFormModal
        open={formOpen}
        iface={editing}
        systems={systems}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setNotice({
            kind: 'success',
            text: editing ? '인터페이스가 수정되었습니다.' : '인터페이스가 추가되었습니다.',
          });
          reloadAll();
        }}
      />
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={onUploaded} />
      <ConfirmDialog
        open={deleting !== null}
        title="인터페이스 삭제"
        message={
          deleting
            ? `'${deleting.interface_id} · ${deleting.interface_name}' 인터페이스를 삭제하시겠습니까?`
            : ''
        }
        busy={deleteBusy}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function SystemCell({ name, code }: { name?: string; code?: string }) {
  if (!name) return <span className="text-slate-400">-</span>;
  return (
    <div>
      <div>{name}</div>
      <div className="font-mono text-xs text-slate-500">{code}</div>
    </div>
  );
}
