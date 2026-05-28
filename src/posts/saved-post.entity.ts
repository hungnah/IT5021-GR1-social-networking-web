import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('saved_posts')
export class SavedPost {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @PrimaryColumn({ type: 'uuid', name: 'post_id' })
  postId!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}

