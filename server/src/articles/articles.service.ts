import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../entities/article.entity';
import { Profile } from '../entities/profile.entity';
import { Follow } from '../entities/follow.entity';
import { Comment } from '../entities/comment.entity';
import { Bookmark } from '../entities/bookmark.entity';
import { NotificationsService } from '../notifications/notifications.service';

/** Strict UUID v4 regex */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value: string, label = 'id') {
  if (!UUID_RE.test(value)) {
    throw new NotFoundException(`${label} is not valid`);
  }
}

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(Bookmark)
    private readonly bookmarkRepo: Repository<Bookmark>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private toPublicComment(comment: Comment) {
    return {
      id: comment.public_id,
      body: comment.body,
      created_at: comment.created_at,
      parent_id: comment.parent_id ?? null,
      author: {
        id: comment.author?.public_id ?? null,
        name: comment.author?.name ?? null,
        username: comment.author?.username ?? null,
        avatar: comment.author?.avatar ?? null,
      },
    };
  }

  /** Fan-out: notify all followers of authorId that a new article was published */
  private async notifyFollowers(
    authorId: number,
    articleId: number,
    articleTitle: string,
    authorName: string,
  ) {
    const follows = await this.followRepo.find({
      where: { following_id: authorId },
    });
    await Promise.all(
      follows.map((f) =>
        this.notificationsService.create(
          f.follower_id,
          'article_published',
          `${authorName} published a new story: "${articleTitle}".`,
          articleId,
        ),
      ),
    );
  }

  private mapToFrontendArticle(article: Article) {
    return {
      id: article.public_id,
      title: article.title,
      subtitle: article.subtitle ?? null,
      body: article.body,
      thumbnail: article.thumbnail ?? null,
      tags: article.tags,
      read_time: article.read_time,
      is_member_only: article.is_member_only,
      is_draft: article.is_draft,
      published_at: article.published_at
        ? article.published_at.toISOString()
        : null,
      author_id: article.author?.public_id ?? null,
      claps: article.claps,
      comments: article.comments_count,
      created_at: article.created_at,
      updated_at: article.updated_at,
      author: {
        id: article.author?.public_id,
        name: article.author?.name,
        username: article.author?.username,
        avatar: article.author?.avatar ?? null,
      },
    };
  }

  async findAll(tag?: string, authorPublicId?: string, page = 1, limit = 10) {
    const query = this.articleRepo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .where('article.is_draft = :isDraft', { isDraft: false })
      .orderBy('article.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (tag) {
      query.andWhere(':tag = ANY(article.tags)', { tag });
    }

    if (authorPublicId) {
      assertUuid(authorPublicId, 'Author');
      query.andWhere('author.public_id = :authorPublicId', { authorPublicId });
    }

    const [articles, total] = await query.getManyAndCount();
    return {
      articles: articles.map((a) => this.mapToFrontendArticle(a)),
      total,
      page,
      limit,
    };
  }

  async findOne(publicId: string) {
    assertUuid(publicId, 'Article');
    const article = await this.articleRepo.findOne({
      where: { public_id: publicId },
      relations: { author: true },
    });

    if (!article) throw new NotFoundException('Article not found');
    return this.mapToFrontendArticle(article);
  }

  async create(authorPublicId: string, data: any) {
    const author = await this.profileRepo.findOne({
      where: { public_id: authorPublicId },
    });
    if (!author) throw new NotFoundException('Author not found');

    const isDraft = data.isDraft ?? true;
    const article = this.articleRepo.create({
      ...data,
      author_id: author.id,
      is_draft: isDraft,
      published_at: isDraft ? null : new Date(),
    });

    const savedArticle = (await this.articleRepo.save(article)) as any;

    // If published immediately, fan-out notifications to followers
    if (!isDraft) {
      await this.notifyFollowers(
        author.id,
        savedArticle.id,
        savedArticle.title,
        author.name,
      );
    }

    // Reload with author relation
    return this.findOne(savedArticle.public_id);
  }

  async update(publicId: string, authorPublicId: string, data: any) {
    assertUuid(publicId, 'Article');
    assertUuid(authorPublicId, 'User');
    const article = await this.articleRepo.findOne({
      where: { public_id: publicId },
      relations: { author: true },
    });

    if (!article) throw new NotFoundException('Article not found');
    if (article.author.public_id !== authorPublicId) {
      throw new UnauthorizedException('You can only edit your own articles');
    }

    // Detect draft → published transition
    const beingPublished = data.isDraft === false && article.is_draft === true;

    // Support draft toggle logic
    if (beingPublished) {
      article.published_at = new Date();
    } else if (data.isDraft === true) {
      article.published_at = null;
    }

    Object.assign(article, {
      title: data.title,
      subtitle: data.subtitle,
      body: data.body,
      thumbnail: data.thumbnail,
      tags: data.tags,
      read_time: data.readTime,
      is_member_only: data.isMemberOnly,
      is_draft: data.isDraft,
    });

    await this.articleRepo.save(article);

    // Fan-out notifications when an article transitions from draft → published
    if (beingPublished) {
      await this.notifyFollowers(
        article.author.id,
        article.id,
        article.title,
        article.author.name,
      );
    }

    return this.mapToFrontendArticle(article);
  }

  async remove(publicId: string, authorPublicId: string) {
    assertUuid(publicId, 'Article');
    assertUuid(authorPublicId, 'User');
    const article = await this.articleRepo.findOne({
      where: { public_id: publicId },
      relations: { author: true },
    });

    if (!article) throw new NotFoundException('Article not found');
    if (article.author.public_id !== authorPublicId) {
      throw new UnauthorizedException('You can only delete your own articles');
    }

    await this.articleRepo.remove(article);
    return { success: true };
  }

  async clap(publicId: string) {
    assertUuid(publicId, 'Article');
    const article = await this.articleRepo.findOne({
      where: { public_id: publicId },
      relations: { author: true },
    });
    if (!article) throw new NotFoundException('Article not found');

    await this.articleRepo.increment({ id: article.id }, 'claps', 1);

    if (article.author) {
      await this.notificationsService.create(
        article.author.id,
        'clap',
        `Someone clapped for your article "${article.title}".`,
        article.id,
      );
    }

    return { success: true, claps: article.claps + 1 };
  }

  // ─── Comments ────────────────────────────────────────────────────────────────

  /** List all comments for an article (oldest first) with author mini-profiles */
  async getComments(publicId: string) {
    assertUuid(publicId, 'Article');
    const article = await this.articleRepo.findOne({
      where: { public_id: publicId },
    });
    if (!article) throw new NotFoundException('Article not found');

    const comments = await this.commentRepo.find({
      where: { article_id: article.id },
      relations: { author: true },
      order: { created_at: 'ASC' },
    });

    return comments.map((c) => this.toPublicComment(c));
  }

  /** Add a comment or reply to an article (auth required) */
  async addComment(
    articlePublicId: string,
    authorPublicId: string,
    body: string,
    parentId?: string,
  ) {
    assertUuid(articlePublicId, 'Article');
    assertUuid(authorPublicId, 'User');
    const article = await this.articleRepo.findOne({
      where: { public_id: articlePublicId },
      relations: { author: true },
    });
    if (!article) throw new NotFoundException('Article not found');

    const author = await this.profileRepo.findOne({
      where: { public_id: authorPublicId },
    });
    if (!author) throw new NotFoundException('User not found');

    // Resolve the parent comment (if any) — must belong to the same article
    let parentComment: Comment | null = null;
    if (parentId) {
      assertUuid(parentId, 'Parent comment');
      parentComment = await this.commentRepo.findOne({
        where: { public_id: parentId, article_id: article.id },
      });
      if (!parentComment)
        throw new NotFoundException('Parent comment not found');
    }

    const comment = this.commentRepo.create({
      article_id: article.id,
      author_id: author.id,
      body,
      parent_id: parentComment ? parentComment.id : null,
    });
    const saved = await this.commentRepo.save(comment);

    // Keep the denormalized count in sync
    await this.articleRepo.increment({ id: article.id }, 'comments_count', 1);

    // Notify the article author (skip self-comments)
    if (article.author && article.author.id !== author.id) {
      await this.notificationsService.create(
        article.author.id,
        'comment',
        `${author.name} commented on your article "${article.title}".`,
        article.id,
      );
    }

    // Notify the parent comment author on replies (skip self + article author)
    if (parentComment && parentComment.author_id !== author.id) {
      const parentAuthor = await this.profileRepo.findOne({
        where: { id: parentComment.author_id },
      });
      if (parentAuthor && parentAuthor.id !== article.author?.id) {
        await this.notificationsService.create(
          parentAuthor.id,
          'reply',
          `${author.name} replied to your comment on "${article.title}".`,
          article.id,
        );
      }
    }

    const full = await this.commentRepo.findOne({
      where: { id: saved.id },
      relations: { author: true },
    });
    return this.toPublicComment(full!);
  }

  /** Delete a comment (only its author or the article author) */
  async deleteComment(
    articlePublicId: string,
    commentPublicId: string,
    userPublicId: string,
  ) {
    assertUuid(articlePublicId, 'Article');
    assertUuid(commentPublicId, 'Comment');
    assertUuid(userPublicId, 'User');
    const article = await this.articleRepo.findOne({
      where: { public_id: articlePublicId },
      relations: { author: true },
    });
    if (!article) throw new NotFoundException('Article not found');

    const comment = await this.commentRepo.findOne({
      where: { public_id: commentPublicId, article_id: article.id },
      relations: { author: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const isCommentAuthor = comment.author?.public_id === userPublicId;
    const isArticleAuthor = article.author?.public_id === userPublicId;
    if (!isCommentAuthor && !isArticleAuthor) {
      throw new UnauthorizedException('You can only delete your own comments');
    }

    // Cascade removes replies, so re-sync the count from what's actually left
    await this.commentRepo.remove(comment);
    const remaining = await this.commentRepo.count({
      where: { article_id: article.id },
    });
    await this.articleRepo.update(
      { id: article.id },
      { comments_count: remaining },
    );
    return { success: true };
  }

  // ─── Bookmarks ───────────────────────────────────────────────────────────────

  /** Check whether a user has bookmarked an article */
  async getBookmarkStatus(articlePublicId: string, userPublicId: string) {
    assertUuid(articlePublicId, 'Article');
    assertUuid(userPublicId, 'User');
    const article = await this.articleRepo.findOne({
      where: { public_id: articlePublicId },
    });
    if (!article) throw new NotFoundException('Article not found');

    const user = await this.profileRepo.findOne({
      where: { public_id: userPublicId },
    });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.bookmarkRepo.findOne({
      where: { user_id: user.id, article_id: article.id },
    });

    return { bookmarked: !!existing };
  }

  /** Bookmark an article (auth required, idempotent) */
  async bookmark(articlePublicId: string, userPublicId: string) {
    assertUuid(articlePublicId, 'Article');
    assertUuid(userPublicId, 'User');
    const article = await this.articleRepo.findOne({
      where: { public_id: articlePublicId },
    });
    if (!article) throw new NotFoundException('Article not found');

    const user = await this.profileRepo.findOne({
      where: { public_id: userPublicId },
    });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.bookmarkRepo.findOne({
      where: { user_id: user.id, article_id: article.id },
    });
    if (!existing) {
      await this.bookmarkRepo.save(
        this.bookmarkRepo.create({ user_id: user.id, article_id: article.id }),
      );
    }
    return { bookmarked: true };
  }

  /** Remove a bookmark (auth required, idempotent) */
  async unbookmark(articlePublicId: string, userPublicId: string) {
    assertUuid(articlePublicId, 'Article');
    assertUuid(userPublicId, 'User');
    const article = await this.articleRepo.findOne({
      where: { public_id: articlePublicId },
    });
    if (!article) throw new NotFoundException('Article not found');

    const user = await this.profileRepo.findOne({
      where: { public_id: userPublicId },
    });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.bookmarkRepo.findOne({
      where: { user_id: user.id, article_id: article.id },
    });
    if (existing) {
      await this.bookmarkRepo.remove(existing);
    }
    return { bookmarked: false };
  }

  /** List articles bookmarked by a user (newest bookmark first) */
  async getBookmarkedArticles(userPublicId: string) {
    const user = await this.profileRepo.findOne({
      where: { public_id: userPublicId },
    });
    if (!user) throw new NotFoundException('User not found');

    const bookmarks = await this.bookmarkRepo.find({
      where: { user_id: user.id },
      relations: { article: { author: true } },
      order: { created_at: 'DESC' },
    });

    return bookmarks
      .filter((b) => !!b.article && !b.article.is_draft)
      .map((b) => this.mapToFrontendArticle(b.article));
  }
}
