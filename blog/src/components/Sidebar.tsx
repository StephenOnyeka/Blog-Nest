import { useState } from "react";
import { Link } from "react-router-dom";
import { TrendUp, Star1, People, Tag2, ArrowRight2 } from "iconsax-react";
import {
  STAFF_PICKS,
  TRENDING,
  RECOMMENDED_TOPICS,
  WHO_TO_FOLLOW,
  formatClaps,
  type Article,
} from "../data/mockData";

export default function Sidebar() {
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  const toggleFollow = (id: string) => {
    setFollowed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className="sticky top-20 self-start hidden lg:block">
      {/* Staff Picks */}
      <section className="mb-6">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 mb-4">
          <Star1 size={16} variant="Bold" color="#ffc017" />
          Staff Picks
        </div>
        {STAFF_PICKS.map((article) => (
          <StaffPickCard key={article.id} article={article} />
        ))}
        <Link
          to="/"
          className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors mt-3 inline-block"
        >
          See the full list
        </Link>
      </section>

      <div className="h-px bg-neutral-100 my-6" />

      {/* Trending */}
      <section className="mb-6">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 mb-4">
          <TrendUp size={16} variant="Linear" color="currentColor" />
          Trending on BlogExpress
        </div>
        {TRENDING.slice(0, 5).map((article, i) => (
          <TrendingCard key={article.id} article={article} index={i + 1} />
        ))}
      </section>

      <div className="h-px bg-neutral-100 my-6" />

      {/* Who to Follow */}
      <section className="mb-6">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 mb-4">
          <People size={16} variant="Linear" color="currentColor" />
          Who to Follow
        </div>
        {WHO_TO_FOLLOW.map((author) => (
          <div
            key={author.id}
            className="flex items-center justify-between gap-3 mb-5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-neutral-100">
                <img
                  src={author.avatar}
                  alt={author.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <Link
                  to={`/profile/${author.username}`}
                  className="text-[13px] font-semibold text-neutral-900 truncate block hover:underline"
                >
                  {author.name}
                </Link>
                <p className="text-[12px] text-neutral-500 line-clamp-1">
                  {author.bio}
                </p>
              </div>
            </div>
            <button
              className={`shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                followed[author.id]
                  ? "bg-neutral-900 text-white border-neutral-900 hover:opacity-80"
                  : "border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white"
              }`}
              onClick={() => toggleFollow(author.id)}
            >
              {followed[author.id] ? "Following" : "Follow"}
            </button>
          </div>
        ))}
        <Link
          to="/"
          className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1 mt-1"
        >
          See more suggestions{" "}
          <ArrowRight2 size={14} variant="Linear" color="currentColor" />
        </Link>
      </section>

      <div className="h-px bg-neutral-100 my-6" />

      {/* Recommended Topics */}
      <section className="mb-6">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 mb-4">
          <Tag2 size={16} variant="Linear" color="currentColor" />
          Recommended Topics
        </div>
        <div className="flex flex-wrap gap-2">
          {RECOMMENDED_TOPICS.map((topic) => (
            <span
              key={topic}
              className="bg-neutral-100 text-neutral-700 text-sm px-3 py-1.5 rounded-full cursor-pointer hover:bg-neutral-200 transition-colors"
            >
              {topic}
            </span>
          ))}
        </div>
        <Link
          to="/"
          className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1 mt-3"
        >
          See more topics{" "}
          <ArrowRight2 size={14} variant="Linear" color="currentColor" />
        </Link>
      </section>

      {/* Footer links */}
      <div className="mt-8">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {[
            "Help",
            "Status",
            "About",
            "Careers",
            "Blog",
            "Privacy",
            "Terms",
            "Text to speech",
            "Teams",
          ].map((link) => (
            <span
              key={link}
              className="text-[13px] text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
            >
              {link}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

function StaffPickCard({ article }: { article: Article }) {
  return (
    <Link
      to={`/article/${article.id}`}
      className="flex items-start gap-2.5 mb-5 no-underline group"
    >
      <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-neutral-100 mt-0.5">
        <img
          src={article.author.avatar}
          alt={article.author.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-neutral-500 mb-1">
          {article.author.name}
        </div>
        <div className="text-sm font-bold text-neutral-900 leading-snug mb-1 group-hover:text-neutral-500 transition-colors line-clamp-2">
          {article.title}
        </div>
        <div className="text-[12px] text-neutral-400">
          {formatClaps(article.claps)} claps · {article.readTime} min read
        </div>
      </div>
    </Link>
  );
}

function TrendingCard({ article, index }: { article: Article; index: number }) {
  return (
    <Link
      to={`/article/${article.id}`}
      className="flex items-start gap-6 mb-5 no-underline group"
    >
      <div className="text-3xl font-bold text-neutral-200 leading-none w-6 shrink-0">
        0{index}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-5 h-5 rounded-full overflow-hidden bg-neutral-100 shrink-0">
            <img
              src={article.author.avatar}
              alt={article.author.name}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-[12px] font-medium text-neutral-600">
            {article.author.name}
          </span>
        </div>
        <div className="text-sm font-bold text-neutral-900 leading-snug mb-1 group-hover:text-neutral-500 transition-colors line-clamp-2">
          {article.title}
        </div>
        <div className="text-[12px] text-neutral-400">
          {article.publishedAt} · {article.readTime} min read
        </div>
      </div>
    </Link>
  );
}
