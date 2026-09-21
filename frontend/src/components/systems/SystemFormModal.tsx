import { useState, type FormEvent } from 'react';

import { errorMessage } from '../../api/client';
import { createSystem, updateSystem } from '../../api/systems';
import { SYSTEM_CATEGORIES, SYSTEM_TYPES } from '../../constants';
import type { System, SystemInput } from '../../types';
import { Alert } from '../common/Alert';
import { Modal } from '../common/Modal';

interface SystemFormModalProps {
  open: boolean;
  system: System | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  category: string;
  type: string;
  system_name: string;
  system_code: string;
  ip: string;
  port: string;
  account: string;
  password: string;
  product_name: string;
  description: string;
}

const EMPTY: FormState = {
  category: SYSTEM_CATEGORIES[0],
  type: SYSTEM_TYPES[0],
  system_name: '',
  system_code: '',
  ip: '',
  port: '',
  account: '',
  password: '',
  product_name: '',
  description: '',
};

function toForm(system: System | null): FormState {
  if (!system) return EMPTY;
  return {
    category: system.category,
    type: system.type,
    system_name: system.system_name,
    system_code: system.system_code,
    ip: system.ip ?? '',
    port: system.port === null ? '' : String(system.port),
    account: system.account ?? '',
    password: '',
    product_name: system.product_name ?? '',
    description: system.description ?? '',
  };
}

function toInput(form: FormState, editing: boolean): SystemInput {
  const nullable = (v: string) => (v.trim() === '' ? null : v.trim());
  return {
    category: form.category,
    type: form.type,
    system_name: form.system_name.trim(),
    system_code: form.system_code.trim(),
    ip: nullable(form.ip),
    port: form.port.trim() === '' ? null : Number(form.port),
    account: nullable(form.account),
    // Blank password on edit keeps the existing one (backend semantics).
    password: editing && form.password === '' ? null : nullable(form.password),
    product_name: nullable(form.product_name),
    description: nullable(form.description),
  };
}

export function SystemFormModal({ open, system, onClose, onSaved }: SystemFormModalProps) {
  return (
    <Modal open={open} title={system ? '시스템 수정' : '시스템 추가'} onClose={onClose}>
      {/* Keyed so the form state re-initialises whenever a different system is opened. */}
      <SystemForm key={system?.id ?? 'new'} system={system} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function SystemForm({ system, onClose, onSaved }: Omit<SystemFormModalProps, 'open'>) {
  const [form, setForm] = useState<FormState>(() => toForm(system));
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = system !== null;

  const set = (key: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = toInput(form, editing);
      if (system) await updateSystem(system.id, body);
      else await createSystem(body);
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-4">
      {error && (
        <div className="col-span-2">
          <Alert kind="error" message={error} />
        </div>
      )}
      <div>
        <label className="label" htmlFor="sys-category">
          구분 *
        </label>
        <select
          id="sys-category"
          className="input"
          value={form.category}
          onChange={set('category')}
        >
          {SYSTEM_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="sys-type">
          Type *
        </label>
        <select id="sys-type" className="input" value={form.type} onChange={set('type')}>
          {SYSTEM_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="sys-name">
          시스템명 *
        </label>
        <input
          id="sys-name"
          className="input"
          required
          maxLength={100}
          value={form.system_name}
          onChange={set('system_name')}
        />
      </div>
      <div>
        <label className="label" htmlFor="sys-code">
          시스템코드 *
        </label>
        <input
          id="sys-code"
          className="input font-mono"
          required
          maxLength={50}
          value={form.system_code}
          onChange={set('system_code')}
        />
      </div>
      <div>
        <label className="label" htmlFor="sys-ip">
          IP
        </label>
        <input id="sys-ip" className="input" value={form.ip} onChange={set('ip')} />
      </div>
      <div>
        <label className="label" htmlFor="sys-port">
          Port
        </label>
        <input
          id="sys-port"
          className="input"
          type="number"
          min={0}
          max={65535}
          value={form.port}
          onChange={set('port')}
        />
      </div>
      <div>
        <label className="label" htmlFor="sys-account">
          계정
        </label>
        <input id="sys-account" className="input" value={form.account} onChange={set('account')} />
      </div>
      <div>
        <label className="label" htmlFor="sys-password">
          패스워드{' '}
          {editing && system?.has_password && (
            <span className="font-normal text-slate-400">(비워두면 기존 값 유지)</span>
          )}
        </label>
        <div className="flex gap-1">
          <input
            id="sys-password"
            className="input"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
          />
          <button
            type="button"
            className="btn-secondary shrink-0 px-2"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? '패스워드 숨기기' : '패스워드 표시'}
          >
            {showPassword ? '숨김' : '표시'}
          </button>
        </div>
      </div>
      <div className="col-span-2">
        <label className="label" htmlFor="sys-product">
          제품명
        </label>
        <input
          id="sys-product"
          className="input"
          value={form.product_name}
          onChange={set('product_name')}
        />
      </div>
      <div className="col-span-2">
        <label className="label" htmlFor="sys-desc">
          시스템 설명
        </label>
        <textarea
          id="sys-desc"
          className="input"
          rows={3}
          value={form.description}
          onChange={set('description')}
        />
      </div>
      <div className="col-span-2 flex justify-end gap-2 border-t border-slate-200 pt-3">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
          취소
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? '저장 중…' : '저장'}
        </button>
      </div>
    </form>
  );
}
