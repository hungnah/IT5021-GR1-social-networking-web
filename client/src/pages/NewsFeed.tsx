import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MoreHorizontal,
  Trash2,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  UserCircle,
  LogOut,
  Globe,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppSidebar from '../components/app-shell/AppSidebar';
import UserLink from '../components/common/UserLink';
import PostTaggedUsers from '../components/post/PostTaggedUsers';
import PostCommentModal from '../components/post/PostCommentModal';
import {
  api,
  ApiError,
  type FeedPost,
  type PostWithCounts,
  type SuggestedUser,
  type UserProfile,
} from '../lib/api';
import { formatMsg, useLanguage } from '../i18n/LanguageContext';
import type { Locale } from '../i18n/translations';
import { getStoredUser, logout } from '../store/authStore';
import '../theme/feed-theme.css';
import './NewsFeed.css';

function SuggestionRow({
  user,
  onFollowToggle,
  busy,
}: {
  user: SuggestedUser;
  onFollowToggle: (id: string) => void;
  busy: boolean;
}) {
  const { t } = useLanguage();

  return (
    <div className="suggestion-item">
      <UserLink
        userId={user.id}
        displayName={user.displayName}
        avatarUrl={user.avatarUrl}
        variant="suggestion"
        subtitle={
          <span className="sugg-mutual">
            {formatMsg(t.suggestions.mutual, { n: user.mutualCount })}
          </span>
        }
      />
      <button
        type="button"
        className={`follow-btn${user.isFollowing ? ' following' : ''}`}
        disabled={busy}
        onClick={() => onFollowToggle(user.id)}
      >
        {user.isFollowing ? t.suggestions.following : t.suggestions.follow}
      </button>
    </div>
  );
}

