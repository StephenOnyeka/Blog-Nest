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

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { connectSocket, disconnectSocket } from "../lib/socket";
import {
  getMe,
  getProfile,
  getFollowing,
  followUser,
  unfollowUser,
  getArticles,
  getArticleById,
  getArticleComments,
  addComment,
  deleteComment,
  clapArticle,
  getBookmarkStatus,
  bookmarkArticle,
  unbookmarkArticle,
  getMyBookmarkedArticles,
  getRelatedArticles,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  subscribe,
  type GetArticlesParams,
  type SubscribePayload,
} from "../data/api";

// ─── Query key registry ─────────────────────────────────────────────────────
// Single source of truth for cache keys so invalidation stays consistent.
export const queryKeys = {
  me: ["me"] as const,
  profile: (userId: string) => ["profile", userId] as const,
  following: (userId: string) => ["following", userId] as const,
  articles: (params: GetArticlesParams = {}) => ["articles", params] as const,
  article: (id: string) => ["article", id] as const,
  articleComments: (articleId: string) => ["article", articleId, "comments"] as const,
  bookmarkStatus: (articleId: string) => ["bookmark", articleId] as const,
  myBookmarks: ["bookmarks"] as const,
  relatedArticles: (articleId: string) => ["article", articleId, "related"] as const,
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

export function useFollowing(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.following(userId ?? ""),
    queryFn: () => getFollowing(userId as string),
    enabled: !!userId,
  });
}

export function useFollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (authorId: string) => followUser(authorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["following"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

export function useUnfollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (authorId: string) => unfollowUser(authorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["following"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: queryKeys.me });
    },
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

// ─── Comments & Bookmarks ───────────────────────────────────────────────────

export function useArticleComments(articleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.articleComments(articleId ?? ""),
    queryFn: () => getArticleComments(articleId as string),
    enabled: !!articleId,
  });
}

export function useAddComment(articleId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, parentId }: { body: string; parentId?: string }) =>
      addComment(articleId as string, body, parentId),
    onSuccess: () => {
      if (articleId) {
        qc.invalidateQueries({ queryKey: queryKeys.articleComments(articleId) });
        qc.invalidateQueries({ queryKey: queryKeys.article(articleId) });
      }
    },
  });
}

/** Clap an article — returns the server-side updated count */
export function useClapArticle(articleId: string | undefined) {
  return useMutation({
    mutationFn: () => clapArticle(articleId as string),
  });
}

export function useDeleteComment(articleId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(articleId as string, commentId),
    onSuccess: () => {
      if (articleId) {
        qc.invalidateQueries({ queryKey: queryKeys.articleComments(articleId) });
        qc.invalidateQueries({ queryKey: queryKeys.article(articleId) });
      }
    },
  });
}

/** Bookmark status for a single article (auth) */
export function useBookmarkStatus(articleId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.bookmarkStatus(articleId ?? ""),
    queryFn: () => getBookmarkStatus(articleId as string),
    enabled: !!articleId && enabled,
  });
}

/** Toggle bookmark on an article (auth) */
export function useToggleBookmark(articleId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookmarked: boolean) =>
      bookmarked
        ? unbookmarkArticle(articleId as string)
        : bookmarkArticle(articleId as string),
    onSuccess: () => {
      if (articleId) {
        qc.invalidateQueries({ queryKey: queryKeys.bookmarkStatus(articleId) });
      }
      qc.invalidateQueries({ queryKey: queryKeys.myBookmarks });
    },
  });
}

/** All articles bookmarked by the logged-in user (auth) */
export function useMyBookmarks(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.myBookmarks,
    queryFn: getMyBookmarkedArticles,
    enabled,
  });
}

/** Related articles for the article page (by author + tags) */
export function useRelatedArticles(articleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.relatedArticles(articleId ?? ""),
    queryFn: () => getRelatedArticles(articleId as string),
    enabled: !!articleId,
    retry: false,
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
 * Unread notification count. Driven by real-time WebSockets instead of HTTP polling.
 */
export function useUnreadNotificationCount(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = connectSocket(token);

    const handleNotification = (data: { message: string }) => {
      if (data?.message) {
        toast.info(data.message);
      }
      qc.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount });
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
      disconnectSocket();
    };
  }, [enabled, qc]);

  return useQuery({
    queryKey: queryKeys.unreadNotificationCount,
    queryFn: getUnreadNotificationCount,
    enabled,
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

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
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
