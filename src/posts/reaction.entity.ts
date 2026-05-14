import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('reactions')
export class Reaction {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @PrimaryColumn({ type: 'uuid', name: 'post_id' })
  postId!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
