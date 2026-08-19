import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { Article } from '../entities/article.entity';
import { Profile } from '../entities/profile.entity';
import { Follow } from '../entities/follow.entity';
import { Comment } from '../entities/comment.entity';
import { Bookmark } from '../entities/bookmark.entity';
import { Clap } from '../entities/clap.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Article,
      Profile,
      Follow,
      Comment,
      Bookmark,
      Clap,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
    NotificationsModule,
    SearchModule,
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
