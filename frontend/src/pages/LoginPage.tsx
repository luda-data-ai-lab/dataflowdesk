import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { logoSrc } from '../api/branding';
import { errorMessage } from '../api/client';
import { Alert } from '../components/common/Alert';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME, useBranding } from '../contexts/BrandingContext';

export function LoginPage() {
  const { user, ready, login } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  if (ready && user) return <Navigate to={from} replace />;

  const logo = branding ? logoSrc(branding) : null;
  const title = branding?.company_name || APP_NAME;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-8">
        <div className="text-center">
          {logo && <img src={logo} alt={title} className="mx-auto mb-3 max-h-16 object-contain" />}
          <h1 className="text-xl font-bold text-brand-700">{title}</h1>
          <p className="text-xs text-slate-500">
            {branding?.company_name ? APP_NAME : '인터페이스 · 시스템 연동 관리'}
          </p>
        </div>
        {error && <Alert kind="error" message={error} onClose={() => setError(null)} />}
        <div>
          <label className="label" htmlFor="username">
            아이디
          </label>
          <input
            id="username"
            className="input w-full"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            className="input w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </div>
  );
}
