import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { Profile } from '../entities/profile.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  private toPublic(n: Notification) {
    return {
      id: n.public_id,
      type: n.type,
      message: n.message,
      is_read: n.is_read,
      read_at: n.read_at,
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

  /** Automatically purge read notifications older than 30 days from the database */
  async cleanupOldReadNotifications() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await this.notificationRepo
        .createQueryBuilder()
        .delete()
        .from(Notification)
        .where('is_read = true AND (read_at < :thirtyDaysAgo OR (read_at IS NULL AND created_at < :thirtyDaysAgo))', {
          thirtyDaysAgo,
        })
        .execute();
    } catch (err) {
      console.error('Failed to cleanup 30-day old read notifications:', err);
    }
  }

  async getForUser(userPublicId: string) {
    const profile = await this.profileRepo.findOne({ where: { public_id: userPublicId } });
    if (!profile) throw new NotFoundException('User not found');

    // Automatically trigger cleanup of read notifications older than 30 days
    await this.cleanupOldReadNotifications();

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

    const now = new Date();
    await this.notificationRepo.update(
      { user_id: profile.id, is_read: false },
      { is_read: true, read_at: now },
    );
    return { success: true };
  }

  async markOneRead(notificationPublicId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { public_id: notificationPublicId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    notification.is_read = true;
    notification.read_at = new Date();
    await this.notificationRepo.save(notification);
    return { success: true };
  }

  async deleteNotification(userPublicId: string, notificationPublicId: string) {
    const profile = await this.profileRepo.findOne({ where: { public_id: userPublicId } });
    if (!profile) throw new NotFoundException('User not found');

    const notification = await this.notificationRepo.findOne({
      where: { public_id: notificationPublicId, user_id: profile.id },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    await this.notificationRepo.remove(notification);
    return { success: true };
  }

  // Utility: create a notification and emit via WebSockets in real time
  async create(userId: number, type: string, message: string, articleId?: number) {
    const notification = this.notificationRepo.create({
      user_id: userId,
      type,
      message,
      article_id: articleId ?? null,
    });
    const saved = await this.notificationRepo.save(notification);

    const profile = await this.profileRepo.findOne({ where: { id: userId } });
    if (profile) {
      this.notificationsGateway.emitNotification(profile.public_id, this.toPublic(saved));
    }
  }
}
