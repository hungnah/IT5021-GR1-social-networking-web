import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Home,
  Search,
  Bell,
  Bookmark,
  MessageCircle,
  Settings,
  LogOut,
  Plus,
  Sun,
  Moon,
  HelpCircle,
  UserCircle,
  Zap,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  api,
  ApiError,
  type FeedPost,
  type NotificationItem,
  type SearchResult,
  type UserProfile,
} from '../../lib/api';
import { avatarUrl } from '../../lib/avatar';
import { formatMsg, useLanguage } from '../../i18n/LanguageContext';
import type { Locale } from '../../i18n/translations';
import { useTheme } from '../../theme/ThemeContext';
import { getStoredUser, logout } from '../../store/authStore';
import { notificationMessage } from './notificationMessage';
import UserLink from '../common/UserLink';
import CreatePostModal from '../create-post/CreatePostModal';
import type { PostWithCounts } from '../../lib/api';
import './AppSidebar.css';

export default function AppSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t, locale, setLocale, localeTag } = useLanguage();
  const { theme, setTheme, toggleTheme, isLight } = useTheme();

  const [me, setMe] = useState<UserProfile | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messagesUnreadCount, setMessagesUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationsPanelRef = useRef<HTMLDivElement>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult>({
    users: [],
    posts: [],
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const helpPanelRef = useRef<HTMLDivElement>(null);
  const [showSaved, setShowSaved] = useState(false);
  const savedPanelRef = useRef<HTMLDivElement>(null);
  const [savedPosts, setSavedPosts] = useState<FeedPost[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const errorMessage = useCallback((e: unknown) => {
    if (e instanceof ApiError) {
      if (e.kind === 'auth') return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      return e.message;
    }
    return e instanceof Error ? e.message : 'Đã có lỗi xảy ra';
  }, []);

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


  const isFeed = pathname === '/feed';
  const isMessages = pathname.startsWith('/messages');

  const handlePostCreated = (post: PostWithCounts) => {
    showToast(t.createPost.success);
    window.dispatchEvent(
      new CustomEvent('feedme:post-created', {
        detail: {
          post,
          author: me
            ? {
                id: me.id,
                displayName: me.displayName,
                avatarUrl: me.avatarUrl,
              }
            : undefined,
        },
      }),
    );
  };

  const toggleCreatePost = () => {
    const next = !showCreatePost;
    if (next) {
      setShowSearch(false);
      setShowNotifications(false);
      setShowSettings(false);
      setShowHelp(false);
      setShowSaved(false);
    }
    setShowCreatePost(next);
  };

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

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await withRetry(
        () => api.get<{ count: number }>('/notifications/unread-count'),
        1,
      );
      setUnreadCount(typeof res.count === 'number' ? res.count : 0);
    } catch (e) {
      if (!(e instanceof ApiError) || e.kind !== 'network') {
        showToast(errorMessage(e));
      }
    }
  }, [errorMessage, showToast, withRetry]);

  const refreshMessagesUnreadCount = useCallback(async () => {
    try {
      const res = await withRetry(
        () => api.get<{ count: number }>('/messages/unread-count'),
        1,
      );
      setMessagesUnreadCount(typeof res.count === 'number' ? res.count : 0);
    } catch {
      setMessagesUnreadCount(0);
    }
  }, [withRetry]);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const data = await withRetry(
        () => api.get<NotificationItem[]>('/notifications?limit=30'),
        1,
      );
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e) {
      setNotifications([]);
      showToast(errorMessage(e));
    } finally {
      setNotificationsLoading(false);
    }
  }, [errorMessage, showToast, withRetry]);

  useEffect(() => {
    if (!getStoredUser()) return;
    void refreshUnreadCount();
    void refreshMessagesUnreadCount();
    api
      .get<UserProfile>('/users/me')
      .then(setMe)
      .catch(() => setMe(null));
  }, [refreshMessagesUnreadCount, refreshUnreadCount]);

  useEffect(() => {
    if (!getStoredUser()) return;
    const intervalMs = showNotifications ? 8000 : 20000;
    const id = window.setInterval(() => {
      void refreshUnreadCount();
      void refreshMessagesUnreadCount();
      if (showNotifications) void loadNotifications();
    }, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshUnreadCount();
        void refreshMessagesUnreadCount();
      }
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    const onFeedActivity = () => {
      void refreshUnreadCount();
      void refreshMessagesUnreadCount();
      if (showNotifications) void loadNotifications();
    };
    window.addEventListener('feedme:activity', onFeedActivity);
    const onMessagesRead = () => {
      void refreshMessagesUnreadCount();
    };
    window.addEventListener('feedme:messages-read', onMessagesRead);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('feedme:activity', onFeedActivity);
      window.removeEventListener('feedme:messages-read', onMessagesRead);
    };
  }, [loadNotifications, refreshMessagesUnreadCount, refreshUnreadCount, showNotifications]);

  useEffect(() => {
    if (!showNotifications && !showSearch && !showSettings && !showHelp && !showSaved) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        showNotifications &&
        notificationsPanelRef.current &&
        !notificationsPanelRef.current.contains(target)
      ) {
        setShowNotifications(false);
      }
      if (
        showSearch &&
        searchPanelRef.current &&
        !searchPanelRef.current.contains(target)
      ) {
        setShowSearch(false);
      }
      if (
        showSettings &&
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(target)
      ) {
        setShowSettings(false);
      }
      if (
        showHelp &&
        helpPanelRef.current &&
        !helpPanelRef.current.contains(target)
      ) {
        setShowHelp(false);
      }
      if (
        showSaved &&
        savedPanelRef.current &&
        !savedPanelRef.current.contains(target)
      ) {
        setShowSaved(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showNotifications, showSearch, showSettings, showHelp, showSaved]);

  useEffect(() => {
    if (!showSearch) return;
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [showSearch]);

  useEffect(() => {
    if (!showSearch) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults({ users: [], posts: [] });
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      void api
        .get<SearchResult>(`/search?q=${encodeURIComponent(q)}&limit=15`)
        .then((data) =>
          setSearchResults({
            users: Array.isArray(data.users) ? data.users : [],
            posts: Array.isArray(data.posts) ? data.posts : [],
          }),
        )
        .catch(() => setSearchResults({ users: [], posts: [] }))
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery, showSearch]);

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

  const anySidePanel =
    showSearch || showNotifications || showSettings || showHelp || showSaved || showCreatePost;

  const closeSidePanels = () => {
    setShowSearch(false);
    setShowNotifications(false);
    setShowSettings(false);
    setShowHelp(false);
    setShowSaved(false);
    setShowCreatePost(false);
  };

  const setLanguage = (lang: Locale) => {
    setLocale(lang);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/', { replace: true });
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const badgeLabel =
    unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  const messagesBadgeLabel =
    messagesUnreadCount > 99
      ? '99+'
      : messagesUnreadCount > 0
        ? String(messagesUnreadCount)
        : null;

  const toggleNotifications = () => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next) {
      setShowSearch(false);
      setShowSettings(false);
      setShowHelp(false);
      void loadNotifications();
    }
  };

  const toggleSearch = () => {
    const next = !showSearch;
    setShowSearch(next);
    if (next) {
      setShowNotifications(false);
      setShowSettings(false);
      setShowHelp(false);
      setSearchQuery('');
      setSearchResults({ users: [], posts: [] });
    }
  };

  const toggleSettings = () => {
    const next = !showSettings;
    setShowSettings(next);
    if (next) {
      setShowSearch(false);
      setShowNotifications(false);
      setShowHelp(false);
    }
  };

  const toggleHelp = () => {
    const next = !showHelp;
    setShowHelp(next);
    if (next) {
      setShowSearch(false);
      setShowNotifications(false);
      setShowSettings(false);
      setShowSaved(false);
    }
  };

  const loadSavedPosts = useCallback(async () => {
    setSavedLoading(true);
    try {
      const data = await withRetry(
        () => api.get<FeedPost[]>('/posts/saved?limit=30&offset=0'),
        1,
      );
      setSavedPosts(Array.isArray(data) ? data : []);
    } catch (e) {
      setSavedPosts([]);
      showToast(errorMessage(e));
    } finally {
      setSavedLoading(false);
    }
  }, [errorMessage, showToast, withRetry]);

  useEffect(() => {
    if (!getStoredUser()) return;
    const onFeedActivity = () => {
      if (showSaved) void loadSavedPosts();
    };
    window.addEventListener('feedme:activity', onFeedActivity);
    return () => window.removeEventListener('feedme:activity', onFeedActivity);
  }, [loadSavedPosts, showSaved]);

  const toggleSaved = () => {
    const next = !showSaved;
    setShowSaved(next);
    if (next) {
      setShowSearch(false);
      setShowNotifications(false);
      setShowSettings(false);
      setShowHelp(false);
      void loadSavedPosts();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await withRetry(() => api.patch('/notifications/read-all', {}), 1);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await withRetry(() => api.patch(`/notifications/${item.id}/read`, {}), 1);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (e) {
        showToast(errorMessage(e));
      }
    }
    setShowNotifications(false);
    if (item.type === 'FOLLOW') {
      navigate(`/profile/${item.actor.id}`);
      return;
    }
    if (item.type === 'MESSAGE') {
      navigate(`/messages/${item.actor.id}`);
      return;
    }
    if (item.entityId) {
      navigate(`/post/${item.entityId}`);
    }
  };

  const goHome = () => {
    closeSidePanels();
    if (!isFeed) navigate('/feed');
  };

  return (
    <>
      <aside className="left-sidebar">
        <div className="sidebar-top">
          <button
            type="button"
            className="brand-container brand-button"
            onClick={() => navigate('/feed')}
            aria-label="FeedMe home"
          >
            <div className="icon-box">
              <Zap size={22} fill="white" color="white" />
            </div>
            <span className="brand-name">FeedMe</span>
          </button>

          <nav className="nav-menu">
            <button
              type="button"
              className={`nav-item${isFeed && !anySidePanel ? ' active' : ''}`}
              onClick={goHome}
              aria-label={t.nav.home}
            >
              <div className="sidebar-icon-wrapper">
                <Home size={24} />
              </div>
              <span className="nav-text">{t.nav.home}</span>
            </button>
            <button
              type="button"
              className={`nav-item${showSearch ? ' active' : ''}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                toggleSearch();
              }}
              aria-haspopup="dialog"
              aria-expanded={showSearch}
              aria-label={t.nav.search}
            >
              <div className="sidebar-icon-wrapper">
                <Search size={24} />
              </div>
              <span className="nav-text">{t.nav.search}</span>
            </button>
            <button
              type="button"
              className={`nav-item${showNotifications ? ' active' : ''}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                toggleNotifications();
              }}
              aria-haspopup="dialog"
              aria-expanded={showNotifications}
              aria-label={t.nav.notifications}
            >
              <div className="sidebar-icon-wrapper">
                <Bell size={24} />
                {badgeLabel && <span className="count-badge">{badgeLabel}</span>}
              </div>
              <span className="nav-text">{t.nav.notifications}</span>
              {badgeLabel && <span className="nav-badge-right">{badgeLabel}</span>}
            </button>
            <button
              type="button"
              className={`nav-item${isMessages ? ' active' : ''}`}
              aria-label={t.nav.messages}
              onClick={() => {
                closeSidePanels();
                navigate('/messages');
              }}
            >
              <div className="sidebar-icon-wrapper">
                <MessageCircle size={24} />
                {messagesBadgeLabel && (
                  <span className="count-badge">{messagesBadgeLabel}</span>
                )}
              </div>
              <span className="nav-text">{t.nav.messages}</span>
              {messagesBadgeLabel && (
                <span className="nav-badge-right">{messagesBadgeLabel}</span>
              )}
            </button>
            <button
              type="button"
              className={`nav-item${showSaved ? ' active' : ''}`}
              aria-label={t.nav.saved}
              aria-haspopup="dialog"
              aria-expanded={showSaved}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                toggleSaved();
              }}
            >
              <div className="sidebar-icon-wrapper">
                <Bookmark size={24} />
              </div>
              <span className="nav-text">{t.nav.saved}</span>
            </button>
            <button
              type="button"
              className={`nav-item${showCreatePost ? ' active' : ''}`}
              aria-label={t.nav.create}
              onClick={toggleCreatePost}
            >
              <div className="sidebar-icon-wrapper">
                <Plus size={24} />
              </div>
              <span className="nav-text">{t.nav.create}</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="divider" />
          <button
            type="button"
            className="nav-item"
            title={isLight ? t.nav.darkMode : t.nav.lightMode}
            onClick={() => toggleTheme()}
            aria-label={isLight ? t.nav.darkMode : t.nav.lightMode}
          >
            <div className="sidebar-icon-wrapper">
              {isLight ? (
                <Moon size={24} className="theme-icon-moon" />
              ) : (
                <Sun size={24} className="theme-icon-sun" />
              )}
            </div>
            <span className="nav-text">
              {isLight ? t.nav.darkMode : t.nav.lightMode}
            </span>
          </button>
          <button
            type="button"
            className={`nav-item${showSettings ? ' active' : ''}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              toggleSettings();
            }}
            aria-haspopup="dialog"
            aria-expanded={showSettings}
            aria-label={t.nav.settings}
          >
            <div className="sidebar-icon-wrapper">
              <Settings size={24} />
            </div>
            <span className="nav-text">{t.nav.settings}</span>
          </button>
          <button
            type="button"
            className={`nav-item${showHelp ? ' active' : ''}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              toggleHelp();
            }}
            aria-haspopup="dialog"
            aria-expanded={showHelp}
            aria-label={t.nav.help}
          >
            <div className="sidebar-icon-wrapper">
              <HelpCircle size={24} />
            </div>
            <span className="nav-text">{t.nav.help}</span>
          </button>

          <div className="user-account-section" onClick={() => navigate('/profile')}>
            <div className="avatar-wrapper">
              {sidebarAvatar ? (
                <img src={sidebarAvatar} alt="Me" className="avatar-img-sidebar" />
              ) : (
                <div className="default-avatar-box-small">
                  <UserCircle size={24} color="#94A3B8" />
                </div>
              )}
              <div className="status-dot" />
            </div>
            <div className="user-info-sidebar">
              <span className="sidebar-user-name">{sidebarName}</span>
              <span className="sidebar-user-handle">{sidebarHandle}</span>
            </div>
            <div
              className="sidebar-logout-icon"
              role="button"
              tabIndex={0}
              title={t.auth.logout}
              aria-disabled={loggingOut}
              onClick={(e) => {
                e.stopPropagation();
                setShowLogoutConfirm(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowLogoutConfirm(true);
                }
              }}
            >
              <LogOut size={18} />
            </div>
          </div>
        </div>
      </aside>

      {showSearch && (
        <div className="search-panel-wrap" ref={searchPanelRef}>
          <div className="search-panel" role="dialog" aria-label={t.searchPanel.title}>
            <div className="search-panel-header">
              <h2>{t.searchPanel.title}</h2>
              <button
                type="button"
                className="search-close-btn"
                aria-label={t.suggestions.close}
                onClick={() => setShowSearch(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="search-input-wrap">
              <Search size={18} className="search-input-icon" />
              <input
                ref={searchInputRef}
                type="search"
                className="search-input"
                placeholder={t.searchPanel.placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="search-panel-body">
              {searchQuery.trim().length < 2 && !searchLoading && (
                <p className="search-hint">
                  {searchQuery.trim().length === 0
                    ? t.searchPanel.empty
                    : t.searchPanel.hint}
                </p>
              )}
              {searchLoading && <p className="search-hint">{t.feed.loading}</p>}
              {!searchLoading && searchQuery.trim().length >= 2 && (
                <>
                  <p className="search-section-label">{t.searchPanel.usersSection}</p>
                  {searchResults.users.length === 0 ? (
                    <p className="search-empty">{t.searchPanel.noUsers}</p>
                  ) : (
                    searchResults.users.map((user) => {
                      const name = user.displayName?.trim() || t.feed.defaultUser;
                      const handle = user.email.split('@')[0];
                      return (
                        <div key={user.id} className="search-user-item">
                          <button
                            type="button"
                            className="search-user-main"
                            onClick={() => {
                              setShowSearch(false);
                              navigate(`/profile/${user.id}`);
                            }}
                          >
                            <img
                              src={avatarUrl(user.id, user.avatarUrl)}
                              alt=""
                              className="search-user-avatar"
                            />
                            <div className="search-user-text">
                              <span className="search-user-name">{name}</span>
                              <span className="search-user-handle">@{handle}</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="search-user-message-btn"
                            title={t.messages.newMessage}
                            aria-label={t.messages.newMessage}
                            onClick={() => {
                              setShowSearch(false);
                              navigate(`/messages/${user.id}`);
                            }}
                          >
                            <MessageCircle size={18} />
                          </button>
                        </div>
                      );
                    })
                  )}
                  <p className="search-section-label">{t.searchPanel.postsSection}</p>
                  {searchResults.posts.length === 0 ? (
                    <p className="search-empty">{t.searchPanel.noPosts}</p>
                  ) : (
                    searchResults.posts.map((post) => (
                      <div key={post.id} className="search-post-item">
                        <UserLink
                          userId={post.author.id}
                          displayName={post.author.displayName}
                          avatarUrl={post.author.avatarUrl}
                          variant="compact"
                        />
                        <button
                          type="button"
                          className="search-post-body"
                          onClick={() => {
                            setShowSearch(false);
                            navigate(`/post/${post.id}`);
                          }}
                        >
                          <span className="search-post-snippet">
                            {post.content?.trim() || '—'}
                          </span>
                        </button>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="feed-side-panel-wrap" ref={settingsPanelRef}>
          <div className="feed-side-panel" role="dialog" aria-label={t.settingsPanel.title}>
            <div className="feed-side-panel-header">
              <h2>{t.settingsPanel.title}</h2>
              <button
                type="button"
                className="feed-panel-close-btn"
                aria-label={t.suggestions.close}
                onClick={() => setShowSettings(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="feed-side-panel-body settings-panel-body">
              <section className="settings-section">
                <p className="settings-section-label">{t.settingsPanel.appearance}</p>
                <div className="theme-toggle-group" role="group" aria-label={t.settingsPanel.appearance}>
                  <button
                    type="button"
                    className={`theme-option${theme === 'dark' ? ' active' : ''}`}
                    onClick={() => setTheme('dark')}
                  >
                    {t.settingsPanel.themeDark}
                  </button>
                  <button
                    type="button"
                    className={`theme-option${theme === 'light' ? ' active' : ''}`}
                    onClick={() => setTheme('light')}
                  >
                    {t.settingsPanel.themeLight}
                  </button>
                </div>
              </section>
              <section className="settings-section">
                <p className="settings-section-label">{t.settingsPanel.language}</p>
                <div className="lang-toggle-group" role="group" aria-label={t.settingsPanel.language}>
                  {(['vi', 'en', 'ja'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      className={`lang-option${locale === lang ? ' active' : ''}`}
                      onClick={() => setLanguage(lang)}
                    >
                      {t.lang[lang]}
                    </button>
                  ))}
                </div>
              </section>
              <section className="settings-section">
                <p className="settings-section-label">{t.settingsPanel.account}</p>
                <button
                  type="button"
                  className="settings-action-btn"
                  onClick={() => {
                    setShowSettings(false);
                    navigate('/profile');
                  }}
                >
                  {t.settingsPanel.editProfile}
                </button>
              </section>
              <section className="settings-section settings-about">
                <p className="settings-section-label">{t.settingsPanel.about}</p>
                <p className="settings-version">{t.settingsPanel.version}</p>
              </section>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="feed-side-panel-wrap" ref={helpPanelRef}>
          <div
            className="feed-side-panel feed-side-panel-wide"
            role="dialog"
            aria-label={t.helpPanel.title}
          >
            <div className="feed-side-panel-header">
              <h2>{t.helpPanel.title}</h2>
              <button
                type="button"
                className="feed-panel-close-btn"
                aria-label={t.suggestions.close}
                onClick={() => setShowHelp(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="feed-side-panel-body help-panel-body">
              <p className="help-intro">{t.helpPanel.intro}</p>
              <div className="help-faq">
                {(
                  [
                    ['q1', 'a1'],
                    ['q2', 'a2'],
                    ['q3', 'a3'],
                    ['q4', 'a4'],
                  ] as const
                ).map(([qk, ak]) => (
                  <div key={qk} className="help-faq-item">
                    <p className="help-q">{t.helpPanel[qk]}</p>
                    <p className="help-a">{t.helpPanel[ak]}</p>
                  </div>
                ))}
              </div>
              <p className="help-contact">{t.helpPanel.contact}</p>
            </div>
          </div>
        </div>
      )}

      {showSaved && (
        <div className="feed-side-panel-wrap" ref={savedPanelRef}>
          <div className="feed-side-panel feed-side-panel-wide" role="dialog" aria-label={t.nav.saved}>
            <div className="feed-side-panel-header">
              <h2>{t.nav.saved}</h2>
              <button
                type="button"
                className="feed-panel-close-btn"
                aria-label={t.suggestions.close}
                onClick={() => setShowSaved(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="feed-side-panel-body search-panel-body">
              {savedLoading && <p className="search-hint">{t.feed.loading}</p>}
              {!savedLoading && savedPosts.length === 0 && (
                <p className="search-empty">{t.savedPanel.empty}</p>
              )}
              {!savedLoading &&
                savedPosts.map((post) => (
                  <div key={post.id} className="search-post-item">
                    <UserLink
                      userId={post.author.id}
                      displayName={post.author.displayName}
                      avatarUrl={post.author.avatarUrl}
                      variant="compact"
                    />
                    <button
                      type="button"
                      className="search-post-body"
                      onClick={() => {
                        setShowSaved(false);
                        navigate(`/post/${post.id}`);
                      }}
                    >
                      <span className="search-post-snippet">{post.content?.trim() || '—'}</span>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {showNotifications && (
        <div className="notifications-panel-wrap" ref={notificationsPanelRef}>
          <div className="notifications-panel" role="dialog" aria-label={t.notificationsPanel.title}>
            <div className="notifications-panel-header">
              <h2>{t.notificationsPanel.title}</h2>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notif-mark-all"
                  onClick={() => void handleMarkAllRead()}
                >
                  {t.notificationsPanel.markAllRead}
                </button>
              )}
              <button
                type="button"
                className="notif-close-btn"
                aria-label={t.suggestions.close}
                onClick={() => setShowNotifications(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="notifications-panel-body">
              {notificationsLoading && (
                <p className="notifications-empty">{t.feed.loading}</p>
              )}
              {!notificationsLoading && notifications.length === 0 && (
                <p className="notifications-empty">{t.notificationsPanel.empty}</p>
              )}
              {!notificationsLoading &&
                notifications.map((item) => {
                  const name = item.actor.displayName?.trim() || t.feed.defaultUser;
                  return (
                    <div
                      key={item.id}
                      className={`notification-item${item.isRead ? '' : ' unread'}`}
                    >
                      <UserLink
                        userId={item.actor.id}
                        displayName={item.actor.displayName}
                        avatarUrl={item.actor.avatarUrl}
                        variant="compact"
                        className="notif-user-link"
                      />
                      <button
                        type="button"
                        className="notif-action"
                        onClick={() => void handleNotificationClick(item)}
                      >
                        <p className="notif-text">
                          {notificationMessage(item.type, name, t.notificationsPanel)}
                        </p>
                        <span className="notif-time">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </button>
                      {!item.isRead && <span className="notif-dot" aria-hidden />}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div
          className="suggestions-modal-overlay"
          role="presentation"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="suggestions-modal"
            role="dialog"
            aria-label={t.auth.logout}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="suggestions-modal-header">
              <h2>{t.auth.logout}</h2>
              <button
                type="button"
                className="modal-close-btn"
                aria-label={t.suggestions.close}
                onClick={() => setShowLogoutConfirm(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="suggestions-modal-body logout-confirm-body">
              <p className="logout-confirm-text">{t.auth.logoutConfirm}</p>
              <div className="logout-confirm-actions">
                <button
                  type="button"
                  className="logout-confirm-cancel"
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  {t.suggestions.close}
                </button>
                <button
                  type="button"
                  className="logout-confirm-submit"
                  disabled={loggingOut}
                  onClick={() => void handleLogout()}
                >
                  {loggingOut ? '…' : t.auth.logout}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toastMsg && <div className="sidebar-toast">{toastMsg}</div>}

      <CreatePostModal
        open={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onCreated={handlePostCreated}
      />
    </>
  );
}
