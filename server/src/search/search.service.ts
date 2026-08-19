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
import { embedDocument, embedText, EMBEDDING_DIM } from './embed';

const SEARCH_PROPERTIES: Array<
  'title' | 'subtitle' | 'body' | 'tags' | 'authorName'
> = ['title', 'subtitle', 'body', 'tags', 'authorName'];

const schema = {
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

type SearchSchema = typeof schema;

export type SearchMode = 'fulltext' | 'hybrid' | 'vector';

export interface SearchOptions {
  mode?: SearchMode;
  limit?: number;
  offset?: number;
}

interface SearchIndexDoc {
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

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private db: Orama<SearchSchema> | null = null;

  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
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

  /** Rebuild the index from every published article in the database */
  async refresh() {
    const db = create({ schema });
    const articles = await this.articleRepo.find({
      where: { is_draft: false },
      relations: { author: true },
      order: { created_at: 'DESC' },
    });

    if (articles.length > 0) {
      await Promise.resolve(
        insertMultiple(
          db,
          articles.map((a) => this.toDoc(a)),
          100,
        ),
      );
    }

    this.db = db;
    this.logger.log(`Indexed ${articles.length} published articles`);
    return { indexed: articles.length };
  }

  /** Re-index a single article (or drop it if it's now a draft) */
  async upsertArticle(publicId: string) {
    if (!this.db) return;
    const article = await this.articleRepo.findOne({
      where: { public_id: publicId },
      relations: { author: true },
    });
    if (!article) return;
    if (article.is_draft) {
      await this.removeArticle(publicId);
      return;
    }
    await Promise.resolve(upsert(this.db, this.toDoc(article)));
  }

  /** Remove an article from the index */
  async removeArticle(publicId: string) {
    if (!this.db) return;
    try {
      await Promise.resolve(remove(this.db, publicId));
    } catch {
      /* not present — fine */
    }
  }

  /** Run a search across the indexed articles */
  async search(
    q: string,
    { mode = 'hybrid', limit = 20, offset = 0 }: SearchOptions = {},
  ) {
    const db = this.db ?? (await this.rebuild());
    const term = (q ?? '').trim();
    if (!term) {
      return { articles: [], total: 0, mode, limit, offset };
    }

    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safeOffset = Math.max(offset, 0);
    const vector = { value: embedText(term), property: 'embedding' };

    const params =
      mode === 'vector'
        ? {
            mode: 'vector' as const,
            vector,
            limit: safeLimit,
            offset: safeOffset,
          }
        : mode === 'hybrid'
          ? {
              mode: 'hybrid' as const,
              term,
              vector,
              properties: SEARCH_PROPERTIES,
              limit: safeLimit,
              offset: safeOffset,
            }
          : {
              term,
              properties: SEARCH_PROPERTIES,
              limit: safeLimit,
              offset: safeOffset,
            };

    const results = await search(db, params);

    return {
      articles: (results.hits ?? []).map((h) =>
        this.toApiArticle(h.document as SearchIndexDoc, h.score),
      ),
      total: results.count ?? 0,
      mode,
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  private async rebuild() {
    await this.refresh();
    return this.db!;
  }

  /** Map a stored article into the frontend-facing article shape (with score) */
  private toApiArticle(doc: SearchIndexDoc, score: number): SearchResultItem {
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

  /** Build the searchable document for a stored article */
  private toDoc(a: Article): SearchIndexDoc {
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
}
