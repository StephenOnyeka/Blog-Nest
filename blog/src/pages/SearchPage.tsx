import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import PageTemplate from "../components/PageTemplate";
import ArticleCard from "../components/ArticleCard";
import { AUTHORS, RECOMMENDED_TOPICS } from "../data/mockData";
import type { Article } from "../data/mockData";
import { searchAll, type SearchPerson } from "../data/api";
import { normalizeApiArticle } from "../data/normalize";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [results, setResults] = useState<Article[]>([]);
  const [people, setPeople] = useState<SearchPerson[]>([]);
  const [totalArticles, setTotalArticles] = useState(0);
  const [totalPeople, setTotalPeople] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = (params.get("q") || "").trim();

  // Debounced hybrid search against the backend Orama index (articles + people)
  useEffect(() => {
    if (!q) {
      setResults([]);
      setPeople([]);
      setTotalArticles(0);
      setTotalPeople(0);
      return;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchAll(q, 20);
        setResults(res.articles.map(normalizeApiArticle));
        setPeople(res.people);
        setTotalArticles(res.total_articles);
        setTotalPeople(res.total_people);
      } catch {
        setResults([]);
        setPeople([]);
        setTotalArticles(0);
        setTotalPeople(0);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  return (
    <PageTemplate>
      <div className="pt-2 pb-12">
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
                    onClick={() => setParams({ q: topic })}
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
                  Stories (
                  {loading ? "…" : totalArticles > 0 ? totalArticles : results.length}
                  )
                </h2>
                <div className="flex flex-col max-w-[740px]">
                  {loading && (
                    <div className="text-sm text-neutral-400 py-4">
                      Searching…
                    </div>
                  )}
                  {!loading &&
                    results.map((a) => (
                      <ArticleCard key={a.id} article={a} isApi={true} />
                    ))}
                </div>
              </div>
            )}

            {/* People results */}
            {people.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-neutral-900 mb-4">
                  People ({totalPeople > 0 ? totalPeople : people.length})
                </h2>
                {people.map((person) => (
                  <Link
                    key={person.id}
                    to={`/profile/${person.username}`}
                    className="flex items-center gap-4 py-4 border-b border-neutral-100 no-underline group"
                  >
                    <div className="w-[52px] h-[52px] rounded-full overflow-hidden bg-neutral-100 shrink-0">
                      <img
                        src={
                          person.avatar ||
                          `https://api.dicebear.com/9.x/avataaars/svg?seed=${person.username}&backgroundColor=ffd5dc`
                        }
                        alt={person.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold text-neutral-900 mb-1 group-hover:underline">
                        {person.name}
                      </div>
                      <div className="text-[13px] text-neutral-500 mb-1">
                        {person.bio || `@${person.username}`}
                      </div>
                      <div className="text-[12px] text-neutral-400">
                        {person.followers.toLocaleString()} followers
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!loading &&
              results.length === 0 &&
              people.length === 0 && (
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