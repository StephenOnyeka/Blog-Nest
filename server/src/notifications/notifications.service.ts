import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { Profile } from '../entities/profile.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
  ) {}

  private toPublic(n: Notification) {
    return {
      id: n.public_id,
      type: n.type,
      message: n.message,
      is_read: n.is_read,
      article_id: n.article?.public_id ?? null,
      created_at: n.created_at,
      ...(n.article ? {
        article: {
          id: n.article.public_id,
          title: n.article.title,
        }
      } : {}),
    };
  }

  async getForUser(userPublicId: string) {
    const profile = await this.profileRepo.findOne({ where: { public_id: userPublicId } });
    if (!profile) throw new NotFoundException('User not found');

    const notifications = await this.notificationRepo.find({
      where: { user_id: profile.id },
      relations: { article: true },
      order: { created_at: 'DESC' },
    });

    return notifications.map(n => this.toPublic(n));
  }

  async getUnreadCount(userPublicId: string) {
    const profile = await this.profileRepo.findOne({ where: { public_id: userPublicId } });
    if (!profile) throw new NotFoundException('User not found');

    const count = await this.notificationRepo.count({
      where: { user_id: profile.id, is_read: false },
    });

    return { count };
  }

  async markAllRead(userPublicId: string) {
    const profile = await this.profileRepo.findOne({ where: { public_id: userPublicId } });
    if (!profile) throw new NotFoundException('User not found');

    await this.notificationRepo.update({ user_id: profile.id, is_read: false }, { is_read: true });
    return { success: true };
  }

  async markOneRead(notificationPublicId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { public_id: notificationPublicId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    notification.is_read = true;
    await this.notificationRepo.save(notification);
    return { success: true };
  }

  // Utility: create a notification (called by other services)
  async create(userId: number, type: string, message: string, articleId?: number) {
    const notification = this.notificationRepo.create({
      user_id: userId,
      type,
      message,
      article_id: articleId ?? null,
    });
    await this.notificationRepo.save(notification);
  }
}
