import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../entities/article.entity';
import { Profile } from '../entities/profile.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    private readonly notificationsService: NotificationsService,
  ) {}

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
      published_at: article.published_at ? article.published_at.toISOString() : null,
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
    const query = this.articleRepo.createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .where('article.is_draft = :isDraft', { isDraft: false })
      .orderBy('article.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (tag) {
      query.andWhere(':tag = ANY(article.tags)', { tag });
    }

    if (authorPublicId) {
      query.andWhere('author.public_id = :authorPublicId', { authorPublicId });
    }

    const [articles, total] = await query.getManyAndCount();
    return {
      articles: articles.map(a => this.mapToFrontendArticle(a)),
      total,
      page,
      limit,
    };
  }

  async findOne(publicId: string) {
    const article = await this.articleRepo.findOne({
      where: { public_id: publicId },
      relations: { author: true },
    });

    if (!article) throw new NotFoundException('Article not found');
    return this.mapToFrontendArticle(article);
  }

  async create(authorPublicId: string, data: any) {
    const author = await this.profileRepo.findOne({ where: { public_id: authorPublicId } });
    if (!author) throw new NotFoundException('Author not found');

    const article = this.articleRepo.create({
      ...data,
      author_id: author.id,
      is_draft: data.isDraft ?? true,
      published_at: data.isDraft ? null : new Date(),
    });

    const savedArticle = (await this.articleRepo.save(article)) as any;
    // Reload with author relation
    return this.findOne(savedArticle.public_id);
  }

  async update(publicId: string, authorPublicId: string, data: any) {
    const article = await this.articleRepo.findOne({
      where: { public_id: publicId },
      relations: { author: true },
    });

    if (!article) throw new NotFoundException('Article not found');
    if (article.author.public_id !== authorPublicId) {
      throw new UnauthorizedException('You can only edit your own articles');
    }

    // Support draft toggle logic
    if (data.isDraft === false && article.is_draft === true) {
      article.published_at = new Date();
    } else if (data.isDraft === true) {
      article.published_at = null as any;
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
    return this.mapToFrontendArticle(article);
  }

  async remove(publicId: string, authorPublicId: string) {
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
}
