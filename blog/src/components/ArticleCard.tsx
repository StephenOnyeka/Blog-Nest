import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, HeartAdd, Save2, Message, More } from "iconsax-react";
import { toast } from "sonner";
import type { Article } from "../data/mockData";
import { formatClaps } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import { useAuthGate } from "../context/AuthGateContext";
import { useToggleBookmark, useClapArticle } from "../hooks/queries";

interface ArticleCardProps {
  article: Article;
  showThumbnail?: boolean;
  /** Initial bookmarked state from the DB (e.g. from the bookmarks feed) */
  initialSaved?: boolean;
  /** Initial clap state from the DB (per-user) */
  initialLiked?: boolean;
  /** Whether this story came from the API (DB-backed) rather than mock/local data */
  isApi?: boolean;
}

export default function ArticleCard({
  article,
  showThumbnail = true,
  initialSaved = false,
  initialLiked = false,
  isApi = true,
}: ArticleCardProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [liked, setLiked] = useState(initialLiked);
  const [claps, setClaps] = useState(article.claps);
  const { isLoggedIn } = useAuth();
  const { openAuthModal } = useAuthGate();
  const toggleBookmark = useToggleBookmark(isApi ? article.id : undefined);
  const clapMut = useClapArticle(isApi ? article.id : undefined);

  // Keep the buttons in sync when the DB state changes
  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  const handleClap = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Mock/local articles (or guests) keep the local toggle behaviour
    if (!isApi || !isLoggedIn) {
      const next = !liked;
      setLiked(next);
      setClaps((c) => (next ? c + 1 : c - 1));
      return;
    }
    // API-backed: flip instantly (optimistic), then reconcile with the server
    const target = !liked;
    setLiked(target);
    setClaps((c) => (target ? c + 1 : c - 1));
    clapMut.mutate(undefined, {
      onSuccess: (res) => {
        setClaps(res.claps);
        if (typeof res.is_liked === "boolean") setLiked(res.is_liked);
      },
      onError: () => {
        setLiked(liked);
        setClaps((c) => (target ? c - 1 : c + 1));
      },
    });
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      openAuthModal();
      return;
    }
    if (!isApi) {
      toast.info("This story can only be saved locally");
      return;
    }
    // Flip instantly (optimistic), then reconcile with the server
    const target = !saved;
    setSaved(target);
    // Pass the CURRENT state; the hook toggles it to the opposite server-side
    toggleBookmark.mutate(saved, {
      onSuccess: (res) => setSaved(res.bookmarked),
      onError: () => setSaved(saved),
    });
  };

  return (
    <Link
      to={`/article/${article.id}`}
      className="group grid grid-cols-[1fr_auto] gap-6 items-start py-6 first:pt-0 border-b border-neutral-100 cursor-pointer no-underline"
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Author row */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-[22px] h-[22px] rounded-full bg-neutral-100 overflow-hidden shrink-0 flex items-center justify-center">
            <img
              src={article.author.avatar}
              alt={article.author.name}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-[13px] font-medium text-neutral-900">
            {article.author.name}
          </span>
          {article.isMemberOnly && (
            <span className="bg-[#ffc017] text-neutral-900 text-[10px] font-semibold px-1.5 py-0.5 rounded-[3px] tracking-[0.3px] uppercase">
              Member Only
            </span>
          )}
        </div>

        {/* Title + Subtitle */}
        <h2 className="text-xl font-bold text-neutral-900 leading-snug mb-2 transition-colors font-sans group-hover:text-neutral-500">
          {article.title}
        </h2>
        <p className="text-[15px] text-neutral-500 leading-relaxed mb-3 line-clamp-2">
          {article.subtitle}
        </p>

        {/* Meta row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[13px] text-neutral-400">
              {article.publishedAt}
            </span>
            <span className="w-0.5 h-0.5 bg-neutral-300 rounded-full" />
            <span className="text-[13px] text-neutral-400">
              {article.readTime} min read
            </span>
            {article.tags.slice(0, 1).map((tag) => (
              <span
                key={tag}
                className="bg-neutral-100 text-neutral-500 text-xs font-medium px-2.5 py-1 rounded-full transition-colors hover:bg-neutral-200"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button
              className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:text-neutral-900 ${liked ? "text-red-600" : "text-neutral-400"}`}
              onClick={handleClap}
              aria-label="Clap"
            >
              {liked ? (
                <Heart size={16} variant="Bold" color="currentColor" />
              ) : (
                <HeartAdd size={16} variant="Linear" color="currentColor" />
              )}
              <span>{formatClaps(claps)}</span>
            </button>
            <button
              className="flex items-center gap-1.5 text-neutral-400 text-[13px] font-medium transition-colors hover:text-neutral-900"
              aria-label="Comments"
            >
              <Message size={16} variant="Linear" color="currentColor" />
              <span>{article.comments}</span>
            </button>
            <button
              className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:text-neutral-900 ${saved ? "text-green-700" : "text-neutral-400"}`}
              onClick={handleSave}
              aria-label="Save"
            >
              <Save2
                size={16}
                variant={saved ? "Bold" : "Linear"}
                color="currentColor"
              />
            </button>
            <button
              className="flex items-center gap-1.5 text-neutral-400 text-[13px] font-medium transition-colors hover:text-neutral-900"
              aria-label="More"
            >
              <More size={16} variant="Linear" color="currentColor" />
            </button>
          </div>
        </div>
      </div>

      {/* Thumbnail */}
      {showThumbnail && (
        <img
          src={article.thumbnail}
          alt={article.title}
          className="w-[88px] h-[88px] sm:w-[112px] sm:h-[112px] md:w-[152px] md:h-[112px] object-cover bg-neutral-100 shrink-0"
        />
      )}
    </Link>
  );
}
