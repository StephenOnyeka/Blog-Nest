import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Profile } from '../entities/profile.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    private readonly jwtService: JwtService,
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

  async register(
    name: string,
    username: string,
    email: string,
    password: string,
  ) {
    const existing = await this.profileRepo.findOne({
      where: [{ email }, { username }],
    });
    if (existing) {
      throw new ConflictException('Email or username is already taken');
    }

    const hashed = await bcrypt.hash(password, 10);
    const profile = this.profileRepo.create({
      name,
      username,
      email,
      password: hashed,
    });
    await this.profileRepo.save(profile);

    const token = this.jwtService.sign({
      sub: profile.public_id,
      email: profile.email,
    });
    return { token, user: this.toPublicUser(profile) };
  }

  async login(email: string, password: string) {
    const profile = await this.profileRepo.findOne({ where: { email } });
    if (!profile) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(password, profile.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    const token = this.jwtService.sign({
      sub: profile.public_id,
      email: profile.email,
    });
    return { token, user: this.toPublicUser(profile) };
  }

  async getMe(publicId: string) {
    const profile = await this.profileRepo.findOne({
      where: { public_id: publicId },
    });
    if (!profile) throw new UnauthorizedException('User not found');
    return { user: this.toPublicUser(profile) };
  }
}
