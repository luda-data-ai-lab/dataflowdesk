import { useState, type FormEvent } from 'react';

import { errorMessage } from '../api/client';
import { activateUser, createUser, deactivateUser, listUsers, updateUser } from '../api/users';
import { Alert } from '../components/common/Alert';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useAsync } from '../hooks/useAsync';
import type { Role, User } from '../types';

interface FormState {
  username: string;
  display_name: string;
  role: Role;
  password: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  user: 'bg-slate-100 text-slate-700',
};
const ACTIVE_COLORS: Record<string, string> = {
  활성: 'bg-emerald-100 text-emerald-700',
  비활성: 'bg-red-100 text-red-700',
};

const EMPTY: FormState = { username: '', display_name: '', role: 'user', password: '' };

export function UserManagePage() {
  const { user: current } = useAuth();
  const users = useAsync(listUsers, []);
  const [editing, setEditing] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setFormOpen(true);
  };
  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      username: u.username,
      display_name: u.display_name ?? '',
      role: u.role,
      password: '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      if (editing) {
        await updateUser(editing.id, {
          display_name: form.display_name || null,
          role: form.role,
          password: form.password || null,
        });
        setNotice(`'${editing.username}' 사용자 정보가 수정되었습니다.`);
      } else {
        await createUser({
          username: form.username.trim(),
          password: form.password,
          display_name: form.display_name || null,
          role: form.role,
        });
        setNotice(`'${form.username.trim()}' 사용자가 등록되었습니다.`);
      }
      setFormOpen(false);
      users.reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (u: User) => {
    try {
      await (u.is_active ? deactivateUser(u.id) : activateUser(u.id));
      setNotice(`'${u.username}' 계정이 ${u.is_active ? '비활성화' : '활성화'}되었습니다.`);
      users.reload();
    } catch (err) {
      setNotice(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">사용자 관리</h1>
          <p className="text-sm text-slate-500">로그인 계정과 권한(admin / user)을 관리합니다.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreate}>
          + 사용자 추가
        </button>
      </header>

      {notice && <Alert kind="info" message={notice} onClose={() => setNotice(null)} />}
      {users.error && <Alert kind="error" message={users.error} />}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">아이디</th>
              <th className="px-4 py-2">이름</th>
              <th className="px-4 py-2">권한</th>
              <th className="px-4 py-2">상태</th>
              <th className="px-4 py-2">생성일</th>
              <th className="px-4 py-2 text-right">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(users.data ?? []).map((u) => {
              const isSelf = u.id === current?.id;
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">
                    {u.username}
                    {isSelf && <span className="ml-1 text-xs text-slate-400">(나)</span>}
                  </td>
                  <td className="px-4 py-2">{u.display_name ?? '—'}</td>
                  <td className="px-4 py-2">
                    <Badge label={u.role} colors={ROLE_COLORS} />
                  </td>
                  <td className="px-4 py-2">
                    <Badge label={u.is_active ? '활성' : '비활성'} colors={ACTIVE_COLORS} />
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {new Date(u.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      className="btn-secondary px-2 py-1 text-xs"
                      onClick={() => openEdit(u)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className={`ml-1 px-2 py-1 text-xs ${
                        u.is_active ? 'btn-danger' : 'btn-secondary'
                      }`}
                      disabled={isSelf}
                      title={isSelf ? '자기 자신은 비활성화할 수 없습니다' : undefined}
                      onClick={() => toggleActive(u)}
                    >
                      {u.is_active ? '비활성화' : '활성화'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={formOpen}
        title={editing ? `사용자 수정 — ${editing.username}` : '사용자 추가'}
        onClose={() => setFormOpen(false)}
        width="md"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>
              취소
            </button>
            <button type="submit" form="user-form" className="btn-primary" disabled={busy}>
              {busy ? '저장 중…' : '저장'}
            </button>
          </>
        }
      >
        <form id="user-form" onSubmit={submit} className="space-y-3">
          {formError && <Alert kind="error" message={formError} />}
          <div>
            <label className="label" htmlFor="u-username">
              아이디
            </label>
            <input
              id="u-username"
              className="input w-full"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              disabled={editing !== null}
              required
              maxLength={50}
              pattern="[A-Za-z0-9._-]+"
              title="영문, 숫자, . _ - 만 사용"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label" htmlFor="u-display">
              이름
            </label>
            <input
              id="u-display"
              className="input w-full"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              maxLength={100}
            />
          </div>
          <div>
            <label className="label" htmlFor="u-role">
              권한
            </label>
            <select
              id="u-role"
              className="input w-full"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              disabled={editing !== null && editing.id === current?.id}
            >
              <option value="user">user — 조회/편집</option>
              <option value="admin">admin — 사용자 관리 포함</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="u-password">
              {editing ? '새 비밀번호 (변경 시에만 입력)' : '비밀번호'}
            </label>
            <input
              id="u-password"
              type="password"
              className="input w-full"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={editing === null}
              minLength={4}
              autoComplete="new-password"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
