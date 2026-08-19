import { useState } from 'react';
import { Add } from 'iconsax-react';
import PageTemplate from '../components/PageTemplate';
import ArticleCard from '../components/ArticleCard';
import Sidebar from '../components/Sidebar';
import { ARTICLES, TOPICS } from '../data/mockData';
import { getUserArticles } from '../data/articleStore';
import { useArticles, useMyBookmarks } from '../hooks/queries';
import { useAuth } from '../context/AuthContext';
import { normalizeApiArticle } from '../data/normalize';

export default function HomePage() {
  const [activeTopic, setActiveTopic] = useState('For You');
  const { isLoggedIn } = useAuth();

  // Load articles from the API (real DB articles, which carry the author's
  // avatar). Fall back to the mock feed only when the API is unreachable.
  const { data: apiData, isError } = useArticles({ limit: 50 });

  // Bookmarks so feed cards show the real saved state from the DB
  const { data: bookmarks } = useMyBookmarks(isLoggedIn);
  const bookmarkedIds = new Set(bookmarks?.map((b) => b.id) ?? []);

  const serverAvailable = !isError && !!apiData;
  const apiArticleIds = new Set((apiData?.articles ?? []).map((a) => a.id));

  const allArticles = serverAvailable
    ? [
        // Only non-draft local stories go on the feed — drafts live in the
        // profile's Drafts tab instead.
        ...getUserArticles().filter(a => !a.isDraft),
        ...(apiData?.articles ?? []).map(normalizeApiArticle),
      ]
    : [...getUserArticles().filter(a => !a.isDraft), ...ARTICLES];

  const filteredArticles = activeTopic === 'For You' || activeTopic === 'Following'
    ? allArticles
    : allArticles.filter(a => a.tags.some(t => t.toLowerCase() === activeTopic.toLowerCase()));

  return (
    <PageTemplate>
      {/* Topic bar */}
      <div className="border-b border-neutral-200 pb-3 bg-white overflow-x-auto scrollbar-none -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-1 whitespace-nowrap">
          <button
            className="px-2 py-1.5 rounded-full text-sm text-neutral-500 transition-all hover:bg-neutral-100 hover:text-neutral-900 shrink-0 cursor-pointer"
            aria-label="Add topics"
            title="Add topics"
          >
            <Add size={18}  variant="Linear" color="currentColor" />
          </button>
          {TOPICS.map(topic => (
            <button
              key={topic}
              className={`px-4 py-1.5 rounded-full text-sm font-normal shrink-0 transition-all cursor-pointer ${
                activeTopic === topic
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
              onClick={() => setActiveTopic(topic)}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 lg:gap-10 py-6 sm:py-8">
        {/* Feed */}
        <div className="flex flex-col">
          {filteredArticles.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">
              <p className="text-base">No articles found in "{activeTopic}"</p>
              <button
                className="mt-3 text-green-700 text-sm cursor-pointer hover:underline"
                onClick={() => setActiveTopic('For You')}
              >
                Back to For You
              </button>
            </div>
          ) : (
            filteredArticles.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                initialSaved={bookmarkedIds.has(article.id)}
                initialLiked={article.isLiked}
                isApi={apiArticleIds.has(article.id)}
              />
            ))
          )}
        </div>

        {/* Right sidebar */}
        <Sidebar />
      </div>
    </PageTemplate>
  );
}
