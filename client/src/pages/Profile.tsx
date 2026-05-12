import {
  Bell,
  Bookmark,
  Grid,
  Heart,
  HelpCircle,
  Home,
  LogOut,
  MessageCircle,
  Moon,
  MoreHorizontal,
  PlusSquare,
  Send,
  Settings,
  Tag,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  api,
  getStoredUser,
  logout,
  type CommentWithUser,
  type PostWithCounts,
  type UserProfile,
} from '../lib/api';
import './Profile.css';

const POST_GRADIENTS = [
  'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  'linear-gradient(135deg, #0d1117 0%, #30363d 100%)',
  'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)',
  'linear-gradient(135deg, #4a1942 0%, #c56cd6 100%)',
  'linear-gradient(135deg, #1a3c34 0%, #10b981 100%)',
];

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return `${Math.floor(diff / 2592000)} tháng trước`;
}

const Profile = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'tagged'>('posts');

  // Settings dropdown
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLSpanElement>(null);

  // Edit profile modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editGender, setEditGender] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create post modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postPrivacy, setPostPrivacy] = useState<'Public' | 'Followers only' | 'Private'>('Public');
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState('');
  const postImageInputRef = useRef<HTMLInputElement>(null);

  // Post detail modal
  const [selectedPost, setSelectedPost] = useState<PostWithCounts | null>(null);
  const [postComments, setPostComments] = useState<CommentWithUser[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showPostOptions, setShowPostOptions] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Close settings dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { navigate('/'); return; }
    try {
      setLoading(true);
      const storedUser = getStoredUser();
      if (id) {
        const userData = await api.get<UserProfile>(`/users/${id}`);
        setProfile(userData);
        const userPosts = await api.get<PostWithCounts[]>(`/users/${id}/posts`);
        setPosts(userPosts);
        setIsOwnProfile(storedUser?.id === id);
      } else {
        const me = await api.get<UserProfile>('/users/me');
        setProfile(me);
        const myPosts = await api.get<PostWithCounts[]>('/users/me/posts');
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

  const handleLogout = () => { logout(); navigate('/'); };

  const openEditModal = () => {
    if (!profile) return;
    setEditDisplayName(profile.displayName ?? '');
    setEditBio(profile.bio ?? '');
    setEditGender(profile.gender ?? '');
    setAvatarFile(null);
    setAvatarPreview(null);
    setEditError('');
    setShowEditModal(true);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    try {
      setEditLoading(true);
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        await api.postForm<UserProfile>('/users/me/avatar', formData);
      }
      const updated = await api.patch<UserProfile>('/users/me', {
        displayName: editDisplayName || undefined,
        bio: editBio || undefined,
        gender: editGender || undefined,
      });
      setProfile(updated);
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Cập nhật thất bại');
    } finally {
      setEditLoading(false);
    }
  };

  const handlePostImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostImageFile(file);
    setPostImagePreview(URL.createObjectURL(file));
  };

  const openPostModal = () => {
    setPostContent('');
    setPostPrivacy('Public');
    setPostImageFile(null);
    setPostImagePreview(null);
    setPostError('');
    setShowPostModal(true);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError('');
    if (!postContent.trim() && !postImageFile) {
      setPostError('Vui lòng nhập nội dung hoặc chọn ảnh');
      return;
    }
    try {
      setPostLoading(true);
      const formData = new FormData();
      formData.append('content', postContent);
      formData.append('privacyStatus', postPrivacy);
      if (postImageFile) formData.append('image', postImageFile);
      const newPost = await api.postForm<PostWithCounts>('/posts', formData);
      setPosts((prev) => [{ ...newPost, reactionCount: 0, commentCount: 0 }, ...prev]);
      setProfile((prev) => prev ? { ...prev, postsCount: prev.postsCount + 1 } : prev);
      setShowPostModal(false);
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Đăng bài thất bại');
    } finally {
      setPostLoading(false);
    }
  };

  // ── Post detail modal handlers ──

  const openPostDetail = async (post: PostWithCounts) => {
    setSelectedPost(post);
    setIsLiked(false);
    setLikeCount(post.reactionCount);
    setNewComment('');
    setShowPostOptions(false);
    setPostComments([]);

    // Load comments
    setCommentsLoading(true);
    try {
      const comments = await api.get<CommentWithUser[]>(`/posts/${post.id}/comments`);
      setPostComments(comments);
    } catch {
      // ignore
    } finally {
      setCommentsLoading(false);
    }

    // Check if current user liked this post
    try {
      const status = await api.get<{ liked: boolean }>(`/posts/${post.id}/reaction-status`);
      setIsLiked(status.liked);
    } catch {
      // not authenticated or error — default false
    }
  };

  const closePostDetail = () => {
    setSelectedPost(null);
    setShowPostOptions(false);
  };

  const handleToggleLike = async () => {
    if (!selectedPost) return;
    try {
      const result = await api.post<{ liked: boolean; reactionCount: number }>(
        `/posts/${selectedPost.id}/reactions`,
        {},
      );
      setIsLiked(result.liked);
      setLikeCount(result.reactionCount);
      // Update the grid too
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPost.id ? { ...p, reactionCount: result.reactionCount } : p,
        ),
      );
    } catch {
      // ignore
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !newComment.trim()) return;
    setCommentSubmitting(true);
    try {
      const comment = await api.post<CommentWithUser>(
        `/posts/${selectedPost.id}/comments`,
        { content: newComment.trim() },
      );
      setPostComments((prev) => [...prev, comment]);
      setNewComment('');
      // Update comment count in grid
      const newCount = postComments.length + 1;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPost.id ? { ...p, commentCount: newCount } : p,
        ),
      );
      setSelectedPost((prev) => prev ? { ...prev, commentCount: newCount } : prev);
      // Scroll to bottom
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      // ignore
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteFromModal = async () => {
    if (!selectedPost) return;
    if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
    try {
      await api.delete(`/posts/${selectedPost.id}`);
      setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id));
      setProfile((prev) =>
        prev ? { ...prev, postsCount: Math.max(0, prev.postsCount - 1) } : prev,
      );
      closePostDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Xóa thất bại');
    }
  };

  const avatarInitial = (profile?.displayName ?? profile?.email ?? '?')[0].toUpperCase();
  const usernameSlug = (profile?.displayName ?? profile?.email ?? '').replace(/\s+/g, '').toLowerCase();

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-screen">Đang tải...</div>
      </div>
    );
  }
  if (!profile) return null;

  const detailPostOwnerName = profile.displayName ?? profile.email ?? '';
  const detailPostOwnerInitial = detailPostOwnerName[0]?.toUpperCase() ?? '?';
  const detailGradientIdx = selectedPost ? posts.findIndex((p) => p.id === selectedPost.id) : 0;

  return (
    <div className="profile-page">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="side-logo">⚡</div>
        <nav className="side-nav">
          <div className="nav-item active"><Home size={24} color="white" /></div>
          <div className="nav-item"><Bell size={24} color="white" /></div>
          <div className="nav-item"><MessageCircle size={24} color="white" /></div>
        </nav>
        <div className="side-bottom">
          <div className="nav-item"><Moon size={24} color="white" /></div>
          <div className="nav-item"><Settings size={24} color="white" /></div>
          <div className="nav-item"><HelpCircle size={24} color="white" /></div>
          {isOwnProfile && (
            <div className="nav-item logout-btn" onClick={handleLogout} title="Đăng xuất">
              <LogOut size={22} color="white" />
            </div>
          )}
          {isOwnProfile && (
            <div className="nav-item new-post-btn" onClick={openPostModal} title="Tạo bài viết">
              <PlusSquare size={24} color="white" />
            </div>
          )}
          <div className="user-avatar-mini">{avatarInitial}</div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <header className="top-search">
          <div className="search-bar">
            <span>🔍</span>
            <input type="text" placeholder="Search FeedMe..." />
          </div>
        </header>

        <div className="profile-container">
          {/* Profile Header */}
          <section className="profile-header">
            <div className="profile-avatar-large">
              {profile.avatarUrl
                ? <img src={profile.avatarUrl} alt="avatar" />
                : <div className="avatar-placeholder">{avatarInitial}</div>
              }
            </div>

            <div className="profile-details">
              <div className="username-row">
                <span className="username">@{usernameSlug}</span>

                {isOwnProfile ? (
                  <>
                    <button className="btn-profile" onClick={openEditModal}>Edit profile</button>
                    <button className="btn-profile">View archive</button>
                    <span className="settings-icon" ref={settingsRef} onClick={() => setShowSettings(!showSettings)}>
                      ⚙️
                      {showSettings && (
                        <div className="settings-dropdown">
                          <button onClick={() => { setShowSettings(false); setShowPostModal(true); }}>
                            <PlusSquare size={15} /> New post
                          </button>
                          <button className="logout-option" onClick={handleLogout}>
                            <LogOut size={15} /> Đăng xuất
                          </button>
                        </div>
                      )}
                    </span>
                  </>
                ) : (
                  <button className="btn-follow">Follow</button>
                )}
              </div>

              <div className="stats-row">
                <span><strong>{profile.postsCount}</strong> posts</span>
                <span><strong>{profile.followersCount.toLocaleString()}</strong> followers</span>
                <span><strong>{profile.followingCount}</strong> following</span>
              </div>

              <div className="bio-row">
                <p className="full-name">{profile.displayName ?? '(Chưa đặt tên)'}</p>
                {profile.bio
                  ? <p className="job">{profile.bio}</p>
                  : <p className="job" style={{ color: '#555' }}>Chưa có bio</p>
                }
              </div>
            </div>
          </section>

          {/* Tabs */}
          <div className="profile-tabs">
            <span className={`tab ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>
              <Grid size={16} /> POSTS
            </span>
            <span className={`tab ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => setActiveTab('saved')}>
              <Bookmark size={16} /> SAVED
            </span>
            <span className={`tab ${activeTab === 'tagged' ? 'active' : ''}`} onClick={() => setActiveTab('tagged')}>
              <Tag size={16} /> TAGGED
            </span>
          </div>

          {/* Posts Grid */}
          {activeTab === 'posts' && (
            posts.length === 0 ? (
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
              <div className="image-grid">
                {posts.map((post, idx) => (
                  <div
                    key={post.id}
                    className="grid-item"
                    style={post.imageUrl ? {} : { background: POST_GRADIENTS[idx % POST_GRADIENTS.length] }}
                    onClick={() => { void openPostDetail(post); }}
                  >
                    {post.imageUrl
                      ? <img src={post.imageUrl} alt="post" />
                      : <p className="grid-item-text">{post.content}</p>
                    }
                    <div className="grid-item-overlay">
                      <span className="grid-overlay-stat">
                        <Heart size={18} fill="white" color="white" />
                        {post.reactionCount}
                      </span>
                      <span className="grid-overlay-stat">
                        <MessageCircle size={18} fill="white" color="white" />
                        {post.commentCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'saved' && (
            <div className="empty-posts"><p>Chưa có bài viết đã lưu.</p></div>
          )}
          {activeTab === 'tagged' && (
            <div className="empty-posts"><p>Chưa có bài viết được gắn thẻ.</p></div>
          )}
        </div>
      </main>

      {/* ── Edit Profile Modal ── */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chỉnh sửa profile</h3>
              <button onClick={() => setShowEditModal(false)}><X size={20} /></button>
            </div>
            {editError && <div className="modal-error">{editError}</div>}
            <form onSubmit={(e) => { void handleEditSubmit(e); }}>
              <label>Ảnh đại diện</label>
              <div className="avatar-upload-row">
                <div className="avatar-upload-preview">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="preview" />
                  ) : profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="current" />
                  ) : (
                    <div className="avatar-upload-placeholder">{avatarInitial}</div>
                  )}
                </div>
                <div className="avatar-upload-actions">
                  <button
                    type="button"
                    className="btn-upload-file"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📁 Chọn ảnh từ máy tính
                  </button>
                  {avatarFile && (
                    <span className="avatar-filename">{avatarFile.name}</span>
                  )}
                  <p className="avatar-hint">JPG, PNG, GIF, WEBP · Tối đa 5MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleAvatarFileChange}
                />
              </div>

              <label>Tên hiển thị</label>
              <input value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} placeholder="Tên của bạn" maxLength={100} />

              <label>Bio</label>
              <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Giới thiệu bản thân..." maxLength={500} rows={3} />

              <label>Giới tính</label>
              <select value={editGender} onChange={(e) => setEditGender(e.target.value)}>
                <option value="">-- Chọn giới tính --</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Tùy chọn">Tùy chọn</option>
                <option value="Không muốn tiết lộ">Không muốn tiết lộ</option>
              </select>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>Hủy</button>
                <button type="submit" className="btn-save" disabled={editLoading}>
                  {editLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Post Modal ── */}
      {showPostModal && (
        <div className="modal-overlay" onClick={() => setShowPostModal(false)}>
          <div className="modal-box post-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tạo bài viết mới</h3>
              <button onClick={() => setShowPostModal(false)}><X size={20} /></button>
            </div>
            {postError && <div className="modal-error">{postError}</div>}
            <form onSubmit={(e) => { void handleCreatePost(e); }}>
              <div
                className={`post-image-area ${postImagePreview ? 'has-image' : ''}`}
                onClick={() => postImageInputRef.current?.click()}
              >
                {postImagePreview ? (
                  <>
                    <img src={postImagePreview} alt="preview" className="post-image-preview" />
                    <button
                      type="button"
                      className="btn-remove-image"
                      onClick={(e) => { e.stopPropagation(); setPostImageFile(null); setPostImagePreview(null); }}
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <div className="post-image-placeholder">
                    <span className="post-image-icon">🖼️</span>
                    <p>Nhấn để thêm ảnh</p>
                    <span className="post-image-hint">JPG, PNG, GIF, WEBP · Tối đa 10MB</span>
                  </div>
                )}
              </div>
              <input
                ref={postImageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePostImageChange}
              />
              <textarea
                className="post-caption"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Viết caption..."
                rows={3}
                maxLength={5000}
              />
              <div className="post-footer-row">
                <select
                  className="post-privacy-select"
                  value={postPrivacy}
                  onChange={(e) => setPostPrivacy(e.target.value as typeof postPrivacy)}
                >
                  <option value="Public">🌐 Công khai</option>
                  <option value="Followers only">👥 Người theo dõi</option>
                  <option value="Private">🔒 Chỉ mình tôi</option>
                </select>
                <div className="post-btn-group">
                  <button type="button" className="btn-cancel" onClick={() => setShowPostModal(false)}>Hủy</button>
                  <button type="submit" className="btn-save" disabled={postLoading}>
                    {postLoading ? 'Đang đăng...' : 'Đăng bài'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Post Detail Modal ── */}
      {selectedPost && (
        <div className="modal-overlay post-detail-overlay" onClick={closePostDetail}>
          <div className="post-detail-modal" onClick={(e) => e.stopPropagation()}>
            {/* Left: image / gradient */}
            <div
              className="post-detail-left"
              style={
                selectedPost.imageUrl
                  ? {}
                  : { background: POST_GRADIENTS[detailGradientIdx >= 0 ? detailGradientIdx % POST_GRADIENTS.length : 0] }
              }
            >
              {selectedPost.imageUrl ? (
                <img src={selectedPost.imageUrl} alt="post" className="post-detail-image" />
              ) : (
                <p className="post-detail-text-content">{selectedPost.content}</p>
              )}
            </div>

            {/* Right: info + comments */}
            <div className="post-detail-right">
              {/* Header */}
              <div className="post-detail-header">
                <div className="post-detail-author">
                  <div className="post-detail-avatar">
                    {profile.avatarUrl
                      ? <img src={profile.avatarUrl} alt="avatar" />
                      : <span>{detailPostOwnerInitial}</span>
                    }
                  </div>
                  <span className="post-detail-username">@{usernameSlug}</span>
                </div>
                <div className="post-detail-menu-wrap">
                  <button
                    className="post-detail-more-btn"
                    onClick={() => setShowPostOptions(!showPostOptions)}
                  >
                    <MoreHorizontal size={20} />
                  </button>
                  {showPostOptions && (
                    <div className="post-detail-options">
                      {isOwnProfile && (
                        <button className="post-option-delete" onClick={() => { void handleDeleteFromModal(); }}>
                          Xóa bài viết
                        </button>
                      )}
                      <button onClick={closePostDetail}>Đóng</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments area */}
              <div className="post-detail-comments">
                {/* Author caption */}
                {selectedPost.content && (
                  <div className="comment-item">
                    <div className="comment-avatar">
                      {profile.avatarUrl
                        ? <img src={profile.avatarUrl} alt="avatar" />
                        : <span>{detailPostOwnerInitial}</span>
                      }
                    </div>
                    <div className="comment-body">
                      <span className="comment-username">@{usernameSlug}</span>
                      <span className="comment-text">{selectedPost.content}</span>
                      <span className="comment-time">{timeAgo(selectedPost.createdAt)}</span>
                    </div>
                  </div>
                )}

                {commentsLoading ? (
                  <p className="comments-loading">Đang tải bình luận...</p>
                ) : (
                  postComments.map((c) => {
                    const cInitial = (c.user.displayName ?? c.user.id)[0]?.toUpperCase() ?? '?';
                    const cName = c.user.displayName ?? 'Người dùng';
                    return (
                      <div key={c.id} className="comment-item">
                        <div className="comment-avatar">
                          {c.user.avatarUrl
                            ? <img src={c.user.avatarUrl} alt="avatar" />
                            : <span>{cInitial}</span>
                          }
                        </div>
                        <div className="comment-body">
                          <span className="comment-username">@{cName.replace(/\s+/g, '').toLowerCase()}</span>
                          <span className="comment-text">{c.content}</span>
                          <span className="comment-time">{timeAgo(c.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Action bar */}
              <div className="post-detail-actions">
                <button
                  className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
                  onClick={() => { void handleToggleLike(); }}
                >
                  <Heart size={22} fill={isLiked ? '#ef4444' : 'none'} color={isLiked ? '#ef4444' : 'white'} />
                </button>
                <button className="action-btn">
                  <MessageCircle size={22} color="white" />
                </button>
                <button className="action-btn">
                  <Send size={22} color="white" />
                </button>
                <button className="action-btn bookmark-btn">
                  <Bookmark size={22} color="white" />
                </button>
              </div>

              <div className="post-detail-like-count">
                <strong>{likeCount.toLocaleString()} lượt thích</strong>
              </div>
              <div className="post-detail-date">{timeAgo(selectedPost.createdAt)}</div>

              {/* Comment input */}
              <form className="post-detail-input-row" onSubmit={(e) => { void handleAddComment(e); }}>
                <span className="comment-emoji-btn">😊</span>
                <input
                  type="text"
                  placeholder="Thêm bình luận..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  maxLength={1000}
                />
                <button
                  type="submit"
                  className="comment-submit-btn"
                  disabled={!newComment.trim() || commentSubmitting}
                >
                  {commentSubmitting ? '...' : 'Đăng'}
                </button>
              </form>
            </div>

            {/* Close button */}
            <button className="post-detail-close" onClick={closePostDetail}>
              <X size={24} color="white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
