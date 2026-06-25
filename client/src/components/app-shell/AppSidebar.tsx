import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Home,
  Search,
  Bell,
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
  type UserProfile,
} from '../../lib/api';
import { avatarUrl } from '../../lib/avatar';
import { formatUsernameLabel } from '../../lib/username';
import { useLanguage } from '../../i18n/LanguageContext';
import type { Locale } from '../../i18n/translations';
import { useTheme } from '../../theme/ThemeContext';
import { getStoredUser, logout, refreshSession, subscribeAuth } from '../../store/authStore';
import { connectChatSocket, disconnectChatSocket } from '../../lib/chatSocket';
import NotificationsOverlay from '../notifications/NotificationsOverlay';
import SearchOverlay from '../search/SearchOverlay';
import CreatePostModal from '../create-post/CreatePostModal';
import type { PostWithCounts, TaggedUserSummary } from '../../lib/api';
import './AppSidebar.css';

export default function AppSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t, locale, setLocale } = useLanguage();
  const { theme, setTheme, toggleTheme, isLight } = useTheme();

  const [me, setMe] = useState<UserProfile | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messagesUnreadCount, setMessagesUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const helpPanelRef = useRef<HTMLDivElement>(null);
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
  const isProfile = pathname.startsWith('/profile');

  const handlePostCreated = (post: PostWithCounts, taggedUsers: TaggedUserSummary[]) => {
    showToast(t.createPost.success);
    window.dispatchEvent(
      new CustomEvent('feedme:post-created', {
        detail: {
          post,
          taggedUsers,
          author: me
            ? {
                id: me.id,
                username: me.username,
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
    }
    setShowCreatePost(next);
  };

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

  const loadMe = useCallback(async () => {
    const stored = getStoredUser();
    if (!stored) {
      setMe(null);
      return;
    }
    try {
      const profile = await api.get<UserProfile>('/users/me');
      if (getStoredUser()?.id === stored.id) {
        setMe(profile);
      }
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    if (!getStoredUser()) return;
    connectChatSocket();
    void refreshUnreadCount();
    void refreshMessagesUnreadCount();
    void loadMe();
  }, [loadMe, refreshMessagesUnreadCount, refreshUnreadCount]);

  useEffect(() => {
    const unsub = subscribeAuth((user) => {
      if (user) {
        void refreshSession().then(() => {
          connectChatSocket();
          void loadMe();
        });
      } else {
        setMe(null);
        disconnectChatSocket();
      }
    });

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'currentUser' || e.key === 'refreshToken') {
        void refreshSession().then(() => {
          connectChatSocket();
          void loadMe();
        });
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      unsub();
      window.removeEventListener('storage', onStorage);
    };
  }, [loadMe]);

  useEffect(() => {
    if (!getStoredUser()) return;
    const id = window.setInterval(() => {
      void refreshUnreadCount();
      void refreshMessagesUnreadCount();
    }, 20000);
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
    };
    window.addEventListener('feedme:activity', onFeedActivity);
    const onMessagesRead = () => {
      void refreshMessagesUnreadCount();
    };
    const onMessageNew = () => {
      void refreshMessagesUnreadCount();
    };
    window.addEventListener('feedme:messages-read', onMessagesRead);
    window.addEventListener('feedme:message-new', onMessageNew);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('feedme:activity', onFeedActivity);
      window.removeEventListener('feedme:messages-read', onMessagesRead);
      window.removeEventListener('feedme:message-new', onMessageNew);
    };
  }, [refreshMessagesUnreadCount, refreshUnreadCount]);

  useEffect(() => {
    if (!showSearch && !showSettings && !showHelp) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
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
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showSearch, showSettings, showHelp]);

  const stored = getStoredUser();
  const profileMatchesSession = Boolean(me && stored && me.id === stored.id);
  const sidebarName =
    (profileMatchesSession ? me?.displayName?.trim() : null) ||
    (stored ? `${stored.firstName} ${stored.lastName}`.trim() : '') ||
    stored?.email ||
    t.feed.defaultUser;
  const sidebarHandle = profileMatchesSession
    ? formatUsernameLabel(me?.username, me?.displayName, me?.id) ||
      (stored?.email ? `@${stored.email.split('@')[0]}` : '@user')
    : stored?.email
      ? `@${stored.email.split('@')[0]}`
      : '@user';
  const sidebarAvatar = profileMatchesSession && me
    ? avatarUrl(me.id, me.avatarUrl)
    : null;

  const anySidePanel =
    showSearch || showNotifications || showSettings || showHelp || showCreatePost;

  const closeSidePanels = () => {
    setShowSearch(false);
    setShowNotifications(false);
    setShowSettings(false);
    setShowHelp(false);
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
    }
  };

  const toggleSearch = () => {
    const next = !showSearch;
    setShowSearch(next);
    if (next) {
      setShowNotifications(false);
      setShowSettings(false);
      setShowHelp(false);
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
    }
  };

  useEffect(() => {
    if (!getStoredUser()) return;
    const onProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent<UserProfile>).detail;
      const stored = getStoredUser();
      if (detail && stored && detail.id === stored.id) {
        setMe(detail);
      } else {
        void loadMe();
      }
    };
    window.addEventListener('feedme:profile-updated', onProfileUpdated);
    return () => window.removeEventListener('feedme:profile-updated', onProfileUpdated);
  }, [loadMe]);

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
              className={`nav-item${showCreatePost ? ' active' : ''}`}
              aria-label={t.nav.create}
              onClick={toggleCreatePost}
            >
              <div className="sidebar-icon-wrapper">
                <Plus size={24} />
              </div>
              <span className="nav-text">{t.nav.create}</span>
            </button>
            <button
              type="button"
              className={`nav-item nav-item-profile${isProfile ? ' active' : ''}`}
              aria-label={t.nav.profile}
              onClick={() => {
                closeSidePanels();
                navigate('/profile');
              }}
            >
              <div className="sidebar-icon-wrapper nav-profile-avatar-wrap">
                {sidebarAvatar ? (
                  <img src={sidebarAvatar} alt="" className="nav-profile-avatar" />
                ) : (
                  <UserCircle size={24} />
                )}
              </div>
              <span className="nav-text">{t.nav.profile}</span>
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

      <SearchOverlay
        open={showSearch}
        onClose={() => setShowSearch(false)}
        panelRef={searchPanelRef}
      />

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

      {showNotifications && (
        <NotificationsOverlay
          open={showNotifications}
          onClose={() => setShowNotifications(false)}
          onUnreadChange={setUnreadCount}
        />
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
