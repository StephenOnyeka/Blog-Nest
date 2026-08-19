import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  create,
  insertMultiple,
  remove,
  search,
  upsert,
  type Orama,
} from '@orama/orama';
import { Article } from '../entities/article.entity';
import { Profile } from '../entities/profile.entity';
import { embedDocument, embedText, EMBEDDING_DIM } from './embed';

const ARTICLE_PROPERTIES: Array<
  'title' | 'subtitle' | 'body' | 'tags' | 'authorName'
> = ['title', 'subtitle', 'body', 'tags', 'authorName'];

const PERSON_PROPERTIES: Array<'name' | 'username' | 'bio'> = [
  'name',
  'username',
  'bio',
];

const articleSchema = {
  id: 'string',
  title: 'string',
  subtitle: 'string',
  body: 'string',
  thumbnail: 'string',
  tags: 'string[]',
  read_time: 'number',
  is_member_only: 'boolean',
  published_at: 'string',
  claps: 'number',
  comments_count: 'number',
  author_id: 'string',
  authorName: 'string',
  authorUsername: 'string',
  authorAvatar: 'string',
  embedding: `vector[${EMBEDDING_DIM}]`,
} as const;

const personSchema = {
  id: 'string',
  name: 'string',
  username: 'string',
  bio: 'string',
  avatar: 'string',
  followers_count: 'number',
  embedding: `vector[${EMBEDDING_DIM}]`,
} as const;

type ArticleSchema = typeof articleSchema;
type PersonSchema = typeof personSchema;

interface ArticleIndexDoc {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  thumbnail: string;
  tags: string[];
  read_time: number;
  is_member_only: boolean;
  published_at: string;
  claps: number;
  comments_count: number;
  author_id: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  embedding: number[];
}

interface PersonIndexDoc {
  id: string;
  name: string;
  username: string;
  bio: string;
  avatar: string;
  followers_count: number;
  embedding: number[];
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string | null;
  body: string;
  thumbnail: string | null;
  tags: string[];
  read_time: number;
  is_member_only: boolean;
  is_draft: false;
  published_at: string | null;
  author_id: string | null;
  claps: number;
  comments: number;
  created_at: string | null;
  updated_at: string | null;
  author: {
    id: string | null;
    name: string | null;
    username: string | null;
    avatar: string | null;
  };
  is_liked: false;
  is_bookmarked: false;
  score: number;
}

