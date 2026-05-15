import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, Search, Bell, MessageCircle, Bookmark,
  Plus, Sun, Settings, LogOut, HelpCircle, UserCircle, Zap, Grid, Tag, MapPin, Link as LinkIcon,
} from 'lucide-react';
import { api, type UserProfile, type PostWithCounts } from '../lib/api';
import { getStoredUser, logout } from '../store/authStore';
import './Profile.css';

const POST_GRADIENTS = [
  'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
  'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)',
  'linear-gradient(135deg, #4a1942 0%, #c56cd6 100%)',
  'linear-gradient(135deg, #1a3c34 0%, #10b981 100%)',
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  'linear-gradient(135deg, #0d1117 0%, #30363d 100%)',
];

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!getStoredUser()) {
      navigate('/');
      return;
    }
    try {
      setLoading(true);
      const [me, myPosts] = await Promise.all([
        api.get<UserProfile>('/users/me'),
        api.get<PostWithCounts[]>('/users/me/posts'),
      ]);
      setProfile(me);
      setPosts(Array.isArray(myPosts) ? myPosts : []);
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handle = profile
    ? `@${(profile.displayName ?? profile.email).replace(/\s+/g, '').toLowerCase()}`
    : '';

  if (loading) {
    return (
      <div className="profile-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94A3B8' }}>Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* SIDEBAR TRÁI */}
      <aside className="left-sidebar">
        <div className="sidebar-top">
          <div className="brand-container" onClick={() => navigate('/feed')}>
            <div className="icon-box">
              <Zap size={22} fill="white" color="white" />
            </div>
            <span className="brand-name">FeedMe</span>
          </div>

          <nav className="nav-menu">
            <div className="nav-item" onClick={() => navigate('/feed')}>
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
              </div>
              <span className="nav-text">Notifications</span>
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
            <div className="nav-item">
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

          <div className="user-account-section active" onClick={() => { void handleLogout(); }}>
            <div className="avatar-wrapper">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Me" className="avatar-img-sidebar" />
              ) : (
                <div className="default-avatar-box-small">
                  <UserCircle size={24} color="#94A3B8" />
                </div>
              )}
              <div className="status-dot"></div>
            </div>
            <div className="user-info-sidebar">
              <span className="sidebar-user-name">{profile?.displayName ?? 'Người dùng'}</span>
              <span className="sidebar-user-handle">{handle}</span>
            </div>
            <div className="sidebar-logout-icon">
              <LogOut size={18} />
            </div>
          </div>
        </div>
      </aside>

      {/* NỘI DUNG CHÍNH */}
      <main className="main-content">
        <div className="profile-container">
          {/* Header Trang Cá Nhân */}
          <section className="profile-header">
            <div className="profile-avatar-large-container">
              <div className="profile-avatar-gradient-border">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="avatar" className="profile-avatar-img" />
                ) : (
                  <div className="profile-default-avatar">
                    <UserCircle size={100} strokeWidth={1} color="#94A3B8" />
                  </div>
                )}
              </div>
            </div>

            <div className="profile-details">
              <div className="username-row">
                <span className="username">{handle}</span>
                <button className="btn-profile">Edit profile</button>
                <button className="btn-profile">View archive</button>
                <span className="settings-icon">⚙️</span>
              </div>

              <div className="stats-row">
                <span><strong>{profile?.postsCount ?? 0}</strong> posts</span>
                <span><strong>{profile?.followersCount ?? 0}</strong> followers</span>
                <span><strong>{profile?.followingCount ?? 0}</strong> following</span>
              </div>

              <div className="bio-row">
                <p className="full-name">{profile?.displayName ?? ''}</p>
                {profile?.bio && <p className="job">{profile.bio}</p>}
                <div className="meta-info">
                  {profile?.location && (
                    <span className="location"><MapPin size={14} /> {profile.location}</span>
                  )}
                  {profile?.website && (
                    <span className="website">
                      <LinkIcon size={14} />
                      <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                        target="_blank" rel="noreferrer">
                        {profile.website}
                      </a>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Tab bài viết */}
          <div className="profile-tabs">
            <span className="tab active"><Grid size={16} /> POSTS</span>
            <span className="tab"><Bookmark size={16} /> SAVED</span>
            <span className="tab"><Tag size={16} /> TAGGED</span>
          </div>

          {/* Lưới bài viết */}
          <div className="image-grid">
            {posts.length === 0 ? (
              <p style={{ color: '#94A3B8', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>
                Chưa có bài viết nào
              </p>
            ) : (
              posts.map((post, idx) => (
                <div key={post.id} className="grid-item">
                  {post.imageUrl ? (
                    <img src={post.imageUrl} alt="post" />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: POST_GRADIENTS[idx % POST_GRADIENTS.length],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                      }}
                    >
                      <p style={{ color: 'white', fontSize: '12px', textAlign: 'center', overflow: 'hidden',
                        display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                        {post.content}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
