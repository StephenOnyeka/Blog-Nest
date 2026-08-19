/**
 * data/normalize.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Maps API article shapes (ApiArticle) into the mock `Article` shape that the
 * card/UI components expect, so API-driven and mock-driven rendering stay
 * consistent. Also provides small avatar helpers so every author surfaced in
 * the UI carries the avatar chosen in the avatar modal (or a deterministic
 * human-styled DiceBear fallback when none is set).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ApiArticle, ApiAuthor } from "./api";

/** DiceBear human avatar fallback used when a profile has no avatar set */
export function fallbackAvatar(seed: string | null | undefined): string {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed || "author"}&backgroundColor=b6e3f4`;
}

/** Normalize an API author mini-profile to the mock Author shape */
export function normalizeAuthor(a: ApiAuthor | null | undefined, fallbackId = "author") {
  return {
    id: a?.id || fallbackId,
    name: a?.name || "Author",
    username: a?.username || "author",
    avatar: a?.avatar || fallbackAvatar(a?.username),
    bio: "",
    followers: 0,
    following: 0,
  };
}

/** Normalize an API article to the mock `Article` shape expected by the UI */
export function normalizeApiArticle(a: ApiArticle) {
  return {
    id: a.id,
    title: a.title,
    subtitle: a.subtitle || "",
    body: a.body,
    author: normalizeAuthor(a.author, a.author_id),
    publishedAt: a.published_at
      ? new Date(a.published_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "Draft",
    readTime: a.read_time || 5,
    tags: a.tags || [],
    thumbnail: a.thumbnail || "",
    claps: a.claps,
    comments: a.comments,
    isMemberOnly: a.is_member_only || false,
    isLiked: a.is_liked,
    isBookmarked: a.is_bookmarked,
  };
}
