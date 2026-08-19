import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Edit, Link1, People, CloseCircle, Gallery } from "iconsax-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageTemplate from "../components/PageTemplate";
import ArticleCard from "../components/ArticleCard";
import AvatarPickerModal from "../components/AvatarPickerModal";
import { useAuth } from "../context/AuthContext";
import { useAuthGate } from "../context/AuthGateContext";
import {
  getProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getArticles,
  getMyDrafts,
  deleteArticle as deleteServerArticle,
  type ApiUser,
  type ApiArticle,
} from "../data/api";
import {
  getUserArticles,
  deleteArticle as deleteLocalArticle,
} from "../data/articleStore";
import { useMyBookmarks, queryKeys } from "../hooks/queries";
import { normalizeApiArticle } from "../data/normalize";

/** A draft shown in the Drafts tab — either on the backend or localStorage */
type DraftItem = {
  id: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  isLocal: boolean;
};

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [activeTab, setActiveTab] = useState<
    "home" | "drafts" | "lists" | "about"
  >("home");
  const { user: currentUser, isLoggedIn } = useAuth();
  const { openAuthModal } = useAuthGate();
  const queryClient = useQueryClient();

  // Determine if viewing own profile
  const isOwn =
    username === "me" ||
    (currentUser &&
      (username === currentUser.username || username === currentUser.id));

  // Bookmarked articles (only meaningful on the user's own profile)
  const { data: bookmarkedArticles, isLoading: bookmarksLoading } =
    useMyBookmarks(isOwn && isLoggedIn && activeTab === "lists");

  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [articles, setArticles] = useState<ApiArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);

  // Modals & About tab states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);

  // Load profile details
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        const identifier = isOwn && currentUser ? currentUser.id : username;
        if (!identifier) return;

        const profileData = await getProfile(identifier);
        if (!isMounted) return;
        setProfile(profileData);
        setBioText(profileData.bio || "");

        // Fetch user articles
        const articlesRes = await getArticles({
          author_id: profileData.id,
          limit: 50,
        });
        if (!isMounted) return;
        setArticles(articlesRes.articles || []);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Failed to load profile:", err);
        setProfile(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [username, isOwn, currentUser]);

  // Load the user's own drafts (only visible on their own profile).
  // Local drafts (localStorage) are merged with backend drafts here.
  useEffect(() => {
    if (!(isOwn && activeTab === "drafts")) return;
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
  }, [isOwn, isLoggedIn, activeTab]);

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

  // Handle Follow / Unfollow toggle
  const handleFollowToggle = async () => {
    if (!isLoggedIn) {
      openAuthModal();
      return;
    }
    if (!profile || isFollowLoading) return;

    setIsFollowLoading(true);
    const targetId = profile.id;
    const nextFollowingState = !isFollowing;
    setIsFollowing(nextFollowingState);

    try {
      if (nextFollowingState) {
        await followUser(targetId);
        toast.success(`You are now following ${profile.name}`);
        setProfile((prev) =>
          prev ? { ...prev, followersCount: prev.followersCount + 1 } : null,
        );
      } else {
        await unfollowUser(targetId);
        toast.info(`Unfollowed ${profile.name}`);
        setProfile((prev) =>
          prev
            ? { ...prev, followersCount: Math.max(0, prev.followersCount - 1) }
            : null,
        );
      }
      queryClient.invalidateQueries({ queryKey: ["following"] });
    } catch (err: any) {
      setIsFollowing(!nextFollowingState);
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Copy Profile Link to Clipboard
  const handleShareProfile = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Profile link copied to clipboard!");
  };

  // Handle Avatar selection from DiceBear / Local picture
  const handleAvatarUpdate = async (base64Avatar: string) => {
    const activeUser = isOwn && currentUser ? currentUser : profile;
    if (!activeUser) return;

    try {
      const updated = await updateProfile(activeUser.id, {
        avatar: base64Avatar,
      });
      setProfile(updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      toast.success("Profile avatar updated!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update avatar");
    }
  };

  // Handle Bio saving in About tab
  const handleSaveBio = async () => {
    const activeUser = isOwn && currentUser ? currentUser : profile;
    if (!activeUser) return;

    setIsSavingBio(true);
    try {
      const updated = await updateProfile(activeUser.id, { bio: bioText });
      setProfile(updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      setIsEditingBio(false);
      toast.success("Bio updated successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save bio");
    } finally {
      setIsSavingBio(false);
    }
  };

  // Insert Photo into Bio in About tab (Base64)
  const handleBioPhotoInsert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      if (base64Data) {
        const imageTag = `<img src="${base64Data}" alt="Inserted photo" class="my-4 rounded-xl max-h-[400px] w-full object-cover shadow-sm" />`;
        setBioText((prev) => (prev ? `${prev}\n\n${imageTag}` : imageTag));
        toast.success("Photo inserted into bio!");
      }
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <PageTemplate hideSidebar>
        <div className="max-w-[1192px] mx-auto px-4 sm:px-6 py-16 flex justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900"></div>
        </div>
      </PageTemplate>
    );
  }

  const activeUser = isOwn && currentUser ? currentUser : profile;

  if (!activeUser) {
    return (
      <PageTemplate hideSidebar>
        <div className="text-center py-20 px-4 sm:px-6">
          <h1 className="text-3xl font-bold mb-4 text-neutral-900">
            User not found
          </h1>
          <p className="text-neutral-500 mb-6">
            The author profile you are looking for does not exist.
          </p>
          <Link to="/" className="text-green-700 font-medium hover:underline">
            ← Back to home
          </Link>
        </div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate>
      {/* Profile header */}
      <div className="border-b border-neutral-200 bg-white mb-6">
        <div className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-900 mb-2">
                {activeUser.name}
              </h1>
              <p className="text-base text-neutral-500 max-w-lg mb-4">
                {activeUser.bio || "No bio provided."}
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-neutral-500">
                <span>
                  <strong className="text-neutral-900 font-semibold">
                    {(activeUser.followersCount ?? 0).toLocaleString()}
                  </strong>{" "}
                  followers
                </span>
                <span>
                  <strong className="text-neutral-900 font-semibold">
                    {(activeUser.followingCount ?? 0).toLocaleString()}
                  </strong>{" "}
                  following
                </span>
                <span className="flex items-center gap-1">
                  <People size={14} variant="Linear" color="currentColor" />{" "}
                  {articles.length} stories
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:ml-8 shrink-0">
              {/* Profile Picture with hover overlay to trigger Avatar Picker */}
              <div
                className={`relative group w-20 h-20 rounded-full overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200 shadow-sm ${
                  isOwn ? "cursor-pointer" : ""
                }`}
                onClick={() => isOwn && setIsAvatarPickerOpen(true)}
                title={isOwn ? "Click to change avatar" : activeUser.name}
              >
                <img
                  src={
                    activeUser.avatar ||
                    `https://api.dicebear.com/9.x/avataaars/svg?seed=${activeUser.username}`
                  }
                  alt={activeUser.name}
                  className="w-full h-full object-cover"
                />
                {isOwn && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit size={20} className="text-white" />
                  </div>
                )}
              </div>

              {!isOwn ? (
                <button
                  disabled={isFollowLoading}
                  className={`text-sm font-medium rounded-full px-5 py-2 border transition-all ${
                    isFollowing
                      ? "bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800"
                      : "border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white"
                  }`}
                  onClick={handleFollowToggle}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 transition-colors p-2 border border-neutral-200 rounded-full hover:bg-neutral-50"
                    aria-label="Edit profile"
                    title="Edit profile"
                  >
                    <Edit size={18} variant="Linear" color="currentColor" />
                  </button>
                  <button
                    onClick={handleShareProfile}
                    className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 transition-colors p-2 border border-neutral-200 rounded-full hover:bg-neutral-50"
                    aria-label="Share profile"
                    title="Share profile"
                  >
                    <Link1 size={18} variant="Linear" color="currentColor" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-transparent overflow-x-auto">
            {(isOwn
              ? (["home", "drafts", "lists", "about"] as const)
              : (["home", "lists", "about"] as const)
            ).map((tab) => (
              <button
                key={tab}
                className={`text-sm font-medium px-1 pb-3 mr-5 sm:mr-6 whitespace-nowrap border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="pt-2 pb-16">
        {activeTab === "home" && (
          <div className="max-w-[740px]">
            {articles.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-100 p-8">
                <p className="text-base font-medium text-neutral-700">
                  No stories published yet.
                </p>
                {isOwn && (
                  <Link
                    to="/write"
                    className="inline-block mt-4 bg-green-700 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-green-800 transition-colors shadow-sm"
                  >
                    Write your first story
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex flex-col space-y-6">
                {articles.map((article) => {
                  const card = normalizeApiArticle(article);
                  return (
                    <ArticleCard
                      key={card.id}
                      article={card}
                      initialSaved={card.isBookmarked}
                      initialLiked={card.isLiked}
                      isApi
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "drafts" && (
          <div className="max-w-[740px]">
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
        )}

        {activeTab === "lists" && (
          <div className="max-w-[740px]">
            {bookmarksLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
              </div>
            ) : !isLoggedIn || !isOwn ? (
              <div className="text-center py-16 text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-100">
                <Save2Icon />
                <p className="text-base mt-4 font-medium text-neutral-700">
                  No saved lists yet
                </p>
                <p className="text-sm text-neutral-400 mt-1">
                  Bookmarked stories will appear here.
                </p>
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
        )}

        {/* ABOUT TAB REDESIGN */}
        {activeTab === "about" && (
          <div className="max-w-[800px]">
            {/* Screenshot 2: EDITING BIO STATE */}
            {isEditingBio ? (
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">
                    Edit Your Bio
                  </h3>
                  <textarea
                    rows={6}
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    placeholder="Tell the world about yourself..."
                    className="w-full p-4 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 text-neutral-800 text-base resize-y leading-relaxed font-sans"
                  />
                </div>

                {/* Bottom Bar matching Screenshot 2 */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-neutral-100">
                  {/* Left: Insert photo button */}
                  <label className="inline-flex items-center gap-2 cursor-pointer group select-none">
                    <div className="w-8 h-8 rounded-full border border-green-600 flex items-center justify-center text-green-600 group-hover:bg-green-50 transition-colors">
                      <Gallery
                        size={16}
                        variant="Linear"
                        color="currentColor"
                      />
                    </div>
                    <span className="text-sm text-green-700 group-hover:text-green-800 transition-colors">
                      Insert photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBioPhotoInsert}
                      className="hidden"
                    />
                  </label>

                  {/* Right: Cancel & Save buttons */}
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setIsEditingBio(false)}
                      className="px-5 py-2 border border-neutral-900 text-neutral-900 rounded-full font-medium text-sm hover:bg-neutral-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBio}
                      disabled={isSavingBio}
                      className="px-6 py-2 bg-neutral-900 text-white rounded-full font-medium text-sm hover:bg-neutral-800 transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {isSavingBio ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            ) : activeUser.bio ? (
              /* VIEWING EXISTING BIO STATE */
              <div className="bg-neutral-50/60 border border-neutral-200/80 rounded-2xl p-5 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-neutral-900">
                    About {activeUser.name}
                  </h3>
                  {isOwn && (
                    <button
                      onClick={() => {
                        setBioText(activeUser.bio || "");
                        setIsEditingBio(true);
                      }}
                      className="flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-900 border border-neutral-300 rounded-full px-4 py-1.5 hover:bg-white transition-colors"
                    >
                      <Edit size={16} variant="Linear" color="currentColor" />{" "}
                      Edit bio
                    </button>
                  )}
                </div>

                <div
                  className="text-base text-neutral-700 leading-relaxed space-y-4 prose prose-neutral max-w-none"
                  dangerouslySetInnerHTML={{ __html: activeUser.bio }}
                />

                <div className="mt-8 pt-6 border-t border-neutral-200 flex gap-6 text-sm text-neutral-500">
                  <span>
                    <strong className="text-neutral-900 font-semibold">
                      {(activeUser.followersCount ?? 0).toLocaleString()}
                    </strong>{" "}
                    followers
                  </span>
                  <span>
                    <strong className="text-neutral-900 font-semibold">
                      {(activeUser.followingCount ?? 0).toLocaleString()}
                    </strong>{" "}
                    following
                  </span>
                </div>
              </div>
            ) : (
              /* Screenshot 1: DEFAULT EMPTY STATE */
              <div className="bg-neutral-50/70 border border-neutral-200/70 rounded-2xl py-16 px-8 text-center max-w-2xl mx-auto shadow-xs">
                <h2 className="text-2xl font-bold text-neutral-900 mb-4 tracking-tight">
                  Tell the world about yourself
                </h2>
                <p className="text-neutral-600 text-base max-w-lg mx-auto mb-8 leading-relaxed">
                  Here’s where you can share more about yourself: your history,
                  work experience, accomplishments, interests, dreams, and more.
                  You can even add images and use rich text to personalize your
                  bio.
                </p>
                {isOwn ? (
                  <button
                    onClick={() => {
                      setBioText("");
                      setIsEditingBio(true);
                    }}
                    className="px-7 py-2.5 border border-neutral-900 text-neutral-900 rounded-full font-medium text-sm hover:bg-neutral-900 hover:text-white transition-all shadow-sm"
                  >
                    Get started
                  </button>
                ) : (
                  <p className="text-sm text-neutral-400 italic">
                    This user has not written a bio yet.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <EditProfileModal
          user={activeUser}
          onClose={() => setIsEditModalOpen(false)}
          onOpenAvatarPicker={() => {
            setIsEditModalOpen(false);
            setIsAvatarPickerOpen(true);
          }}
          onUpdated={(updatedUser) => {
            setProfile(updatedUser);
            queryClient.invalidateQueries({ queryKey: queryKeys.me });
            setIsEditModalOpen(false);
          }}
        />
      )}

      {/* Avatar Picker Modal (16 DiceBear Avatars / Local Picture Upload) */}
      {isAvatarPickerOpen && (
        <AvatarPickerModal
          currentAvatar={activeUser.avatar}
          onClose={() => setIsAvatarPickerOpen(false)}
          onSelect={handleAvatarUpdate}
        />
      )}
    </PageTemplate>
  );
}

/** Edit Profile Modal Component */
function EditProfileModal({
  user,
  onClose,
  onOpenAvatarPicker,
  onUpdated,
}: {
  user: ApiUser;
  onClose: () => void;
  onOpenAvatarPicker: () => void;
  onUpdated: (updated: ApiUser) => void;
}) {
  const [name, setName] = useState(user.name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateProfile(user.id, { name, bio, avatar });
      toast.success("Profile updated successfully!");
      onUpdated(updated);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-neutral-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <CloseCircle size={24} variant="Linear" color="currentColor" />
        </button>

        <h2 className="text-xl font-bold text-neutral-900 mb-6">
          Profile Information
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              placeholder="Your full name"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
              Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-900 transition-colors resize-none"
              placeholder="Short bio about yourself..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
              Avatar Image
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {avatar && (
                  <img
                    src={avatar}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full object-cover border border-neutral-200"
                  />
                )}
                <button
                  type="button"
                  onClick={onOpenAvatarPicker}
                  className="px-4 py-2 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors text-neutral-700"
                >
                  Choose from Avatars or Upload Photo
                </button>
              </div>
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="Or paste image URL / Base64 Data URI"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
