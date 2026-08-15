import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Profile } from '../entities/profile.entity';
import { Article } from '../entities/article.entity';
import { Notification } from '../entities/notification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Profile, Article, Notification])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
