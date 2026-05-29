import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCircle,
  Grid,
  Tag,
  MapPin,
  Link as LinkIcon,
  Bookmark,
} from 'lucide-react';
import AppSidebar from '../components/app-shell/AppSidebar';
import { api, type UserProfile, type PostWithCounts } from '../lib/api';
import { getStoredUser } from '../store/authStore';
import '../theme/feed-theme.css';
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

  useEffect(() => {
    const onPostCreated = (e: Event) => {
      const detail = (e as CustomEvent<{ post: PostWithCounts }>).detail;
      if (!detail?.post) return;
      setPosts((prev) => [detail.post, ...prev.filter((p) => p.id !== detail.post.id)]);
      setProfile((prev) =>
        prev ? { ...prev, postsCount: prev.postsCount + 1 } : prev,
      );
    };
    window.addEventListener('feedme:post-created', onPostCreated);
    return () => window.removeEventListener('feedme:post-created', onPostCreated);
  }, []);

  const handle = profile
    ? `@${(profile.displayName ?? profile.email).replace(/\s+/g, '').toLowerCase()}`
    : '';

  if (loading) {
    return (
      <div className="app-shell-page profile-page profile-page--loading">
        <AppSidebar />
        <main className="main-content">
          <p className="profile-loading-text">Đang tải...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell-page profile-page">
      <AppSidebar />

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
