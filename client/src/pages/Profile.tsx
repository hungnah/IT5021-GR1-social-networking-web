import {
  Bell,
  Grid,
  Home,
  HelpCircle,
  LogOut,
  MessageCircle,
  Moon,
  Pencil,
  Plus,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getStoredUser, logout, type Post, type UserProfile } from '../lib/api';
import './Profile.css';

const PRIVACY_LABELS: Record<string, string> = {
  Public: '🌐 Công khai',
  'Followers only': '👥 Người theo dõi',
  Private: '🔒 Chỉ mình tôi',
};

const Profile = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Edit profile modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Create post modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postPrivacy, setPostPrivacy] = useState<'Public' | 'Followers only' | 'Private'>('Public');
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState('');

  const loadData = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { navigate('/'); return; }

    try {
      setLoading(true);
      const storedUser = getStoredUser();
      const targetId = id ?? storedUser?.id;

      if (!targetId && !id) {
        const me = await api.get<UserProfile>('/users/me');
        setProfile(me);
        const myPosts = await api.get<Post[]>('/users/me/posts');
        setPosts(myPosts);
        setIsOwnProfile(true);
      } else if (id) {
        const userData = await api.get<UserProfile>(`/users/${id}`);
        setProfile(userData);
        const userPosts = await api.get<Post[]>(`/users/${id}/posts`);
        setPosts(userPosts);
        setIsOwnProfile(storedUser?.id === id);
      } else {
        const me = await api.get<UserProfile>('/users/me');
        setProfile(me);
        const myPosts = await api.get<Post[]>('/users/me/posts');
        setPosts(myPosts);
        setIsOwnProfile(true);
      }
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [id]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const openEditModal = () => {
    if (!profile) return;
    setEditDisplayName(profile.displayName ?? '');
    setEditBio(profile.bio ?? '');
    setEditAvatarUrl(profile.avatarUrl ?? '');
    setEditCoverUrl(profile.coverUrl ?? '');
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    try {
      setEditLoading(true);
      const updated = await api.patch<UserProfile>('/users/me', {
        displayName: editDisplayName || undefined,
        bio: editBio || undefined,
        avatarUrl: editAvatarUrl || undefined,
        coverUrl: editCoverUrl || undefined,
      });
      setProfile(updated);
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Cập nhật thất bại');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError('');
    if (!postContent.trim()) { setPostError('Nội dung bài viết không được để trống'); return; }
    try {
      setPostLoading(true);
      const newPost = await api.post<Post>('/posts', {
        content: postContent,
        privacyStatus: postPrivacy,
      });
      setPosts((prev) => [newPost, ...prev]);
      setProfile((prev) => prev ? { ...prev, postsCount: prev.postsCount + 1 } : prev);
      setPostContent('');
      setPostPrivacy('Public');
      setShowPostModal(false);
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Đăng bài thất bại');
    } finally {
      setPostLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setProfile((prev) => prev ? { ...prev, postsCount: Math.max(0, prev.postsCount - 1) } : prev);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Xóa thất bại');
    }
  };

  const avatarInitial = (profile?.displayName ?? profile?.email ?? '?')[0].toUpperCase();

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-screen">Đang tải...</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="profile-page">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="side-logo">⚡</div>
        <nav className="side-nav">
          <div className="nav-item active"><Home size={24} color="white" /></div>
          <div className="nav-item">
            <Bell size={24} color="white" />
          </div>
          <div className="nav-item"><MessageCircle size={24} color="white" /></div>
        </nav>
        <div className="side-bottom">
          <div className="nav-item"><Moon size={24} color="white" /></div>
          <div className="nav-item"><Settings size={24} color="white" /></div>
          <div className="nav-item"><HelpCircle size={24} color="white" /></div>
          {isOwnProfile && (
            <div className="nav-item logout-btn" onClick={handleLogout} title="Đăng xuất">
              <LogOut size={22} color="#ef4444" />
            </div>
          )}
          <div className="user-avatar-mini">{avatarInitial}</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-search">
          <div className="search-bar">
            <span>🔍</span>
            <input type="text" placeholder="Search FeedMe..." />
          </div>
        </header>

        <div className="profile-container">
          {/* Cover */}
          {profile.coverUrl && (
            <div className="cover-image">
              <img src={profile.coverUrl} alt="cover" />
            </div>
          )}

          {/* Profile Header */}
          <section className="profile-header">
            <div className="profile-avatar-large">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="avatar" />
              ) : (
                <div className="avatar-placeholder">{avatarInitial}</div>
              )}
            </div>

            <div className="profile-details">
              <div className="username-row">
                <span className="username">@{(profile.displayName ?? profile.email).replace(/\s+/g, '').toLowerCase()}</span>
                {isOwnProfile ? (
                  <>
                    <button className="btn-profile" onClick={openEditModal}>
                      <Pencil size={14} /> Edit profile
                    </button>
                    <button className="btn-profile btn-newpost" onClick={() => setShowPostModal(true)}>
                      <Plus size={14} /> New post
                    </button>
                    <button className="btn-profile btn-logout-text" onClick={handleLogout}>
                      <LogOut size={14} /> Đăng xuất
                    </button>
                  </>
                ) : (
                  <button className="btn-follow">Follow</button>
                )}
              </div>

              <div className="stats-row">
                <span><strong>{profile.postsCount}</strong> bài viết</span>
                <span><strong>{profile.followersCount}</strong> người theo dõi</span>
                <span><strong>{profile.followingCount}</strong> đang theo dõi</span>
              </div>

              <div className="bio-row">
                <p className="full-name">{profile.displayName ?? '(Chưa đặt tên)'}</p>
                {profile.bio && <p className="bio-text">{profile.bio}</p>}
              </div>
            </div>
          </section>

          {/* Posts */}
          <div className="profile-tabs">
            <span className="tab active"><Grid size={16} /> BÀI VIẾT</span>
          </div>

          {posts.length === 0 ? (
            <div className="empty-posts">
              {isOwnProfile ? (
                <>
                  <p>Bạn chưa có bài viết nào.</p>
                  <button className="btn-first-post" onClick={() => setShowPostModal(true)}>
                    Đăng bài viết đầu tiên
                  </button>
                </>
              ) : (
                <p>Người dùng này chưa có bài viết công khai.</p>
              )}
            </div>
          ) : (
            <div className="posts-list">
              {posts.map((post) => (
                <div key={post.id} className="post-card">
                  <div className="post-meta">
                    <span className="post-author">{profile.displayName ?? profile.email}</span>
                    <span className="post-privacy">{PRIVACY_LABELS[post.privacyStatus]}</span>
                    <span className="post-date">
                      {new Date(post.createdAt).toLocaleDateString('vi-VN', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </span>
                    {isOwnProfile && (
                      <button
                        className="btn-delete-post"
                        onClick={() => handleDeletePost(post.id)}
                        title="Xóa bài"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <p className="post-content">{post.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chỉnh sửa profile</h3>
              <button onClick={() => setShowEditModal(false)}><X size={20} /></button>
            </div>
            {editError && <div className="modal-error">{editError}</div>}
            <form onSubmit={(e) => { void handleEditSubmit(e); }}>
              <label>Tên hiển thị</label>
              <input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Tên của bạn"
                maxLength={100}
              />
              <label>Bio</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Giới thiệu bản thân..."
                maxLength={500}
                rows={3}
              />
              <label>URL ảnh đại diện</label>
              <input
                value={editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
              <label>URL ảnh bìa</label>
              <input
                value={editCoverUrl}
                onChange={(e) => setEditCoverUrl(e.target.value)}
                placeholder="https://..."
              />
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-save" disabled={editLoading}>
                  {editLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {showPostModal && (
        <div className="modal-overlay" onClick={() => setShowPostModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tạo bài viết mới</h3>
              <button onClick={() => setShowPostModal(false)}><X size={20} /></button>
            </div>
            {postError && <div className="modal-error">{postError}</div>}
            <form onSubmit={(e) => { void handleCreatePost(e); }}>
              <textarea
                className="post-textarea"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Bạn đang nghĩ gì?"
                rows={5}
                maxLength={5000}
              />
              <label>Quyền xem</label>
              <select
                value={postPrivacy}
                onChange={(e) => setPostPrivacy(e.target.value as typeof postPrivacy)}
              >
                <option value="Public">🌐 Công khai</option>
                <option value="Followers only">👥 Người theo dõi</option>
                <option value="Private">🔒 Chỉ mình tôi</option>
              </select>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowPostModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-save" disabled={postLoading}>
                  {postLoading ? 'Đang đăng...' : 'Đăng bài'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
