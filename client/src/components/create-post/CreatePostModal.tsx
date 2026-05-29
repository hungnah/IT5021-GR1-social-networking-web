import { useEffect, useRef, useState } from 'react';
import { Globe, ImagePlus, Lock, X } from 'lucide-react';
import { api, type PostWithCounts } from '../../lib/api';
import { useLanguage } from '../../i18n/LanguageContext';
import './CreatePostModal.css';

type PrivacyChoice = 'Public' | 'Private';

export interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (post: PostWithCounts) => void;
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

  const resetForm = () => {
    setContent('');
    setPrivacy('Public');
    setImageFile(null);
    setImagePreview(null);
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
      if (imageFile) formData.append('image', imageFile);
      const newPost = await api.postForm<PostWithCounts>('/posts', formData);
      onCreated?.(newPost);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.createPost.error);
    } finally {
      setSubmitting(false);
    }
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
