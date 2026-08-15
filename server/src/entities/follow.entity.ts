import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Column,
} from 'typeorm';
import { Profile } from './profile.entity';

@Entity('follows')
export class Follow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  follower_id: number;

  @Column()
  following_id: number;

  @ManyToOne(() => Profile, (profile) => profile.following, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower_id' })
  follower: Profile;

  @ManyToOne(() => Profile, (profile) => profile.followers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'following_id' })
  following: Profile;

  @CreateDateColumn()
  created_at: Date;
}
