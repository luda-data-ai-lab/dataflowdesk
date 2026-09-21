import { useState, type ChangeEvent } from 'react';

import { errorMessage } from '../../api/client';
import { uploadSheet } from '../../api/upload';
import type { UploadResult } from '../../types';
import { Alert } from '../common/Alert';
import { Modal } from '../common/Modal';

type UploadKind = 'interfaces' | 'systems';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded: (result: UploadResult) => void;
}

const KIND_LABELS: Record<UploadKind, string> = {
  interfaces: '인터페이스 리스트',
  systems: '시스템 연동정보',
};

export function UploadModal({ open, onClose, onUploaded }: UploadModalProps) {
  const [kind, setKind] = useState<UploadKind>('interfaces');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const reset = () => {
    setFile(null);
    setError(null);
    setResult(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setError(null);
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await uploadSheet(kind, file);
      setResult(res);
      onUploaded(res);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Excel 업로드"
      onClose={close}
      footer={
        result ? (
          <>
            <button type="button" className="btn-secondary" onClick={reset}>
              다른 파일 업로드
            </button>
            <button type="button" className="btn-primary" onClick={close}>
              확인
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-secondary" onClick={close} disabled={busy}>
              취소
            </button>
            <button type="button" className="btn-primary" onClick={submit} disabled={busy || !file}>
              {busy ? '업로드 중…' : '업로드'}
            </button>
          </>
        )
      }
    >
      {result ? (
        <UploadResultView result={result} />
      ) : (
        <div className="space-y-4">
          {error && <Alert kind="error" message={error} />}
          <div>
            <span className="label">업로드 대상 시트</span>
            <div className="flex gap-4">
              {(Object.keys(KIND_LABELS) as UploadKind[]).map((k) => (
                <label key={k} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="upload-kind"
                    checked={kind === k}
                    onChange={() => setKind(k)}
                  />
                  {KIND_LABELS[k]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="upload-file">
              Excel 파일 (.xlsx)
            </label>
            <input
              id="upload-file"
              type="file"
              accept=".xlsx"
              className="block w-full text-sm"
              onChange={onFile}
            />
          </div>
          <p className="text-xs text-slate-500">
            템플릿과 동일한 시트명·헤더를 사용해야 합니다. 오류가 있는 행은 건너뛰고 나머지 행은
            저장됩니다. 인터페이스 업로드 시 소스/타켓 시스템코드는 먼저 등록되어 있어야 합니다.
          </p>
        </div>
      )}
    </Modal>
  );
}

function UploadResultView({ result }: { result: UploadResult }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="파일" value={result.file_name} small />
        <Stat label="성공" value={String(result.success_count)} tone="text-emerald-700" />
        <Stat label="건너뜀" value={String(result.skipped_count)} tone="text-red-700" />
      </div>
      {result.errors.length === 0 ? (
        <Alert kind="success" message="모든 행이 정상적으로 업로드되었습니다." />
      ) : (
        <div className="max-h-72 overflow-y-auto rounded border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-1.5">행</th>
                <th className="px-3 py-1.5">필드</th>
                <th className="px-3 py-1.5">오류</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.errors.map((e, i) => (
                <tr key={`${e.row}-${e.field}-${i}`}>
                  <td className="px-3 py-1.5">{e.row}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{e.field}</td>
                  <td className="px-3 py-1.5 text-red-700">{e.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = '',
  small = false,
}: {
  label: string;
  value: string;
  tone?: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`${small ? 'truncate text-sm' : 'text-2xl font-bold'} ${tone}`} title={value}>
        {value}
      </div>
    </div>
  );
}
