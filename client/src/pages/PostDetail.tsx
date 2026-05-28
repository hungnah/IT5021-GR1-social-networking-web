import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Heart, MessageCircle, Send } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppSidebar from '../components/app-shell/AppSidebar';
import {
  api,
  ApiError,
  type CommentWithUser,
  type FeedPost,
  type PostWithCounts,
} from '../lib/api';
import { avatarUrl } from '../lib/avatar';
import { useLanguage } from '../i18n/LanguageContext';
import '../theme/feed-theme.css';
import './NewsFeed.css';

type DetailPost = PostWithCounts & {
  author?: FeedPost['author'];
};

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { search } = useLocation();
  const navigate = useNavigate();
  const { t, localeTag } = useLanguage();
  const [post, setPost] = useState<DetailPost | null>(null);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const commentsRef = useRef<HTMLElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const errorMessage = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError) {
        if (e.kind === 'auth') return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        return e.message;
      }
      return e instanceof Error ? e.message : t.feed.loadError;
    },
    [t.feed.loadError],
  );

  const fetchPostAndComments = useCallback(async () => {
    if (!id) return;
    const [p, c, likedRes, savedRes] = await Promise.all([
      api.get<DetailPost>(`/posts/${id}`),
      api.get<CommentWithUser[]>(`/posts/${id}/comments`),
      api.get<{ liked: boolean }>(`/posts/${id}/reaction-status`),
      api.get<{ saved: boolean }>(`/posts/${id}/save-status`),
    ]);
    setPost(p);
    setComments(Array.isArray(c) ? c : []);
    setLiked(!!likedRes.liked);
    setSaved(!!savedRes.saved);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    void fetchPostAndComments()
      .catch((e) => {
        setError(errorMessage(e));
        setPost(null);
        setComments([]);
      })
      .finally(() => setLoading(false));
  }, [errorMessage, fetchPostAndComments, id]);

  const title = useMemo(() => post?.content?.trim() || 'Post', [post?.content]);
  const shouldFocusComments = useMemo(
    () => new URLSearchParams(search).get('focus') === 'comments',
    [search],
  );

  useEffect(() => {
    if (!shouldFocusComments || loading) return;
    const timer = window.setTimeout(() => {
      commentsRef.current?.focus();
      commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [loading, shouldFocusComments]);

  useEffect(() => {
    if (!id) return;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void fetchPostAndComments().catch(() => {
        /* silent periodic refresh */
      });
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [fetchPostAndComments, id]);

  const handleToggleLike = async () => {
    if (!id || !post || actionBusy) return;
    setActionBusy(true);
    const prevLiked = liked;
    const prevCount = post.reactionCount;
    setLiked(!prevLiked);
    setPost({ ...post, reactionCount: Math.max(0, prevCount + (prevLiked ? -1 : 1)) });
    try {
      const res = await api.post<{ liked: boolean; reactionCount: number }>(
        `/posts/${id}/reactions`,
        {},
      );
      setLiked(!!res.liked);
      setPost((prev) => (prev ? { ...prev, reactionCount: res.reactionCount } : prev));
      window.dispatchEvent(new CustomEvent('feedme:activity'));
    } catch (e) {
      setLiked(prevLiked);
      setPost((prev) => (prev ? { ...prev, reactionCount: prevCount } : prev));
      showToast(errorMessage(e));
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleSave = async () => {
    if (!id || actionBusy) return;
    setActionBusy(true);
    const prevSaved = saved;
    setSaved(!prevSaved);
    try {
      const res = await api.post<{ saved: boolean }>(`/posts/${id}/saves`, {});
      setSaved(!!res.saved);
      window.dispatchEvent(new CustomEvent('feedme:activity'));
    } catch (e) {
      setSaved(prevSaved);
      showToast(errorMessage(e));
    } finally {
      setActionBusy(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!id) return;
    const text = commentDraft.trim();
    if (!text) return;
    try {
      const created = await api.post<CommentWithUser>(`/posts/${id}/comments`, {
        content: text,
      });
      setComments((prev) => [...prev, created]);
      setCommentDraft('');
      setPost((prev) =>
        prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev,
      );
      window.dispatchEvent(new CustomEvent('feedme:activity'));
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  const handleShare = async () => {
    if (!id) return;
    const shareUrl = `${window.location.origin}/post/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'FeedMe', url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Da sao chep lien ket bai viet');
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      showToast(errorMessage(e));
    }
  };

  return (
    <div className="app-shell-page newsfeed-page">
      <AppSidebar />
      <main className="main-content">
        <button type="button" className="feed-open-post-btn" onClick={() => navigate('/feed')}>
          ← {t.feed.backToFeed}
        </button>
        {loading && <div className="feed-state">{t.feed.loading}</div>}
        {error && !loading && <div className="feed-state feed-error">{error}</div>}
        {!loading && !error && post && (
          <article className="post-container">
            <header className="post-header">
              <div className="post-user">
                <div className="post-user-avatar">
                  <img
                    src={avatarUrl(post.userId, post.author?.avatarUrl ?? null)}
                    alt=""
                  />
                </div>
                <div className="user-meta">
                  <span className="user-name">
                    {post.author?.displayName?.trim() || t.feed.defaultUser}
                  </span>
                  <span className="post-time">
                    {new Date(post.createdAt).toLocaleString(localeTag)}
                  </span>
                </div>
              </div>
            </header>
            {!!post.imageUrl && (
              <div className="post-content">
                <img src={post.imageUrl} alt={title} />
              </div>
            )}
            <footer className="post-footer">
              <div className="interaction-bar">
                <div className="left-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={actionBusy}
                    aria-label="like"
                    onClick={() => void handleToggleLike()}
                  >
                    <Heart
                      size={24}
                      className={`action-icon${liked ? ' liked' : ''}`}
                      fill={liked ? 'currentColor' : 'none'}
                    />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="focus comments"
                    onClick={() => {
                      commentsRef.current?.focus();
                      commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    <MessageCircle size={24} className="action-icon" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="share"
                    onClick={() => void handleShare()}
                  >
                    <Send size={24} className="action-icon" />
                  </button>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  disabled={actionBusy}
                  aria-label="save"
                  onClick={() => void handleToggleSave()}
                >
                  <Bookmark
                    size={24}
                    className={`action-icon${saved ? ' saved' : ''}`}
                    fill={saved ? 'currentColor' : 'none'}
                  />
                </button>
              </div>
              <div className="likes-count">
                {post.reactionCount} {t.feed.likes} · {post.commentCount} {t.feed.comments}
              </div>
              <div className="caption-section">
                <p>{post.content ?? ''}</p>
              </div>
            </footer>
          </article>
        )}
        {!loading && !error && comments.length > 0 && (
          <section className="post-container" ref={commentsRef} tabIndex={-1}>
            <header className="post-header">
              <strong>{t.feed.comments}</strong>
            </header>
            <div className="post-footer">
              {comments.map((c) => (
                <div key={c.id} className="caption-section" style={{ marginBottom: 12 }}>
                  <p>
                    <strong>{c.user.displayName?.trim() || t.feed.defaultUser}</strong> {c.content}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
        {!loading && !error && (
          <section className="post-container">
            <header className="post-header">
              <strong>{t.feed.comments}</strong>
            </header>
            <div className="post-footer">
              <div className="search-input-wrap">
                <input
                  className="search-input"
                  placeholder={t.searchPanel.placeholder}
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                />
                <button
                  type="button"
                  className="feed-open-post-btn"
                  onClick={() => void handleSubmitComment()}
                >
                  Send
                </button>
              </div>
            </div>
          </section>
        )}
        {toastMsg && <div className="feed-toast">{toastMsg}</div>}
      </main>
    </div>
  );
}

