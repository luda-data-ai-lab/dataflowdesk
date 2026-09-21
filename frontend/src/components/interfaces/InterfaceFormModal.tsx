import { useState, type FormEvent } from 'react';

import { errorMessage } from '../../api/client';
import { createInterface, updateInterface } from '../../api/interfaces';
import { INTERFACE_CYCLES, INTERFACE_STATUSES } from '../../constants';
import type { Interface, InterfaceInput, System } from '../../types';
import { Alert } from '../common/Alert';
import { Modal } from '../common/Modal';

interface InterfaceFormModalProps {
  open: boolean;
  iface: Interface | null;
  systems: System[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  interface_id: string;
  interface_name: string;
  integration_type: string;
  process: string;
  source_system_id: string;
  target_system_id: string;
  via_system_id: string;
  cycle: string;
  description: string;
  status: string;
}

const EMPTY: FormState = {
  interface_id: '',
  interface_name: '',
  integration_type: '',
  process: '',
  source_system_id: '',
  target_system_id: '',
  via_system_id: '',
  cycle: INTERFACE_CYCLES[0],
  description: '',
  status: INTERFACE_STATUSES[0],
};

function toForm(iface: Interface | null): FormState {
  if (!iface) return EMPTY;
  return {
    interface_id: iface.interface_id,
    interface_name: iface.interface_name,
    integration_type: iface.integration_type,
    process: iface.process ?? '',
    source_system_id: String(iface.source_system_id),
    target_system_id: String(iface.target_system_id),
    via_system_id: iface.via_system_id === null ? '' : String(iface.via_system_id),
    cycle: iface.cycle,
    description: iface.description ?? '',
    status: iface.status,
  };
}

function toInput(form: FormState): InterfaceInput {
  const nullable = (v: string) => (v.trim() === '' ? null : v.trim());
  return {
    interface_id: form.interface_id.trim(),
    interface_name: form.interface_name.trim(),
    integration_type: form.integration_type.trim(),
    process: nullable(form.process),
    source_system_id: Number(form.source_system_id),
    target_system_id: Number(form.target_system_id),
    via_system_id: form.via_system_id === '' ? null : Number(form.via_system_id),
    cycle: form.cycle,
    description: nullable(form.description),
    status: form.status,
  };
}

export function InterfaceFormModal({
  open,
  iface,
  systems,
  onClose,
  onSaved,
}: InterfaceFormModalProps) {
  return (
    <Modal open={open} title={iface ? '인터페이스 수정' : '인터페이스 추가'} onClose={onClose}>
      {/* Keyed so the form state re-initialises whenever a different interface is opened. */}
      <InterfaceForm
        key={iface?.id ?? 'new'}
        iface={iface}
        systems={systems}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function InterfaceForm({
  iface,
  systems,
  onClose,
  onSaved,
}: Omit<InterfaceFormModalProps, 'open'>) {
  const [form, setForm] = useState<FormState>(() => toForm(iface));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.source_system_id || !form.target_system_id) {
      setError('소스시스템과 타켓시스템을 선택하세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = toInput(form);
      if (iface) await updateInterface(iface.id, body);
      else await createInterface(body);
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const systemOptions = systems.map((s) => (
    <option key={s.id} value={s.id}>
      {s.system_name} ({s.system_code}) · {s.type}
    </option>
  ));

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-4">
      {error && (
        <div className="col-span-2">
          <Alert kind="error" message={error} />
        </div>
      )}
      <div>
        <label className="label" htmlFor="if-id">
          인터페이스 ID *
        </label>
        <input
          id="if-id"
          className="input font-mono"
          required
          maxLength={50}
          value={form.interface_id}
          onChange={set('interface_id')}
        />
      </div>
      <div>
        <label className="label" htmlFor="if-name">
          인터페이스 이름 *
        </label>
        <input
          id="if-name"
          className="input"
          required
          maxLength={200}
          value={form.interface_name}
          onChange={set('interface_name')}
        />
      </div>
      <div>
        <label className="label" htmlFor="if-type">
          연동방식 *
        </label>
        <input
          id="if-type"
          className="input"
          required
          maxLength={50}
          placeholder="예: DB Link, REST API, File"
          value={form.integration_type}
          onChange={set('integration_type')}
        />
      </div>
      <div>
        <label className="label" htmlFor="if-cycle">
          연동주기 *
        </label>
        <select id="if-cycle" className="input" value={form.cycle} onChange={set('cycle')}>
          {INTERFACE_CYCLES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="if-source">
          소스시스템 *
        </label>
        <select
          id="if-source"
          className="input"
          required
          value={form.source_system_id}
          onChange={set('source_system_id')}
        >
          <option value="">선택…</option>
          {systemOptions}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="if-target">
          타켓시스템 *
        </label>
        <select
          id="if-target"
          className="input"
          required
          value={form.target_system_id}
          onChange={set('target_system_id')}
        >
          <option value="">선택…</option>
          {systemOptions}
        </select>
      </div>
      <div className="col-span-2">
        <label className="label" htmlFor="if-via">
          경유시스템 (EAI/IFSYS)
        </label>
        <select
          id="if-via"
          className="input"
          value={form.via_system_id}
          onChange={set('via_system_id')}
        >
          <option value="">직접 연동 (경유 없음)</option>
          {systemOptions}
        </select>
      </div>
      <div className="col-span-2">
        <label className="label" htmlFor="if-process">
          인터페이스 Process
        </label>
        <input id="if-process" className="input" value={form.process} onChange={set('process')} />
      </div>
      <div className="col-span-2">
        <label className="label" htmlFor="if-desc">
          인터페이스설명
        </label>
        <textarea
          id="if-desc"
          className="input"
          rows={3}
          value={form.description}
          onChange={set('description')}
        />
      </div>
      <div>
        <label className="label" htmlFor="if-status">
          상태
        </label>
        <select id="if-status" className="input" value={form.status} onChange={set('status')}>
          {INTERFACE_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
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
