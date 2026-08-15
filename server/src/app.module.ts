import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ArticlesModule } from './articles/articles.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { Profile } from './entities/profile.entity';
import { Follow } from './entities/follow.entity';
import { Article } from './entities/article.entity';
import { Notification } from './entities/notification.entity';
import { Subscription } from './entities/subscription.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        ssl: { rejectUnauthorized: false },
        entities: [Profile, Follow, Article, Notification, Subscription],
        migrations: ['dist/migrations/*.js'],
        synchronize: false,
      }),
    }),
    AuthModule,
    UsersModule,
    ArticlesModule,
    NotificationsModule,
    SubscriptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    try {
      if (this.dataSource.isInitialized) {
        console.log('✅ Successfully connected to the database');
      } else {
        await this.dataSource.initialize();
        console.log('✅ Successfully connected to the database');
      }
    } catch (error: any) {
      console.error('❌ Failed to connect to the database:', error?.message ?? error);
    }
  }
}

