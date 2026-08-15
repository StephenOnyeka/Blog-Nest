import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from '../entities/profile.entity';
import { Follow } from '../entities/follow.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private toPublicUser(profile: Profile) {
    return {
      id: profile.public_id,
      name: profile.name,
      username: profile.username,
      email: profile.email,
      avatar: profile.avatar ?? null,
      bio: profile.bio ?? null,
      followersCount: profile.followers_count,
      followingCount: profile.following_count,
      created_at: profile.created_at,
    };
  }

  async getProfile(publicId: string) {
    const profile = await this.profileRepo.findOne({ where: { public_id: publicId } });
    if (!profile) throw new NotFoundException(`Profile not found`);
    return this.toPublicUser(profile);
  }

  async updateProfile(publicId: string, updates: { name?: string; username?: string; avatar?: string; bio?: string }) {
    const profile = await this.profileRepo.findOne({ where: { public_id: publicId } });
    if (!profile) throw new NotFoundException(`Profile not found`);

    Object.assign(profile, updates);
    await this.profileRepo.save(profile);
    return this.toPublicUser(profile);
  }

  async follow(followerPublicId: string, followingPublicId: string) {
    const follower = await this.profileRepo.findOne({ where: { public_id: followerPublicId } });
    const following = await this.profileRepo.findOne({ where: { public_id: followingPublicId } });

    if (!follower || !following) throw new NotFoundException('User not found');

    const existing = await this.followRepo.findOne({
      where: { follower_id: follower.id, following_id: following.id },
    });
    if (existing) throw new ConflictException('Already following this user');

    const follow = this.followRepo.create({ follower_id: follower.id, following_id: following.id });
    await this.followRepo.save(follow);

    // Update counts atomically using query builder
    await this.profileRepo.increment({ id: follower.id }, 'following_count', 1);
    await this.profileRepo.increment({ id: following.id }, 'followers_count', 1);

    // Send real-time notification via WebSockets
    await this.notificationsService.create(
      following.id,
      'follow',
      `${follower.name} (@${follower.username}) started following you.`,
    );

    return { message: 'Followed successfully' };
  }

  async unfollow(followerPublicId: string, followingPublicId: string) {
    const follower = await this.profileRepo.findOne({ where: { public_id: followerPublicId } });
    const following = await this.profileRepo.findOne({ where: { public_id: followingPublicId } });

    if (!follower || !following) throw new NotFoundException('User not found');

    const follow = await this.followRepo.findOne({
      where: { follower_id: follower.id, following_id: following.id },
    });
    if (!follow) throw new NotFoundException('Not following this user');

    await this.followRepo.remove(follow);

    await this.profileRepo.decrement({ id: follower.id }, 'following_count', 1);
    await this.profileRepo.decrement({ id: following.id }, 'followers_count', 1);

    return { message: 'Unfollowed successfully' };
  }
}
