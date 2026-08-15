import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { Profile } from './entities/profile.entity';
import { Follow } from './entities/follow.entity';
import { Article } from './entities/article.entity';
import { Notification } from './entities/notification.entity';
import { Subscription } from './entities/subscription.entity';

dotenv.config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  url: configService.get<string>('DATABASE_URL'),
  ssl: { rejectUnauthorized: false },
  entities: [Profile, Follow, Article, Notification, Subscription],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
