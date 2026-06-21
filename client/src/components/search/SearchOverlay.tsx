import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, X } from 'lucide-react';
import { api, type SearchResult, type SearchUserHit } from '../../lib/api';
import { avatarUrl } from '../../lib/avatar';
import {
  addToSearchHistory,
  clearSearchHistory,
  loadSearchHistory,
  removeFromSearchHistory,
  type SearchHistoryEntry,
} from '../../lib/searchHistory';
import { formatUsernameLabel, normalizeUsername } from '../../lib/username';
import { useLanguage } from '../../i18n/LanguageContext';
import './SearchOverlay.css';

export type SearchOverlayProps = {
  open: boolean;
  onClose: () => void;
  panelRef?: React.RefObject<HTMLDivElement | null>;
};

export default function SearchOverlay({ open, onClose, panelRef }: SearchOverlayProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUserHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<SearchHistoryEntry[]>([]);

  const refreshRecent = useCallback(() => {
    setRecent(loadSearchHistory());
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      return;
    }
    refreshRecent();
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open, refreshRecent]);

  useEffect(() => {
    if (!open) return;
    const q = normalizeUsername(query.replace(/^@+/, '')).trim() || query.trim();
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      void api
        .get<SearchResult>(`/search?q=${encodeURIComponent(q)}&limit=20`)
        .then((data) => setResults(data.users ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  const openUser = (user: SearchUserHit) => {
    addToSearchHistory(user);
    refreshRecent();
    onClose();
    navigate(`/profile/${user.id}`);
  };

  const renderUserRow = (
    user: SearchUserHit,
    options?: { showRemove?: boolean; onRemove?: () => void },
  ) => {
    const handle = formatUsernameLabel(user.username, user.displayName, user.id);
    const displayName = user.displayName?.trim() || user.email.split('@')[0];

    return (
      <div key={user.id} className="search-overlay-user-row">
        <button
          type="button"
          className="search-overlay-user-main"
          onClick={() => openUser(user)}
        >
          <img
            src={avatarUrl(user.id, user.avatarUrl)}
            alt=""
            className="search-overlay-user-avatar"
          />
          <div className="search-overlay-user-text">
            <span className="search-overlay-user-handle">{handle || displayName}</span>
            <span className="search-overlay-user-name">{displayName}</span>
          </div>
        </button>
        {options?.showRemove ? (
          <button
            type="button"
            className="search-overlay-remove-btn"
            aria-label={t.searchPanel.removeRecent}
            onClick={options.onRemove}
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
    );
  };

  if (!open) return null;

  const trimmed = query.trim();
  const showRecent = trimmed.length === 0;

  return (
    <div className="search-overlay-wrap" ref={panelRef}>
      <div className="search-overlay" role="dialog" aria-label={t.searchPanel.title}>
        <div className="search-overlay-toolbar">
          <button
            type="button"
            className="search-overlay-back"
            aria-label={t.messages.back}
            onClick={onClose}
          >
            <ChevronLeft size={24} />
          </button>
          <div className="search-overlay-input-wrap">
            <Search size={16} className="search-overlay-input-icon" />
            <input
              ref={inputRef}
              type="search"
              className="search-overlay-input"
              placeholder={t.searchPanel.placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <button
                type="button"
                className="search-overlay-clear"
                aria-label={t.suggestions.close}
                onClick={() => setQuery('')}
              >
                <X size={16} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="search-overlay-body">
          {showRecent ? (
            <>
              {recent.length > 0 ? (
                <div className="search-overlay-recent-header">
                  <span>{t.searchPanel.recent}</span>
                  <button
                    type="button"
                    className="search-overlay-clear-all"
                    onClick={() => {
                      clearSearchHistory();
                      refreshRecent();
                    }}
                  >
                    {t.searchPanel.clearAll}
                  </button>
                </div>
              ) : (
                <p className="search-overlay-hint">{t.searchPanel.empty}</p>
              )}
              {recent.map((user) =>
                renderUserRow(user, {
                  showRemove: true,
                  onRemove: () => {
                    removeFromSearchHistory(user.id);
                    refreshRecent();
                  },
                }),
              )}
            </>
          ) : null}

          {!showRecent && loading ? (
            <p className="search-overlay-hint">{t.feed.loading}</p>
          ) : null}

          {!showRecent && !loading && results.length === 0 ? (
            <p className="search-overlay-hint">{t.searchPanel.noUsers}</p>
          ) : null}

          {!showRecent && !loading
            ? results.map((user) => renderUserRow(user))
            : null}
        </div>
      </div>
    </div>
  );
}