export interface SearchPersonResult {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  followers: number;
  score: number;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private articleDb: Orama<ArticleSchema> | null = null;
  private personDb: Orama<PersonSchema> | null = null;

  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
  ) {}

  async onModuleInit() {
    try {
      await this.refresh();
    } catch (error: unknown) {
      this.logger.error(
        `Failed to build search index: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Rebuild both indexes from the database (published articles + all profiles) */
  async refresh() {
    const articleDb = create({ schema: articleSchema });
    const articles = await this.articleRepo.find({
      where: { is_draft: false },
      relations: { author: true },
      order: { created_at: 'DESC' },
    });
    if (articles.length > 0) {
      await Promise.resolve(
        insertMultiple(
          articleDb,
          articles.map((a) => this.toArticleDoc(a)),
          100,
        ),
      );
    }
    this.articleDb = articleDb;

    const personDb = create({ schema: personSchema });
    const profiles = await this.profileRepo.find({
      order: { followers_count: 'DESC' },
    });
    if (profiles.length > 0) {
      await Promise.resolve(
        insertMultiple(
          personDb,
          profiles.map((p) => this.toPersonDoc(p)),
          100,
        ),
      );
    }
    this.personDb = personDb;

    this.logger.log(
      `Indexed ${articles.length} published articles and ${profiles.length} people`,
    );
    return { indexed: articles.length, people: profiles.length };
  }

  /** Re-index a single article (or drop it if it's now a draft) */
  async upsertArticle(publicId: string) {
    if (!this.articleDb) return;
    const article = await this.articleRepo.findOne({
      where: { public_id: publicId },
      relations: { author: true },
    });
    if (!article) return;
    if (article.is_draft) {
      await this.removeArticle(publicId);
      return;
    }
    await Promise.resolve(upsert(this.articleDb, this.toArticleDoc(article)));
  }

  /** Remove an article from the index */
  async removeArticle(publicId: string) {
    if (!this.articleDb) return;
    try {
      await Promise.resolve(remove(this.articleDb, publicId));
    } catch {
      /* not present — fine */
    }
  }

  /** Re-index a single profile (name, bio, avatar, follower counts) */
  async upsertProfile(publicId: string) {
    if (!this.personDb) return;
    const profile = await this.profileRepo.findOne({
      where: { public_id: publicId },
    });
    if (!profile) return;
    await Promise.resolve(upsert(this.personDb, this.toPersonDoc(profile)));
  }

  /** Remove a profile from the index */
  async removeProfile(publicId: string) {
    if (!this.personDb) return;
    try {
      await Promise.resolve(remove(this.personDb, publicId));
    } catch {
      /* not present — fine */
    }
  }

  /** Hybrid search (full-text + vector) across articles and people by default */
  async search(q: string, { limit = 20, offset = 0 }: SearchOptions = {}) {
    const term = (q ?? '').trim();
    if (!term) {
      return {
        articles: [],
        people: [],
        total_articles: 0,
        total_people: 0,
        mode: 'hybrid',
        limit,
        offset,
      };
    }

    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safeOffset = Math.max(offset, 0);
    const vector = { value: embedText(term), property: 'embedding' };

    const articlesRes = this.articleDb
      ? await search(this.articleDb, {
          mode: 'hybrid',
          term,
          properties: ARTICLE_PROPERTIES,
          vector,
          limit: safeLimit,
          offset: safeOffset,
        })
      : null;

    const peopleRes = this.personDb
      ? await search(this.personDb, {
          mode: 'hybrid',
          term,
          properties: PERSON_PROPERTIES,
          vector,
          limit: safeLimit,
          offset: safeOffset,
        })
      : null;

    return {
      articles: (articlesRes?.hits ?? []).map((h) =>
        this.toApiArticle(h.document as ArticleIndexDoc, h.score),
      ),
      people: (peopleRes?.hits ?? []).map((h) =>
        this.toApiPerson(h.document as PersonIndexDoc, h.score),
      ),
      total_articles: articlesRes?.count ?? 0,
      total_people: peopleRes?.count ?? 0,
      mode: 'hybrid',
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  /** Map a stored article into the frontend-facing article shape (with score) */
  private toApiArticle(doc: ArticleIndexDoc, score: number): SearchResultItem {
    return {
      id: doc.id,
      title: doc.title,
      subtitle: doc.subtitle || null,
      body: doc.body,
      thumbnail: doc.thumbnail || null,
      tags: doc.tags ?? [],
      read_time: doc.read_time,
      is_member_only: doc.is_member_only,
      is_draft: false,
      published_at: doc.published_at || null,
      author_id: doc.author_id || null,
      claps: doc.claps,
      comments: doc.comments_count,
      created_at: null,
      updated_at: null,
      author: {
        id: doc.author_id || null,
        name: doc.authorName || null,
        username: doc.authorUsername || null,
        avatar: doc.authorAvatar || null,
      },
      is_liked: false,
      is_bookmarked: false,
      score,
    };
  }

  /** Map a stored profile into the frontend-facing person shape (with score) */
  private toApiPerson(doc: PersonIndexDoc, score: number): SearchPersonResult {
    return {
      id: doc.id,
      name: doc.name,
      username: doc.username,
      avatar: doc.avatar || null,
      bio: doc.bio || null,
      followers: doc.followers_count,
      score,
    };
  }

  /** Build the searchable document for a stored article */
  private toArticleDoc(a: Article): ArticleIndexDoc {
    return {
      id: a.public_id,
      title: a.title,
      subtitle: a.subtitle ?? '',
      body: a.body,
      thumbnail: a.thumbnail ?? '',
      tags: a.tags ?? [],
      read_time: a.read_time,
      is_member_only: a.is_member_only,
      published_at: a.published_at ? a.published_at.toISOString() : '',
      claps: a.claps,
      comments_count: a.comments_count,
      author_id: a.author?.public_id ?? '',
      authorName: a.author?.name ?? 'Unknown',
      authorUsername: a.author?.username ?? '',
      authorAvatar: a.author?.avatar ?? '',
      embedding: embedDocument(a.title, a.subtitle ?? '', a.body, a.tags ?? []),
    };
  }

  /** Build the searchable document for a stored profile */
  private toPersonDoc(p: Profile): PersonIndexDoc {
    return {
      id: p.public_id,
      name: p.name,
      username: p.username,
      bio: p.bio ?? '',
      avatar: p.avatar ?? '',
      followers_count: p.followers_count,
      embedding: embedText([p.name, p.username, p.bio ?? ''].join(' ')),
    };
  }
}
