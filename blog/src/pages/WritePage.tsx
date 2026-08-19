import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
  ArrowLeft,
  Setting2,
  CloseCircle,
  Image as ImageIcon,
  TickCircle,
  Add,
} from "iconsax-react";
import PageTemplate from "../components/PageTemplate";
import {
  saveArticle,
  getArticleById,
  createDraftArticle,
  deleteArticle,
  estimateReadTime,
  wordCount,
  CURRENT_USER,
} from "../data/articleStore";
import type { Article } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import {
  createArticle,
  updateArticle,
  getArticleById as fetchArticleById,
} from "../data/api";
import { normalizeApiArticle } from "../data/normalize";
import { toast } from "sonner";

/* ─── Quill toolbar modules ─────────────────────── */
const MODULES = {
  toolbar: {
    container: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      ["blockquote", "code-block"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image", "video"],
      [{ align: [] }],
      ["clean"],
    ],
  },
};

const FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "code-block",
  "list",
  "bullet",
  "link",
  "image",
  "video",
  "align",
];

/* ─── Suggested tags ───────────────────────────── */
const SUGGESTED_TAGS = [
  "Technology",
  "AI",
  "Design",
  "Programming",
  "Startups",
  "Science",
  "Writing",
  "Culture",
  "Health",
  "Psychology",
  "Business",
  "Finance",
  "Productivity",
  "Education",
  "Travel",
];

