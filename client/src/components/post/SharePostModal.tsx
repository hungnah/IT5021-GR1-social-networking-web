import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import {
  api,
  type ConversationItem,
  type FeedPost,
  type SearchResult,
  type SearchUserHit,
} from '../../lib/api';
import { avatarUrl } from '../../lib/avatar';
import { sendChatMessage } from '../../lib/chatSocket';
import { buildPostShareMessage } from '../../lib/postShare';
import { getPostImageUrls } from './PostImageCarousel';
import { getStoredUser } from '../../store/authStore';
import { resolveUsername } from '../../lib/username';
import { useLanguage } from '../../i18n/LanguageContext';
import './SharePostModal.css';

export type SharePostModalProps = {
  open: boolean;
  post: FeedPost | null;
  onClose: () => void;
  onSent?: (receiverId: string) => void;
};

export default function SharePostModal({
  open,
  post,
  onClose,
  onSent,
}: SharePostModalProps) {
  const { t } = useLanguage();
  const me = getStoredUser();
  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [searchUsers, setSearchUsers] = useState<SearchUserHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    setQuery('');
    setSearchUsers([]);
    setError('');
    setSendingId(null);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    setLoading(true);
    void api
      .get<ConversationItem[]>('/messages/conversations')
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setSearchUsers([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void api
        .get<SearchResult>(`/search?q=${encodeURIComponent(q)}&limit=12`)
        .then((res) => setSearchUsers(res.users ?? []))
        .catch(() => setSearchUsers([]));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  const conversationUsers = useMemo(() => {
    return conversations
      .map((c) => c.partner)
      .filter((u) => u.id !== me?.id);
  }, [conversations, me?.id]);

  const users = useMemo(() => {
    const q = query.trim();
    if (q.length >= 2) {
      return searchUsers.filter((u) => u.id !== me?.id);
    }
    return conversationUsers;
  }, [query, searchUsers, conversationUsers, me?.id]);

  const handleSend = async (receiverId: string) => {
    if (!post || sendingId) return;
    setSendingId(receiverId);
    setError('');
    try {
      const content = buildPostShareMessage(post.id);
      await sendChatMessage(receiverId, content);
      window.dispatchEvent(new CustomEvent('feedme:message-new'));
      onSent?.(receiverId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.sharePost.error);
    } finally {
      setSendingId(null);
    }
  };

  if (!open || !post) return null;

  const images = getPostImageUrls(post);
  const thumb = images[0] ?? null;
  const authorName = post.author.displayName?.trim() || t.feed.defaultUser;

  return createPortal(
    <div
      className="share-post-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="share-post-modal"
        role="dialog"
        aria-labelledby="share-post-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="share-post-header">
          <button type="button" className="share-post-close" aria-label={t.suggestions.close} onClick={onClose}>
            <X size={22} />
          </button>
          <h2 id="share-post-title">{t.sharePost.title}</h2>
          <span className="share-post-header-spacer" />
        </header>

        <div className="share-post-preview">
          {thumb ? (
            <img src={thumb} alt="" className="share-post-preview-thumb" />
          ) : (
            <div className="share-post-preview-thumb share-post-preview-thumb--empty">
              {post.content?.slice(0, 60) || t.sharePost.viewPost}
            </div>
          )}
          <div className="share-post-preview-text">
            <strong>{authorName}</strong>
            {post.content ? <p>{post.content}</p> : null}
          </div>
        </div>

        <div className="share-post-search-wrap">
          <Search size={18} className="share-post-search-icon" />
          <input
            type="search"
            className="share-post-search"
            placeholder={t.sharePost.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error ? <p className="share-post-error">{error}</p> : null}

        <div className="share-post-list">
          {loading && users.length === 0 ? (
            <p className="share-post-hint">{t.feed.loading}</p>
          ) : null}
          {!loading && users.length === 0 ? (
            <p className="share-post-hint">
              {query.trim().length >= 2 ? t.searchPanel.noUsers : t.messages.noConversations}
            </p>
          ) : null}
          {users.map((user) => {
            const name = user.displayName?.trim() || user.email.split('@')[0];
            const handle = resolveUsername(
              user.username,
              user.displayName,
              user.id,
              user.email,
            );
            const busy = sendingId === user.id;
            return (
              <button
                key={user.id}
                type="button"
                className="share-post-user-row"
                disabled={Boolean(sendingId)}
                onClick={() => void handleSend(user.id)}
              >
                <img
                  src={avatarUrl(user.id, user.avatarUrl)}
                  alt=""
                  className="share-post-user-avatar"
                />
                <span className="share-post-user-meta">
                  <strong>{name}</strong>
                  <span>{handle}</span>
                </span>
                <span className="share-post-send-label">
                  {busy ? t.sharePost.sending : t.sharePost.send}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
