import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StringValue } from 'ms';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/user.entity';
import { Message } from './message.entity';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User]),
    NotificationsModule,
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
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway, JwtAuthGuard],
  exports: [MessagesService],
})
export class MessagesModule {}
