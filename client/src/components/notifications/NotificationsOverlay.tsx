import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api, type NotificationItem } from '../../lib/api';
import { avatarUrl } from '../../lib/avatar';
import { splitMentionParts } from '../../lib/mention';
import { formatMsg, useLanguage } from '../../i18n/LanguageContext';
import './NotificationsOverlay.css';

type NotifFilter = 'all' | 'following' | 'comments' | 'likes' | 'follows' | 'tags';

export interface NotificationsOverlayProps {
  open: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

function renderMentionText(text: string) {
  return splitMentionParts(text).map((part, index) =>
    part.startsWith('@') ? (
      <span key={`${part}-${index}`} className="notif-mention">
        {part}
      </span>
    ) : (
      <span key={`t-${index}`}>{part}</span>
    ),
  );
}

function groupKey(iso: string): 'week' | 'month' | 'earlier' {
  const time = new Date(iso).getTime();
  const diff = Date.now() - time;
  const week = 7 * 24 * 60 * 60 * 1000;
  const month = 30 * 24 * 60 * 60 * 1000;
  if (diff <= week) return 'week';
  if (diff <= month) return 'month';
  return 'earlier';
}

const NAME_MARK = '\uE000';

function renderWithBoldName(
  template: string,
  name: string,
  vars: Record<string, string> = {},
) {
  const text = formatMsg(template.replace(/\{name\}/g, NAME_MARK), { name, ...vars });
  return text.split(NAME_MARK).map((part, i, arr) => (
    <span key={`${i}-${part.slice(0, 8)}`}>
      {part}
      {i < arr.length - 1 ? <strong>{name}</strong> : null}
    </span>
  ));
}

function NotificationBody({
  item,
  name,
  templates,
  defaultUser,
}: {
  item: NotificationItem;
  name: string;
  templates: {
    follow: string;
    like: string;
    comment: string;
    commentReply: string;
    message: string;
    tag: string;
  };
  defaultUser: string;
}) {
  if (item.type === 'FOLLOW') {
    return <>{renderWithBoldName(templates.follow, name)}</>;
  }
  if (item.type === 'LIKE') {
    return <>{renderWithBoldName(templates.like, name)}</>;
  }
  if (item.type === 'TAG') {
    return <>{renderWithBoldName(templates.tag, name)}</>;
  }
  if (item.type === 'MESSAGE') {
    return <>{renderWithBoldName(templates.message, name)}</>;
  }
  if (item.type === 'COMMENT') {
    if (item.commentIsReply && item.commentSnippet) {
      const owner = item.postAuthorName?.trim() || defaultUser;
      return (
        <>
          {renderWithBoldName(templates.commentReply, name, { owner })}
          &ldquo;{renderMentionText(item.commentSnippet)}&rdquo;
        </>
      );
    }
    if (item.commentSnippet) {
      return (
        <>
          {renderWithBoldName(templates.comment, name)}: &ldquo;
          {renderMentionText(item.commentSnippet)}&rdquo;
        </>
      );
    }
    return <>{renderWithBoldName(templates.comment, name)}</>;
  }
  return <>{renderWithBoldName(templates.comment, name)}</>;
}

export default function NotificationsOverlay({
  open,
  onClose,
  onUnreadChange,
}: NotificationsOverlayProps) {
  const navigate = useNavigate();
  const { t, localeTag } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<NotifFilter>('all');
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);

