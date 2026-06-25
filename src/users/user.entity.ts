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

  @Column({ type: 'varchar', name: 'display_name', length: 100, nullable: true })
  displayName!: string | null;

  @Column({ type: 'varchar', name: 'username', length: 30, nullable: true, unique: true })
  username!: string | null;

  @Column({ type: 'varchar', name: 'email', unique: true, length: 255 })
  email!: string;

  @Column({ type: 'varchar', name: 'password_hash', length: 255, select: false })
  password!: string;

  @Column({ type: 'varchar', name: 'google_id', nullable: true, unique: true, length: 255 })
  googleId!: string | null;

  @Column({ type: 'text', name: 'bio', nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', name: 'avatar_url', length: 255, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', name: 'cover_url', length: 255, nullable: true })
  coverUrl!: string | null;

  @Column({ type: 'varchar', name: 'gender', length: 50, nullable: true })
  gender!: string | null;

  @Column({ type: 'varchar', name: 'location', length: 255, nullable: true })
  location!: string | null;

  @Column({ type: 'varchar', name: 'website', length: 500, nullable: true })
  website!: string | null;

  // Lưu HASH (bcrypt) của refresh token, không lưu plain text.
  // select: false → các query mặc định sẽ không trả về cột này.
  @Column({
    type: 'varchar',
    name: 'refresh_token',
    length: 255,
    nullable: true,
    select: false,
  })
  refreshToken!: string | null;

  // Thời điểm refresh token hết hạn (mặc định 30 ngày kể từ lúc cấp).
  @Column({
    type: 'timestamptz',
    name: 'refresh_token_expires_at',
    nullable: true,
    select: false,
  })
  refreshTokenExpiresAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
