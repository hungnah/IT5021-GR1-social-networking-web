import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  entityId: string | null;
  isRead: boolean;
  createdAt: Date;
  actor: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async create(
    recipientId: string,
    actorId: string,
    type: NotificationType,
    entityId: string | null = null,
  ): Promise<void> {
    if (recipientId === actorId) return;

    try {
      const row = this.notificationsRepository.create({
        recipientId,
        actorId,
        type,
        entityId,
        isRead: false,
      });
      await this.notificationsRepository.save(row);
    } catch {
      /* bảng chưa có hoặc FK lỗi — bỏ qua để không chặn luồng chính */
    }
  }

  async findForUser(recipientId: string, limit = 30): Promise<NotificationItem[]> {
    const lim = Math.min(Math.max(1, Math.floor(Number(limit)) || 30), 50);

    try {
      const rows = await this.notificationsRepository.find({
        where: { recipientId },
        relations: ['actor'],
        order: { createdAt: 'DESC' },
        take: lim,
      });

      return rows.map((n) => ({
        id: n.id,
        type: n.type,
        entityId: n.entityId,
        isRead: n.isRead,
        createdAt: n.createdAt,
        actor: {
          id: n.actor.id,
          displayName: n.actor.displayName,
          avatarUrl: n.actor.avatarUrl,
        },
      }));
    } catch {
      return [];
    }
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    try {
      return await this.notificationsRepository.count({
        where: { recipientId, isRead: false },
      });
    } catch {
      return 0;
    }
  }

  async markRead(recipientId: string, notificationId: string): Promise<void> {
    const row = await this.notificationsRepository.findOne({
      where: { id: notificationId, recipientId },
    });
    if (!row) throw new NotFoundException('Thông báo không tồn tại');
    row.isRead = true;
    await this.notificationsRepository.save(row);
  }

  async markAllRead(recipientId: string): Promise<void> {
    try {
      await this.notificationsRepository.update(
        { recipientId, isRead: false },
        { isRead: true },
      );
    } catch {
      /* ignore */
    }
  }
}
