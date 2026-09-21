import { useCallback, useEffect, useState } from 'react';

import { errorMessage } from '../api/client';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface Settled<T> {
  key: string;
  data: T | null;
  error: string | null;
}

/**
 * Run an async loader whenever `deps` change; exposes data/loading/error and a manual reload.
 * `loading` is derived by comparing the current request key with the last settled key, so no
 * state is written synchronously inside the effect.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [tick, setTick] = useState(0);
  const key = `${JSON.stringify(deps)}#${tick}`;
  const [settled, setSettled] = useState<Settled<T>>({ key: '', data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    loader()
      .then((data) => {
        if (!cancelled) setSettled({ key, data, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) setSettled((prev) => ({ key, data: prev.data, error: errorMessage(err) }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data: settled.data, loading: settled.key !== key, error: settled.error, reload };
}
