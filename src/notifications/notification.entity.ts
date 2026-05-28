import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum NotificationType {
  FOLLOW = 'FOLLOW',
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'recipient_id' })
  recipientId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'recipient_id' })
  recipient!: User;

  @Column({ type: 'uuid', name: 'actor_id' })
  actorId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'actor_id' })
  actor!: User;

  @Column({ type: 'varchar', name: 'type', length: 50 })
  type!: NotificationType;

  @Column({ type: 'uuid', name: 'entity_id', nullable: true })
  entityId!: string | null;

  @Column({ type: 'boolean', name: 'is_read', default: false })
  isRead!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