  const formatRelativeTime = useCallback(
    (iso: string) => {
      const time = new Date(iso).getTime();
      if (Number.isNaN(time)) return '';
      const diff = (Date.now() - time) / 1000;
      if (diff < 60) return t.time.justNow;
      if (diff < 3600) return formatMsg(t.time.minutes, { n: Math.floor(diff / 60) });
      if (diff < 86400) return formatMsg(t.time.hours, { n: Math.floor(diff / 3600) });
      if (diff < 604800) return formatMsg(t.time.days, { n: Math.floor(diff / 86400) });
      return new Date(iso).toLocaleDateString(localeTag, { month: 'short', day: 'numeric' });
    },
    [localeTag, t],
  );

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<NotificationItem[]>('/notifications?limit=40');
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await api.get<{ count: number }>('/notifications/unread-count');
      onUnreadChange?.(res.count ?? 0);
    } catch {
      /* ignore */
    }
  }, [onUnreadChange]);

  useEffect(() => {
    if (!open) return;
    void loadNotifications();
    void refreshUnread();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [loadNotifications, onClose, open, refreshUnread]);

  const filters: { id: NotifFilter; label: string }[] = [
    { id: 'all', label: t.notificationsPanel.filterAll },
    { id: 'following', label: t.notificationsPanel.filterFollowing },
    { id: 'comments', label: t.notificationsPanel.filterComments },
    { id: 'likes', label: t.notificationsPanel.filterLikes },
    { id: 'follows', label: t.notificationsPanel.filterFollows },
    { id: 'tags', label: t.notificationsPanel.filterTags },
  ];

  const filtered = useMemo(() => {
    return notifications.filter((item) => {
      if (filter === 'all') return true;
      if (filter === 'following') return !!item.viewerFollowsActor;
      if (filter === 'comments') return item.type === 'COMMENT';
      if (filter === 'likes') return item.type === 'LIKE';
      if (filter === 'follows') return item.type === 'FOLLOW';
      if (filter === 'tags') return item.type === 'TAG';
      return true;
    });
  }, [filter, notifications]);

  const grouped = useMemo(() => {
    const groups: Record<'week' | 'month' | 'earlier', NotificationItem[]> = {
      week: [],
      month: [],
      earlier: [],
    };
    for (const item of filtered) {
      groups[groupKey(item.createdAt)].push(item);
    }
    return groups;
  }, [filtered]);

  const groupLabels: Record<'week' | 'month' | 'earlier', string> = {
    week: t.notificationsPanel.groupThisWeek,
    month: t.notificationsPanel.groupThisMonth,
    earlier: t.notificationsPanel.groupEarlier,
  };

  const markRead = async (item: NotificationItem) => {
    if (item.isRead) return;
    try {
      await api.patch(`/notifications/${item.id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
      );
      void refreshUnread();
    } catch {
      /* ignore */
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    await markRead(item);
    onClose();
    if (item.type === 'FOLLOW') {
      navigate(`/profile/${item.actor.id}`);
      return;
    }
    if (item.type === 'MESSAGE') {
      navigate(`/messages/${item.actor.id}`);
      return;
    }
    if (item.entityId) {
      navigate(`/post/${item.entityId}`);
    }
  };

  const handleFollowToggle = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (followBusyId) return;
    setFollowBusyId(userId);
    try {
      await api.post<{ following: boolean }>(`/users/${userId}/follow`, {});
      setNotifications((prev) =>
        prev.map((n) =>
          n.actor.id === userId ? { ...n, viewerFollowsActor: true } : n,
        ),
      );
    } catch {
      /* ignore */
    } finally {
      setFollowBusyId(null);
    }
  };

  const renderRow = (item: NotificationItem) => {
    const name = item.actor.displayName?.trim() || t.feed.defaultUser;
    const showThumb =
      item.type !== 'FOLLOW' &&
      item.type !== 'MESSAGE' &&
      !!item.postImageUrl;

    return (
      <div
        key={item.id}
        className={`notif-row${item.isRead ? '' : ' notif-row--unread'}`}
      >
        <button
          type="button"
          className="notif-row-main"
          onClick={() => void handleItemClick(item)}
        >
          <img
            className="notif-row-avatar"
            src={avatarUrl(item.actor.id, item.actor.avatarUrl)}
            alt=""
          />
          <div className="notif-row-content">
            <p className="notif-row-text">
              <NotificationBody
                item={item}
                name={name}
                templates={t.notificationsPanel}
                defaultUser={t.feed.defaultUser}
              />
            </p>
            <span className="notif-row-time">{formatRelativeTime(item.createdAt)}</span>
          </div>
          {showThumb ? (
            <img className="notif-row-thumb" src={item.postImageUrl!} alt="" />
          ) : null}
        </button>

        {item.type === 'FOLLOW' ? (
          <button
            type="button"
            className={`notif-follow-btn${item.viewerFollowsActor ? ' following' : ''}`}
            disabled={followBusyId === item.actor.id || !!item.viewerFollowsActor}
            onClick={(e) => void handleFollowToggle(item.actor.id, e)}
          >
            {item.viewerFollowsActor ? t.suggestions.following : t.notificationsPanel.followBack}
          </button>
        ) : null}
      </div>
    );
  };

  if (!open) return null;

  return createPortal(
    <div
      className="notif-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="notif-screen"
        role="dialog"
        aria-modal="true"
        aria-label={t.notificationsPanel.title}
      >
        <header className="notif-screen-header">
          <h1>{t.notificationsPanel.title}</h1>
          <button
            type="button"
            className="notif-screen-close"
            aria-label={t.suggestions.close}
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </header>

        <div className="notif-filters" role="tablist">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`notif-filter-chip${filter === f.id ? ' active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="notif-screen-body">
          {loading && <p className="notif-empty">{t.feed.loading}</p>}
          {!loading && filtered.length === 0 && (
            <p className="notif-empty">{t.notificationsPanel.empty}</p>
          )}
          {!loading &&
            (['week', 'month', 'earlier'] as const).map((key) =>
              grouped[key].length > 0 ? (
                <section key={key} className="notif-group">
                  <h2 className="notif-group-title">{groupLabels[key]}</h2>
                  {grouped[key].map((item) => renderRow(item))}
                </section>
              ) : null,
            )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
