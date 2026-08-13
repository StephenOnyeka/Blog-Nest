import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import parse from 'html-react-parser';
import DOMPurify from 'dompurify';
import {
  Heart, HeartAdd, Message, Save2, Share, More, ArrowLeft, Link1,
} from 'iconsax-react';
import PageTemplate from '../components/PageTemplate';
import ArticleCard from '../components/ArticleCard';
import { ARTICLES, formatClaps } from '../data/mockData';
import { getUserArticles } from '../data/articleStore';
import { useAuth } from '../context/AuthContext';
import { useAuthGate } from '../context/AuthGateContext';

const toolbarBtn = 'flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900 cursor-pointer';

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { openAuthModal } = useAuthGate();
  const article = ARTICLES.find(a => a.id === id) ?? getUserArticles().find(a => a.id === id);

  const [claps, setClaps] = useState(0);
  const [clapped, setClapped] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (article) setClaps(article.claps);
  }, [article]);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  if (!article) {
    return (
      <PageTemplate>
        <div className="text-center py-20 px-6">
          <h1 className="text-3xl font-bold mb-4">Article not found</h1>
          <button
            onClick={() => navigate('/')}
            className="text-green-700 text-base hover:underline"
          >
            ← Back to home
          </button>
        </div>
      </PageTemplate>
    );
  }

  // Sanitize and parse HTML
  const renderBody = (html: string) => {
    const isQuillHtml = /<[a-z][\s\S]*>/i.test(html);
    let rawHtml = html;
    if (!isQuillHtml) {
      rawHtml = html
        .replace(/\n\n/g, '</p><p>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
    }
    const cleanHtml = DOMPurify.sanitize(rawHtml);
    return parse(cleanHtml);
  };

  const moreArticles = ARTICLES.filter(
    a => a.id !== article.id && a.author.id === article.author.id
  ).slice(0, 2);

  const relatedArticles = ARTICLES.filter(
    a => a.id !== article.id && a.tags.some(t => article.tags.includes(t))
  ).slice(0, 3);

  return (
    <PageTemplate>
      {/* Reading progress bar */}
      <div
        className="fixed top-0 left-0 h-0.5 bg-neutral-900 z-[200] transition-all duration-100"
        style={{ width: `${scrollProgress}%` }}
      />

      <div className="max-w-[740px] mx-auto px-6 py-8 overflow-x-hidden">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-neutral-500 text-sm mb-4 py-4 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft size={16} variant='Linear' color='currentColor'/>
          Back
        </button>

        {/* Hero */}
        <div className="mb-8">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-5">
            {article.tags.map(tag => (
              <span key={tag} className="bg-neutral-100 text-neutral-600 text-xs font-medium px-3 py-1 rounded-full">{tag}</span>
            ))}
            {article.isMemberOnly && (
              <span className="bg-[#ffc017] text-neutral-900 text-[11px] font-bold px-2.5 py-1 rounded-[3px] tracking-[0.5px] uppercase">
                ★ MEMBER ONLY
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-serif text-[38px] md:text-[46px] font-bold text-neutral-900 leading-tight mb-4">{article.title}</h1>
          <p className="text-xl text-neutral-500 leading-relaxed mb-8">{article.subtitle}</p>

          {/* Author bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 py-4 border-t border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <Link to={`/profile/${article.author.username}`} className="w-10 h-10 rounded-full overflow-hidden bg-neutral-100 shrink-0 block">
                <img src={article.author.avatar} alt={article.author.name} className="w-full h-full object-cover" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/profile/${article.author.username}`}
                    className="text-sm font-semibold text-neutral-900 hover:underline"
                  >
                    {article.author.name}
                  </Link>
                  <button
                    className="text-sm text-green-700 hover:text-green-900 transition-colors"
                    onClick={() => {
                      if (!isLoggedIn) { openAuthModal(); return; }
                      setFollowing(v => !v);
                    }}
                  >
                    {following ? '· Following' : '· Follow'}
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-neutral-400 mt-0.5">
                  <span>{article.readTime} min read</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-neutral-300" />
                  <span>{article.publishedAt}</span>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-4">
              <button
                className={`${toolbarBtn} ${clapped ? 'text-red-600' : ''}`}
                onClick={() => {
                  if (!isLoggedIn) { openAuthModal(); return; }
                  setClapped(v => !v);
                  setClaps(c => clapped ? c - 1 : c + 1);
                }}
                aria-label="Clap"
              >
                {clapped
                  ? <Heart size={20} variant="Bold" color="currentColor" />
                  : <HeartAdd size={20} variant="Linear" color="currentColor" />
                }
                <span>{formatClaps(claps)}</span>
              </button>
              <button className={toolbarBtn} aria-label="Comments">
                <Message size={20}  variant="Linear" color="currentColor" />
                <span>{article.comments}</span>
              </button>
              <button
                className={`${toolbarBtn} ${saved ? 'text-green-700' : ''}`}
                onClick={() => {
                  if (!isLoggedIn) { openAuthModal(); return; }
                  setSaved(v => !v);
                  showToast(saved ? 'Removed from list' : 'Saved to reading list');
                }}
                aria-label="Save"
              >
                <Save2 size={20} variant={saved ? 'Bold' : 'Linear'} color="currentColor" />
              </button>
              <button
                className={toolbarBtn}
                onClick={() => { navigator.clipboard.writeText(window.location.href); showToast('Link copied!'); }}
                aria-label="Share"
              >
                <Share size={20}  variant="Linear" color="currentColor" />
              </button>
              <button className={toolbarBtn} aria-label="More">
                <More size={20}  variant="Linear" color="currentColor" />
              </button>
            </div>
          </div>

          {/* Cover image */}
          <img
            src={article.thumbnail}
            alt={article.title}
            className="w-full max-h-[500px] object-cover rounded-lg mt-8"
          />
        </div>

        {/* Body */}
        <div className="prose prose-lg max-w-none text-neutral-900 leading-[1.9] break-words [&_*]:max-w-full [&_p]:mb-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3 [&_a]:text-green-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-neutral-600 [&_img]:rounded-lg [&_img]:my-6 [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto">
          {renderBody(article.body)}
        </div>

        {/* Clap zone */}
        <div className="flex items-center gap-4 py-8 border-t border-b border-neutral-100 my-10">
          <button
            className={`flex items-center gap-2 text-base font-medium transition-colors ${clapped ? 'text-red-600' : 'text-neutral-500 hover:text-neutral-900'}`}
            onClick={() => {
              if (!isLoggedIn) { openAuthModal(); return; }
              setClapped(v => !v);
              setClaps(c => clapped ? c - 1 : c + 1);
            }}
          >
            {clapped
              ? <Heart size={28} variant="Bold" color="currentColor" />
              : <HeartAdd size={28}  variant="Linear" color="currentColor" />
            }
            <span className="text-base font-medium">{formatClaps(claps)}</span>
          </button>
          <button className="flex items-center gap-2 text-neutral-500 text-sm hover:text-neutral-900 transition-colors" aria-label="Comments">
            <Message size={24}  variant="Linear" color="currentColor" />
            <span>{article.comments} responses</span>
          </button>

          <div className="ml-auto flex gap-4">
            <button
              className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-900 transition-colors"
              onClick={() => { navigator.clipboard.writeText(window.location.href); showToast('Link copied!'); }}
              aria-label="Copy link"
            >
              <Link1 size={20}  variant="Linear" color="currentColor" />
            </button>
            <button
              className={`flex items-center gap-1.5 transition-colors ${saved ? 'text-green-700' : 'text-neutral-400 hover:text-neutral-900'}`}
              onClick={() => {
                if (!isLoggedIn) { openAuthModal(); return; }
                setSaved(v => !v);
                showToast(saved ? 'Removed from list' : 'Saved!');
              }}
              aria-label="Save"
            >
              <Save2 size={20} variant={saved ? 'Bold' : 'Linear'} color="currentColor" />
            </button>
          </div>
        </div>

        {/* Author card */}
        <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-8 my-10 flex gap-5 items-start">
          <Link to={`/profile/${article.author.username}`} className="block">
            <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 bg-neutral-100">
              <img src={article.author.avatar} alt={article.author.name} className="w-full h-full object-cover" />
            </div>
          </Link>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <Link to={`/profile/${article.author.username}`}>
                <span className="text-lg font-bold text-neutral-900 hover:underline">{article.author.name}</span>
              </Link>
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
            </div>
            <p className="text-sm text-neutral-500 mb-2">{article.author.bio}</p>
            <span className="text-[13px] text-neutral-400">
              {article.author.followers.toLocaleString()} followers
            </span>
          </div>
        </div>

        {/* More from author */}
        {moreArticles.length > 0 && (
          <div className="mt-12 pt-8 border-t border-neutral-100">
            <h2 className="text-xl font-bold text-neutral-900 mb-6">More from {article.author.name}</h2>
            <div className="flex flex-col">
              {moreArticles.map(a => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </div>
        )}

        {/* Related reading */}
        {relatedArticles.length > 0 && (
          <div className="mt-12 pt-8 border-t border-neutral-100">
            <h2 className="text-xl font-bold text-neutral-900 mb-6">Recommended Reading</h2>
            <div className="flex flex-col">
              {relatedArticles.map(a => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm px-5 py-2.5 rounded-full shadow-lg z-[999] animate-fade-in">
          {toast}
        </div>
      )}
    </PageTemplate>
  );
}
