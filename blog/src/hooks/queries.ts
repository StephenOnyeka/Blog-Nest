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
  type ApiArticle,
  type ArticleListResponse,
  type BookmarkStatus,
} from "../data/api";

// ─── Query key registry ─────────────────────────────────────────────────────
// Single source of truth for cache keys so invalidation stays consistent.
export const queryKeys = {
  me: ["me"] as const,
  profile: (userId: string) => ["profile", userId] as const,
  following: (userId: string) => ["following", userId] as const,
  articles: (params: GetArticlesParams = {}) => ["articles", params] as const,
  article: (id: string) => ["article", id] as const,
  articleComments: (articleId: string) =>
    ["article", articleId, "comments"] as const,
  bookmarkStatus: (articleId: string) => ["bookmark", articleId] as const,
  myBookmarks: ["bookmarks"] as const,
  relatedArticles: (articleId: string) =>
    ["article", articleId, "related"] as const,
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
        qc.invalidateQueries({
          queryKey: queryKeys.articleComments(articleId),
        });
        qc.invalidateQueries({ queryKey: queryKeys.article(articleId) });
      }
    },
  });
}

/** Clap an article — optimistic per-user toggle with cache sync + rollback */
export function useClapArticle(articleId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => clapArticle(articleId as string),
    onMutate: async () => {
      if (!articleId) return undefined;

      // Cancel any in-flight reads so they can't clobber the optimistic write.
      await qc.cancelQueries({ queryKey: queryKeys.article(articleId) });
      await qc.cancelQueries({ queryKey: ["articles"] });
      await qc.cancelQueries({ queryKey: queryKeys.myBookmarks });

      // Snapshot everything we're about to change (for rollback on error).
      const prevArticle = qc.getQueryData<ApiArticle>(
        queryKeys.article(articleId),
      );
      const prevFeeds = qc.getQueriesData<ArticleListResponse>({
        queryKey: ["articles"],
      });
      const prevBookmarks = qc.getQueryData<ApiArticle[]>(
        queryKeys.myBookmarks,
      );

      const toggle = (a: ApiArticle): ApiArticle => ({
        ...a,
        is_liked: !a.is_liked,
        claps: a.is_liked ? a.claps - 1 : a.claps + 1,
      });

      qc.setQueryData<ApiArticle>(queryKeys.article(articleId), (old) =>
        old ? toggle(old) : old,
      );
      qc.setQueriesData<ArticleListResponse>(
        { queryKey: ["articles"] },
        (old) =>
          old
            ? {
                ...old,
                articles: old.articles.map((a) =>
                  a.id === articleId ? toggle(a) : a,
                ),
              }
            : old,
      );
      qc.setQueryData<ApiArticle[]>(queryKeys.myBookmarks, (old) =>
        old ? old.map((a) => (a.id === articleId ? toggle(a) : a)) : old,
      );

      return { prevArticle, prevFeeds, prevBookmarks };
    },
    onError: (_err, _vars, context) => {
      if (!articleId || !context) return;
      const { prevArticle, prevFeeds, prevBookmarks } = context;
      if (prevArticle !== undefined) {
        qc.setQueryData(queryKeys.article(articleId), prevArticle);
      }
      for (const [key, data] of prevFeeds) qc.setQueryData(key, data);
      if (prevBookmarks !== undefined) {
        qc.setQueryData(queryKeys.myBookmarks, prevBookmarks);
      }
    },
    onSuccess: (res) => {
      if (!articleId) return;
      const sync = (a: ApiArticle): ApiArticle => ({
        ...a,
        claps: res.claps,
        is_liked: res.is_liked ?? a.is_liked,
      });
      qc.setQueryData<ApiArticle>(queryKeys.article(articleId), (old) =>
        old ? sync(old) : old,
      );
      qc.setQueriesData<ArticleListResponse>(
        { queryKey: ["articles"] },
        (old) =>
          old
            ? {
                ...old,
                articles: old.articles.map((a) =>
                  a.id === articleId ? sync(a) : a,
                ),
              }
            : old,
      );
      qc.setQueryData<ApiArticle[]>(queryKeys.myBookmarks, (old) =>
        old ? old.map((a) => (a.id === articleId ? sync(a) : a)) : old,
      );
    },
    onSettled: () => {
      if (articleId) {
        qc.invalidateQueries({ queryKey: queryKeys.article(articleId) });
      }
      qc.invalidateQueries({ queryKey: ["articles"] });
      qc.invalidateQueries({ queryKey: queryKeys.myBookmarks });
    },
  });
}

