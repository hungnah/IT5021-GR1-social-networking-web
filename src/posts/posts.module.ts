import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StringValue } from 'ms';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { Post } from './post.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        secret: cs.get<string>('JWT_SECRET', 'feedme-dev-secret'),
        signOptions: {
          expiresIn: cs.get<string>('JWT_EXPIRES_IN', '7d') as StringValue,
        },
      }),
    }),
  ],
  controllers: [PostsController],
  providers: [PostsService, JwtAuthGuard],
  exports: [PostsService],
})
export class PostsModule {}
