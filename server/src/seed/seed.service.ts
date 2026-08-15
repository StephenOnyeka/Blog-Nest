import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Profile } from '../entities/profile.entity';
import { Article } from '../entities/article.entity';
import { Notification } from '../entities/notification.entity';

const LONG_BODY = `
There is something profound about the way we engage with ideas in the modern age. The internet promised us infinite knowledge — and it delivered. But with that delivery came an unexpected problem: too much of everything.

## The Attention Economy

Every platform today competes for your focus. Scroll, like, share, repeat. The dopamine loop is well-understood at this point. What's less discussed is what we lose in this constant rush — the ability to sit with an idea long enough for it to become part of us.

Writing has always been the antidote. Not writing for an algorithm, but writing to think. Writing to understand. Writing to share something real with another human across time and space.

> "The scariest moment is always just before you start." — Stephen King

## Why Blogging Still Matters

Blogging isn't dead. In fact, long-form writing is experiencing a quiet renaissance. Newsletters are booming. Platforms like this one have millions of engaged readers who want depth, not just headlines.

The reason is simple: people are starving for meaning. They're tired of hot takes and viral content. They want to read something that changes the way they think — and that takes words, carefully chosen and arranged with intention.

### What makes a great blog post?

A great blog post does three things:
- It earns your trust with a strong opening
- It teaches you something you didn't know
- It sends you away changed in some small way

That's it. No tricks, no growth hacks. Just honesty and craft.

## Getting Started

If you've been thinking about starting a blog, here's the only advice you need: write the first post. Don't plan the perfect structure, don't worry about SEO on day one, don't wait for the perfect idea.

Write something you care about. Hit publish. See what happens.

The rest follows from there.
`;

const SAMPLE_AUTHORS = [
  {
    name: 'Sarah Chen',
    username: 'sarahchen',
    email: 'sarah@example.com',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=sarah&backgroundColor=b6e3f4',
    bio: 'Product designer & writer. Building tools for thought.',
    followers_count: 12400,
    following_count: 342,
  },
  {
    name: 'Marcus Reid',
    username: 'marcusreid',
    email: 'marcus@example.com',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=marcus&backgroundColor=d1d4f9',
    bio: 'Software engineer at Google. Writing about distributed systems.',
    followers_count: 8930,
    following_count: 120,
  },
  {
    name: 'Priya Nair',
    username: 'priyanair',
    email: 'priya@example.com',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=priya&backgroundColor=c0aede',
    bio: 'AI researcher. Making machines think — or at least seem to.',
    followers_count: 21000,
    following_count: 88,
  },
];

const SAMPLE_ARTICLES = [
  {
    authorIndex: 0,
    title: 'The Quiet Renaissance of Long-Form Writing',
    subtitle: 'Why blogging still matters in the age of TikTok and algorithmic feeds',
    body: LONG_BODY,
    read_time: 6,
    tags: ['Writing', 'Culture', 'Media'],
    thumbnail: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80',
    claps: 1247,
    comments_count: 43,
    is_member_only: false,
    is_draft: false,
  },
  {
    authorIndex: 1,
    title: 'How I Built a Distributed System That Handles 10M Requests Per Day',
    subtitle: 'A deep dive into Kafka, Redis, and the tradeoffs that kept me up at night',
    body: LONG_BODY,
    read_time: 12,
    tags: ['Engineering', 'Backend', 'Distributed Systems'],
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80',
    claps: 3892,
    comments_count: 118,
    is_member_only: true,
    is_draft: false,
  },
  {
    authorIndex: 2,
    title: 'The Illusion of AI Alignment: What the Research Actually Shows',
    subtitle: 'We are racing toward a technology we barely understand. Here is the state of the science.',
    body: LONG_BODY,
    read_time: 15,
    tags: ['AI', 'Technology', 'Research'],
    thumbnail: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=80',
    claps: 8741,
    comments_count: 356,
    is_member_only: true,
    is_draft: false,
  },
  {
    authorIndex: 0,
    title: 'Words That Work: The UX Copy Principles Behind Great Products',
    subtitle: 'Your app’s copy is not an afterthought — it’s a core part of your design',
    body: LONG_BODY,
    read_time: 7,
    tags: ['UX', 'Design', 'Writing'],
    thumbnail: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&q=80',
    claps: 2134,
    comments_count: 67,
    is_member_only: false,
    is_draft: false,
  },
  {
    authorIndex: 1,
    title: 'TypeScript is Not Your Enemy: A Gentle Introduction',
    subtitle: 'Stop fighting the type system — let it do the hard work for you',
    body: LONG_BODY,
    read_time: 10,
    tags: ['TypeScript', 'JavaScript', 'Engineering'],
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80',
    claps: 4321,
    comments_count: 143,
    is_member_only: false,
    is_draft: false,
  },
];

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async onApplicationBootstrap() {
    const profileCount = await this.profileRepo.count();
    if (profileCount === 0 || profileCount === 1) {
      console.log('🌱 Seeding initial database records...');
      await this.seed();
      console.log('✅ Database seeding complete!');
    }
  }

  async seed() {
    const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

    const savedProfiles: Profile[] = [];
    for (const authorData of SAMPLE_AUTHORS) {
      let profile = await this.profileRepo.findOne({ where: { username: authorData.username } });
      if (!profile) {
        profile = await this.profileRepo.save(
          this.profileRepo.create({
            ...authorData,
            password: defaultPasswordHash,
          }),
        );
      }
      savedProfiles.push(profile);
    }

    const savedArticles: Article[] = [];
    for (const articleData of SAMPLE_ARTICLES) {
      const author = savedProfiles[articleData.authorIndex];
      let article = await this.articleRepo.findOne({
        where: { title: articleData.title, author_id: author.id },
      });
      if (!article) {
        article = await this.articleRepo.save(
          this.articleRepo.create({
            title: articleData.title,
            subtitle: articleData.subtitle,
            body: articleData.body,
            read_time: articleData.read_time,
            tags: articleData.tags,
            thumbnail: articleData.thumbnail,
            claps: articleData.claps,
            comments_count: articleData.comments_count,
            is_member_only: articleData.is_member_only,
            is_draft: articleData.is_draft,
            published_at: new Date(),
            author_id: author.id,
          }),
        );
      }
      savedArticles.push(article);
    }

    // Seed sample notifications for all profiles in the database
    const allProfiles = await this.profileRepo.find();
    for (const p of allProfiles) {
      const existingNotifCount = await this.notificationRepo.count({ where: { user_id: p.id } });
      if (existingNotifCount === 0) {
        const notif1 = this.notificationRepo.create({
          user_id: p.id,
          type: 'follow',
          message: 'Marcus Reid started following you.',
          is_read: false,
        });
        const notif2 = this.notificationRepo.create({
          user_id: p.id,
          type: 'clap',
          message: 'Priya Nair clapped for your article.',
          article_id: savedArticles[0]?.id ?? null,
          is_read: false,
        });
        const notif3 = this.notificationRepo.create({
          user_id: p.id,
          type: 'article_published',
          message: 'Sarah Chen published a new story: "The Quiet Renaissance of Long-Form Writing".',
          article_id: savedArticles[0]?.id ?? null,
          is_read: false,
        });
        await this.notificationRepo.save([notif1, notif2, notif3]);
      }
    }
    console.log('🔔 Notifications seeded successfully for all profiles!');
  }
}
