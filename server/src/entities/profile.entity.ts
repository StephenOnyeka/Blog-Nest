import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Generated,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Follow } from './follow.entity';
import { Article } from './article.entity';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn()
  id: number; // internal, never exposed in API

  @Column({ unique: true })
  @Generated('uuid')
  public_id: string; // exposed as `id` in all API responses

  @Column()
  name: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string; // bcrypt hash

  @Column({ nullable: true, type: 'text' })
  avatar: string;

  @Column({ nullable: true, type: 'text' })
  bio: string;

  @Column({ default: 0 })
  followers_count: number;

  @Column({ default: 0 })
  following_count: number;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Follow, (follow) => follow.follower)
  following: Follow[];

  @OneToMany(() => Follow, (follow) => follow.following)
  followers: Follow[];

  @OneToMany(() => Article, (article) => article.author)
  articles: Article[];
}