/* ─── Component ─────────────────────────────────── */
export default function WritePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const { user, isLoggedIn } = useAuth();

  // Active author = logged-in user (avatar from their profile / avatar modal)
  const activeAuthor =
    isLoggedIn && user
      ? {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar:
            user.avatar ||
            `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username || "me"}`,
          bio: user.bio || "",
          followers: user.followersCount || 0,
          following: user.followingCount || 0,
        }
      : CURRENT_USER;

  // Load draft from store or create new one
  const [draft, setDraft] = useState<Article>(() => {
    if (editId) {
      const existing = getArticleById(editId);
      if (existing) return existing;
    }
    return createDraftArticle();
  });

  const [title, setTitle] = useState(draft.title);
  const [subtitle, setSubtitle] = useState(draft.subtitle);
  const [body, setBody] = useState(draft.body);
  const [tags, setTags] = useState<string[]>(draft.tags);
  const [thumbnail, setThumbnail] = useState(draft.thumbnail);
  const [isMemberOnly, setIsMemberOnly] = useState(draft.isMemberOnly);

  const [showPublishPanel, setShowPublishPanel] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<"draft" | "saving" | "saved">(
    "draft",
  );
  const [published, setPublished] = useState(false);
  const [publishedArticleId, setPublishedArticleId] = useState<string | null>(
    null,
  );

  // Id of the article already saved on the backend (a draft or a published
  // story being edited). `null` means it only exists locally so far.
  const [serverDraftId, setServerDraftId] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // When editing an article that lives on the server (e.g. a saved draft),
  // load it into the editor instead of keeping a blank local draft.
  useEffect(() => {
    if (!editId || editId.startsWith("user-")) return;
    let mounted = true;
    fetchArticleById(editId)
      .then((article) => {
        if (!mounted) return;
        const normalized = normalizeApiArticle(article);
        setDraft(normalized);
        setTitle(normalized.title);
        setSubtitle(normalized.subtitle);
        setBody(normalized.body);
        setTags(normalized.tags);
        setThumbnail(normalized.thumbnail);
        setIsMemberOnly(normalized.isMemberOnly);
        setServerDraftId(article.id);
      })
      .catch(() => {
        /* fall back to the blank local draft */
      });
    return () => {
      mounted = false;
    };
  }, [editId]);

  // Auto-save to localStorage whenever content changes
  const autosave = useCallback(() => {
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const updatedDraft: Article = {
        ...draft,
        title,
        subtitle,
        body,
        tags,
        thumbnail,
        isMemberOnly,
        readTime: estimateReadTime(body),
        isDraft: true,
        publishedAt: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      };
      saveArticle(updatedDraft);
      setDraft(updatedDraft);
      setSaveStatus("saved");
    }, 800);
  }, [draft, title, subtitle, body, tags, thumbnail, isMemberOnly]);

  useEffect(() => {
    if (title || body) autosave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subtitle, body, tags, thumbnail, isMemberOnly]);

  // Tag helpers
  const addTag = (tag: string) => {
    const cleaned = tag.trim();
    if (!cleaned || tags.includes(cleaned) || tags.length >= 5) return;
    setTags([...tags, cleaned]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  // Thumbnail upload (file → data URL)
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setThumbnail(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Publish
  const handlePublish = async () => {
    if (!title.trim()) return;

    // Logged-in users publish to the DB via the API, so the story is real and
    // bears the author's actual avatar from their profile.
    if (isLoggedIn && user) {
      try {
        const payload = {
          title,
          subtitle,
          body,
          tags,
          thumbnail: thumbnail || undefined,
          is_member_only: isMemberOnly,
          is_draft: false,
          read_time: estimateReadTime(body),
        };
        // If the story was previously saved as a backend draft, publish the
        // same row (draft → published). Otherwise create it fresh.
        const created = serverDraftId
          ? await updateArticle(serverDraftId, payload)
          : await createArticle(payload);
        // Remove the local draft so it doesn't duplicate the DB article
        deleteArticle(draft.id);
        setPublishedArticleId(created.id);
        setPublished(true);
        return;
      } catch (err: any) {
        toast.error(
          err.response?.data?.message || "Failed to publish. Please try again.",
        );
        return;
      }
    }

    // Guests fall back to the local store
    const finalArticle: Article = {
      ...draft,
      title,
      subtitle,
      body,
      tags,
      thumbnail,
      isMemberOnly,
      author: activeAuthor,
      readTime: estimateReadTime(body),
      isDraft: false,
      publishedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    };
    saveArticle(finalArticle);
    setPublishedArticleId(finalArticle.id);
    setPublished(true);
  };

  // Save as draft
  const handleSaveDraft = async () => {
    setShowPublishPanel(false);

    // Logged-in users save drafts to the backend so they can be resumed later.
    if (isLoggedIn && user) {
      try {
        const payload = {
          title,
          subtitle,
          body,
          tags,
          thumbnail: thumbnail || undefined,
          is_member_only: isMemberOnly,
          is_draft: true,
          read_time: estimateReadTime(body),
        };
        const saved = serverDraftId
          ? await updateArticle(serverDraftId, payload)
          : await createArticle(payload);
        setServerDraftId(saved.id);
        // The server is now the source of truth — drop the redundant local
        // copy so it doesn't show up twice on the home feed.
        deleteArticle(draft.id);
        setSaveStatus("saved");
        toast.success("Draft saved to your profile");
      } catch (err: any) {
        toast.error(
          err.response?.data?.message ||
            "Failed to save draft. Please try again.",
        );
      }
      return;
    }

    // Guests fall back to the local store
    const updatedDraft: Article = {
      ...draft,
      title,
      subtitle,
      body,
      tags,
      thumbnail,
      isMemberOnly,
      readTime: estimateReadTime(body),
      isDraft: true,
      publishedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    };
    saveArticle(updatedDraft);
    setDraft(updatedDraft);
    setSaveStatus("saved");
    toast.success("Draft saved locally");
  };

  const words = wordCount(body);
  const readMins = estimateReadTime(body);
  const canPublish =
    title.trim().length > 0 && body.replace(/<[^>]+>/g, "").trim().length > 0;

  /* ── Published success screen ──────────────────── */
  if (published) {
    return (
      <PageTemplate showFooter={false}>
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center px-6">
          <div className="text-6xl">🎉</div>
          <h1 className="text-[28px] font-extrabold text-neutral-900 tracking-[-0.5px]">
            Your story is live!
          </h1>
          <p className="text-base text-neutral-500 max-w-[400px]">
            "{title}" has been published to BlogNest. Share it with the world!
          </p>
          <div className="flex gap-3 mt-2">
            <button
              className="bg-green-700 text-white rounded-full px-6 py-2.5 text-[15px] font-semibold transition-colors font-sans hover:bg-green-800"
              onClick={() =>
                navigate(`/article/${publishedArticleId || draft.id}`)
              }
            >
              View story
            </button>
            <button
              className="border border-neutral-200 rounded-full px-6 py-2.5 text-[15px] font-medium text-neutral-900 bg-transparent transition-colors hover:bg-neutral-50"
              onClick={() => navigate("/profile/me")}
            >
              Go to profile
            </button>
          </div>
        </div>
      </PageTemplate>
    );
  }

  /* ── Editor ─────────────────────────────────────── */
  return (
    <PageTemplate showFooter={false}>
      {/* Top bar */}
      <div className="sticky top-0 z-[100] bg-white border-b border-neutral-100 px-4 sm:px-6 flex items-center justify-between h-[57px] gap-3 sm:gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-neutral-500 bg-transparent border-none cursor-pointer text-sm font-sans p-0 shrink-0 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft size={16} variant="Linear" color="currentColor" />
          <span className="flex items-center gap-1">
            {saveStatus === "saving" && (
              <span className="text-neutral-400">Saving…</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-green-700 flex items-center gap-[3px]">
                <TickCircle size={14} variant="Linear" color="currentColor" />{" "}
                Saved
              </span>
            )}
            {saveStatus === "draft" && (
              <span className="text-neutral-400">Draft</span>
            )}
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          {words > 0 && (
            <span className="hidden sm:inline text-xs text-neutral-400">
              {words.toLocaleString()} words · {readMins} min read
            </span>
          )}
          <button
            title="Story settings"
            aria-label="Settings"
            onClick={() => setShowPublishPanel(true)}
            className="bg-transparent border-none cursor-pointer flex items-center text-neutral-500 p-1 hover:text-neutral-900 transition-colors"
          >
            <Setting2 size={20} variant="Linear" color="currentColor" />
          </button>
          <button
            className="bg-neutral-900 text-white rounded-full px-4 sm:px-5 py-2 text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-40"
            onClick={() => canPublish && setShowPublishPanel(true)}
            disabled={!canPublish}
          >
            Publish
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div className="max-w-[740px] mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-20">
        {/* Title */}
        <textarea
          className="w-full border-none outline-none font-serif text-[30px] sm:text-[42px] font-light text-neutral-900 placeholder:text-neutral-300 leading-tight mb-2 resize-none bg-transparent"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onInput={(e) => {
            const el = e.target as HTMLTextAreaElement;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }}
          rows={1}
        />

        {/* Subtitle */}
        <textarea
          className="w-full border-none outline-none font-sans text-[18px] sm:text-[22px] text-neutral-500 leading-relaxed mb-6 resize-none bg-transparent placeholder:text-neutral-300"
          placeholder="Add a subtitle (optional)"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          onInput={(e) => {
            const el = e.target as HTMLTextAreaElement;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }}
          rows={1}
        />

        {/* Author strip */}
        <div className="flex items-center gap-2.5 mb-8 pb-5 border-b border-neutral-100">
          <img
            src={activeAuthor.avatar}
            alt={activeAuthor.name}
            className="w-9 h-9 rounded-full object-cover bg-neutral-100"
          />
          <div>
            <div className="text-sm font-semibold text-neutral-900">
              {activeAuthor.name}
            </div>
            <div className="text-xs text-neutral-400">
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* ReactQuill */}
        <ReactQuill
          theme="snow"
          value={body}
          onChange={setBody}
          modules={MODULES}
          formats={FORMATS}
          placeholder="Tell your story…"
          style={{ fontFamily: "var(--font-serif)" }}
        />
      </div>

      {/* Hidden file input for thumbnail */}
      <input
        ref={thumbnailInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleThumbnailUpload}
      />

      {/* Publish panel */}
      {showPublishPanel && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setShowPublishPanel(false)}
            className="fixed inset-0 bg-black/35 z-[499]"
          />
          <div className="fixed inset-y-0 right-0 w-[440px] max-w-full bg-white border-l border-neutral-200 z-[500] flex flex-col overflow-y-auto animate-[slideFromRight_0.25s_ease]">
            <div className="flex items-center justify-between p-5 px-6 border-b border-neutral-200">
              <span className="text-lg font-bold text-neutral-900">
                Story preview
              </span>
              <button
                onClick={() => setShowPublishPanel(false)}
                className="bg-transparent border-none cursor-pointer flex items-center text-neutral-500 hover:text-neutral-900 transition-colors"
                aria-label="Close"
              >
                <CloseCircle size={22} variant="Linear" color="currentColor" />
              </button>
            </div>

            <div className="p-6 flex-1">
              {/* Preview card */}
              <div className="mb-7">
                <div className="bg-neutral-50 border border-neutral-100 rounded-md overflow-hidden">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt="Cover"
                      className="w-full h-[160px] object-cover block bg-neutral-100"
                    />
                  ) : (
                    <button
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="w-full h-[160px] bg-neutral-100 border-none cursor-pointer flex flex-col items-center justify-center gap-2 text-neutral-400 font-sans hover:bg-neutral-200 transition-colors"
                    >
                      <ImageIcon
                        size={28}
                        variant="Linear"
                        color="currentColor"
                      />
                      <span className="text-[13px]">Add cover image</span>
                    </button>
                  )}
                  {thumbnail && (
                    <button
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="w-full text-center text-xs text-green-700 p-1.5 bg-transparent border-none cursor-pointer font-sans border-t border-neutral-100 hover:bg-neutral-50 transition-colors"
                    >
                      Change image
                    </button>
                  )}
                  <div className="p-3.5">
                    <div className="text-base font-bold text-neutral-900 leading-snug mb-1.5">
                      {title || "Story title…"}
                    </div>
                    <div className="text-[13px] text-neutral-500 leading-relaxed">
                      {subtitle || "Story subtitle…"}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 mt-1.5">
                  Note: Changes here affect how your story appears in public
                  places like BlogNest's homepage — not the story itself.
                </p>
              </div>

              {/* Tags */}
              <div className="mb-7">
                <span className="text-[13px] font-semibold text-neutral-500 uppercase tracking-wide mb-2.5 block">
                  Add up to 5 topics
                </span>
                <p className="text-[13px] text-neutral-500 mb-2.5">
                  Topics make it easier for readers to find your story.
                </p>

                <div className="flex gap-2">
                  <input
                    className="w-full border border-neutral-200 rounded-full px-4 py-2 text-[15px] text-neutral-900 bg-white outline-none font-sans transition-colors focus:border-neutral-900 box-border flex-1"
                    placeholder="Add a topic…"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        (e.key === "Enter" || e.key === ",") &&
                        tagInput.trim()
                      ) {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    disabled={tags.length >= 5}
                  />
                  <button
                    onClick={() => addTag(tagInput)}
                    disabled={!tagInput.trim() || tags.length >= 5}
                    className="bg-neutral-900 text-white border-none rounded-full px-3.5 py-2 cursor-pointer flex items-center disabled:opacity-40 transition-opacity hover:opacity-85"
                  >
                    <Add size={18} variant="Linear" color="currentColor" />
                  </button>
                </div>

                {/* Current tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 bg-neutral-100 text-neutral-500 text-[13px] px-2.5 py-1 rounded-full cursor-pointer transition-colors hover:bg-neutral-200"
                      >
                        {tag}
                        <span
                          className="flex items-center text-neutral-400 cursor-pointer ml-0.5 text-base leading-none hover:text-neutral-600"
                          onClick={() => removeTag(tag)}
                        >
                          ×
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Suggested tags */}
                <div className="mt-3">
                  <p className="text-xs text-neutral-400 mb-2">Suggested:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_TAGS.filter((t) => !tags.includes(t))
                      .slice(0, 8)
                      .map((tag) => (
                        <button
                          key={tag}
                          onClick={() => addTag(tag)}
                          disabled={tags.length >= 5}
                          className="bg-neutral-100 text-neutral-500 text-xs px-2.5 py-1 rounded-full border-none cursor-pointer font-sans transition-colors hover:bg-neutral-200 disabled:opacity-40"
                        >
                          + {tag}
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="mb-7">
                <span className="text-[13px] font-semibold text-neutral-500 uppercase tracking-wide mb-2.5 block">
                  Publishing options
                </span>
                <div>
                  <ToggleRow
                    label="Member only story"
                    sublabel="Only subscribers can read the full story"
                    checked={isMemberOnly}
                    onChange={setIsMemberOnly}
                  />
                </div>
              </div>
            </div>

            <div className="p-5 px-6 border-t border-neutral-200 flex items-center gap-3">
              <button
                className="bg-green-700 text-white rounded-full px-6 py-2.5 text-[15px] font-semibold transition-colors font-sans border-none cursor-pointer hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={handlePublish}
                disabled={!canPublish}
              >
                Publish now
              </button>
              <button
                className="text-sm text-neutral-500 bg-transparent border-none cursor-pointer font-sans transition-colors hover:text-neutral-900"
                onClick={handleSaveDraft}
              >
                Save as draft
              </button>
            </div>
          </div>
        </>
      )}
    </PageTemplate>
  );
}

/* ─── Toggle Row ──────────────────────────────────── */
interface ToggleRowProps {
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, sublabel, checked, onChange }: ToggleRowProps) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-none">
      <div>
        <div className="text-sm font-medium text-neutral-900">{label}</div>
        {sublabel && (
          <div className="text-xs text-neutral-400 mt-0.5">{sublabel}</div>
        )}
      </div>
      <label className="relative w-10 h-[22px] shrink-0 cursor-pointer">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="absolute inset-0 rounded-full bg-neutral-200 transition-colors peer-checked:bg-green-700" />
        <span className="absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-[18px] pointer-events-none shadow-[0_1px_3px_rgba(0,0,0,0.2)]" />
      </label>
    </div>
  );
}
