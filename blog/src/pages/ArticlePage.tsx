import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import parse from 'html-react-parser';
import DOMPurify from 'dompurify';
import {
  Heart, HeartAdd, Message, Save2, Share, More, ArrowLeft, Link1, Trash, Send2,
} from 'iconsax-react';
import PageTemplate from '../components/PageTemplate';
import ArticleCard from '../components/ArticleCard';
import { ARTICLES, formatClaps } from '../data/mockData';
import { getUserArticles } from '../data/articleStore';
import { getArticleById, type ApiArticle } from '../data/api';
import { normalizeApiArticle } from '../data/normalize';
import {
  useArticleComments,
  useAddComment,
  useDeleteComment,
  useBookmarkStatus,
  useToggleBookmark,
  useClapArticle,
} from '../hooks/queries';
import { useAuth } from '../context/AuthContext';
import { useAuthGate } from '../context/AuthGateContext';
import { toast } from 'sonner';

const toolbarBtn = 'flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900 cursor-pointer';

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const { openAuthModal } = useAuthGate();
  const [article, setArticle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApiArticle, setIsApiArticle] = useState(false);

  const [claps, setClaps] = useState(0);
  const [clapped, setClapped] = useState(false);
  const [following, setFollowing] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [toastMsg, setToastMsg] = useState('');

  // Comments
  const [commentText, setCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const { data: comments, isLoading: commentsLoading } = useArticleComments(
    isApiArticle && article ? article.id : undefined,
  );
  const addCommentMut = useAddComment(isApiArticle && article ? article.id : undefined);
  const deleteCommentMut = useDeleteComment(isApiArticle && article ? article.id : undefined);

  // Bookmark (auth)
  const { data: bookmarkStatus } = useBookmarkStatus(
    isApiArticle && article ? article.id : undefined,
    isLoggedIn,
  );
  const toggleBookmark = useToggleBookmark(isApiArticle && article ? article.id : undefined);
  const saved = isApiArticle ? !!bookmarkStatus?.bookmarked : false;

  // Clap (API-backed for real articles)
  const clapMut = useClapArticle(isApiArticle && article ? article.id : undefined);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadArticle = async () => {
      if (!id) return;
      try {
        // Only attempt to fetch from API if the ID is a valid UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        if (!isUuid) throw new Error("Not a UUID, fallback to local/mock");
        
        const apiArticle: ApiArticle = await getArticleById(id);
        if (!isMounted) return;
        setArticle(normalizeApiArticle(apiArticle));
        setClaps(apiArticle.claps);
        setIsApiArticle(true);
      } catch {
        if (!isMounted) return;
        const local = ARTICLES.find(a => a.id === id) ?? getUserArticles().find(a => a.id === id);
        setArticle(local ?? null);
        setIsApiArticle(false);
        if (local) setClaps(local.claps);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadArticle();
    return () => {
      isMounted = false;
    };
  }, [id]);

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
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const commentCount = isApiArticle
    ? (comments?.length ?? article?.comments ?? 0)
    : (article?.comments ?? 0);

  const handleAddComment = async () => {
    if (!isLoggedIn) { openAuthModal(); return; }
    if (!isApiArticle) {
      showToast('This local draft cannot receive comments');
      return;
    }
    const text = commentText.trim();
    if (!text) return;
    try {
      await addCommentMut.mutateAsync({ body: text });
      setCommentText('');
      toast.success('Comment posted');
    } catch {
      // error toast handled by api interceptor
    }
  };

  const handleReply = async (parentId: string) => {
    if (!isLoggedIn) { openAuthModal(); return; }
    const text = replyText.trim();
    if (!text) return;
    try {
      await addCommentMut.mutateAsync({ body: text, parentId });
      setReplyText('');
      setReplyToId(null);
      toast.success('Reply posted');
    } catch {
      // error toast handled by api interceptor
    }
  };

  const handleClap = () => {
    if (!isApiArticle || !isLoggedIn) {
      // Guests or mock articles keep the local toggle behaviour
      setClapped(v => !v);
      setClaps(c => clapped ? c - 1 : c + 1);
      return;
    }
    // API-backed: increment on the server and use the authoritative count
    setClapped(true);
    clapMut.mutate(undefined, {
      onSuccess: (res) => setClaps(res.claps),
    });
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteCommentMut.mutateAsync(commentId);
      toast.success('Comment deleted');
    } catch {
      // error toast handled by api interceptor
    }
  };

  const handleSaveToggle = () => {
    if (!isLoggedIn) { openAuthModal(); return; }
    if (!isApiArticle) {
      showToast('This draft can only be saved locally');
      return;
    }
    toggleBookmark.mutate(!!bookmarkStatus?.bookmarked, {
      onSuccess: (res) => {
        showToast(res.bookmarked ? 'Saved to reading list' : 'Removed from list');
      },
    });
  };

  if (isLoading) {
    return (
      <PageTemplate>
        <div className="max-w-[740px] mx-auto px-4 sm:px-6 py-20 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900"></div>
        </div>
      </PageTemplate>
    );
  }

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

      <div className="max-w-[740px] mx-auto px-4 sm:px-6 py-8 overflow-x-hidden">
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
            {article.tags.map((tag: string) => (
              <span key={tag} className="bg-neutral-100 text-neutral-600 text-xs font-medium px-3 py-1 rounded-full">{tag}</span>
            ))}
            {article.isMemberOnly && (
              <span className="bg-[#ffc017] text-neutral-900 text-[11px] font-bold px-2.5 py-1 rounded-[3px] tracking-[0.5px] uppercase">
                ★ MEMBER ONLY
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-serif text-[30px] sm:text-[38px] md:text-[46px] font-bold text-neutral-900 leading-tight mb-4">{article.title}</h1>
          <p className="text-lg sm:text-xl text-neutral-500 leading-relaxed mb-8">{article.subtitle}</p>

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
                onClick={handleClap}
                aria-label="Clap"
              >
                {clapped
                  ? <Heart size={20} variant="Bold" color="currentColor" />
                  : <HeartAdd size={20} variant="Linear" color="currentColor" />
                }
                <span>{formatClaps(claps)}</span>
              </button>
              <a href="#responses" className={toolbarBtn} aria-label="Comments">
                <Message size={20}  variant="Linear" color="currentColor" />
                <span>{commentCount}</span>
              </a>
              <button
                className={`${toolbarBtn} ${saved ? 'text-green-700' : ''}`}
                onClick={handleSaveToggle}
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
          {article.thumbnail && (
            <img
              src={article.thumbnail}
              alt={article.title}
              className="w-full max-h-[500px] object-cover rounded-lg mt-8"
            />
          )}
        </div>

        {/* Body */}
        <div className="prose prose-lg max-w-none text-neutral-900 leading-[1.9] break-words [&_*]:max-w-full [&_p]:mb-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3 [&_a]:text-green-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-neutral-600 [&_img]:rounded-lg [&_img]:my-6 [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto">
          {renderBody(article.body)}
        </div>

        {/* Clap zone */}
        <div className="flex items-center flex-wrap gap-4 py-8 border-t border-b border-neutral-100 my-10">
          <button
            className={`flex items-center gap-2 text-base font-medium transition-colors ${clapped ? 'text-red-600' : 'text-neutral-500 hover:text-neutral-900'}`}
            onClick={handleClap}
          >
            {clapped
              ? <Heart size={28} variant="Bold" color="currentColor" />
              : <HeartAdd size={28}  variant="Linear" color="currentColor" />
            }
            <span className="text-base font-medium">{formatClaps(claps)}</span>
          </button>
          <a href="#responses" className="flex items-center gap-2 text-neutral-500 text-sm hover:text-neutral-900 transition-colors" aria-label="Comments">
            <Message size={24}  variant="Linear" color="currentColor" />
            <span>{commentCount} responses</span>
          </a>

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
              onClick={handleSaveToggle}
              aria-label="Save"
            >
              <Save2 size={20} variant={saved ? 'Bold' : 'Linear'} color="currentColor" />
            </button>
          </div>
        </div>

        {/* Responses / Comments */}
        <div id="responses" className="mt-2 scroll-mt-24">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">Responses ({commentCount})</h2>

          {/* Comment composer */}
          {isLoggedIn ? (
            <div className="flex items-start gap-3 mb-8">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-100 shrink-0">
                <img
                  src={user?.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user?.username || 'me'}`}
                  alt={user?.name || 'You'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="What are your thoughts?"
                  rows={3}
                  className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 outline-none focus:border-neutral-900 transition-colors resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || addCommentMut.isPending}
                    className="flex items-center gap-1.5 bg-neutral-900 text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-40"
                  >
                    <Send2 size={16} variant="Linear" color="currentColor" />
                    {addCommentMut.isPending ? 'Posting…' : 'Respond'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="w-full border border-neutral-200 rounded-xl px-4 py-4 text-sm text-neutral-400 text-left hover:border-neutral-900 hover:text-neutral-900 transition-colors mb-8"
            >
              Sign in to leave a response…
            </button>
          )}

          {/* Comment list — threaded (top-level + replies) */}
          <div className="space-y-6">
            {commentsLoading && (
              <div className="text-sm text-neutral-400 py-4">Loading responses…</div>
            )}
            {!commentsLoading && comments && comments.length === 0 && (
              <div className="text-sm text-neutral-400 py-4">
                No responses yet — be the first to share your thoughts.
              </div>
            )}
            {comments
              ?.filter((c) => !c.parent_id)
              .map((comment) => {
                const replies = comments.filter((c) => c.parent_id === comment.id);
                return (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    replies={replies}
                    isLoggedIn={isLoggedIn}
                    currentUserId={user?.id}
                    replyToId={replyToId}
                    replyText={replyText}
                    onReplyTextChange={setReplyText}
                    onToggleReply={setReplyToId}
                    onSubmitReply={() => handleReply(comment.id)}
                    onDelete={handleDeleteComment}
                    onOpenAuth={openAuthModal}
                    deleting={deleteCommentMut.isPending}
                    replying={addCommentMut.isPending}
                  />
                );
              })}
          </div>
        </div>

        {/* Author card */}
        <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-4 sm:p-8 my-10 flex gap-4 sm:gap-5 items-start">
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
            {article.author.bio && (
              <p className="text-sm text-neutral-500 mb-2">{article.author.bio}</p>
            )}
            {article.author.followers > 0 && (
              <span className="text-[13px] text-neutral-400">
                {article.author.followers.toLocaleString()} followers
              </span>
            )}
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
      {toastMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm px-5 py-2.5 rounded-full shadow-lg z-[999] animate-fade-in">
          {toastMsg}
        </div>
      )}
    </PageTemplate>
  );
}

interface CommentThreadProps {
  comment: any;
  replies: any[];
  isLoggedIn: boolean;
  currentUserId?: string;
  replyToId: string | null;
  replyText: string;
  onReplyTextChange: (v: string) => void;
  onToggleReply: (id: string | null) => void;
  onSubmitReply: () => void;
  onDelete: (commentId: string) => void;
  onOpenAuth: () => void;
  deleting: boolean;
  replying: boolean;
}

/** One top-level comment with its replies nested underneath */
function CommentThread({
  comment,
  replies,
  isLoggedIn,
  currentUserId,
  replyToId,
  replyText,
  onReplyTextChange,
  onToggleReply,
  onSubmitReply,
  onDelete,
  onOpenAuth,
  deleting,
  replying,
}: CommentThreadProps) {
  const isOwn = isLoggedIn && comment.author?.id === currentUserId;
  const showReplyBox = replyToId === comment.id;

  return (
    <div>
      {/* Top-level comment */}
      <CommentItem
        comment={comment}
        isOwn={isOwn}
        showReplyButton
        onReply={() => isLoggedIn ? onToggleReply(comment.id) : onOpenAuth()}
        onDelete={() => onDelete(comment.id)}
        deleting={deleting}
      />

      {/* Reply composer */}
      {showReplyBox && (
        <div className="flex items-start gap-3 mt-3 ml-12 sm:ml-14">
          <div className="flex-1">
            <textarea
              value={replyText}
              onChange={(e) => onReplyTextChange(e.target.value)}
              placeholder={`Reply to ${comment.author?.name || 'user'}…`}
              rows={2}
              autoFocus
              className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 outline-none focus:border-neutral-900 transition-colors resize-none"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => onToggleReply(null)}
                className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={onSubmitReply}
                disabled={!replyText.trim() || replying}
                className="flex items-center gap-1.5 bg-neutral-900 text-white rounded-full px-4 py-1.5 text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-40"
              >
                <Send2 size={14} variant="Linear" color="currentColor" />
                {replying ? 'Posting…' : 'Reply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replies (one level deep) */}
      {replies.length > 0 && (
        <div className="mt-4 ml-6 sm:ml-8 pl-4 sm:pl-6 border-l-2 border-neutral-100 space-y-4">
          {replies.map((reply) => {
            const isReplyOwn = isLoggedIn && reply.author?.id === currentUserId;
            return (
              <CommentItem
                key={reply.id}
                comment={reply}
                isOwn={isReplyOwn}
                showReplyButton={false}
                onReply={() => {}}
                onDelete={() => onDelete(reply.id)}
                deleting={deleting}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  isOwn,
  showReplyButton,
  onReply,
  onDelete,
  deleting,
}: {
  comment: any;
  isOwn: boolean;
  showReplyButton: boolean;
  onReply: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-100 shrink-0">
        <img
          src={comment.author?.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${comment.author?.username || 'user'}`}
          alt={comment.author?.name || 'User'}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Link
              to={comment.author?.username ? `/profile/${comment.author.username}` : '#'}
              className="font-semibold text-neutral-900 hover:underline truncate"
            >
              {comment.author?.name || 'User'}
            </Link>
            <span className="text-xs text-neutral-400 shrink-0">
              {new Date(comment.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {showReplyButton && (
              <button
                onClick={onReply}
                className="text-xs font-medium text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                Reply
              </button>
            )}
            {isOwn && (
              <button
                onClick={onDelete}
                disabled={deleting}
                className="text-neutral-300 hover:text-red-600 transition-colors"
                aria-label="Delete comment"
              >
                <Trash size={15} variant="Linear" color="currentColor" />
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-neutral-700 leading-relaxed mt-1 whitespace-pre-wrap break-words">
          {comment.body}
        </p>
      </div>
    </div>
  );
}
