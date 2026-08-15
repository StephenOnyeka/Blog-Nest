import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Edit, Link1, People, CloseCircle, TickCircle } from 'iconsax-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageTemplate from '../components/PageTemplate';
import ArticleCard from '../components/ArticleCard';
import { useAuth } from '../context/AuthContext';
import { useAuthGate } from '../context/AuthGateContext';
import {
  getProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getArticles,
  type ApiUser,
  type ApiArticle,
} from '../data/api';
import { queryKeys } from '../hooks/queries';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [activeTab, setActiveTab] = useState<'home' | 'lists' | 'about'>('home');
  const { user: currentUser, isLoggedIn } = useAuth();
  const { openAuthModal } = useAuthGate();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [articles, setArticles] = useState<ApiArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Determine if viewing own profile
  const isOwn =
    username === 'me' ||
    (currentUser && (username === currentUser.username || username === currentUser.id));

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

        // Fetch user articles
        const articlesRes = await getArticles({ author_id: profileData.id, limit: 50 });
        if (!isMounted) return;
        setArticles(articlesRes.articles || []);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to load profile:', err);
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
          prev ? { ...prev, followersCount: prev.followersCount + 1 } : null
        );
      } else {
        await unfollowUser(targetId);
        toast.info(`Unfollowed ${profile.name}`);
        setProfile((prev) =>
          prev ? { ...prev, followersCount: Math.max(0, prev.followersCount - 1) } : null
        );
      }
    } catch (err: any) {
      setIsFollowing(!nextFollowingState);
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Copy Profile Link to Clipboard
  const handleShareProfile = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Profile link copied to clipboard!');
  };

  if (isLoading) {
    return (
      <PageTemplate>
        <div className="max-w-[1192px] mx-auto px-6 py-16 flex justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900"></div>
        </div>
      </PageTemplate>
    );
  }

  const activeUser = isOwn && currentUser ? currentUser : profile;

  if (!activeUser) {
    return (
      <PageTemplate>
        <div className="text-center py-20 px-6">
          <h1 className="text-3xl font-bold mb-4 text-neutral-900">User not found</h1>
          <p className="text-neutral-500 mb-6">The author profile you are looking for does not exist.</p>
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
      <div className="border-b border-neutral-200 bg-white">
        <div className="max-w-[1192px] mx-auto px-6 py-10">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="font-serif text-4xl font-bold text-neutral-900 mb-2">
                {activeUser.name}
              </h1>
              <p className="text-base text-neutral-500 max-w-lg mb-4">
                {activeUser.bio || 'No bio provided.'}
              </p>
              <div className="flex items-center gap-5 text-sm text-neutral-500">
                <span>
                  <strong className="text-neutral-900 font-semibold">
                    {(activeUser.followersCount ?? 0).toLocaleString()}
                  </strong>{' '}
                  followers
                </span>
                <span>
                  <strong className="text-neutral-900 font-semibold">
                    {(activeUser.followingCount ?? 0).toLocaleString()}
                  </strong>{' '}
                  following
                </span>
                <span className="flex items-center gap-1">
                  <People size={14} variant="Linear" color="currentColor" /> {articles.length} stories
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 ml-8">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200 shadow-sm">
                <img
                  src={
                    activeUser.avatar ||
                    `https://api.dicebear.com/9.x/avataaars/svg?seed=${activeUser.username}`
                  }
                  alt={activeUser.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {!isOwn ? (
                <button
                  disabled={isFollowLoading}
                  className={`text-sm font-medium rounded-full px-5 py-2 border transition-all ${
                    isFollowing
                      ? 'bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800'
                      : 'border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white'
                  }`}
                  onClick={handleFollowToggle}
                >
                  {isFollowing ? 'Following' : 'Follow'}
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
          <div className="flex gap-0 border-b border-transparent">
            {(['home', 'lists', 'about'] as const).map((tab) => (
              <button
                key={tab}
                className={`text-sm font-medium px-1 pb-3 mr-6 border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
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
      <div className="max-w-[1192px] mx-auto px-6 pt-8 pb-12">
        {activeTab === 'home' && (
          <div className="max-w-[740px]">
            {articles.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-100 p-8">
                <p className="text-base font-medium text-neutral-700">No stories published yet.</p>
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
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={normalizeArticleForCard(article)} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'lists' && (
          <div className="max-w-[740px] text-center py-16 text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-100">
            <Save2Icon />
            <p className="text-base mt-4 font-medium text-neutral-700">No saved lists yet</p>
            <p className="text-sm text-neutral-400 mt-1">Bookmarked stories will appear here.</p>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-[480px]">
            <div className="bg-neutral-50 border border-neutral-200/60 rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-semibold mb-3 text-neutral-900">About {activeUser.name}</h3>
              <p className="text-[15px] text-neutral-600 leading-relaxed">
                {activeUser.bio || 'This user has not written a bio yet.'}
              </p>
              <div className="mt-6 pt-4 border-t border-neutral-200/60 flex gap-6 text-sm text-neutral-500">
                <span>
                  <strong className="text-neutral-900 font-semibold">
                    {(activeUser.followersCount ?? 0).toLocaleString()}
                  </strong>{' '}
                  followers
                </span>
                <span>
                  <strong className="text-neutral-900 font-semibold">
                    {(activeUser.followingCount ?? 0).toLocaleString()}
                  </strong>{' '}
                  following
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <EditProfileModal
          user={activeUser}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(updatedUser) => {
            setProfile(updatedUser);
            queryClient.invalidateQueries({ queryKey: queryKeys.me });
            setIsEditModalOpen(false);
          }}
        />
      )}
    </PageTemplate>
  );
}

/** Helper to map ApiArticle to expected card shape */
function normalizeArticleForCard(a: ApiArticle) {
  return {
    id: a.id,
    title: a.title,
    subtitle: a.subtitle || '',
    body: a.body,
    author: {
      id: a.author?.id || a.author_id,
      name: a.author?.name || 'Author',
      username: a.author?.username || 'author',
      avatar: a.author?.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${a.author?.username || 'author'}`,
      bio: '',
      followers: 0,
      following: 0,
    },
    publishedAt: a.published_at
      ? new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'Draft',
    readTime: a.read_time || 5,
    tags: a.tags || [],
    thumbnail: a.thumbnail || 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80',
    claps: a.claps || 0,
    comments: a.comments || 0,
    isMemberOnly: a.is_member_only || false,
  };
}

/** Edit Profile Modal Component */
function EditProfileModal({
  user,
  onClose,
  onUpdated,
}: {
  user: ApiUser;
  onClose: () => void;
  onUpdated: (updated: ApiUser) => void;
}) {
  const [name, setName] = useState(user.name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateProfile(user.id, { name, bio, avatar });
      toast.success('Profile updated successfully!');
      onUpdated(updated);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
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

        <h2 className="text-xl font-bold text-neutral-900 mb-6">Profile Information</h2>

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
              Avatar Image URL
            </label>
            <input
              type="url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              placeholder="https://example.com/avatar.png"
            />
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
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Save2Icon() {
  return (
    <svg className="mx-auto" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 3H7C5.9 3 5 3.9 5 5v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
    </svg>
  );
}
