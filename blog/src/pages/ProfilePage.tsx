import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Edit, Link1, People } from 'iconsax-react';
import PageTemplate from '../components/PageTemplate';
import ArticleCard from '../components/ArticleCard';
import { AUTHORS, ARTICLES } from '../data/mockData';
import { getUserArticles, CURRENT_USER as ME } from '../data/articleStore';
import { useAuth } from '../context/AuthContext';
import { useAuthGate } from '../context/AuthGateContext';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [activeTab, setActiveTab] = useState<'home' | 'lists' | 'about'>('home');
  const [following, setFollowing] = useState(false);
  const { isLoggedIn } = useAuth();
  const { openAuthModal } = useAuthGate();

  const isOwn = username === 'me';
  const author = isOwn
    ? {
        id: 'me',
        name: ME.name,
        username: 'me',
        avatar: ME.avatar,
        bio: ME.bio,
        followers: ME.followers,
        following: ME.following,
      }
    : AUTHORS.find(a => a.username === username);

  if (!author) {
    return (
      <PageTemplate>
        <div className="text-center py-20 px-6">
          <h1 className="text-3xl font-bold mb-4">User not found</h1>
          <Link to="/" className="text-green-700 hover:underline">← Back to home</Link>
        </div>
      </PageTemplate>
    );
  }

  const authorArticles = isOwn
    ? getUserArticles()
    : ARTICLES.filter(a => a.author.username === username);

  return (
    <PageTemplate>
      {/* Profile header */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="max-w-[1192px] mx-auto px-6 py-10">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="font-serif text-4xl font-bold text-neutral-900 mb-2">{author.name}</h1>
              <p className="text-base text-neutral-500 max-w-lg mb-4">{author.bio}</p>
              <div className="flex items-center gap-5 text-sm text-neutral-500">
                <span><strong className="text-neutral-900">{author.followers.toLocaleString()}</strong> followers</span>
                <span><strong className="text-neutral-900">{author.following}</strong> following</span>
                <span className="flex items-center gap-1">
                  <People size={14}  variant="Linear" color="currentColor" /> {authorArticles.length} stories
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 ml-8">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-neutral-100 shrink-0">
                <img src={author.avatar} alt={author.name} className="w-full h-full object-cover" />
              </div>
              {!isOwn ? (
                <button
                  className={`text-sm font-medium rounded-full px-4 py-1.5 border transition-colors ${
                    following
                      ? 'bg-neutral-900 text-white border-neutral-900 hover:opacity-80'
                      : 'border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white'
                  }`}
                  onClick={() => {
                    if (!isLoggedIn) { openAuthModal(); return; }
                    setFollowing(v => !v);
                  }}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 transition-colors p-2" aria-label="Edit profile">
                    <Edit size={18}  variant="Linear" color="currentColor" />
                  </button>
                  <button className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 transition-colors p-2" aria-label="Share profile">
                    <Link1 size={18}  variant="Linear" color="currentColor" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-transparent">
            {(['home', 'lists', 'about'] as const).map(tab => (
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

      {/* Content */}
      <div className="max-w-[1192px] mx-auto px-6 pt-8 pb-12">
        {activeTab === 'home' && (
          <div className="max-w-[740px]">
            {authorArticles.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <p>No stories published yet.</p>
                {isOwn && (
                  <Link
                    to="/write"
                    className="inline-block mt-4 bg-green-700 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-green-800 transition-colors"
                  >
                    Write your first story
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex flex-col">
                {authorArticles.map(article => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'lists' && (
          <div className="max-w-[740px] text-center py-12 text-neutral-500">
            <Save2Icon />
            <p className="text-base mt-4">No lists yet</p>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-[480px]">
            <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-6">
              <h3 className="text-base font-semibold mb-3 text-neutral-900">About {author.name}</h3>
              <p className="text-[15px] text-neutral-500 leading-relaxed">{author.bio}</p>
              <div className="mt-4 flex gap-4 text-sm text-neutral-400">
                <span><strong className="text-neutral-900">{author.followers.toLocaleString()}</strong> followers</span>
                <span><strong className="text-neutral-900">{author.following}</strong> following</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}

function Save2Icon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 3H7C5.9 3 5 3.9 5 5v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
    </svg>
  );
}
