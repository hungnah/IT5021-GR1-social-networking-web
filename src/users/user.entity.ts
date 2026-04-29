import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'varchar', name: 'display_name', length: 255, nullable: true })
  displayName!: string | null;

  @Column({ type: 'varchar', name: 'email', unique: true, length: 255 })
  email!: string;

  @Column({ type: 'varchar', name: 'password_hash', length: 255, select: false })
  password!: string;

  @Column({
    type: 'varchar',
    name: 'google_id',
    nullable: true,
    unique: true,
    length: 255,
  })
  googleId!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
