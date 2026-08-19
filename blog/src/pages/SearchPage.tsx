import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { SearchNormal1 } from "iconsax-react";
import Fuse from "fuse.js";
import PageTemplate from "../components/PageTemplate";
import ArticleCard from "../components/ArticleCard";
import { ARTICLES, AUTHORS, RECOMMENDED_TOPICS } from "../data/mockData";
import type { Article } from "../data/mockData";
import { searchArticles, type SearchMode } from "../data/api";
import { normalizeApiArticle } from "../data/normalize";

const MODES: { value: SearchMode; label: string }[] = [
  { value: "hybrid", label: "Hybrid" },
  { value: "fulltext", label: "Full-text" },
  { value: "vector", label: "Vector" },
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [mode, setMode] = useState<SearchMode>("hybrid");
  const [results, setResults] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [usingApi, setUsingApi] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = query.trim();

  // Debounced search against the backend Orama index
  useEffect(() => {
    if (!q) {
      setResults([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchArticles(q, mode, 20);
        setResults(res.articles.map(normalizeApiArticle));
        setTotal(res.total);
        setUsingApi(true);
      } catch {
        // API down → fall back to filtering the mock catalog client-side
        const fuse = new Fuse(ARTICLES, {
          keys: ["title", "subtitle", "tags", "author.name"],
          threshold: 0.4,
          ignoreLocation: true,
        });
        setResults(fuse.search(q).map((r) => r.item));
        setTotal(0);
        setUsingApi(false);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, mode]);

  // People results stay client-side over the mock authors catalogue
  const authorFuse = useMemo(
    () =>
      new Fuse(AUTHORS, {
        keys: ["name", "bio", "username"],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [],
  );
  const matchedAuthors = q ? authorFuse.search(q).map((r) => r.item) : [];

  return (
    <PageTemplate>
      <div className="pt-2 pb-12">
        {/* Search input */}
        <div className="flex items-center gap-3 bg-neutral-50 rounded-full px-5 py-3 mb-4 max-w-full sm:max-w-[600px]">
          <SearchNormal1
            size={20}
            className="text-neutral-400 shrink-0"
            variant="Linear"
            color="currentColor"
          />
          <input
            autoFocus
            type="text"
            placeholder="Search BlogNest"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setParams({ q: e.target.value });
            }}
            className="border-none bg-transparent outline-none text-lg text-neutral-900 w-full font-sans placeholder-neutral-400"
          />
        </div>

        {/* Search mode toggle */}
        {q && (
          <div className="flex items-center gap-2 mb-8">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mr-1">
              Mode
            </span>
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  mode === m.value
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

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
            {(loading || results.length > 0) && (
              <div className="mb-10">
                <h2 className="text-lg font-bold text-neutral-900 mb-4">
                  Stories ({loading ? "…" : total > 0 ? total : results.length})
                </h2>
                <div className="flex flex-col max-w-[740px]">
                  {loading && (
                    <div className="text-sm text-neutral-400 py-4">
                      Searching…
                    </div>
                  )}
                  {!loading &&
                    results.map((a) => (
                      <ArticleCard key={a.id} article={a} isApi={usingApi} />
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

            {!loading &&
              results.length === 0 &&
              matchedAuthors.length === 0 && (
                <div className="text-center py-16 text-neutral-500">
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="text-lg font-medium text-neutral-900 mb-2">
                    No results for "{q}"
                  </p>
                  <p>
                    Try searching for something else, or check your spelling.
                  </p>
                </div>
              )}
          </>
        )}
      </div>
    </PageTemplate>
  );
}