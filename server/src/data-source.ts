import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { Profile } from './entities/profile.entity';
import { Follow } from './entities/follow.entity';

dotenv.config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  url: configService.get<string>('DATABASE_URL'),
  ssl: { rejectUnauthorized: false },
  entities: [Profile, Follow],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
