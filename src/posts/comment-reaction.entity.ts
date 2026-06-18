import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('comment_reactions')
export class CommentReaction {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @PrimaryColumn({ type: 'uuid', name: 'comment_id' })
  commentId!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
