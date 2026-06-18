import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StringValue } from 'ms';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { Comment } from './comment.entity';
import { CommentReaction } from './comment-reaction.entity';
import { Post } from './post.entity';
import { PostTag } from './post-tag.entity';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { Reaction } from './reaction.entity';
import { SavedPost } from './saved-post.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, Comment, CommentReaction, Reaction, SavedPost, PostTag]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        secret: cs.get<string>('JWT_SECRET', 'feedme-dev-secret'),
        signOptions: {
          expiresIn: cs.get<string>('JWT_EXPIRES_IN', '7d') as StringValue,
        },
      }),
    }),
    NotificationsModule,
  ],
  controllers: [PostsController],
  providers: [PostsService, JwtAuthGuard],
  exports: [PostsService],
})
export class PostsModule {}
