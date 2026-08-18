import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Generated,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Profile } from './profile.entity';
import { Comment } from './comment.entity';
import { Bookmark } from './bookmark.entity';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Generated('uuid')
  public_id: string;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  subtitle: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ nullable: true })
  thumbnail: string;

  @Column('text', { array: true, default: '{}' })
  tags: string[];

  @Column({ default: 5 })
  read_time: number;

  @Column({ default: false })
  is_member_only: boolean;

  @Column({ default: false })
  is_draft: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  published_at: Date | null;

  @Column({ default: 0 })
  claps: number;

  @Column({ default: 0 })
  comments_count: number;

  @Column()
  author_id: number;

  @ManyToOne(() => Profile, (profile) => profile.articles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'author_id' })
  author: Profile;

  @OneToMany(() => Comment, (comment) => comment.article)
  comments: Comment[];

  @OneToMany(() => Bookmark, (bookmark) => bookmark.article)
  bookmarks: Bookmark[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
