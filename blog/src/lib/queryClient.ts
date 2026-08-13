import { QueryClient } from "@tanstack/react-query";

/**
 * A single QueryClient shared for the entire lifecycle of the app.
 *
 * Caching is effectively permanent:
 *   • staleTime: Infinity  → cached data is never considered stale, so it is
 *     never refetched automatically (no refetch on mount / focus / reconnect).
 *   • gcTime:    Infinity  → cached data is never garbage-collected, even when
 *     no component is subscribed to it.
 *
 * Data only changes when we explicitly invalidate/refetch a query (e.g. after
 * a mutation) or when an individual query opts into a refetchInterval.
 * The cache lives as long as the tab/app is open; a full page reload starts
 * fresh (in-memory only, by design).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});
