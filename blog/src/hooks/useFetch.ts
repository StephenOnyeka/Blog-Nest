/**
 * hooks/useFetch.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * A generic data-fetching hook that wraps any async function returning a
 * Promise<T>.  It handles loading / error / data states and supports:
 *   • Auto-fetch on mount (default: true)
 *   • Manual re-fetch via the returned `refetch()` function
 *   • Dependency-based re-fetch (works like useEffect deps)
 *   • Abort on unmount to prevent state-setting on unmounted components
 *
 * Usage:
 *   // Auto-fetch
 *   const { data, isLoading, error } = useFetch(() => getArticles({ page: 1 }));
 *
 *   // Manual fetch (skip auto-fetch)
 *   const { data, isLoading, refetch } = useFetch(
 *     () => getArticleById(id),
 *     { autoFetch: false }
 *   );
 *   // call refetch() whenever you want data
 *
 *   // Re-fetch when `id` changes
 *   const { data } = useFetch(() => getArticleById(id), { deps: [id] });
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type DependencyList,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseFetchState<T> {
  /** The resolved data, or null if not yet loaded or in error */
  data: T | null;
  /** True while the request is in-flight */
  isLoading: boolean;
  /** The error thrown by the fetcher, or null */
  error: Error | null;
  /** Call this to manually (re-)trigger the fetcher */
  refetch: () => void;
}

export interface UseFetchOptions {
  /**
   * If true (default), the fetcher is called once on mount and again when
   * `deps` change.  Set to false to only call the fetcher on demand via
   * `refetch()`.
   */
  autoFetch?: boolean;
  /**
   * Additional React dependency array.  When any value in this array changes,
   * the fetcher is automatically re-triggered (only relevant when autoFetch
   * is true).
   */
  deps?: DependencyList;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFetch<T>(
  fetcher: () => Promise<T>,
  options: UseFetchOptions = {},
): UseFetchState<T> {
  const { autoFetch = true, deps = [] } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  // Keep a stable reference to the fetcher so the effect doesn't re-run
  // just because the caller re-created an inline arrow function.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Track whether the component is still mounted before touching state
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcherRef.current();
      if (isMountedRef.current) {
        setData(result);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fetch on mount and when deps change
  useEffect(() => {
    if (autoFetch) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, execute, ...deps]);

  return { data, isLoading, error, refetch: execute };
}

export default useFetch;
