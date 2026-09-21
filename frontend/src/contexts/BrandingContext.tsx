import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { getBranding } from '../api/branding';
import type { Branding } from '../types';

export const APP_NAME = 'DataFlowDesk';

interface BrandingContextValue {
  branding: Branding | null;
  /** Push a fresh branding object (after save/upload) so the sidebar updates immediately. */
  setBranding: (b: Branding) => void;
  reload: () => void;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: null,
  setBranding: () => undefined,
  reload: () => undefined,
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getBranding()
      .then((b) => {
        if (!cancelled) setBranding(b);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return (
    <BrandingContext.Provider value={{ branding, setBranding, reload }}>
      {children}
    </BrandingContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBranding(): BrandingContextValue {
  return useContext(BrandingContext);
}
