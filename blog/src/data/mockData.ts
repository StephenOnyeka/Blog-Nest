export interface Author {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
}

export interface Article {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  author: Author;
  publishedAt: string;
  readTime: number;
  tags: string[];
  thumbnail: string;
  claps: number;
  comments: number;
  isMemberOnly: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
  /** Local drafts only live in localStorage until they reach the backend */
  isDraft?: boolean;
}

export const AUTHORS: Author[] = [
  {
    id: "1",
    name: "Sarah Chen",
    username: "sarahchen",
    avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=sarah&backgroundColor=b6e3f4`,
    bio: "Product designer & writer. Building tools for thought.",
    followers: 12400,
    following: 342,
  },
  {
    id: "2",
    name: "Marcus Reid",
    username: "marcusreid",
    avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=marcus&backgroundColor=d1d4f9`,
    bio: "Software engineer at Google. Writing about distributed systems.",
    followers: 8930,
    following: 120,
  },
  {
    id: "3",
    name: "Priya Nair",
    username: "priyanair",
    avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=priya&backgroundColor=c0aede`,
    bio: "AI researcher. Making machines think — or at least seem to.",
    followers: 21000,
    following: 88,
  },
  {
    id: "4",
    name: "Tom Wright",
    username: "tomwright",
    avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=tom&backgroundColor=ffd5dc`,
    bio: "Startup founder. Ex-Stripe. Writing about product & growth.",
    followers: 5200,
    following: 410,
  },
  {
    id: "5",
    name: "Lena Hoffman",
    username: "lenahoffman",
    avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=lena&backgroundColor=b6e3f4`,
    bio: "UX writer & content strategist. I make things make sense.",
    followers: 3400,
    following: 230,
  },
];

const LONG_BODY = `
There is something profound about the way we engage with ideas in the modern age. The internet promised us infinite knowledge — and it delivered. But with that delivery came an unexpected problem: too much of everything.

<h2>The Attention Economy</h2>

Every platform today competes for your focus. Scroll, like, share, repeat. The dopamine loop is well-understood at this point. What's less discussed is what we lose in this constant rush — the ability to sit with an idea long enough for it to become part of us.

Writing has always been the antidote. Not writing for an algorithm, but writing to think. Writing to understand. Writing to share something real with another human across time and space.

<blockquote>"The scariest moment is always just before you start." — Stephen King</blockquote>

<h2>Why Blogging Still Matters</h2>

Blogging isn't dead. In fact, long-form writing is experiencing a quiet renaissance. Newsletters are booming. Platforms like this one have millions of engaged readers who want depth, not just headlines.

The reason is simple: people are starving for meaning. They're tired of hot takes and viral content. They want to read something that changes the way they think — and that takes words, carefully chosen and arranged with intention.

<h3>What makes a great blog post?</h3>

A great blog post does three things:
- It earns your trust with a strong opening
- It teaches you something you didn't know
- It sends you away changed in some small way

That's it. No tricks, no growth hacks. Just honesty and craft.

<h2>Getting Started</h2>

If you've been thinking about starting a blog, here's the only advice you need: write the first post. Don't plan the perfect structure, don't worry about SEO on day one, don't wait for the perfect idea.

Write something you care about. Hit publish. See what happens.

The rest follows from there.
`;

export const ARTICLES: Article[] = [
  {
    id: "1",
    title: "The Quiet Renaissance of Long-Form Writing",
    subtitle:
      "Why blogging still matters in the age of TikTok and algorithmic feeds",
    body: LONG_BODY,
    author: AUTHORS[0],
    publishedAt: "Jun 20",
    readTime: 6,
    tags: ["Writing", "Culture", "Media"],
    thumbnail: `https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80`,
    claps: 1247,
    comments: 43,
    isMemberOnly: false,
  },
  {
    id: "2",
    title: "How I Built a Distributed System That Handles 10M Requests Per Day",
    subtitle:
      "A deep dive into Kafka, Redis, and the tradeoffs that kept me up at night",
    body: LONG_BODY,
    author: AUTHORS[1],
    publishedAt: "Jun 19",
    readTime: 12,
    tags: ["Engineering", "Backend", "Distributed Systems"],
    thumbnail: `https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80`,
    claps: 3892,
    comments: 118,
    isMemberOnly: true,
  },
  {
    id: "3",
    title: "The Illusion of AI Alignment: What the Research Actually Shows",
    subtitle:
      "We are racing toward a technology we barely understand. Here is the state of the science.",
    body: LONG_BODY,
    author: AUTHORS[2],
    publishedAt: "Jun 18",
    readTime: 15,
    tags: ["AI", "Technology", "Research"],
    thumbnail: `https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=80`,
    claps: 8741,
    comments: 356,
    isMemberOnly: true,
  },
  {
    id: "4",
    title:
      "From Zero to $1M ARR: What Nobody Tells You About Early-Stage Growth",
    subtitle:
      "The uncomfortable truths about startup growth that every founder needs to hear",
    body: LONG_BODY,
    author: AUTHORS[3],
    publishedAt: "Jun 17",
    readTime: 9,
    tags: ["Startups", "Growth", "Entrepreneurship"],
    thumbnail: `https://images.unsplash.com/photo-1553484771-371a605b060b?w=400&q=80`,
    claps: 5209,
    comments: 201,
    isMemberOnly: false,
  },
  {
    id: "5",
    title: "Words That Work: The UX Copy Principles Behind Great Products",
    subtitle:
      "Your app's copy is not an afterthought — it's a core part of your design",
    body: LONG_BODY,
    author: AUTHORS[4],
    publishedAt: "Jun 16",
    readTime: 7,
    tags: ["UX", "Design", "Writing"],
    thumbnail: `https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&q=80`,
    claps: 2134,
    comments: 67,
    isMemberOnly: false,
  },
  {
    id: "6",
    title: "The Psychology of Color in Interface Design",
    subtitle: "Why the colors you choose are doing more work than you think",
    body: LONG_BODY,
    author: AUTHORS[0],
    publishedAt: "Jun 15",
    readTime: 8,
    tags: ["Design", "Psychology", "UI"],
    thumbnail: `https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&q=80`,
    claps: 1876,
    comments: 54,
    isMemberOnly: false,
  },
  {
    id: "7",
    title: "TypeScript is Not Your Enemy: A Gentle Introduction",
    subtitle: "Stop fighting the type system — let it do the hard work for you",
    body: LONG_BODY,
    author: AUTHORS[1],
    publishedAt: "Jun 14",
    readTime: 10,
    tags: ["TypeScript", "JavaScript", "Engineering"],
    thumbnail: `https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80`,
    claps: 4321,
    comments: 143,
    isMemberOnly: false,
  },
  {
    id: "8",
    title: "What Happens Inside a Large Language Model",
    subtitle: "A visual and intuitive guide to transformer architecture",
    body: LONG_BODY,
    author: AUTHORS[2],
    publishedAt: "Jun 13",
    readTime: 18,
    tags: ["AI", "Machine Learning", "Explainers"],
    thumbnail: `https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&q=80`,
    claps: 12003,
    comments: 492,
    isMemberOnly: true,
  },
];

export const TOPICS = [
  "For You",
  "Following",
  "Technology",
  "AI",
  "Design",
  "Startups",
  "Science",
  "Programming",
  "Self Improvement",
  "Writing",
  "Culture",
  "Psychology",
  "Business",
  "Health",
  "Politics",
];

export const RECOMMENDED_TOPICS = [
  "Technology",
  "AI",
  "Design",
  "Startups",
  "Science",
  "Programming",
  "Writing",
  "Culture",
  "Health",
  "Psychology",
];

export const STAFF_PICKS = [ARTICLES[2], ARTICLES[1], ARTICLES[6]];
export const TRENDING = [
  ARTICLES[7],
  ARTICLES[3],
  ARTICLES[2],
  ARTICLES[0],
  ARTICLES[4],
];

export const WHO_TO_FOLLOW = AUTHORS.slice(0, 3);

export function formatClaps(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
