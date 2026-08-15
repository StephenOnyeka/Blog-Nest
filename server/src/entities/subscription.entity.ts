import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Generated,
  CreateDateColumn,
} from 'typeorm';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Generated('uuid')
  public_id: string;

  @Column({ unique: true })
  email: string;

  @Column('text', { array: true, default: '{}' })
  topics: string[];

  @Column({ default: true })
  newsletter: boolean;

  @Column({ default: false })
  verified: boolean;

  @Column({ type: 'varchar', nullable: true })
  token: string | null;

  @CreateDateColumn()
  created_at: Date;
}
