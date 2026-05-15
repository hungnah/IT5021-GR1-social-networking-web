import { Module, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
