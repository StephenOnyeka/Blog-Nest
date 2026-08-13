import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { SearchNormal1 } from "iconsax-react";
import Fuse from "fuse.js";
import PageTemplate from "../components/PageTemplate";
import ArticleCard from "../components/ArticleCard";
import { ARTICLES, AUTHORS, RECOMMENDED_TOPICS } from "../data/mockData";
import type { Article } from "../data/mockData";
import { api } from "../lib/api";

// Map a backend article record to the frontend Article shape.
function normalizeArticle(a: any): Article {
  return {
    id: a.id,
    title: a.title ?? "",
    subtitle: a.subtitle ?? "",
    body: a.body ?? "",
    author: {
      id: a.author?.id ?? "",
      name: a.author?.name ?? "Unknown",
      username: a.author?.username ?? "",
      avatar: a.author?.avatar ?? "",
      bio: a.author?.bio ?? "",
      followers: a.author?.followersCount ?? 0,
      following: a.author?.followingCount ?? 0,
    },
    publishedAt: a.published_at
      ? new Date(a.published_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "",
    readTime: a.read_time ?? 1,
    tags: a.tags ?? [],
    thumbnail: a.thumbnail ?? "",
    claps: a.claps ?? 0,
    comments: a.comments_count ?? 0,
    isMemberOnly: a.is_member_only ?? false,
  };
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [liveArticles, setLiveArticles] = useState<Article[]>([]);

  useEffect(() => {
    api
      .get("/articles")
      .then((res) => {
        const list = res.data?.articles ?? res.data ?? [];
        setLiveArticles(list.map(normalizeArticle));
      })
      .catch(() => setLiveArticles([]));
  }, []);

  const allArticles = useMemo(() => {
    const byId = new Map<string, Article>();
    for (const a of ARTICLES) byId.set(a.id, a);
    for (const a of liveArticles) byId.set(a.id, a);
    return [...byId.values()];
  }, [liveArticles]);

  const articleFuse = useMemo(
    () =>
      new Fuse(allArticles, {
        keys: ["title", "subtitle", "tags", "author.name"],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [allArticles],
  );

  const authorFuse = useMemo(
    () =>
      new Fuse(AUTHORS, {
        keys: ["name", "bio", "username"],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [],
  );

  const q = query.trim();

  const matchedArticles = q ? articleFuse.search(q).map((r) => r.item) : [];
  const matchedAuthors = q ? authorFuse.search(q).map((r) => r.item) : [];

  return (
    <PageTemplate>
      <div className="max-w-[1192px] mx-auto px-6 pt-8 pb-12">
        {/* Search input */}
        <div className="flex items-center gap-3 bg-neutral-50 rounded-full px-5 py-3 mb-8 max-w-[600px]">
          <SearchNormal1
            size={20}
            className="text-neutral-400 shrink-0"
            variant="Linear"
            color="currentColor"
          />
          <input
            autoFocus
            type="text"
            placeholder="Search BlogExpress"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setParams({ q: e.target.value });
            }}
            className="border-none bg-transparent outline-none text-lg text-neutral-900 w-full font-sans placeholder-neutral-400"
          />
        </div>

        {!q && (
          <>
            {/* Default state — show topics */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">
                Recommended Topics
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {RECOMMENDED_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    className="bg-neutral-100 text-neutral-700 text-sm px-4 py-2 rounded-full cursor-pointer hover:bg-neutral-200 transition-colors"
                    onClick={() => {
                      setQuery(topic);
                      setParams({ q: topic });
                    }}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-neutral-900 mb-4">
                Popular Writers
              </h2>
              <div className="flex flex-col gap-0">
                {AUTHORS.slice(0, 4).map((author) => (
                  <Link
                    key={author.id}
                    to={`/profile/${author.username}`}
                    className="flex items-center gap-4 py-3 border-b border-neutral-100 no-underline group"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-100 shrink-0">
                      <img
                        src={author.avatar}
                        alt={author.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold text-neutral-900 mb-0.5 group-hover:underline">
                        {author.name}
                      </div>
                      <div className="text-[13px] text-neutral-500">
                        {author.bio}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {q && (
          <>
            {/* Stories results */}
            {matchedArticles.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-bold text-neutral-900 mb-4">
                  Stories ({matchedArticles.length})
                </h2>
                <div className="flex flex-col max-w-[740px]">
                  {matchedArticles.map((a) => (
                    <ArticleCard key={a.id} article={a} />
                  ))}
                </div>
              </div>
            )}

            {/* People results */}
            {matchedAuthors.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-neutral-900 mb-4">
                  People ({matchedAuthors.length})
                </h2>
                {matchedAuthors.map((author) => (
                  <Link
                    key={author.id}
                    to={`/profile/${author.username}`}
                    className="flex items-center gap-4 py-4 border-b border-neutral-100 no-underline group"
                  >
                    <div className="w-[52px] h-[52px] rounded-full overflow-hidden bg-neutral-100 shrink-0">
                      <img
                        src={author.avatar}
                        alt={author.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold text-neutral-900 mb-1 group-hover:underline">
                        {author.name}
                      </div>
                      <div className="text-[13px] text-neutral-500 mb-1">
                        {author.bio}
                      </div>
                      <div className="text-[12px] text-neutral-400">
                        {author.followers.toLocaleString()} followers
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {matchedArticles.length === 0 && matchedAuthors.length === 0 && (
              <div className="text-center py-16 text-neutral-500">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-lg font-medium text-neutral-900 mb-2">
                  No results for "{q}"
                </p>
                <p>Try searching for something else, or check your spelling.</p>
              </div>
            )}
          </>
        )}
      </div>
    </PageTemplate>
  );
}
