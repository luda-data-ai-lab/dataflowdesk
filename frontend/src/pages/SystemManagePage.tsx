import { useState } from 'react';

import { errorMessage } from '../api/client';
import { deleteSystem, getSystem, listSystems } from '../api/systems';
import { Alert } from '../components/common/Alert';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Pagination } from '../components/common/Pagination';
import { SystemFormModal } from '../components/systems/SystemFormModal';
import { PAGE_SIZE, SYSTEM_TYPE_COLORS } from '../constants';
import { useAsync } from '../hooks/useAsync';
import type { System } from '../types';

const TABS = ['전체', '운영', '개발'] as const;
type Tab = (typeof TABS)[number];

export function SystemManagePage() {
  const [tab, setTab] = useState<Tab>('전체');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<System | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<System | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const query = useAsync(
    () =>
      listSystems({
        category: tab === '전체' ? undefined : tab,
        keyword: keyword || undefined,
        page,
        size: PAGE_SIZE,
      }),
    [tab, keyword, page],
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (s: System) => {
    setEditing(s);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteSystem(deleting.id);
      setDeleting(null);
      setNotice(`'${deleting.system_name}' 시스템이 삭제되었습니다.`);
      query.reload();
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  const toggleReveal = async (s: System) => {
    if (revealed[s.id] !== undefined) {
      setRevealed((r) => {
        const next = { ...r };
        delete next[s.id];
        return next;
      });
      return;
    }
    try {
      const full = await getSystem(s.id, true);
      setRevealed((r) => ({ ...r, [s.id]: full.password ?? '' }));
    } catch (err) {
      setNotice(errorMessage(err));
    }
  };

  const data = query.data;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">시스템 관리</h1>
          <p className="text-sm text-slate-500">연동 대상 시스템의 접속 정보를 관리합니다.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreate}>
          + 시스템 추가
        </button>
      </header>

      {notice && <Alert kind="info" message={notice} onClose={() => setNotice(null)} />}
      {query.error && <Alert kind="error" message={query.error} />}

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex gap-1" role="tablist">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => {
                  setTab(t);
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  tab === t ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            className="input w-64"
            placeholder="시스템명 / 코드 / IP 검색"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">구분</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">시스템명</th>
                <th className="px-4 py-2">시스템코드</th>
                <th className="px-4 py-2">IP</th>
                <th className="px-4 py-2">Port</th>
                <th className="px-4 py-2">계정</th>
                <th className="px-4 py-2">패스워드</th>
                <th className="px-4 py-2">제품명</th>
                <th className="px-4 py-2 text-right">I/F</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {query.loading && !data && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                    불러오는 중…
                  </td>
                </tr>
              )}
              {data && data.items.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                    등록된 시스템이 없습니다.
                  </td>
                </tr>
              )}
              {data?.items.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">{s.category}</td>
                  <td className="px-4 py-2">
                    <Badge label={s.type} colors={SYSTEM_TYPE_COLORS} />
                  </td>
                  <td className="px-4 py-2 font-medium">{s.system_name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{s.system_code}</td>
                  <td className="px-4 py-2 font-mono text-xs">{s.ip ?? '-'}</td>
                  <td className="px-4 py-2">{s.port ?? '-'}</td>
                  <td className="px-4 py-2">{s.account ?? '-'}</td>
                  <td className="px-4 py-2">
                    {s.has_password ? (
                      <button
                        type="button"
                        className="font-mono text-xs text-slate-600 hover:text-brand-600"
                        onClick={() => toggleReveal(s)}
                        title={revealed[s.id] !== undefined ? '숨기기' : '표시'}
                      >
                        {revealed[s.id] !== undefined ? revealed[s.id] : (s.password ?? '•••••')}
                      </button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{s.product_name ?? '-'}</td>
                  <td className="px-4 py-2 text-right">{s.interface_count}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      className="text-brand-600 hover:underline"
                      onClick={() => openEdit(s)}
                    >
                      수정
                    </button>
                    <span className="mx-1 text-slate-300">|</span>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleting(s);
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

      <SystemFormModal
        open={formOpen}
        system={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setNotice(editing ? '시스템이 수정되었습니다.' : '시스템이 추가되었습니다.');
          query.reload();
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="시스템 삭제"
        message={
          deleting
            ? `'${deleting.system_name}' (${deleting.system_code}) 시스템을 삭제하시겠습니까? 인터페이스에서 사용 중인 시스템은 삭제할 수 없습니다.`
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
