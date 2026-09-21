import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

/** Route guard: waits for the token check, then redirects anonymous users to /login. */
export function RequireAuth({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, ready, isAdmin } = useAuth();
  const location = useLocation();
  if (!ready) {
    return <div className="p-8 text-sm text-slate-500">인증 확인 중…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
