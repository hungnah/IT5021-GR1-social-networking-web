import { useEffect, useRef, useState } from 'react';
import { Globe, ImagePlus, Lock, X } from 'lucide-react';
import { api, type PostWithCounts, type SearchResult, type SearchUserHit, type TaggedUserSummary } from '../../lib/api';
import UserLink from '../common/UserLink';
import { avatarUrl } from '../../lib/avatar';
import { useLanguage } from '../../i18n/LanguageContext';
import './CreatePostModal.css';

type PrivacyChoice = 'Public' | 'Private';

export interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (post: PostWithCounts, taggedUsers: TaggedUserSummary[]) => void;
}

export default function CreatePostModal({ open, onClose, onCreated }: CreatePostModalProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyChoice>('Public');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tagQuery, setTagQuery] = useState('');
  const [tagResults, setTagResults] = useState<SearchUserHit[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<SearchUserHit[]>([]);
  const [tagSearching, setTagSearching] = useState(false);
  const [friends, setFriends] = useState<SearchUserHit[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const resetForm = () => {
    setContent('');
    setPrivacy('Public');
    setImageFile(null);
    setImagePreview(null);
    setTagQuery('');
    setTagResults([]);
    setTaggedUsers([]);
    setFriends([]);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

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
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!content.trim() && !imageFile) {
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
      if (imageFile) formData.append('image', imageFile);
      const newPost = await api.postForm<PostWithCounts>('/posts', formData);
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
    return (
      <button
        type="button"
        className="create-post-tag-pick-row"
        onClick={onPick}
      >
        <img
          src={avatarUrl(user.id, user.avatarUrl)}
          alt=""
          className="create-post-tag-pick-avatar"
        />
        <span className="create-post-tag-pick-text">
          <span className="create-post-tag-pick-name">{name}</span>
          <span className="create-post-tag-handle">@{user.email.split('@')[0]}</span>
        </span>
        <span className="create-post-tag-add" aria-hidden>
          +
        </span>
      </button>
    );
  };

  if (!open) return null;

  return (
    <div
      className="create-post-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="create-post-modal"
        role="dialog"
        aria-labelledby="create-post-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="create-post-header">
          <h2 id="create-post-title">{t.createPost.title}</h2>
          <button
            type="button"
            className="create-post-close"
            aria-label={t.suggestions.close}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <form className="create-post-form" onSubmit={(e) => void handleSubmit(e)}>
          <textarea
            className="create-post-caption"
            placeholder={t.createPost.captionPlaceholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            rows={5}
            autoFocus
          />

          {imagePreview ? (
            <div className="create-post-preview-wrap">
              <img src={imagePreview} alt="" className="create-post-preview" />
              <button
                type="button"
                className="create-post-remove-image"
                onClick={removeImage}
                aria-label={t.createPost.removeImage}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="create-post-add-image"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={20} />
              <span>{t.createPost.addImage}</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            hidden
            onChange={handleImageChange}
          />

          <div className="create-post-tags">
            <span className="create-post-privacy-label">{t.createPost.tagPeople}</span>
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
                  .filter((u) => !taggedUsers.some((t) => t.id === u.id))
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
                  .filter((u) => !taggedUsers.some((t) => t.id === u.id))
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

          <div className="create-post-privacy">
            <span className="create-post-privacy-label">{t.createPost.privacy}</span>
            <div className="create-post-privacy-options" role="radiogroup" aria-label={t.createPost.privacy}>
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

          <div className="create-post-actions">
            <button
              type="button"
              className="create-post-cancel"
              onClick={onClose}
              disabled={submitting}
            >
              {t.suggestions.close}
            </button>
            <button
              type="submit"
              className="create-post-submit"
              disabled={submitting}
            >
              {submitting ? t.createPost.submitting : t.createPost.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