export function useDeleteComment(articleId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      deleteComment(articleId as string, commentId),
    onSuccess: () => {
      if (articleId) {
        qc.invalidateQueries({
          queryKey: queryKeys.articleComments(articleId),
        });
        qc.invalidateQueries({ queryKey: queryKeys.article(articleId) });
      }
    },
  });
}

/** Bookmark status for a single article (auth) */
export function useBookmarkStatus(
  articleId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.bookmarkStatus(articleId ?? ""),
    queryFn: () => getBookmarkStatus(articleId as string),
    enabled: !!articleId && enabled,
  });
}

/** Toggle bookmark on an article (auth) — optimistic with cache sync + rollback */
export function useToggleBookmark(articleId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookmarked: boolean) =>
      bookmarked
        ? unbookmarkArticle(articleId as string)
        : bookmarkArticle(articleId as string),
    onMutate: async (bookmarked) => {
      if (!articleId) return undefined;
      const target = !bookmarked; // the state we want to move to

      await qc.cancelQueries({ queryKey: queryKeys.bookmarkStatus(articleId) });
      await qc.cancelQueries({ queryKey: queryKeys.myBookmarks });
      await qc.cancelQueries({ queryKey: queryKeys.article(articleId) });
      await qc.cancelQueries({ queryKey: ["articles"] });

      const prevStatus = qc.getQueryData<BookmarkStatus>(
        queryKeys.bookmarkStatus(articleId),
      );
      const prevBookmarks = qc.getQueryData<ApiArticle[]>(
        queryKeys.myBookmarks,
      );
      const prevArticle = qc.getQueryData<ApiArticle>(
        queryKeys.article(articleId),
      );
      const prevFeeds = qc.getQueriesData<ArticleListResponse>({
        queryKey: ["articles"],
      });

      const withBookmark = (a: ApiArticle): ApiArticle => ({
        ...a,
        is_bookmarked: target,
      });

      qc.setQueryData<BookmarkStatus>(queryKeys.bookmarkStatus(articleId), {
        bookmarked: target,
      });
      qc.setQueryData<ApiArticle>(queryKeys.article(articleId), (old) =>
        old ? withBookmark(old) : old,
      );
      qc.setQueriesData<ArticleListResponse>(
        { queryKey: ["articles"] },
        (old) =>
          old
            ? {
                ...old,
                articles: old.articles.map((a) =>
                  a.id === articleId ? withBookmark(a) : a,
                ),
              }
            : old,
      );
      // Optimistically add/remove from the bookmarks list (if the article is cached)
      qc.setQueryData<ApiArticle[]>(queryKeys.myBookmarks, (old) => {
        if (!old) return old;
        if (target) {
          if (old.some((a) => a.id === articleId)) return old;
          const article = qc.getQueryData<ApiArticle>(
            queryKeys.article(articleId),
          );
          return article ? [article, ...old] : old;
        }
        return old.filter((a) => a.id !== articleId);
      });

      return { prevStatus, prevBookmarks, prevArticle, prevFeeds };
    },
    onError: (_err, _vars, context) => {
      if (!articleId || !context) return;
      const { prevStatus, prevBookmarks, prevArticle, prevFeeds } = context;
      if (prevStatus !== undefined) {
        qc.setQueryData(queryKeys.bookmarkStatus(articleId), prevStatus);
      }
      if (prevArticle !== undefined) {
        qc.setQueryData(queryKeys.article(articleId), prevArticle);
      }
      if (prevBookmarks !== undefined) {
        qc.setQueryData(queryKeys.myBookmarks, prevBookmarks);
      }
      for (const [key, data] of prevFeeds) qc.setQueryData(key, data);
    },
    onSettled: () => {
      if (articleId) {
        qc.invalidateQueries({ queryKey: queryKeys.bookmarkStatus(articleId) });
        qc.invalidateQueries({ queryKey: queryKeys.article(articleId) });
      }
      qc.invalidateQueries({ queryKey: ["articles"] });
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
