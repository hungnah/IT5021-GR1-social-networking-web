import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum PrivacyLevel {
  PUBLIC = 'Public',
  FOLLOWERS_ONLY = 'Followers only',
  PRIVATE = 'Private',
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'text', name: 'content', nullable: true })
  content!: string | null;

  @Column({
    type: 'enum',
    enum: PrivacyLevel,
    name: 'privacy_status',
    default: PrivacyLevel.PUBLIC,
  })
  privacyStatus!: PrivacyLevel;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
