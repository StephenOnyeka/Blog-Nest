import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { Article } from '../entities/article.entity';
import { Profile } from '../entities/profile.entity';
import { Follow } from '../entities/follow.entity';
import { Comment } from '../entities/comment.entity';
import { Bookmark } from '../entities/bookmark.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Profile, Follow, Comment, Bookmark]),
    NotificationsModule,
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
