import { Module, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthModule } from './auth/auth.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PostsModule } from './posts/posts.module';
import { SearchModule } from './search/search.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<string>('DB_PORT', '5432')),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_DATABASE', 'feedme'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    UsersModule,
    AuthModule,
    PostsModule,
    NotificationsModule,
    MessagesModule,
    SearchModule,
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger('AppModule');
  private readonly moduleRef: ModuleRef;
  private dataSource!: DataSource;

  constructor(moduleRef: ModuleRef) {
    this.moduleRef = moduleRef;
  }

  async onModuleInit() {
    this.dataSource = this.moduleRef.get(DataSource, { strict: false });
    // Tự động thêm các cột mới nếu chưa tồn tại trong DB
    const migrations = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(50)`,
      // Refresh token: lưu HASH (bcrypt) + thời điểm hết hạn (30 ngày)
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMPTZ`,
      `ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(500)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username)) WHERE username IS NOT NULL`,
      `CREATE TABLE IF NOT EXISTS follows (
        follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (follower_id, following_id)
      )`,
      `CREATE TABLE IF NOT EXISTS reactions (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, post_id)
      )`,
      `CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS comment_reactions (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, comment_id)
      )`,
      `CREATE TABLE IF NOT EXISTS saved_posts (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, post_id)
      )`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        entity_id UUID,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE`,
      `CREATE INDEX IF NOT EXISTS idx_messages_participants ON messages(sender_id, receiver_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON messages(receiver_id, is_read)`,
      `CREATE TABLE IF NOT EXISTS post_tags (
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tagged_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (post_id, user_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_post_tags_user ON post_tags(user_id, created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS post_images (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        image_url VARCHAR(500) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_post_images_post ON post_images(post_id, created_at ASC)`,
      `INSERT INTO post_images (post_id, image_url)
       SELECT p.id, p.image_url FROM posts p
       WHERE p.image_url IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM post_images pi WHERE pi.post_id = p.id)`,
      `CREATE TABLE IF NOT EXISTS reposts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, post_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_reposts_post ON reposts(post_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_reposts_user ON reposts(user_id, created_at DESC)`,
    ];

    for (const sql of migrations) {
      try {
        await this.dataSource.query(sql);
      } catch (err) {
        this.logger.warn(`Migration skipped: ${(err as Error).message}`);
      }
    }
    this.logger.log('DB columns verified/migrated');
  }
}
