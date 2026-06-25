import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  UserCircle,
  Grid,
  Tag,
  MapPin,
  Link as LinkIcon,
  Bookmark,
  Lock,
  X,
  MessageCircle,
} from 'lucide-react';
import AppSidebar from '../components/app-shell/AppSidebar';
import EditProfileModal from '../components/profile/EditProfileModal';
import UserListModal from '../components/profile/UserListModal';
import {
  api,
  ApiError,
  type FeedPost,
  type PostWithCounts,
  type SearchUserHit,
  type UserProfile,
} from '../lib/api';
import { avatarUrl } from '../lib/avatar';
import { formatUsernameLabel } from '../lib/username';
import { useLanguage } from '../i18n/LanguageContext';
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

type ProfileTab = 'posts' | 'saved' | 'tagged';

type GridPost = {
  id: string;
  content: string | null;
  imageUrl: string | null;
  privacyStatus?: string;
};

function PostGrid({
  posts,
  emptyText,
  onOpenPost,
}: {
  posts: GridPost[];
  emptyText: string;
  onOpenPost: (id: string) => void;
}) {
  if (posts.length === 0) {
    return (
      <p className="profile-grid-empty">{emptyText}</p>
    );
  }
  return (
    <div className="image-grid">
      {posts.map((post, idx) => (
        <button
          key={post.id}
          type="button"
          className="grid-item"
          onClick={() => onOpenPost(post.id)}
          aria-label="Open post"
        >
          {post.imageUrl ? (
            <img src={post.imageUrl} alt="" />
          ) : (
            <div
              className="grid-item-text"
              style={{ background: POST_GRADIENTS[idx % POST_GRADIENTS.length] }}
            >
              <p>{post.content}</p>
            </div>
          )}
          {post.privacyStatus === 'Private' && (
            <span className="grid-item-private" aria-hidden>
              <Lock size={14} />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

const Profile = () => {
  const navigate = useNavigate();
  const { id: routeUserId } = useParams<{ id?: string }>();
  const { t } = useLanguage();

  const [meId, setMeId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostWithCounts[]>([]);
  const [savedPosts, setSavedPosts] = useState<FeedPost[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<PostWithCounts[]>([]);
  const [archivePosts, setArchivePosts] = useState<PostWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followers, setFollowers] = useState<SearchUserHit[]>([]);
  const [following, setFollowing] = useState<SearchUserHit[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const tabLoadSeqRef = useRef(0);

  const profileId = routeUserId ?? meId;
  const isOwnProfile =
    !!meId &&
    (!routeUserId || routeUserId.toLowerCase() === meId.toLowerCase());

  const handle = profile
    ? formatUsernameLabel(profile.username, profile.displayName, profile.id)
    : '';

  const fetchSavedPosts = useCallback(async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const data = await api.get<FeedPost[]>('/posts/saved?limit=50&offset=0');
        setSavedPosts(Array.isArray(data) ? data : []);
        return;
      } catch {
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }
    }
  }, []);

  const handleTabChange = useCallback((tab: ProfileTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setTabLoading(true);
  }, [activeTab]);

  const loadPostsForTab = useCallback(
    async (userId: string, tab: ProfileTab, own: boolean) => {
      const seq = ++tabLoadSeqRef.current;
      setTabLoading(true);
      try {
        if (tab === 'posts') {
          const data = own
            ? await api.get<PostWithCounts[]>('/users/me/posts')
            : await api.get<PostWithCounts[]>(`/users/${userId}/posts`);
          if (seq !== tabLoadSeqRef.current) return;
          const list = Array.isArray(data) ? data : [];
          setPosts(own ? list.filter((p) => p.privacyStatus === 'Public') : list);
        } else if (tab === 'saved' && own) {
          await fetchSavedPosts();
        } else if (tab === 'tagged') {
          const data = await api.get<PostWithCounts[]>(`/users/${userId}/tagged-posts`);
          if (seq !== tabLoadSeqRef.current) return;
          setTaggedPosts(Array.isArray(data) ? data : []);
        }
      } catch {
        if (seq !== tabLoadSeqRef.current) return;
        if (tab === 'posts') setPosts([]);
        if (tab === 'tagged') setTaggedPosts([]);
      } finally {
        if (seq === tabLoadSeqRef.current) {
          setTabLoading(false);
        }
      }
    },
    [fetchSavedPosts],
  );

  const loadData = useCallback(async () => {
    if (!getStoredUser()) {
      navigate('/');
      return;
    }
    try {
      setLoading(true);
      const me = await api.get<UserProfile>('/users/me');
      setMeId(me.id);
      const targetId = routeUserId ?? me.id;
      const own =
        !routeUserId || routeUserId.toLowerCase() === me.id.toLowerCase();
      const [userProfile, followRes] = await Promise.all([
        own ? Promise.resolve(me) : api.get<UserProfile>(`/users/${targetId}`),
        own
          ? Promise.resolve({ following: false })
          : api.get<{ following: boolean }>(`/users/${targetId}/follow-status`),
      ]);
      setProfile(userProfile);
      setIsFollowing(!!followRes.following);
      if (!own) setActiveTab('posts');
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [navigate, routeUserId]);

  useEffect(() => {
    if (loading || !isOwnProfile) return;
    void fetchSavedPosts();
  }, [fetchSavedPosts, isOwnProfile, loading]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!profileId || loading) return;
    if (activeTab === 'saved' && !isOwnProfile) {
      setActiveTab('posts');
      return;
    }
    void loadPostsForTab(profileId, activeTab, isOwnProfile);
  }, [activeTab, isOwnProfile, loadPostsForTab, loading, profileId]);

  useEffect(() => {
    const onPostCreated = (e: Event) => {
      if (!isOwnProfile) return;
      const detail = (e as CustomEvent<{ post: PostWithCounts }>).detail;
      if (!detail?.post) return;
      if (detail.post.privacyStatus === 'Public') {
        setPosts((prev) => [detail.post, ...prev.filter((p) => p.id !== detail.post.id)]);
      }
      setProfile((prev) =>
        prev ? { ...prev, postsCount: prev.postsCount + 1 } : prev,
      );
    };
    window.addEventListener('feedme:post-created', onPostCreated);
    return () => window.removeEventListener('feedme:post-created', onPostCreated);
  }, [isOwnProfile]);

  useEffect(() => {
    if (!isOwnProfile || !getStoredUser()) return;
    const onActivity = () => {
      void fetchSavedPosts();
    };
    window.addEventListener('feedme:activity', onActivity);
    return () => window.removeEventListener('feedme:activity', onActivity);
  }, [fetchSavedPosts, isOwnProfile]);

  const openArchive = async () => {
    setShowArchive(true);
    try {
      const data = await api.get<PostWithCounts[]>('/users/me/posts/archive');
      setArchivePosts(Array.isArray(data) ? data : []);
    } catch {
      setArchivePosts([]);
    }
  };

  const openFollowers = async () => {
    if (!profileId) return;
    setShowFollowers(true);
    setListLoading(true);
    try {
      const data = await api.get<SearchUserHit[]>(`/users/${profileId}/followers`);
      setFollowers(Array.isArray(data) ? data : []);
    } catch {
      setFollowers([]);
    } finally {
      setListLoading(false);
    }
  };

  const openFollowing = async () => {
    if (!profileId) return;
    setShowFollowing(true);
    setListLoading(true);
    try {
      const data = await api.get<SearchUserHit[]>(`/users/${profileId}/following`);
      setFollowing(Array.isArray(data) ? data : []);
    } catch {
      setFollowing([]);
    } finally {
      setListLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!profileId || isOwnProfile || followBusy) return;
    setFollowBusy(true);
    try {
      const res = await api.post<{ following: boolean }>(`/users/${profileId}/follow`, {});
      setIsFollowing(!!res.following);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              followersCount: Math.max(
                0,
                prev.followersCount + (res.following ? 1 : -1),
              ),
            }
          : prev,
      );
      window.dispatchEvent(new CustomEvent('feedme:activity'));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : t.profile.followError);
    } finally {
      setFollowBusy(false);
    }
  };

  const gridPosts: GridPost[] = useMemo(() => {
    if (activeTab === 'tagged') {
      return taggedPosts.map((p) => ({
        id: p.id,
        content: p.content,
        imageUrl: p.imageUrl,
        privacyStatus: p.privacyStatus,
      }));
    }
    if (activeTab === 'saved') {
      return savedPosts.map((p) => ({
        id: p.id,
        content: p.content,
        imageUrl: p.imageUrl,
      }));
    }
    return posts.map((p) => ({
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      privacyStatus: p.privacyStatus,
    }));
  }, [activeTab, posts, savedPosts, taggedPosts]);

  const emptyText =
    activeTab === 'saved'
      ? t.savedPanel.empty
      : activeTab === 'tagged'
        ? t.profile.taggedEmpty
        : t.profile.noPosts;

  if (loading || !profile) {
    return (
      <div className="app-shell-page profile-page profile-page--loading">
        <AppSidebar />
        <main className="main-content">
          <p className="profile-loading-text">{t.feed.loading}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell-page profile-page">
      <AppSidebar />

      <main className="main-content">
        <div className="profile-container">
          <section className="profile-header">
            <div className="profile-avatar-large-container">
              <div className="profile-avatar-gradient-border">
                {profile.avatarUrl ? (
                  <img src={avatarUrl(profile.id, profile.avatarUrl)} alt="" className="profile-avatar-img" />
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
                {isOwnProfile ? (
                  <>
                    <button
                      type="button"
                      className="btn-profile"
                      onClick={() => setShowEditModal(true)}
                    >
                      {t.profile.editProfile}
                    </button>
                    <button type="button" className="btn-profile" onClick={() => void openArchive()}>
                      {t.profile.viewArchive}
                    </button>
                    <button
                      type="button"
                      className="settings-icon-btn"
                      aria-label={t.nav.settings}
                      onClick={() => setShowEditModal(true)}
                    >
                      ⚙️
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`btn-profile btn-follow${isFollowing ? ' following' : ''}`}
                      disabled={followBusy}
                      onClick={() => void handleFollowToggle()}
                    >
                      {isFollowing ? t.suggestions.following : t.suggestions.follow}
                    </button>
                    <button
                      type="button"
                      className="btn-profile btn-profile-icon"
                      onClick={() => navigate(`/messages/${profile.id}`)}
                    >
                      <MessageCircle size={16} />
                      <span>{t.profile.message}</span>
                    </button>
                  </>
                )}
              </div>

              <div className="stats-row">
                <span>
                  <strong>{profile.postsCount}</strong> {t.profile.posts}
                </span>
                <button type="button" className="stats-btn" onClick={() => void openFollowers()}>
                  <strong>{profile.followersCount}</strong> {t.profile.followers}
                </button>
                <button type="button" className="stats-btn" onClick={() => void openFollowing()}>
                  <strong>{profile.followingCount}</strong> {t.profile.following}
                </button>
              </div>

              <div className="bio-row">
                <p className="full-name">{profile.displayName ?? ''}</p>
                {profile.bio && <p className="job">{profile.bio}</p>}
                <div className="meta-info">
                  {profile.location && (
                    <span className="location">
                      <MapPin size={14} /> {profile.location}
                    </span>
                  )}
                  {profile.website && (
                    <span className="website">
                      <LinkIcon size={14} />
                      <a
                        href={
                          profile.website.startsWith('http')
                            ? profile.website
                            : `https://${profile.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        {profile.website}
                      </a>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="profile-tabs">
            <button
              type="button"
              className={`tab${activeTab === 'posts' ? ' active' : ''}`}
              onClick={() => handleTabChange('posts')}
            >
              <Grid size={16} /> {t.profile.tabPosts}
            </button>
            {isOwnProfile && (
              <button
                type="button"
                className={`tab${activeTab === 'saved' ? ' active' : ''}`}
                onClick={() => handleTabChange('saved')}
              >
                <Bookmark size={16} /> {t.profile.tabSaved}
              </button>
            )}
            <button
              type="button"
              className={`tab${activeTab === 'tagged' ? ' active' : ''}`}
              onClick={() => handleTabChange('tagged')}
            >
              <Tag size={16} /> {t.profile.tabTagged}
            </button>
          </div>

          {tabLoading && gridPosts.length === 0 ? (
            <p className="profile-grid-empty">{t.feed.loading}</p>
          ) : (
            <PostGrid
              posts={gridPosts}
              emptyText={emptyText}
              onOpenPost={(postId) => navigate(`/post/${postId}`)}
            />
          )}
        </div>
      </main>

      {isOwnProfile && (
        <EditProfileModal
          open={showEditModal}
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setProfile(updated);
            window.dispatchEvent(
              new CustomEvent('feedme:profile-updated', { detail: updated }),
            );
            window.dispatchEvent(new CustomEvent('feedme:activity'));
          }}
        />
      )}

      <UserListModal
        open={showFollowers}
        title={t.profile.followers}
        users={followers}
        loading={listLoading}
        onClose={() => setShowFollowers(false)}
      />

      <UserListModal
        open={showFollowing}
        title={t.profile.followingLabel}
        users={following}
        loading={listLoading}
        onClose={() => setShowFollowing(false)}
      />

      {showArchive && (
        <div className="profile-archive-overlay" role="presentation" onClick={() => setShowArchive(false)}>
          <div
            className="profile-archive-modal"
            role="dialog"
            aria-label={t.profile.archiveTitle}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profile-archive-header">
              <h2>{t.profile.archiveTitle}</h2>
              <button
                type="button"
                className="profile-archive-close"
                aria-label={t.suggestions.close}
                onClick={() => setShowArchive(false)}
              >
                <X size={20} />
              </button>
            </div>
            <p className="profile-archive-hint">{t.profile.archiveHint}</p>
            <PostGrid
              posts={archivePosts.map((p) => ({
                id: p.id,
                content: p.content,
                imageUrl: p.imageUrl,
                privacyStatus: p.privacyStatus,
              }))}
              emptyText={t.profile.archiveEmpty}
              onOpenPost={(postId) => {
                setShowArchive(false);
                navigate(`/post/${postId}`);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
