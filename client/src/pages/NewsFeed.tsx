import { useCallback, useEffect, useState } from 'react';
import {
  Home,
  Search,
  Bell,
  Bookmark,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Send,
  UserCircle,
  Zap,
  Settings,
  LogOut,
  Plus,
  Sun,
  HelpCircle,
  Globe,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, type FeedPost, type UserProfile } from '../lib/api';
import { getStoredUser, logout } from '../store/authStore';
import './NewsFeed.css';

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

function avatarUrl(userId: string, url: string | null): string {
  if (url) return url;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userId)}`;
}

const NewsFeed = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [me, setMe] = useState<UserProfile | null>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<FeedPost[]>('/posts/feed?limit=30');
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Không tải được bảng tin');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getStoredUser()) {
      navigate('/', { replace: true });
      return;
    }
    void loadFeed();
  }, [navigate, loadFeed]);

  useEffect(() => {
    if (!getStoredUser()) return;
    api
      .get<UserProfile>('/users/me')
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const stored = getStoredUser();
  const sidebarName =
    me?.displayName?.trim() ||
    (stored ? `${stored.firstName} ${stored.lastName}`.trim() : '') ||
    stored?.email ||
    'Bạn';
  const sidebarHandle = stored?.email
    ? `@${stored.email.split('@')[0]}`
    : '@user';
  const sidebarAvatar = me?.avatarUrl ?? null;

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="newsfeed-page">
      <aside className="left-sidebar">
        <div className="sidebar-top">
          <div className="brand-container" onClick={() => navigate('/feed')}>
            <div className="icon-box">
              <Zap size={22} fill="white" color="white" />
            </div>
            <span className="brand-name">FeedMe</span>
          </div>

          <nav className="nav-menu">
            <div className="nav-item active" onClick={() => navigate('/feed')}>
              <div className="sidebar-icon-wrapper">
                <Home size={24} />
              </div>
              <span className="nav-text">Home</span>
            </div>
            <div className="nav-item">
              <div className="sidebar-icon-wrapper">
                <Search size={24} />
              </div>
              <span className="nav-text">Search</span>
            </div>
            <div className="nav-item">
              <div className="sidebar-icon-wrapper">
                <Bell size={24} />
                <span className="count-badge">3</span>
              </div>
              <span className="nav-text">Notifications</span>
              <span className="nav-badge-right">3</span>
            </div>
            <div className="nav-item">
              <div className="sidebar-icon-wrapper">
                <MessageCircle size={24} />
              </div>
              <span className="nav-text">Messages</span>
            </div>
            <div className="nav-item">
              <div className="sidebar-icon-wrapper">
                <Bookmark size={24} />
              </div>
              <span className="nav-text">Saved</span>
            </div>
            <div className="nav-item" onClick={() => navigate('/profile')}>
              <div className="sidebar-icon-wrapper">
                <Plus size={24} />
              </div>
              <span className="nav-text">Create</span>
            </div>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="divider"></div>
          <div className="nav-item">
            <div className="sidebar-icon-wrapper">
              <Sun size={24} className="theme-icon-sun" />
            </div>
            <span className="nav-text">Light Mode</span>
          </div>
          <div className="nav-item">
            <div className="sidebar-icon-wrapper">
              <Settings size={24} />
            </div>
            <span className="nav-text">Settings</span>
          </div>
          <div className="nav-item">
            <div className="sidebar-icon-wrapper">
              <HelpCircle size={24} />
            </div>
            <span className="nav-text">Help</span>
          </div>

          <div className="user-account-section" onClick={() => navigate('/profile')}>
            <div className="avatar-wrapper">
              {sidebarAvatar ? (
                <img src={sidebarAvatar} alt="Me" className="avatar-img-sidebar" />
              ) : (
                <div className="default-avatar-box-small">
                  <UserCircle size={24} color="#94A3B8" />
                </div>
              )}
              <div className="status-dot"></div>
            </div>
            <div className="user-info-sidebar">
              <span className="sidebar-user-name">{sidebarName}</span>
              <span className="sidebar-user-handle">{sidebarHandle}</span>
            </div>
            <div className="sidebar-logout-icon" onClick={(e) => { e.stopPropagation(); void handleLogout(); }}>
              <LogOut size={18} />
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {loading && <div className="feed-state feed-loading">Đang tải bảng tin…</div>}
        {loadError && !loading && (
          <div className="feed-state feed-error">
            <p>{loadError}</p>
            <button type="button" className="feed-retry-btn" onClick={() => void loadFeed()}>
              Thử lại
            </button>
          </div>
        )}
        {!loading && !loadError && posts.length === 0 && (
          <div className="feed-state feed-empty">
            Chưa có bài viết công khai nào. Hãy đăng bài từ trang cá nhân!
          </div>
        )}
        {!loading &&
          !loadError &&
          posts.map((post) => {
            const authorLabel = post.author.displayName?.trim() || 'Người dùng';
            return (
              <article key={post.id} className="post-container">
                <header className="post-header">
                  <div className="post-user">
                    <div className="post-user-avatar">
                      <img
                        src={avatarUrl(post.author.id, post.author.avatarUrl)}
                        alt=""
                      />
                    </div>
                    <div className="user-meta">
                      <span className="user-name">{authorLabel}</span>
                      <span className="post-time">{formatRelativeTime(post.createdAt)}</span>
                    </div>
                  </div>
                  <button type="button" className="more-btn">
                    <MoreHorizontal size={20} />
                  </button>
                </header>

                {post.imageUrl ? (
                  <div className="post-content">
                    <img src={post.imageUrl} alt="" />
                  </div>
                ) : null}

                <footer className="post-footer">
                  <div className="interaction-bar">
                    <div className="left-actions">
                      <Heart size={24} className="action-icon" />
                      <MessageCircle size={24} className="action-icon" />
                      <Send size={24} className="action-icon" />
                    </div>
                    <Bookmark size={24} className="action-icon" />
                  </div>
                  <div className="likes-count">
                    {post.reactionCount} lượt thích · {post.commentCount} bình luận
                  </div>
                  <div className="caption-section">
                    <p>
                      <strong>{authorLabel}</strong>{' '}
                      {post.content ?? ''}
                    </p>
                  </div>
                </footer>
              </article>
            );
          })}
      </main>

      <aside className="right-sidebar">
        <div className="right-user-header">
          <div className="right-user-info">
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
          </div>

          <button type="button" className="logout-btn" onClick={() => void handleLogout()}>
            <LogOut size={16} /> <span>Log out</span>
          </button>
        </div>

        <div className="suggestions-section">
          <div className="sugg-header">
            <span>Suggested for you</span>
            <button type="button" className="see-all">
              See all
            </button>
          </div>

          {[
            { name: 'Marcus Rivera', mutual: '12 mutual follows' },
            { name: 'Priya Sharma', mutual: '8 mutual follows' },
            { name: 'James Carter', mutual: '5 mutual follows' },
          ].map((user, i) => (
            <div key={i} className="suggestion-item">
              <div className="sugg-user-info">
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                  alt=""
                  className="sugg-avatar"
                />
                <div className="sugg-text">
                  <span className="sugg-name">{user.name}</span>
                  <span className="sugg-mutual">{user.mutual}</span>
                </div>
              </div>
              <button type="button" className="follow-btn">
                Follow
              </button>
            </div>
          ))}
        </div>

        <div className="right-sidebar-footer">
          <div className="footer-links">
            <Globe size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            <span>Tiếng Việt</span>
            <span className="dot-sep">·</span>
            <span className="active-lang-blue">English</span>
            <span className="dot-sep">·</span>
            <span>日本語</span>
          </div>
          <div className="footer-links secondary">
            <span>About</span> <span className="dot-sep">·</span>
            <span>Help</span> <span className="dot-sep">·</span>
            <span>Privacy</span> <span className="dot-sep">·</span>
            <span>Terms</span> <span className="dot-sep">·</span>
            <span>Advertising</span> <span className="dot-sep">·</span>
            <span>More</span>
          </div>
          <div className="footer-copyright-main">FeedMe © 2026</div>
        </div>
      </aside>
    </div>
  );
};

export default NewsFeed;
