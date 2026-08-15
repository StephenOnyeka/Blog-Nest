/**
 * data/api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source-of-truth for every HTTP call the frontend makes to the
 * blog-backend REST API.  Built on top of the thin axios instance in
 * lib/api.ts, which already handles:
 *   • Base URL  (http://localhost:3000/api)
 *   • Attaching the JWT Bearer token from localStorage
 *   • Clearing the token on 401 responses
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { api } from "../lib/api";

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  created_at: string;
}

export interface ApiAuthor {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
}

export interface ApiArticle {
  id: string;
  title: string;
  subtitle: string | null;
  body: string;
  thumbnail: string | null;
  tags: string[];
  read_time: number;
  is_draft: boolean;
  is_member_only: boolean;
  published_at: string | null;
  author_id: string;
  author: ApiAuthor;
  created_at: string;
  updated_at: string;
}

export interface ArticleListResponse {
  articles: ApiArticle[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiNotification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  article_id: string | null;
  created_at: string;
  article?: ApiArticle;
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: ApiUser;
  token: string;
}

/** Register a new account */
export const register = async (
  data: RegisterPayload,
): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>("/auth/register", data);
  return res.data;
};

/** Log in with email + password */
export const login = async (data: LoginPayload): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>("/auth/login", data);
  return res.data;
};

/** Fetch the currently authenticated user (requires token) */
export const getMe = async (): Promise<{ user: ApiUser }> => {
  const res = await api.get<{ user: ApiUser }>("/auth/me");
  return res.data;
};

// ─── Users ─────────────────────────────────────────────────────────────────────

export interface UpdateProfilePayload {
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
}

/** Get a public user profile by id */
export const getProfile = async (userId: string): Promise<ApiUser> => {
  const res = await api.get<ApiUser>(`/users/${userId}`);
  return res.data;
};

/** Get users followed by a user */
export const getFollowing = async (userId: string): Promise<ApiAuthor[]> => {
  const res = await api.get<ApiAuthor[]>(`/users/${userId}/following`);
  return res.data;
};

/** Update the logged-in user's profile (own id only) */
export const updateProfile = async (
  userId: string,
  data: UpdateProfilePayload,
): Promise<ApiUser> => {
  const res = await api.put<ApiUser>(`/users/${userId}`, data);
  return res.data;
};

/** Follow an author */
export const followUser = async (
  authorId: string,
): Promise<{ message: string }> => {
  const res = await api.post<{ message: string }>(`/users/${authorId}/follow`);
  return res.data;
};

/** Unfollow an author */
export const unfollowUser = async (
  authorId: string,
): Promise<{ message: string }> => {
  const res = await api.delete<{ message: string }>(
    `/users/${authorId}/follow`,
  );
  return res.data;
};

// ─── Articles ──────────────────────────────────────────────────────────────────

export interface GetArticlesParams {
  page?: number;
  limit?: number;
  author_id?: string;
  tags?: string; // comma-separated, e.g. "AI,Design"
}

export interface CreateArticlePayload {
  title: string;
  subtitle?: string;
  body: string;
  thumbnail?: string;
  tags?: string[];
  is_member_only?: boolean;
  is_draft?: boolean;
}

export type UpdateArticlePayload = Partial<CreateArticlePayload>;

/** List published articles (paginated, filterable) */
export const getArticles = async (
  params: GetArticlesParams = {},
): Promise<ArticleListResponse> => {
  const res = await api.get<ArticleListResponse>("/articles", { params });
  return res.data;
};

/** Get a single article by id */
export const getArticleById = async (id: string): Promise<ApiArticle> => {
  const res = await api.get<ApiArticle>(`/articles/${id}`);
  return res.data;
};

/** Create a new article (auth required) */
export const createArticle = async (
  data: CreateArticlePayload,
): Promise<ApiArticle> => {
  const res = await api.post<ApiArticle>("/articles", data);
  return res.data;
};

/** Update an existing article (auth required, must be author) */
export const updateArticle = async (
  id: string,
  data: UpdateArticlePayload,
): Promise<ApiArticle> => {
  const res = await api.put<ApiArticle>(`/articles/${id}`, data);
  return res.data;
};

/** Delete an article (auth required, must be author) */
export const deleteArticle = async (
  id: string,
): Promise<{ message: string }> => {
  const res = await api.delete<{ message: string }>(`/articles/${id}`);
  return res.data;
};

// ─── Notifications ─────────────────────────────────────────────────────────────

/** Get all notifications for the logged-in user */
export const getNotifications = async (): Promise<ApiNotification[]> => {
  const res = await api.get<ApiNotification[]>("/notifications");
  return res.data;
};

/** Get the count of unread notifications */
export const getUnreadNotificationCount = async (): Promise<{
  count: number;
}> => {
  const res = await api.get<{ count: number }>("/notifications/unread-count");
  return res.data;
};

/** Mark all notifications as read */
export const markAllNotificationsRead = async (): Promise<{
  success: boolean;
}> => {
  const res = await api.patch<{ success: boolean }>("/notifications/read-all");
  return res.data;
};

/** Mark a single notification as read */
export const markNotificationRead = async (
  id: string,
): Promise<{ success: boolean }> => {
  const res = await api.patch<{ success: boolean }>(
    `/notifications/${id}/read`,
  );
  return res.data;
};

/** Delete a single notification */
export const deleteNotification = async (
  id: string,
): Promise<{ success: boolean }> => {
  const res = await api.delete<{ success: boolean }>(`/notifications/${id}`);
  return res.data;
};

// ─── Subscriptions ─────────────────────────────────────────────────────────────

export interface SubscribePayload {
  email: string;
  topics?: string[];
  newsletter?: boolean;
}

/** Subscribe (or update subscription) for newsletter emails */
export const subscribe = async (
  data: SubscribePayload,
): Promise<{ success: boolean; verified: boolean }> => {
  const res = await api.post<{ success: boolean; verified: boolean }>(
    "/subscriptions",
    data,
  );
  return res.data;
};

/** Verify a subscription email via token (from query param in link) */
export const verifySubscription = async (
  token: string,
): Promise<{ success: boolean }> => {
  const res = await api.get<{ success: boolean }>("/subscriptions/verify", {
    params: { token },
  });
  return res.data;
};

/** Unsubscribe via token */
export const unsubscribe = async (
  token: string,
): Promise<{ success: boolean }> => {
  const res = await api.delete<{ success: boolean }>(
    "/subscriptions/unsubscribe",
    {
      params: { token },
    },
  );
  return res.data;
};
