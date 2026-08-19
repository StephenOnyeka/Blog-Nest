import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from '../entities/profile.entity';
import { Follow } from '../entities/follow.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { SearchService } from '../search/search.service';

const isUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
    private readonly notificationsService: NotificationsService,
    private readonly searchService: SearchService,
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

  private toPublicMini(profile: Profile) {
    return {
      id: profile.public_id,
      name: profile.name,
      username: profile.username,
      avatar: profile.avatar ?? null,
    };
  }

  private async findProfileByIdentifier(identifier: string) {
    const where = isUuid(identifier)
      ? [{ public_id: identifier }, { username: identifier }]
      : { username: identifier };
    return this.profileRepo.findOne({ where });
  }

  async getProfile(identifier: string) {
    const profile = await this.findProfileByIdentifier(identifier);
    if (!profile) throw new NotFoundException(`Profile not found`);
    return this.toPublicUser(profile);
  }

  async getFollowing(identifier: string) {
    const profile = await this.findProfileByIdentifier(identifier);
    if (!profile) throw new NotFoundException('User not found');

    const follows = await this.followRepo.find({
      where: { follower_id: profile.id },
      relations: { following: true },
      order: { created_at: 'DESC' },
    });

    return follows
      .filter((f) => !!f.following)
      .map((f) => this.toPublicMini(f.following));
  }

  async updateProfile(
    identifier: string,
    updates: {
      name?: string;
      username?: string;
      avatar?: string;
      bio?: string;
    },
  ) {
    const profile = await this.findProfileByIdentifier(identifier);
    if (!profile) throw new NotFoundException(`Profile not found`);

    Object.assign(profile, updates);
    await this.profileRepo.save(profile);
    // Keep the search index in sync
    await this.searchService.upsertProfile(profile.public_id);
    return this.toPublicUser(profile);
  }

  async follow(followerPublicId: string, followingPublicId: string) {
    const follower = await this.findProfileByIdentifier(followerPublicId);
    const following = await this.findProfileByIdentifier(followingPublicId);

    if (!follower || !following) throw new NotFoundException('User not found');

    const existing = await this.followRepo.findOne({
      where: { follower_id: follower.id, following_id: following.id },
    });
    if (existing) throw new ConflictException('Already following this user');

    const follow = this.followRepo.create({
      follower_id: follower.id,
      following_id: following.id,
    });
    await this.followRepo.save(follow);

    // Update counts atomically using query builder
    await this.profileRepo.increment({ id: follower.id }, 'following_count', 1);
    await this.profileRepo.increment(
      { id: following.id },
      'followers_count',
      1,
    );

    // Send real-time notification via WebSockets
    await this.notificationsService.create(
      following.id,
      'follow',
      `${follower.name} (@${follower.username}) started following you.`,
    );

    // Keep follower counts in the search index fresh
    await this.searchService.upsertProfile(follower.public_id);
    await this.searchService.upsertProfile(following.public_id);

    return { message: 'Followed successfully' };
  }

  async unfollow(followerPublicId: string, followingPublicId: string) {
    const follower = await this.findProfileByIdentifier(followerPublicId);
    const following = await this.findProfileByIdentifier(followingPublicId);

    if (!follower || !following) throw new NotFoundException('User not found');

    const follow = await this.followRepo.findOne({
      where: { follower_id: follower.id, following_id: following.id },
    });
    if (!follow) throw new NotFoundException('Not following this user');

    await this.followRepo.remove(follow);

    await this.profileRepo.decrement({ id: follower.id }, 'following_count', 1);
    await this.profileRepo.decrement(
      { id: following.id },
      'followers_count',
      1,
    );

    // Keep follower counts in the search index fresh
    await this.searchService.upsertProfile(follower.public_id);
    await this.searchService.upsertProfile(following.public_id);

    return { message: 'Unfollowed successfully' };
  }
}