const NewsFeed = () => {
  const FEED_PAGE_SIZE = 15;
  const navigate = useNavigate();
  const { t, locale, setLocale, localeTag } = useLanguage();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [allSuggestions, setAllSuggestions] = useState<SuggestedUser[]>([]);
  const [showAllModal, setShowAllModal] = useState(false);
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [likedPostIds, setLikedPostIds] = useState<Record<string, boolean>>({});
  const [savedPostIds, setSavedPostIds] = useState<Record<string, boolean>>({});
  const [heartFxIds, setHeartFxIds] = useState<Record<string, boolean>>({});
  const [saveFxIds, setSaveFxIds] = useState<Record<string, boolean>>({});
  const [actionBusyIds, setActionBusyIds] = useState<Record<string, boolean>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [menuOpenPostId, setMenuOpenPostId] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const errorMessage = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError) {
        if (e.kind === 'auth') return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        if (e.kind === 'network') return e.message;
        return e.message;
      }
      return e instanceof Error ? e.message : t.feed.loadError;
    },
    [t.feed.loadError],
  );

  const withRetry = useCallback(async <T,>(fn: () => Promise<T>, retry = 1): Promise<T> => {
    let lastError: unknown;
    for (let i = 0; i <= retry; i += 1) {
      try {
        return await fn();
      } catch (e) {
        lastError = e;
        if (!(e instanceof ApiError) || (e.kind !== 'network' && e.kind !== 'server') || i === retry) {
          throw e;
        }
      }
    }
    throw lastError;
  }, []);

  const formatRelativeTime = useCallback(
    (iso: string) => {
      const time = new Date(iso).getTime();
      if (Number.isNaN(time)) return '';
      const diff = (Date.now() - time) / 1000;
      if (diff < 60) return t.time.justNow;
      if (diff < 3600) {
        return formatMsg(t.time.minutes, { n: Math.floor(diff / 60) });
      }
      if (diff < 86400) {
        return formatMsg(t.time.hours, { n: Math.floor(diff / 3600) });
      }
      if (diff < 604800) {
        return formatMsg(t.time.days, { n: Math.floor(diff / 86400) });
      }
      return new Date(iso).toLocaleDateString(localeTag);
    },
    [t, localeTag],
  );

  const syncInteractionState = useCallback((feedPosts: FeedPost[]) => {
    if (feedPosts.length === 0) return;
    setLikedPostIds((prev) => {
      const next = { ...prev };
      feedPosts.forEach((p) => {
        next[p.id] = !!p.likedByMe;
      });
      return next;
    });
    setSavedPostIds((prev) => {
      const next = { ...prev };
      feedPosts.forEach((p) => {
        next[p.id] = !!p.savedByMe;
      });
      return next;
    });
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setHasMore(true);
    setLikedPostIds({});
    setSavedPostIds({});
    try {
      const data = await api.get<FeedPost[]>(`/posts/feed?limit=${FEED_PAGE_SIZE}&offset=0`);
      const list = Array.isArray(data) ? data : [];
      setPosts(list);
      syncInteractionState(list);
      setHasMore(list.length === FEED_PAGE_SIZE);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t.feed.loadError);
      setPosts([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [FEED_PAGE_SIZE, syncInteractionState, t.feed.loadError]);

  const loadMoreFeed = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await api.get<FeedPost[]>(
        `/posts/feed?limit=${FEED_PAGE_SIZE}&offset=${posts.length}`,
      );
      const incoming = Array.isArray(data) ? data : [];
      setPosts((prev) => [
        ...prev,
        ...incoming.filter((p) => !prev.some((x) => x.id === p.id)),
      ]);
      syncInteractionState(incoming);
      setHasMore(incoming.length === FEED_PAGE_SIZE);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }, [FEED_PAGE_SIZE, errorMessage, hasMore, loading, loadingMore, posts.length, showToast, syncInteractionState]);

  const loadSuggestions = useCallback(async () => {
    try {
      const data = await api.get<SuggestedUser[]>('/users/suggestions?limit=3');
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (e) {
      setSuggestions([]);
      showToast(errorMessage(e));
    }
  }, [errorMessage, showToast]);

  const loadAllSuggestions = useCallback(async () => {
    try {
      const data = await api.get<SuggestedUser[]>('/users/suggestions?all=true');
      setAllSuggestions(Array.isArray(data) ? data : []);
    } catch (e) {
      setAllSuggestions([]);
      showToast(errorMessage(e));
    }
  }, [errorMessage, showToast]);

  useEffect(() => {
    if (!getStoredUser()) {
      navigate('/', { replace: true });
      return;
    }
    void loadFeed();
    void loadSuggestions();
  }, [navigate, loadFeed, loadSuggestions]);

  useEffect(() => {
    if (!loadMoreRef.current || loading || !hasMore) return;
    const el = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreFeed();
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMoreFeed, loading]);

  useEffect(() => {
    if (!getStoredUser()) return;
    api
      .get<UserProfile>('/users/me')
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    const onPostCreated = (e: Event) => {
      const detail = (e as CustomEvent<{
        post: PostWithCounts;
        author?: FeedPost['author'];
        taggedUsers?: FeedPost['taggedUsers'];
      }>).detail;
      if (!detail?.post || detail.post.privacyStatus !== 'Public') return;
      const author = detail.author ?? {
        id: detail.post.userId,
        displayName: me?.displayName ?? null,
        avatarUrl: me?.avatarUrl ?? null,
      };
      const feedPost: FeedPost = {
        ...detail.post,
        likedByMe: false,
        savedByMe: false,
        createdAt:
          typeof detail.post.createdAt === 'string'
            ? detail.post.createdAt
            : new Date(detail.post.createdAt).toISOString(),
        author,
        taggedUsers: detail.taggedUsers ?? [],
      };
      setPosts((prev) => [feedPost, ...prev.filter((p) => p.id !== feedPost.id)]);
    };
    window.addEventListener('feedme:post-created', onPostCreated);
    return () => window.removeEventListener('feedme:post-created', onPostCreated);
  }, [me?.avatarUrl, me?.displayName]);

  const stored = getStoredUser();
  const sidebarName =
    me?.displayName?.trim() ||
    (stored ? `${stored.firstName} ${stored.lastName}`.trim() : '') ||
    stored?.email ||
    t.feed.defaultUser;
  const sidebarHandle = stored?.email
    ? `@${stored.email.split('@')[0]}`
    : '@user';
  const sidebarAvatar = me?.avatarUrl ?? null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const handleFollowToggle = async (userId: string) => {
    setFollowBusyId(userId);
    try {
      const res = await withRetry(
        () => api.post<{ following: boolean }>(`/users/${userId}/follow`, {}),
        1,
      );
      const update = (list: SuggestedUser[]) =>
        list
          .map((u) =>
            u.id === userId ? { ...u, isFollowing: res.following } : u,
          )
          .filter((u) => !res.following || u.id !== userId);
      setSuggestions((prev) => update(prev));
      setAllSuggestions((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isFollowing: res.following } : u,
        ),
      );
      window.dispatchEvent(new CustomEvent('feedme:activity'));
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setFollowBusyId(null);
    }
  };

  const openSeeAll = () => {
    setShowAllModal(true);
    void loadAllSuggestions();
  };

  const setActionBusy = (postId: string, busy: boolean) => {
    setActionBusyIds((prev) => ({ ...prev, [postId]: busy }));
  };

  const handleLikeFx = async (postId: string) => {
    if (actionBusyIds[postId]) return;
    setActionBusy(postId, true);
    const prevLiked = !!likedPostIds[postId];
    const prevReactionCount =
      posts.find((p) => p.id === postId)?.reactionCount ?? 0;
    setLikedPostIds((prev) => ({ ...prev, [postId]: !prevLiked }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, reactionCount: Math.max(0, p.reactionCount + (prevLiked ? -1 : 1)) }
          : p,
      ),
    );
    setHeartFxIds((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await withRetry(() => api.post<{ liked: boolean; reactionCount: number }>(
        `/posts/${postId}/reactions`,
        {},
      ), 1);
      setLikedPostIds((prev) => ({ ...prev, [postId]: !!res.liked }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, reactionCount: res.reactionCount } : p,
        ),
      );
      window.dispatchEvent(new CustomEvent('feedme:activity'));
    } catch (e) {
      setLikedPostIds((prev) => ({ ...prev, [postId]: prevLiked }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, reactionCount: prevReactionCount } : p,
        ),
      );
      showToast(errorMessage(e));
    } finally {
      window.setTimeout(() => {
        setHeartFxIds((prev) => ({ ...prev, [postId]: false }));
      }, 260);
      setActionBusy(postId, false);
    }
  };

  const handleSaveFx = async (postId: string) => {
    if (actionBusyIds[postId]) return;
    setActionBusy(postId, true);
    const prevSaved = !!savedPostIds[postId];
    setSavedPostIds((prev) => ({ ...prev, [postId]: !prevSaved }));
    setSaveFxIds((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await withRetry(
        () => api.post<{ saved: boolean }>(`/posts/${postId}/saves`, {}),
        1,
      );
      setSavedPostIds((prev) => ({ ...prev, [postId]: !!res.saved }));
      window.dispatchEvent(new CustomEvent('feedme:activity'));
    } catch (e) {
      setSavedPostIds((prev) => ({ ...prev, [postId]: prevSaved }));
      showToast(errorMessage(e));
    } finally {
      window.setTimeout(() => {
        setSaveFxIds((prev) => ({ ...prev, [postId]: false }));
      }, 260);
      setActionBusy(postId, false);
    }
  };

  const handleCommentClick = (postId: string) => {
    setCommentPostId(postId);
  };

  useEffect(() => {
    if (!menuOpenPostId) return;
    const close = () => setMenuOpenPostId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpenPostId]);

  const handleDeletePost = async (postId: string) => {
    if (deleteBusyId) return;
    if (!window.confirm(t.feed.deletePostConfirm)) return;
    setMenuOpenPostId(null);
    setDeleteBusyId(postId);
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setLikedPostIds((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      setSavedPostIds((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      showToast(t.feed.deletePostSuccess);
      window.dispatchEvent(new CustomEvent('feedme:activity'));
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setDeleteBusyId(null);
    }
  };

  const handleShareClick = async (postId: string) => {
    const shareUrl = `${window.location.origin}/post/${postId}`;
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

  const setLanguage = (lang: Locale) => {
    setLocale(lang);
  };

  const langClass = (lang: Locale) =>
    locale === lang ? 'lang-link active-lang-blue' : 'lang-link';

  const actionBusyLabel = useMemo(() => t.feed.loading, [t.feed.loading]);

  return (
    <div className="app-shell-page newsfeed-page">
      <AppSidebar />

      <main className="main-content">
        {loading && <div className="feed-state feed-loading">{t.feed.loading}</div>}
        {loadError && !loading && (
          <div className="feed-state feed-error">
            <p>{loadError}</p>
            <button type="button" className="feed-retry-btn" onClick={() => void loadFeed()}>
              {t.feed.retry}
            </button>
          </div>
        )}
        {!loading && !loadError && posts.length === 0 && (
          <div className="feed-state feed-empty">{t.feed.empty}</div>
        )}
        {!loading &&
          !loadError &&
          posts.map((post) => {
            return (
              <article key={post.id} className="post-container">
                <header className="post-header">
                  <UserLink
                    userId={post.author.id}
                    displayName={post.author.displayName}
                    avatarUrl={post.author.avatarUrl}
                    variant="header"
                    subtitle={
                      <span className="post-time">
                        {formatRelativeTime(post.createdAt)}
                      </span>
                    }
                  />
                  {me?.id === post.userId ? (
                    <div className="post-menu-wrap">
                      <button
                        type="button"
                        className="more-btn"
                        aria-label={t.feed.postMenu}
                        aria-expanded={menuOpenPostId === post.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenPostId((prev) =>
                            prev === post.id ? null : post.id,
                          );
                        }}
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      {menuOpenPostId === post.id && (
                        <div
                          className="post-menu-dropdown"
                          role="menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="post-menu-item danger"
                            role="menuitem"
                            disabled={deleteBusyId === post.id}
                            onClick={() => void handleDeletePost(post.id)}
                          >
                            <Trash2 size={16} />
                            {t.feed.deletePost}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </header>

                {post.imageUrl ? (
                  <div className="post-content">
                    <img src={post.imageUrl} alt="" />
                  </div>
                ) : null}

                <footer className="post-footer">
                  <div className="caption-section">
                    <p>
                      <UserLink
                        userId={post.author.id}
                        displayName={post.author.displayName}
                        variant="inline"
                      />{' '}
                      {post.content ?? ''}
                    </p>
                    <PostTaggedUsers taggedUsers={post.taggedUsers} />
                  </div>
                  <div className="interaction-bar">
                    <div className="left-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="like"
                        aria-busy={actionBusyIds[post.id] || undefined}
                        title={actionBusyIds[post.id] ? actionBusyLabel : undefined}
                        disabled={actionBusyIds[post.id]}
                        onClick={() => void handleLikeFx(post.id)}
                      >
                        <Heart
                          size={24}
                          className={`action-icon${likedPostIds[post.id] ? ' liked' : ''}${heartFxIds[post.id] ? ' pop' : ''}`}
                          fill={likedPostIds[post.id] ? 'currentColor' : 'none'}
                          strokeWidth={likedPostIds[post.id] ? 0 : 2}
                        />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="comment"
                        onClick={() => void handleCommentClick(post.id)}
                      >
                        <MessageCircle size={24} className="action-icon" />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="share"
                        onClick={() => void handleShareClick(post.id)}
                      >
                        <Send size={24} className="action-icon" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="save"
                      disabled={actionBusyIds[post.id]}
                      onClick={() => void handleSaveFx(post.id)}
                    >
                      <Bookmark
                        size={24}
                        className={`action-icon${savedPostIds[post.id] ? ' saved' : ''}${saveFxIds[post.id] ? ' pop' : ''}`}
                        fill={savedPostIds[post.id] ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>
                  <div className="likes-count">
                    {post.reactionCount} {t.feed.likes} · {post.commentCount}{' '}
                    {t.feed.comments}
                  </div>
                  <button
                    type="button"
                    className="feed-open-post-btn"
                    aria-label={t.feed.openPost}
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                    {t.feed.openPost}
                  </button>
                </footer>
              </article>
            );
          })}
        {!loading && !loadError && (
          <div ref={loadMoreRef} className="feed-state feed-loading-more">
                    {loadingMore ? t.feed.loading : hasMore ? t.feed.scrollToLoadMore : ''}
          </div>
        )}
        {toastMsg && <div className="feed-toast">{toastMsg}</div>}
      </main>

      <aside className="right-sidebar">
        <div className="right-user-header">
          <button
            type="button"
            className="right-user-info"
            onClick={() => navigate('/profile')}
          >
            <div className="right-avatar">
              {sidebarAvatar ? (
                <img src={sidebarAvatar} alt="Me" className="avatar-img-sidebar" />
              ) : (
                <div
                  className="default-avatar-box-small"
                  style={{ width: '32px', height: '32px' }}
                >
                  <UserCircle size={24} color="#94A3B8" strokeWidth={1.5} />
                </div>
              )}
            </div>
            <div className="right-name-box">
              <span className="right-full-name">{sidebarName}</span>
              <span className="right-handle">{sidebarHandle}</span>
            </div>
          </button>

          <button
            type="button"
            className="logout-btn"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
          >
            <LogOut size={16} /> <span>{loggingOut ? '…' : t.auth.logout}</span>
          </button>
        </div>

        <div className="suggestions-section">
          <div className="sugg-header">
            <span>{t.suggestions.title}</span>
            <button type="button" className="see-all" onClick={openSeeAll}>
              {t.suggestions.seeAll}
            </button>
          </div>

          {suggestions.length === 0 ? (
            <p className="suggestions-empty">{t.suggestions.empty}</p>
          ) : (
            suggestions.map((user) => (
              <SuggestionRow
                key={user.id}
                user={user}
                busy={followBusyId === user.id}
                onFollowToggle={handleFollowToggle}
              />
            ))
          )}
        </div>

        <div className="right-sidebar-footer">
          <div className="footer-links">
            <Globe size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            <button type="button" className={langClass('vi')} onClick={() => setLanguage('vi')}>
              {t.lang.vi}
            </button>
            <span className="dot-sep">·</span>
            <button type="button" className={langClass('en')} onClick={() => setLanguage('en')}>
              {t.lang.en}
            </button>
            <span className="dot-sep">·</span>
            <button type="button" className={langClass('ja')} onClick={() => setLanguage('ja')}>
              {t.lang.ja}
            </button>
          </div>
          <div className="footer-links secondary">
            <span>{t.footer.about}</span> <span className="dot-sep">·</span>
            <span>{t.footer.help}</span> <span className="dot-sep">·</span>
            <span>{t.footer.privacy}</span> <span className="dot-sep">·</span>
            <span>{t.footer.terms}</span> <span className="dot-sep">·</span>
            <span>{t.footer.advertising}</span> <span className="dot-sep">·</span>
            <span>{t.footer.more}</span>
          </div>
          <div className="footer-copyright-main">{t.footer.copyright}</div>
        </div>
      </aside>

      {showAllModal && (
        <div
          className="suggestions-modal-overlay"
          role="presentation"
          onClick={() => setShowAllModal(false)}
        >
          <div
            className="suggestions-modal"
            role="dialog"
            aria-labelledby="suggestions-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="suggestions-modal-header">
              <h2 id="suggestions-modal-title">{t.suggestions.modalTitle}</h2>
              <button
                type="button"
                className="modal-close-btn"
                aria-label={t.suggestions.close}
                onClick={() => setShowAllModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="suggestions-modal-body">
              {allSuggestions.length === 0 ? (
                <p className="suggestions-empty">{t.suggestions.empty}</p>
              ) : (
                allSuggestions.map((user) => (
                  <SuggestionRow
                    key={user.id}
                    user={user}
                    busy={followBusyId === user.id}
                    onFollowToggle={handleFollowToggle}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
      <PostCommentModal
        postId={commentPostId ?? ''}
        open={!!commentPostId}
        onClose={() => setCommentPostId(null)}
        onPostUpdated={(patch) => {
          if (!commentPostId) return;
          setPosts((prev) =>
            prev.map((p) => (p.id === commentPostId ? { ...p, ...patch } : p)),
          );
        }}
      />
    </div>
  );
};

export default NewsFeed;
