import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Globe,
  ImagePlus,
  Lock,
  Smile,
  X,
} from 'lucide-react';
import {
  api,
  type PostWithCounts,
  type SearchResult,
  type SearchUserHit,
  type TaggedUserSummary,
  type UserProfile,
} from '../../lib/api';
import UserLink from '../common/UserLink';
import { avatarUrl } from '../../lib/avatar';
import { resolveUsername } from '../../lib/username';
import { useLanguage } from '../../i18n/LanguageContext';
import { getStoredUser } from '../../store/authStore';
import './CreatePostModal.css';

type PrivacyChoice = 'Public' | 'Private';

const CAPTION_MAX = 2200;

export interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (post: PostWithCounts, taggedUsers: TaggedUserSummary[]) => void;
}

export default function CreatePostModal({ open, onClose, onCreated }: CreatePostModalProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);

  const [me, setMe] = useState<UserProfile | null>(null);
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyChoice>('Public');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [tagResults, setTagResults] = useState<SearchUserHit[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<SearchUserHit[]>([]);
  const [tagSearching, setTagSearching] = useState(false);
  const [friends, setFriends] = useState<SearchUserHit[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const revokePreviews = useCallback((urls: string[]) => {
    urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const resetForm = useCallback(() => {
    revokePreviews(previewUrlsRef.current);
    previewUrlsRef.current = [];
    setContent('');
    setPrivacy('Public');
    setImageFiles([]);
    setImagePreviews([]);
    setActiveImageIndex(0);
    setShowTagPanel(false);
    setTagQuery('');
    setTagResults([]);
    setTaggedUsers([]);
    setFriends([]);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [revokePreviews]);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    void api.get<UserProfile>('/users/me').then(setMe).catch(() => setMe(null));
    setFriendsLoading(true);
    void api
      .get<SearchUserHit[]>('/users/me/following?limit=30')
      .then((data) => setFriends(Array.isArray(data) ? data : []))
      .catch(() => setFriends([]))
      .finally(() => setFriendsLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = tagQuery.trim();
    if (q.length < 2) {
      setTagResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setTagSearching(true);
      void api
        .get<SearchResult>(`/search?q=${encodeURIComponent(q)}&limit=8`)
        .then((res) => setTagResults(Array.isArray(res.users) ? res.users : []))
        .catch(() => setTagResults([]))
        .finally(() => setTagSearching(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [open, tagQuery]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    previewUrlsRef.current = [...previewUrlsRef.current, ...newPreviews];
    setImageFiles((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    setActiveImageIndex((prev) => (prev === 0 && imageFiles.length === 0 ? 0 : prev));
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeActiveImage = () => {
    if (imagePreviews.length === 0) return;
    URL.revokeObjectURL(imagePreviews[activeImageIndex]);
    previewUrlsRef.current = previewUrlsRef.current.filter(
      (_, i) => i !== activeImageIndex,
    );
    setImageFiles((prev) => prev.filter((_, i) => i !== activeImageIndex));
    setImagePreviews((prev) => prev.filter((_, i) => i !== activeImageIndex));
    setActiveImageIndex((prev) => Math.max(0, Math.min(prev, imagePreviews.length - 2)));
  };

  const goPrevImage = () => {
    setActiveImageIndex((i) => (i > 0 ? i - 1 : imagePreviews.length - 1));
  };

  const goNextImage = () => {
    setActiveImageIndex((i) => (i < imagePreviews.length - 1 ? i + 1 : 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!content.trim() && imageFiles.length === 0) {
      setError(t.createPost.requireContentOrImage);
      return;
    }
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('content', content.trim());
      formData.append('privacyStatus', privacy);
      if (taggedUsers.length > 0) {
        formData.append(
          'taggedUserIds',
          JSON.stringify(taggedUsers.map((u) => u.id)),
        );
      }
      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          formData.append('images', file);
        }
      }
      const newPost = await api.postForm<PostWithCounts & { imageUrls?: string[] }>(
        '/posts',
        formData,
      );
      const tagSummary: TaggedUserSummary[] = taggedUsers.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
      }));
      onCreated?.(newPost, tagSummary);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.createPost.error);
    } finally {
      setSubmitting(false);
    }
  };

  const addTaggedUser = (user: SearchUserHit) => {
    setTaggedUsers((prev) =>
      prev.some((u) => u.id === user.id) ? prev : [...prev, user],
    );
  };

  const renderTagPickRow = (user: SearchUserHit, onPick: () => void) => {
    const name = user.displayName?.trim() || user.email.split('@')[0];
    const handle = user.username
      ? `@${user.username}`
      : `@${user.email.split('@')[0]}`;
    return (
      <button type="button" className="create-post-tag-pick-row" onClick={onPick}>
        <img
          src={avatarUrl(user.id, user.avatarUrl)}
          alt=""
          className="create-post-tag-pick-avatar"
        />
        <span className="create-post-tag-pick-text">
          <span className="create-post-tag-pick-name">{name}</span>
          <span className="create-post-tag-handle">{handle}</span>
        </span>
        <span className="create-post-tag-add" aria-hidden>
          +
        </span>
      </button>
    );
  };

  if (!open) return null;

  const stored = getStoredUser();
  const username = me
    ? resolveUsername(me.username, me.displayName, me.id, me.email)
    : stored?.email.split('@')[0] ?? 'user';
  const hasMultipleImages = imagePreviews.length > 1;
  const activePreview = imagePreviews[activeImageIndex] ?? null;

  return (
    <div className="create-post-overlay" role="presentation" onClick={onClose}>
      <div
        className="create-post-modal create-post-modal--wide"
        role="dialog"
        aria-labelledby="create-post-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="create-post-header">
          <button
            type="button"
            className="create-post-back"
            aria-label={t.suggestions.close}
            onClick={onClose}
          >
            <ArrowLeft size={22} />
          </button>
          <h2 id="create-post-title">{t.createPost.newTitle}</h2>
          <button
            type="submit"
            form="create-post-form"
            className="create-post-share"
            disabled={submitting}
          >
            {submitting ? t.createPost.submitting : t.createPost.share}
          </button>
        </div>

        <form
          id="create-post-form"
          className="create-post-body"
          onSubmit={(e) => void handleSubmit(e)}
        >
          <div className="create-post-media">
            {activePreview ? (
              <>
                <button
                  type="button"
                  className="create-post-media-image-btn"
                  onClick={() => setShowTagPanel((v) => !v)}
                  aria-label={t.createPost.tagPeople}
                >
                  <img src={activePreview} alt="" className="create-post-media-img" />
                </button>
                <p className="create-post-tag-tooltip">{t.createPost.tagImageHint}</p>
                {hasMultipleImages && (
                  <>
                    <button
                      type="button"
                      className="create-post-carousel-btn create-post-carousel-btn--prev"
                      aria-label={t.createPost.prevImage}
                      onClick={goPrevImage}
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <button
                      type="button"
                      className="create-post-carousel-btn create-post-carousel-btn--next"
                      aria-label={t.createPost.nextImage}
                      onClick={goNextImage}
                    >
                      <ChevronRight size={22} />
                    </button>
                    <span className="create-post-carousel-counter">
                      {activeImageIndex + 1}/{imagePreviews.length}
                    </span>
                  </>
                )}
                <button
                  type="button"
                  className="create-post-remove-image"
                  onClick={removeActiveImage}
                  aria-label={t.createPost.removeImage}
                >
                  <X size={16} />
                </button>
                <button
                  type="button"
                  className="create-post-add-more"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus size={18} />
                </button>
              </>
            ) : (
              <button
                type="button"
                className="create-post-media-empty"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus size={48} strokeWidth={1.2} />
                <span>{t.createPost.addImage}</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              hidden
              onChange={handleImageChange}
            />
          </div>

          <div className="create-post-side">
            <div className="create-post-user-row">
              <img
                src={avatarUrl(me?.id ?? '', me?.avatarUrl ?? null)}
                alt=""
                className="create-post-user-avatar"
              />
              <span className="create-post-user-name">{username}</span>
            </div>

            <div className="create-post-caption-wrap">
              <textarea
                className="create-post-caption"
                placeholder={t.createPost.captionPlaceholder}
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, CAPTION_MAX))}
                rows={4}
              />
              <div className="create-post-caption-meta">
                <Smile size={20} className="create-post-emoji-icon" aria-hidden />
                <span className="create-post-char-count">
                  {content.length}/{CAPTION_MAX}
                </span>
              </div>
            </div>

            {showTagPanel && (
              <div className="create-post-tags">
                <div className="create-post-tags-header">
                  <span>{t.createPost.tagPeople}</span>
                  <button
                    type="button"
                    className="create-post-tags-close"
                    onClick={() => setShowTagPanel(false)}
                  >
                    <X size={16} />
                  </button>
                </div>
                {taggedUsers.length > 0 && (
                  <div className="create-post-tag-chips">
                    {taggedUsers.map((user) => (
                      <span key={user.id} className="create-post-tag-chip">
                        <UserLink
                          userId={user.id}
                          displayName={user.displayName ?? user.email.split('@')[0]}
                          variant="inline"
                        />
                        <button
                          type="button"
                          aria-label={t.createPost.tagRemove}
                          onClick={() =>
                            setTaggedUsers((prev) => prev.filter((u) => u.id !== user.id))
                          }
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="create-post-tag-section-label">{t.createPost.tagFriends}</p>
                {friendsLoading && <p className="create-post-tag-hint">{t.feed.loading}</p>}
                {!friendsLoading && friends.length === 0 && (
                  <p className="create-post-tag-hint">{t.createPost.tagFriendsEmpty}</p>
                )}
                {!friendsLoading && friends.length > 0 && (
                  <ul className="create-post-friends-list">
                    {friends
                      .filter((u) => !taggedUsers.some((tg) => tg.id === u.id))
                      .map((user) => (
                        <li key={user.id}>
                          {renderTagPickRow(user, () => addTaggedUser(user))}
                        </li>
                      ))}
                  </ul>
                )}
                <input
                  type="search"
                  className="create-post-tag-search"
                  placeholder={t.createPost.tagSearchPlaceholder}
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                />
                {tagSearching && <p className="create-post-tag-hint">{t.feed.loading}</p>}
                {!tagSearching && tagResults.length > 0 && (
                  <ul className="create-post-tag-results">
                    {tagResults
                      .filter((u) => !taggedUsers.some((tg) => tg.id === u.id))
                      .map((user) => (
                        <li key={user.id}>
                          {renderTagPickRow(user, () => {
                            addTaggedUser(user);
                            setTagQuery('');
                            setTagResults([]);
                          })}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}

            {!showTagPanel && taggedUsers.length > 0 && (
              <div className="create-post-tag-chips create-post-tag-chips--inline">
                {taggedUsers.map((user) => (
                  <span key={user.id} className="create-post-tag-chip">
                    <UserLink
                      userId={user.id}
                      displayName={user.displayName ?? user.email.split('@')[0]}
                      variant="inline"
                    />
                  </span>
                ))}
              </div>
            )}

            <div className="create-post-privacy">
              <span className="create-post-privacy-label">{t.createPost.privacy}</span>
              <div className="create-post-privacy-options" role="radiogroup">
                <button
                  type="button"
                  role="radio"
                  aria-checked={privacy === 'Public'}
                  className={`create-post-privacy-btn${privacy === 'Public' ? ' active' : ''}`}
                  onClick={() => setPrivacy('Public')}
                >
                  <Globe size={16} />
                  {t.createPost.public}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={privacy === 'Private'}
                  className={`create-post-privacy-btn${privacy === 'Private' ? ' active' : ''}`}
                  onClick={() => setPrivacy('Private')}
                >
                  <Lock size={16} />
                  {t.createPost.private}
                </button>
              </div>
              <p className="create-post-privacy-hint">
                {privacy === 'Public' ? t.createPost.publicHint : t.createPost.privateHint}
              </p>
            </div>

            {error && <p className="create-post-error">{error}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
