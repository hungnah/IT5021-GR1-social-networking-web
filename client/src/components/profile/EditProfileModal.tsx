import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { api, ApiError, type UserProfile } from '../../lib/api';
import { avatarUrl } from '../../lib/avatar';
import { isValidUsername, normalizeUsername } from '../../lib/username';
import { useLanguage } from '../../i18n/LanguageContext';
import './EditProfileModal.css';

const GENDER_OPTIONS = ['Nam', 'Nữ', 'Tùy chọn', 'Không muốn tiết lộ'] as const;

export interface EditProfileModalProps {
  open: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSaved: (profile: UserProfile) => void;
}

function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function EditProfileModal({
  open,
  profile,
  onClose,
  onSaved,
}: EditProfileModalProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [username, setUsername] = useState(profile.username ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [location, setLocation] = useState(profile.location ?? '');
  const [website, setWebsite] = useState(profile.website ?? '');
  const [gender, setGender] = useState(profile.gender ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setDisplayName(profile.displayName ?? '');
    setUsername(profile.username ?? '');
    setBio(profile.bio ?? '');
    setLocation(profile.location ?? '');
    setWebsite(profile.website ?? '');
    setGender(profile.gender ?? '');
    setAvatarFile(null);
    setAvatarPreview(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const nextUsername = normalizeUsername(username);
    if (!nextUsername || !isValidUsername(nextUsername)) {
      setError(t.profile.usernameInvalid);
      return;
    }
    try {
      setSubmitting(true);
      let updated = await api.patch<UserProfile>('/users/me', {
        displayName: displayName.trim() || null,
        username: nextUsername,
        bio: bio.trim() || null,
        location: location.trim() || null,
        website: website.trim() ? normalizeWebsite(website) : null,
        gender: gender || null,
      });
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        updated = await api.postForm<UserProfile>('/users/me/avatar', formData);
      }
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.profile.editError);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const currentAvatar = avatarPreview ?? avatarUrl(profile.id, profile.avatarUrl);

  return (
    <div className="edit-profile-overlay" role="presentation" onClick={onClose}>
      <div
        className="edit-profile-modal"
        role="dialog"
        aria-label={t.profile.editProfile}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="edit-profile-header">
          <h2>{t.profile.editProfile}</h2>
          <button type="button" className="edit-profile-close" aria-label={t.suggestions.close} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form className="edit-profile-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="edit-profile-avatar-row">
            <img src={currentAvatar} alt="" className="edit-profile-avatar" />
            <button
              type="button"
              className="edit-profile-avatar-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera size={16} />
              {t.profile.changePhoto}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="edit-profile-file-input"
              onChange={handleAvatarChange}
            />
          </div>

          <label className="edit-profile-field">
            <span>{t.profile.username}</span>
            <div className="edit-profile-username-input">
              <span className="edit-profile-username-at">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                maxLength={30}
                autoComplete="username"
                spellCheck={false}
              />
            </div>
            <small className="edit-profile-hint">{t.profile.usernameHint}</small>
          </label>

          <label className="edit-profile-field">
            <span>{t.profile.displayName}</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
            />
          </label>

          <label className="edit-profile-field">
            <span>{t.profile.bio}</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </label>

          <label className="edit-profile-field">
            <span>{t.profile.location}</span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={255}
            />
          </label>

          <label className="edit-profile-field">
            <span>{t.profile.website}</span>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
              maxLength={500}
            />
          </label>

          <label className="edit-profile-field">
            <span>{t.profile.gender}</span>
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">{t.profile.genderNone}</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>

          {error && <p className="edit-profile-error">{error}</p>}

          <div className="edit-profile-actions">
            <button type="button" className="edit-profile-cancel" onClick={onClose}>
              {t.suggestions.close}
            </button>
            <button type="submit" className="edit-profile-save" disabled={submitting}>
              {submitting ? t.profile.saving : t.profile.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
