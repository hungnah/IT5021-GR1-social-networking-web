import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SearchUserHit } from '../../lib/api';
import { avatarUrl } from '../../lib/avatar';
import { useLanguage } from '../../i18n/LanguageContext';
import './UserListModal.css';

export interface UserListModalProps {
  open: boolean;
  title: string;
  users: SearchUserHit[];
  loading?: boolean;
  onClose: () => void;
}

export default function UserListModal({
  open,
  title,
  users,
  loading = false,
  onClose,
}: UserListModalProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="user-list-overlay" role="presentation" onClick={onClose}>
      <div
        className="user-list-modal"
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="user-list-header">
          <h2>{title}</h2>
          <button type="button" className="user-list-close" aria-label={t.suggestions.close} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="user-list-body">
          {loading && <p className="user-list-empty">{t.feed.loading}</p>}
          {!loading && users.length === 0 && (
            <p className="user-list-empty">{t.profile.noUsers}</p>
          )}
          {!loading &&
            users.map((user) => {
              const name = user.displayName?.trim() || t.feed.defaultUser;
              const handle = user.email.split('@')[0];
              return (
                <button
                  key={user.id}
                  type="button"
                  className="user-list-item"
                  onClick={() => {
                    onClose();
                    navigate(`/profile/${user.id}`);
                  }}
                >
                  <img
                    src={avatarUrl(user.id, user.avatarUrl)}
                    alt=""
                    className="user-list-avatar"
                  />
                  <div className="user-list-text">
                    <span className="user-list-name">{name}</span>
                    <span className="user-list-handle">@{handle}</span>
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
