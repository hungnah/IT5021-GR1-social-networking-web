import type { MouseEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { avatarUrl } from '../../lib/avatar';
import { useLanguage } from '../../i18n/LanguageContext';
import './UserLink.css';

export type UserLinkVariant =
  | 'header'
  | 'suggestion'
  | 'inline'
  | 'comment'
  | 'compact'
  | 'avatar';

export interface UserLinkProps {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  variant?: UserLinkVariant;
  subtitle?: ReactNode;
  className?: string;
  stopPropagation?: boolean;
}

export default function UserLink({
  userId,
  displayName,
  avatarUrl: userAvatar,
  variant = 'inline',
  subtitle,
  className = '',
  stopPropagation = true,
}: UserLinkProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const name = displayName?.trim() || t.feed.defaultUser;

  const handleClick = (e: MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    navigate(`/profile/${userId}`);
  };

  if (variant === 'header') {
    return (
      <button
        type="button"
        className={`user-link user-link--header ${className}`}
        onClick={handleClick}
      >
        <span className="user-link-avatar post-user-avatar">
          <img src={avatarUrl(userId, userAvatar ?? null)} alt="" />
        </span>
        <span className="user-link-meta user-meta">
          <span className="user-link-name user-name">{name}</span>
          {subtitle ? <span className="user-link-subtitle">{subtitle}</span> : null}
        </span>
      </button>
    );
  }

  if (variant === 'suggestion') {
    return (
      <button
        type="button"
        className={`user-link user-link--suggestion sugg-user-info ${className}`}
        onClick={handleClick}
      >
        <img src={avatarUrl(userId, userAvatar ?? null)} alt="" className="sugg-avatar" />
        <div className="sugg-text">
          <span className="sugg-name">{name}</span>
          {subtitle}
        </div>
      </button>
    );
  }

  if (variant === 'avatar') {
    return (
      <button
        type="button"
        className={`user-link user-link--avatar ${className}`}
        onClick={handleClick}
        aria-label={name}
      >
        <img src={avatarUrl(userId, userAvatar ?? null)} alt="" />
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        className={`user-link user-link--compact ${className}`}
        onClick={handleClick}
      >
        <img src={avatarUrl(userId, userAvatar ?? null)} alt="" className="user-link-compact-avatar" />
        <span className="user-link-compact-text">
          <span className="user-link-compact-name">{name}</span>
          {subtitle}
        </span>
      </button>
    );
  }

  if (variant === 'comment') {
    return (
      <button
        type="button"
        className={`user-link user-link--comment ${className}`}
        onClick={handleClick}
      >
        <strong>{name}</strong>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`user-link user-link--inline ${className}`}
      onClick={handleClick}
    >
      <strong>{name}</strong>
    </button>
  );
}
