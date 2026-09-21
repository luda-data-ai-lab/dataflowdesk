import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { login as apiLogin, me } from '../api/auth';
import { SESSION_EXPIRED_EVENT } from '../api/client';
import { clearTokens, getAccessToken, storeTokens } from '../auth/tokens';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  /** True until the stored token has been validated (or found missing) on first load. */
  ready: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  ready: false,
  isAdmin: false,
  login: async () => undefined,
  logout: () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(() => getAccessToken() === null);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    me()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        clearTokens();
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const pair = await apiLogin(username, password);
    storeTokens(pair);
    setUser(await me());
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, isAdmin: user?.role === 'admin', login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
