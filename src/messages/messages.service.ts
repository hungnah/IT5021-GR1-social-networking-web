import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/user.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from './message.entity';

export interface ConversationPartner {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string;
}

export interface ConversationItem {
  partner: ConversationPartner;
  lastMessage: {
    id: string;
    content: string;
    createdAt: Date;
    isMine: boolean;
    isRead: boolean;
  };
  unreadCount: number;
}

export interface MessageItem {
  id: string;
  content: string;
  createdAt: Date;
  isMine: boolean;
  isRead: boolean;
  receiverId: string;
  sender: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getConversations(userId: string): Promise<ConversationItem[]> {
    try {
      const rows: Array<{
        partner_id: string;
        display_name: string | null;
        avatar_url: string | null;
        email: string;
        last_id: string;
        last_content: string;
        last_at: Date;
        last_sender_id: string;
        last_is_read: boolean;
        unread_count: string;
      }> = await this.messagesRepository.query(
        `
        WITH conv AS (
          SELECT
            CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS partner_id,
            id,
            content,
            created_at,
            sender_id,
            is_read
          FROM messages
          WHERE sender_id = $1 OR receiver_id = $1
        ),
        latest AS (
          SELECT DISTINCT ON (partner_id)
            partner_id, id, content, created_at, sender_id, is_read
          FROM conv
          ORDER BY partner_id, created_at DESC
        )
        SELECT
          l.partner_id,
          u.display_name,
          u.avatar_url,
          u.email,
          l.id AS last_id,
          l.content AS last_content,
          l.created_at AS last_at,
          l.sender_id AS last_sender_id,
          l.is_read AS last_is_read,
          COALESCE(
            (SELECT COUNT(*)::text FROM messages m
             WHERE m.receiver_id = $1 AND m.sender_id = l.partner_id AND m.is_read = FALSE),
            '0'
          ) AS unread_count
        FROM latest l
        JOIN users u ON u.id = l.partner_id
        ORDER BY l.created_at DESC
        LIMIT 50
        `,
        [userId],
      );

      return rows.map((r) => ({
        partner: {
          id: r.partner_id,
          displayName: r.display_name,
          avatarUrl: r.avatar_url,
          email: r.email,
        },
        lastMessage: {
          id: r.last_id,
          content: r.last_content,
          createdAt: r.last_at,
          isMine: r.last_sender_id === userId,
          isRead: r.last_is_read,
        },
        unreadCount: parseInt(r.unread_count, 10) || 0,
      }));
    } catch {
      return [];
    }
  }

  async getThread(
    userId: string,
    partnerId: string,
    limit = 50,
    before?: string,
  ): Promise<MessageItem[]> {
    if (userId === partnerId) {
      throw new BadRequestException('Không thể nhắn tin với chính mình');
    }

    const partner = await this.usersRepository.findOne({ where: { id: partnerId } });
    if (!partner) throw new NotFoundException('Người dùng không tồn tại');

    const lim = Math.min(Math.max(1, Math.floor(Number(limit)) || 50), 100);

    const qb = this.messagesRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 'sender')
      .where(
        '(m.sender_id = :userId AND m.receiver_id = :partnerId) OR (m.sender_id = :partnerId AND m.receiver_id = :userId)',
        { userId, partnerId },
      )
      .orderBy('m.createdAt', 'DESC')
      .take(lim);

    if (before) {
      qb.andWhere('m.createdAt < :before', { before: new Date(before) });
    }

    const rows = await qb.getMany();

    return rows.reverse().map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt,
      isMine: m.senderId === userId,
      isRead: m.isRead,
      receiverId: m.receiverId,
      sender: {
        id: m.sender.id,
        displayName: m.sender.displayName,
        avatarUrl: m.sender.avatarUrl,
      },
    }));
  }

  async send(userId: string, dto: CreateMessageDto): Promise<MessageItem> {
    if (userId === dto.receiverId) {
      throw new BadRequestException('Không thể nhắn tin với chính mình');
    }

    const receiver = await this.usersRepository.findOne({
      where: { id: dto.receiverId },
    });
    if (!receiver) throw new NotFoundException('Người nhận không tồn tại');

    const content = dto.content.trim();
    if (!content) throw new BadRequestException('Nội dung tin nhắn không được để trống');

    const row = this.messagesRepository.create({
      senderId: userId,
      receiverId: dto.receiverId,
      content,
      isRead: false,
    });
    const saved = await this.messagesRepository.save(row);

    const sender = await this.usersRepository.findOne({ where: { id: userId } });

    void this.notificationsService.create(
      dto.receiverId,
      userId,
      NotificationType.MESSAGE,
      saved.id,
    );

    return {
      id: saved.id,
      content: saved.content,
      createdAt: saved.createdAt,
      isMine: true,
      isRead: false,
      receiverId: dto.receiverId,
      sender: {
        id: userId,
        displayName: sender?.displayName ?? null,
        avatarUrl: sender?.avatarUrl ?? null,
      },
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.messagesRepository.count({
        where: { receiverId: userId, isRead: false },
      });
    } catch {
      return 0;
    }
  }

  async markThreadRead(userId: string, partnerId: string): Promise<void> {
    try {
      await this.messagesRepository.update(
        { receiverId: userId, senderId: partnerId, isRead: false },
        { isRead: true },
      );
    } catch {
      /* ignore */
    }
  }

  async getPartner(userId: string, partnerId: string): Promise<ConversationPartner> {
    if (userId === partnerId) {
      throw new BadRequestException('Không hợp lệ');
    }
    const user = await this.usersRepository.findOne({ where: { id: partnerId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      email: user.email,
    };
  }
}
