import PageTemplate from "../components/PageTemplate";
import ArticleCard from "../components/ArticleCard";
import { useMyBookmarks } from "../hooks/queries";
import { normalizeApiArticle } from "../data/normalize";

/** Saved (bookmarked) articles for the logged-in user */
export default function LibraryPage() {
  const { data: bookmarkedArticles, isLoading: bookmarksLoading } =
    useMyBookmarks(true);

  return (
    <PageTemplate>
      <div className="pt-2 pb-16 max-w-[740px]">
        <h1 className="text-2xl font-serif font-bold text-neutral-900 mb-6">
          Library
        </h1>

        {bookmarksLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
          </div>
        ) : bookmarkedArticles && bookmarkedArticles.length > 0 ? (
          <div className="flex flex-col space-y-6">
            {bookmarkedArticles.map((article) => {
              const card = normalizeApiArticle(article);
              return (
                <ArticleCard
                  key={card.id}
                  article={card}
                  initialSaved
                  initialLiked={card.isLiked}
                  isApi
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-100">
            <Save2Icon />
            <p className="text-base mt-4 font-medium text-neutral-700">
              No saved stories yet
            </p>
            <p className="text-sm text-neutral-400 mt-1">
              Tap the bookmark icon on any story to save it here.
            </p>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}

function Save2Icon() {
  return (
    <svg
      className="mx-auto"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M17 3H7C5.9 3 5 3.9 5 5v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
    </svg>
  );
}