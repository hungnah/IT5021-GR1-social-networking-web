import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'varchar', name: 'first_name', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', name: 'last_name', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', name: 'email', unique: true, length: 255 })
  email!: string;

  @Column({ type: 'varchar', name: 'password', length: 255, select: false })
  password!: string;

  @Column({
    type: 'varchar',
    name: 'google_id',
    nullable: true,
    unique: true,
    length: 255,
  })
  googleId!: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date;
}
