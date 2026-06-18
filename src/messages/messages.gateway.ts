import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/jwt-auth.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageItem, MessagesService } from './messages.service';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    email: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://it-5021-gr-1-social-networking-web.vercel.app',
      ...(process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',')
            .map((o) => o.trim())
            .filter(Boolean)
        : []),
    ],
    credentials: true,
  },
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly messagesService: MessagesService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data = { userId: payload.sub, email: payload.email };
      await client.join(this.userRoom(payload.sub));
      this.logger.debug(`Client connected: user=${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    if (client.data?.userId) {
      this.logger.debug(`Client disconnected: user=${client.data.userId}`);
    }
  }

  @SubscribeMessage('message:send')
  async onSend(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: CreateMessageDto,
  ): Promise<MessageItem> {
    const senderId = client.data.userId;
    const saved = await this.messagesService.send(senderId, body);

    const forSender = this.toClientView(saved, senderId);
    const forReceiver = this.toClientView(saved, body.receiverId);

    this.server
      .to(this.userRoom(body.receiverId))
      .emit('message:new', forReceiver);

    return forSender;
  }

  @SubscribeMessage('message:read')
  async onRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { partnerId: string },
  ): Promise<{ ok: true }> {
    const userId = client.data.userId;
    await this.messagesService.markThreadRead(userId, body.partnerId);

    this.server.to(this.userRoom(body.partnerId)).emit('message:read', {
      readerId: userId,
      partnerId: body.partnerId,
    });

    return { ok: true };
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token) return auth.token;

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string') {
      const [type, token] = header.split(' ');
      if (type === 'Bearer' && token) return token;
    }

    return undefined;
  }

  private toClientView(msg: MessageItem, viewerId: string): MessageItem {
    return {
      ...msg,
      isMine: msg.sender.id === viewerId,
    };
  }
}
