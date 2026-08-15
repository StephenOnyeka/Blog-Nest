import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../entities/article.entity';
import { Profile } from '../entities/profile.entity';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
  ) {}

  private mapToFrontendArticle(article: Article) {
    return {
      id: article.public_id,
      title: article.title,
      subtitle: article.subtitle ?? '',
      body: article.body,
      thumbnail: article.thumbnail ?? '',
      tags: article.tags,
      readTime: article.read_time,
      isMemberOnly: article.is_member_only,
      isDraft: article.is_draft,
      publishedAt: article.published_at ? article.published_at.toISOString() : null,
      claps: article.claps,
      comments: article.comments_count,
      author: {
        id: article.author.public_id,
        name: article.author.name,
        username: article.author.username,
        avatar: article.author.avatar ?? '',
        bio: article.author.bio ?? '',
        followers: article.author.followers_count,
        following: article.author.following_count,
      },
    };
  }

  async findAll(tag?: string, authorPublicId?: string) {
    const query = this.articleRepo.createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .where('article.is_draft = :isDraft', { isDraft: false })
      .orderBy('article.created_at', 'DESC');

    if (tag) {
      query.andWhere(':tag = ANY(article.tags)', { tag });
    }

    if (authorPublicId) {
      query.andWhere('author.public_id = :authorPublicId', { authorPublicId });
    }

    const articles = await query.getMany();
    return articles.map(a => this.mapToFrontendArticle(a));
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
    const article = await this.articleRepo.findOne({ where: { public_id: publicId } });
    if (!article) throw new NotFoundException('Article not found');

    await this.articleRepo.increment({ id: article.id }, 'claps', 1);
    return { success: true, claps: article.claps + 1 };
  }
}
