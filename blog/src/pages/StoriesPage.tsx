import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import PageTemplate from "../components/PageTemplate";
import { useAuth } from "../context/AuthContext";
import {
  getMyDrafts,
  deleteArticle as deleteServerArticle,
  type ApiArticle,
} from "../data/api";
import {
  getUserArticles,
  deleteArticle as deleteLocalArticle,
} from "../data/articleStore";

/** A draft shown on the Stories page — either on the backend or localStorage */
type DraftItem = {
  id: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  isLocal: boolean;
};

/** Own-only page holding the user's drafts (published stories live on the profile) */
export default function StoriesPage() {
  const { isLoggedIn } = useAuth();
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);

  // Load the user's own drafts. Local drafts (localStorage) are merged with
  // backend drafts here.
  useEffect(() => {
    let mounted = true;
    setDraftsLoading(true);
    const load = async () => {
      const localDrafts = getUserArticles().filter((a) => a.isDraft);
      let apiDrafts: ApiArticle[] = [];
      if (isLoggedIn) {
        try {
          apiDrafts = await getMyDrafts();
        } catch {
          apiDrafts = [];
        }
      }
      if (!mounted) return;
      const items: DraftItem[] = [
        ...localDrafts.map((d) => ({
          id: d.id,
          title: d.title || "Untitled",
          subtitle: d.subtitle || "No subtitle yet.",
          updatedAt: d.publishedAt,
          isLocal: true,
        })),
        ...apiDrafts.map((d) => ({
          id: d.id,
          title: d.title || "Untitled",
          subtitle: d.subtitle || "No subtitle yet.",
          updatedAt: d.updated_at
            ? new Date(d.updated_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "Recently edited",
          isLocal: false,
        })),
      ];
      setDrafts(items);
      setDraftsLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  const handleDeleteDraft = async (draft: DraftItem) => {
    try {
      if (draft.isLocal) {
        deleteLocalArticle(draft.id);
      } else {
        await deleteServerArticle(draft.id);
      }
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
      toast.success("Draft deleted");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete draft");
    }
  };

  return (
    <PageTemplate>
      <div className="pt-2 pb-16 max-w-[740px]">
        <h1 className="text-2xl font-serif font-bold text-neutral-900 mb-6">
          Stories
        </h1>

        {/* Drafts tab */}
        <div className="flex gap-0 border-b border-neutral-200 mb-6 overflow-x-auto">
          <button className="text-sm font-medium px-1 pb-3 mr-5 sm:mr-6 whitespace-nowrap border-b-2 border-neutral-900 text-neutral-900">
            Drafts
          </button>
        </div>

        {draftsLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-12 text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-100 p-8">
            <p className="text-base font-medium text-neutral-700">
              No drafts yet.
            </p>
            <Link
              to="/write"
              className="inline-block mt-4 bg-green-700 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-green-800 transition-colors shadow-sm"
            >
              Start writing
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="py-6 border-b border-neutral-100 first:pt-2"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 bg-neutral-100 rounded px-1.5 py-0.5">
                        Draft
                      </span>
                      <span className="text-[13px] text-neutral-400">
                        {draft.updatedAt}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 leading-snug mb-1">
                      {draft.title}
                    </h3>
                    <p className="text-[15px] text-neutral-500 leading-relaxed line-clamp-2">
                      {draft.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/write?edit=${draft.id}`}
                      className="text-sm font-medium text-neutral-900 border border-neutral-200 rounded-full px-4 py-1.5 hover:bg-neutral-50 transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteDraft(draft)}
                      className="text-sm text-neutral-400 hover:text-red-600 transition-colors bg-transparent border-none cursor-pointer font-sans"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTemplate>
  );
}