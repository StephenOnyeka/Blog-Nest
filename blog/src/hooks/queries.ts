/**
 * hooks/queries.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * React Query hooks + a central query-key registry for every cached API read
 * in the app. All queries inherit the app-wide infinite cache defaults from
 * lib/queryClient.ts (staleTime/gcTime = Infinity), so data is fetched once and
 * kept for the whole app lifecycle unless a mutation invalidates it (or the
 * query opts into its own refetchInterval).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMe,
  getProfile,
  getArticles,
  getArticleById,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  subscribe,
  type GetArticlesParams,
  type SubscribePayload,
} from "../data/api";

// ─── Query key registry ─────────────────────────────────────────────────────
// Single source of truth for cache keys so invalidation stays consistent.
export const queryKeys = {
  me: ["me"] as const,
  profile: (userId: string) => ["profile", userId] as const,
  articles: (params: GetArticlesParams = {}) => ["articles", params] as const,
  article: (id: string) => ["article", id] as const,
  notifications: ["notifications"] as const,
  unreadNotificationCount: ["notifications", "unread-count"] as const,
};

// ─── Auth ───────────────────────────────────────────────────────────────────

/** The currently authenticated user. Only runs when a token is present. */
export function useMe(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
    enabled,
  });
}

// ─── Users ──────────────────────────────────────────────────────────────────

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(userId ?? ""),
    queryFn: () => getProfile(userId as string),
    enabled: !!userId,
  });
}

// ─── Articles ───────────────────────────────────────────────────────────────

export function useArticles(params: GetArticlesParams = {}) {
  return useQuery({
    queryKey: queryKeys.articles(params),
    queryFn: () => getArticles(params),
  });
}

export function useArticle(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.article(id ?? ""),
    queryFn: () => getArticleById(id as string),
    enabled: !!id,
  });
}

// ─── Notifications ──────────────────────────────────────────────────────────

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: getNotifications,
    enabled,
  });
}

/**
 * Unread notification count. This is the one query that stays live: it keeps a
 * 30s poll so the navbar badge reflects new notifications even under the
 * app-wide infinite cache.
 */
export function useUnreadNotificationCount(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.unreadNotificationCount,
    queryFn: getUnreadNotificationCount,
    enabled,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.setQueryData(queryKeys.unreadNotificationCount, { count: 0 });
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount });
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

// ─── Subscriptions ──────────────────────────────────────────────────────────

export function useSubscribe() {
  return useMutation({
    mutationFn: (data: SubscribePayload) => subscribe(data),
  });
}
