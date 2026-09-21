import { useRef, useState, type FormEvent } from 'react';

import { deleteLogo, logoSrc, updateBranding, uploadLogo } from '../api/branding';
import { errorMessage } from '../api/client';
import { Alert } from '../components/common/Alert';
import { APP_NAME, useBranding } from '../contexts/BrandingContext';
import type { Branding } from '../types';

const MAX_LOGO_KB = 1024;
const ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml';

export function SettingsPage() {
  const { branding, setBranding } = useBranding();
  if (!branding) return <div className="py-24 text-center text-slate-400">불러오는 중…</div>;
  return <SettingsForm branding={branding} setBranding={setBranding} />;
}

interface SettingsFormProps {
  branding: Branding;
  setBranding: (b: Branding) => void;
}

function SettingsForm({ branding, setBranding }: SettingsFormProps) {
  const [companyName, setCompanyName] = useState(branding.company_name ?? '');
  const [tagline, setTagline] = useState(branding.tagline ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(label);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onSaveText = (e: FormEvent) => {
    e.preventDefault();
    void run('회사 정보가 저장되었습니다.', async () => {
      setBranding(await updateBranding({ company_name: companyName, tagline }));
    });
  };

  const onPickLogo = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_LOGO_KB * 1024) {
      setError(`로고 파일은 ${MAX_LOGO_KB}KB 이하여야 합니다.`);
      return;
    }
    void run('로고가 업로드되었습니다.', async () => {
      setBranding(await uploadLogo(file));
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const onRemoveLogo = () =>
    run('로고가 삭제되었습니다.', async () => {
      setBranding(await deleteLogo());
    });

  const src = logoSrc(branding);

  return (
    <div className="max-w-3xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-sm text-slate-500">
          고객사 로고와 회사명을 등록하면 좌측 상단에 표시됩니다. 서버 재시작 없이 즉시 반영됩니다.
        </p>
      </header>

      {error && <Alert kind="error" message={error} onClose={() => setError(null)} />}
      {notice && <Alert kind="success" message={notice} onClose={() => setNotice(null)} />}

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold">회사 로고</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex h-24 w-56 items-center justify-center rounded-md bg-brand-700 p-3">
            {src ? (
              <img src={src} alt="회사 로고" className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="text-center text-white">
                <div className="text-lg font-bold">{companyName || APP_NAME}</div>
                <div className="text-xs text-white/60">로고 없음 (텍스트 표시)</div>
              </div>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <input
              ref={fileRef}
              id="logo-file"
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => onPickLogo(e.target.files?.[0])}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {src ? '로고 변경' : '로고 업로드'}
              </button>
              {src && (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() => void onRemoveLogo()}
                >
                  로고 삭제
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500">
              PNG · JPG · GIF · WebP · SVG, 최대 {MAX_LOGO_KB}KB. 가로형(예: 400×100) 이미지를
              권장합니다.
              {branding.logo_size != null && (
                <>
                  {' '}
                  현재: {branding.logo_mime} · {Math.ceil(branding.logo_size / 1024)}KB
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <form className="card space-y-4 p-5" onSubmit={onSaveText}>
        <h2 className="font-semibold">회사 정보</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="company-name">
              회사명
            </label>
            <input
              id="company-name"
              className="input"
              maxLength={100}
              placeholder={APP_NAME}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">비워두면 {APP_NAME}으로 표시됩니다.</p>
          </div>
          <div>
            <label className="label" htmlFor="tagline">
              부제 (선택)
            </label>
            <input
              id="tagline"
              className="input"
              maxLength={200}
              placeholder="MES/ERP 연동 관리"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={busy}>
            저장
          </button>
        </div>
      </form>
    </div>
  );
}
