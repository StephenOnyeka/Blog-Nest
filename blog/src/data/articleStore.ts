/**
 * articleStore.ts
 * A simple localStorage-backed store for user-created articles.
 * This bridges WritePage → HomePage/ArticlePage/ProfilePage.
 */

import type { Article } from "./mockData";

const STORE_KEY = "BlogNest_user_articles";

/** Logged-in user (hardcoded for mock auth) */
export const CURRENT_USER = {
  id: "me",
  name: "Stephen Onyeka",
  username: "me",
  avatar:
    "https://api.dicebear.com/9.x/avataaars/svg?seed=me&backgroundColor=ffd5dc",
  bio: "Writer & developer. Building things on the internet.",
  followers: 0,
  following: 0,
};

function load(): Article[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(articles: Article[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(articles));
}

export function getUserArticles(): Article[] {
  return load();
}

export function getArticleById(id: string): Article | undefined {
  return load().find((a) => a.id === id);
}

export function saveArticle(article: Article) {
  const articles = load();
  const idx = articles.findIndex((a) => a.id === article.id);
  if (idx >= 0) {
    articles[idx] = article;
  } else {
    articles.unshift(article);
  }
  save(articles);
}

export function deleteArticle(id: string) {
  save(load().filter((a) => a.id !== id));
}

export function createDraftArticle(): Article {
  return {
    id: `user-${Date.now()}`,
    title: "",
    subtitle: "",
    body: "",
    author: CURRENT_USER,
    publishedAt: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    readTime: 1,
    tags: [],
    thumbnail: "",
    claps: 0,
    comments: 0,
    isMemberOnly: false,
  };
}

/** Estimate read time from HTML string */
export function estimateReadTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Get plain-text word count from HTML */
export function wordCount(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").trim();
  return text.split(/\s+/).filter(Boolean).length;
}
