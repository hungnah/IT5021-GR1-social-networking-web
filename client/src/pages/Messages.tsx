import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  Info,
  Send,
  Smile,
  SquarePen,
  UserCircle,
} from 'lucide-react';
import AppSidebar from '../components/app-shell/AppSidebar';
import UserLink from '../components/common/UserLink';
import MessageContent from '../components/messages/MessageContent';
import {
  api,
  ApiError,
  type ConversationItem,
  type MessageItem,
  type ConversationPartner,
  type UserProfile,
} from '../lib/api';
import {
  connectChatSocket,
  markChatRead,
  onChatMessage,
  onChatRead,
  sendChatMessage,
} from '../lib/chatSocket';
import { avatarUrl } from '../lib/avatar';
import { resolveUsername } from '../lib/username';
import { formatMessagePreview } from '../lib/postShare';
import { scrollChatToBottom } from '../lib/chatScroll';
import { formatMsg, useLanguage } from '../i18n/LanguageContext';
import { getStoredUser } from '../store/authStore';
import '../theme/feed-theme.css';
import './Messages.css';

function formatMessageTime(iso: string, localeTag: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(localeTag, { hour: 'numeric', minute: '2-digit' });
}

function formatConversationTime(iso: string, localeTag: string, t: {
  time: { justNow: string; minutes: string; hours: string; days: string };
}): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  const diff = (Date.now() - time) / 1000;
  if (diff < 60) return t.time.justNow;
  if (diff < 3600) return formatMsg(t.time.minutes, { n: Math.floor(diff / 60) });
  if (diff < 86400) return formatMsg(t.time.hours, { n: Math.floor(diff / 3600) });
  if (diff < 604800) return formatMsg(t.time.days, { n: Math.floor(diff / 86400) });
  return new Date(iso).toLocaleDateString(localeTag);
}

function dateLabel(iso: string, localeTag: string, t: {
  messages: { today: string; yesterday: string };
}): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return t.messages.today;
  if (d.toDateString() === yesterday.toDateString()) return t.messages.yesterday;
  return d.toLocaleDateString(localeTag, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function groupMessagesByDate(messages: MessageItem[]): Array<{ date: string; items: MessageItem[] }> {
  const groups: Array<{ date: string; items: MessageItem[] }> = [];
  for (const msg of messages) {
    const key = new Date(msg.createdAt).toDateString();
    const last = groups[groups.length - 1];
    if (last && new Date(last.items[0].createdAt).toDateString() === key) {
      last.items.push(msg);
    } else {
      groups.push({ date: msg.createdAt, items: [msg] });
    }
  }
  return groups;
}

function messagePartnerId(msg: MessageItem): string {
  return msg.isMine ? msg.receiverId : msg.sender.id;
}

function partnerLabel(partner: ConversationPartner): string {
  return resolveUsername(
    partner.username,
    partner.displayName,
    partner.id,
    partner.email,
  );
}

function partnerDisplayName(
  partner: ConversationPartner,
  fallback: string,
): string {
  return partner.displayName?.trim() || fallback;
}

function formatPartnerActivity(
  iso: string,
  t: { messages: { activeNow: string; activeMinutes: string; activeHours: string; activeDays: string } },
  formatMsgFn: (template: string, vars: Record<string, string | number>) => string,
): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  const diff = (Date.now() - time) / 1000;
  if (diff < 60) return t.messages.activeNow;
  if (diff < 3600) {
    return formatMsgFn(t.messages.activeMinutes, { n: Math.floor(diff / 60) });
  }
  if (diff < 86400) {
    return formatMsgFn(t.messages.activeHours, { n: Math.floor(diff / 3600) });
  }
  if (diff < 604800) {
    return formatMsgFn(t.messages.activeDays, { n: Math.floor(diff / 86400) });
  }
  return '';
}

export default function Messages() {
  const navigate = useNavigate();
  const { userId: partnerIdParam } = useParams<{ userId?: string }>();
  const { t, localeTag } = useLanguage();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [activePartner, setActivePartner] = useState<ConversationPartner | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [me, setMe] = useState<UserProfile | null>(null);
  const [inboxTab, setInboxTab] = useState<'messages' | 'requests'>('messages');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageCountRef = useRef(0);
  const partnerIdRef = useRef<string | undefined>(partnerIdParam);
  const activePartnerRef = useRef(activePartner);

  partnerIdRef.current = partnerIdParam;
  activePartnerRef.current = activePartner;

  const errorMessage = useCallback((e: unknown) => {
    if (e instanceof ApiError) return e.message;
    return e instanceof Error ? e.message : t.messages.error;
  }, [t.messages.error]);

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const data = await api.get<ConversationItem[]>('/messages/conversations');
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      setConversations([]);
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  const loadPartner = useCallback(async (partnerId: string) => {
    try {
      const partner = await api.get<ConversationPartner>(`/messages/partner/${partnerId}`);
      setActivePartner(partner);
    } catch {
      setActivePartner(null);
    }
  }, []);

  const loadThread = useCallback(async (partnerId: string) => {
    setMessagesLoading(true);
    setMessages([]);
    try {
      const data = await api.get<MessageItem[]>(`/messages/with/${partnerId}?limit=80`);
      setMessages(Array.isArray(data) ? data : []);
      markChatRead(partnerId);
      setConversations((prev) =>
        prev.map((c) =>
          c.partner.id === partnerId ? { ...c, unreadCount: 0 } : c,
        ),
      );
      window.dispatchEvent(new CustomEvent('feedme:messages-read'));
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getStoredUser()) {
      navigate('/', { replace: true });
      return;
    }
    connectChatSocket();
    void loadConversations();
    void api.get<UserProfile>('/users/me').then(setMe).catch(() => setMe(null));
  }, [loadConversations, navigate]);

  useEffect(() => {
    const onProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent<UserProfile>).detail;
      const stored = getStoredUser();
      if (detail && stored && detail.id === stored.id) {
        setMe(detail);
      }
    };
    window.addEventListener('feedme:profile-updated', onProfileUpdated);
    return () => window.removeEventListener('feedme:profile-updated', onProfileUpdated);
  }, []);

  useEffect(() => {
    const unsub = onChatMessage((msg) => {
      const partnerId = messagePartnerId(msg);
      const openThreadId = partnerIdRef.current;

      if (openThreadId === partnerId) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
        );
        if (!msg.isMine) {
          markChatRead(partnerId);
          window.dispatchEvent(new CustomEvent('feedme:messages-read'));
        }
      }

      setConversations((prev) => {
        const existing = prev.find((c) => c.partner.id === partnerId);
        const partner =
          openThreadId === partnerId
            ? activePartnerRef.current ?? existing?.partner
            : existing?.partner;

        if (!partner) return prev;

        const updated: ConversationItem = {
          partner,
          lastMessage: {
            id: msg.id,
            content: msg.content,
            createdAt: msg.createdAt,
            isMine: msg.isMine,
            isRead: msg.isRead,
          },
          unreadCount:
            openThreadId === partnerId
              ? 0
              : (existing?.unreadCount ?? 0) + (!msg.isMine ? 1 : 0),
        };

        const rest = prev.filter((c) => c.partner.id !== partnerId);
        return [updated, ...rest];
      });
    });

    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onChatRead((payload) => {
      const readerId = payload.readerId;
      if (partnerIdRef.current === readerId) {
        setMessages((prev) =>
          prev.map((m) => (m.isMine ? { ...m, isRead: true } : m)),
        );
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.partner.id === readerId && c.lastMessage.isMine
            ? {
                ...c,
                lastMessage: { ...c.lastMessage, isRead: true },
              }
            : c,
        ),
      );
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!partnerIdParam) {
      setActivePartner(null);
      setMessages([]);
      return;
    }
    void loadPartner(partnerIdParam);
    void loadThread(partnerIdParam);
  }, [partnerIdParam, loadPartner, loadThread]);

  useEffect(() => {
    messageCountRef.current = 0;
  }, [partnerIdParam]);

  useEffect(() => {
    if (messages.length === 0) return;

    const prevCount = messageCountRef.current;
    messageCountRef.current = messages.length;

    const appendedOne =
      !messagesLoading && messages.length === prevCount + 1 && prevCount > 0;

    scrollChatToBottom(threadRef.current, appendedOne);
  }, [messages, messagesLoading]);

  useEffect(() => {
    if (partnerIdParam) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 100);
      return () => window.clearTimeout(id);
    }
  }, [partnerIdParam]);

  const handleSelectConversation = (partnerId: string) => {
    navigate(`/messages/${partnerId}`);
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || !partnerIdParam || sending) return;
    setSending(true);
    setDraft('');
    try {
      const sent = await sendChatMessage(partnerIdParam, content);
      setMessages((prev) => [...prev, sent]);
      setConversations((prev) => {
        const existing = prev.find((c) => c.partner.id === partnerIdParam);
        const partner = activePartner ?? existing?.partner;
        if (!partner) return prev;
        const updated: ConversationItem = {
          partner,
          lastMessage: {
            id: sent.id,
            content: sent.content,
            createdAt: sent.createdAt,
            isMine: true,
            isRead: false,
          },
          unreadCount: 0,
        };
        const rest = prev.filter((c) => c.partner.id !== partnerIdParam);
        return [updated, ...rest];
      });
      window.dispatchEvent(new CustomEvent('feedme:messages-read'));
    } catch (e) {
      setDraft(content);
      alert(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) => {
        const q = searchQuery.trim().toLowerCase();
        const name = (c.partner.displayName ?? '').toLowerCase();
        const handle = partnerLabel(c.partner).toLowerCase();
        return name.includes(q) || handle.includes(q);
      })
    : conversations;

  const inboxConversations = filteredConversations;
  const requestConversations = filteredConversations.filter((c) => c.unreadCount > 0);

  const myUsername = me
    ? resolveUsername(me.username, me.displayName, me.id, me.email)
    : getStoredUser()?.email.split('@')[0] ?? 'user';

  const partnerUsername = activePartner
    ? partnerLabel(activePartner)
    : '';

  const partnerName = activePartner
    ? partnerDisplayName(activePartner, t.feed.defaultUser)
    : '';

  const partnerActivityLabel = useMemo(() => {
    if (!activePartner) return '';
    const lastTheirs = [...messages].reverse().find((m) => !m.isMine);
    if (lastTheirs) {
      const activity = formatPartnerActivity(lastTheirs.createdAt, t, formatMsg);
      if (activity) return activity;
    }
    const conv = conversations.find((c) => c.partner.id === partnerIdParam);
    if (conv?.lastMessage && !conv.lastMessage.isMine) {
      const activity = formatPartnerActivity(conv.lastMessage.createdAt, t, formatMsg);
      if (activity) return activity;
    }
    return partnerUsername;
  }, [activePartner, conversations, formatMsg, messages, partnerIdParam, partnerUsername, t]);

  const quickChatPartners = filteredConversations.map((c) => c.partner);

  const messageGroups = groupMessagesByDate(messages);

  const renderConversationItem = (conv: ConversationItem) => {
    const name = partnerDisplayName(conv.partner, t.feed.defaultUser);
    const isActive = partnerIdParam === conv.partner.id;
    const isUnread = conv.unreadCount > 0;
    const previewText = formatMessagePreview(
      conv.lastMessage.content,
      t.sharePost.sharedPost,
      t.messages.photo,
    );
    const preview =
      conv.lastMessage.isMine && previewText
        ? `${t.messages.you}: ${previewText}`
        : previewText;

    return (
      <div
        key={conv.partner.id}
        className={`messages-conv-item${isActive ? ' active' : ''}${isUnread ? ' unread' : ''}`}
      >
        <div className="messages-conv-avatar-wrap">
          <UserLink
            userId={conv.partner.id}
            displayName={conv.partner.displayName}
            avatarUrl={conv.partner.avatarUrl}
            variant="avatar"
            className="messages-conv-avatar-link"
          />
          {isUnread && <span className="messages-unread-dot" aria-hidden />}
        </div>
        <button
          type="button"
          className="messages-conv-main"
          onClick={() => handleSelectConversation(conv.partner.id)}
        >
          <div className="messages-conv-body">
            <div className="messages-conv-top">
              <span className="messages-conv-name">{name}</span>
              <span className="messages-conv-time">
                {formatConversationTime(conv.lastMessage.createdAt, localeTag, t)}
              </span>
            </div>
            <p className="messages-conv-preview">{preview}</p>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="app-shell-page messages-page">
      <AppSidebar />

      <main className="messages-main">
        <div className={`messages-layout${partnerIdParam ? ' has-thread' : ''}`}>
          {/* Danh sách hội thoại — cột trái */}
          <aside className="messages-inbox">
            <header className="messages-inbox-header">
              <button type="button" className="messages-inbox-user-btn">
                <span className="messages-inbox-username">{myUsername}</span>
                <ChevronDown size={16} />
              </button>
              <button
                type="button"
                className="messages-new-btn"
                aria-label={t.messages.newMessage}
              >
                <SquarePen size={22} />
              </button>
            </header>
            <div className="messages-search-wrap">
              <input
                type="search"
                className="messages-search"
                placeholder={t.messages.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {quickChatPartners.length > 0 && (
              <div className="messages-quick-chat-row">
                {quickChatPartners.map((partner) => (
                  <button
                    key={partner.id}
                    type="button"
                    className={`messages-quick-chat-item${partnerIdParam === partner.id ? ' active' : ''}`}
                    onClick={() => handleSelectConversation(partner.id)}
                    title={partnerDisplayName(partner, t.feed.defaultUser)}
                  >
                    <img
                      src={avatarUrl(partner.id, partner.avatarUrl)}
                      alt=""
                      className="messages-quick-chat-avatar"
                    />
                    <span className="messages-quick-chat-label">
                      {partnerDisplayName(partner, t.feed.defaultUser)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="messages-inbox-tabs">
              <button
                type="button"
                className={`messages-inbox-tab${inboxTab === 'messages' ? ' active' : ''}`}
                onClick={() => setInboxTab('messages')}
              >
                {t.messages.tabMessages}
              </button>
              <button
                type="button"
                className={`messages-inbox-tab${inboxTab === 'requests' ? ' active' : ''}`}
                onClick={() => setInboxTab('requests')}
              >
                {t.messages.tabRequests}
                {requestConversations.length > 0 && (
                  <span className="messages-tab-badge">{requestConversations.length}</span>
                )}
              </button>
            </div>

            <div className="messages-conversation-list">
              {inboxTab === 'requests' && conversationsLoading && (
                <p className="messages-empty-hint">{t.feed.loading}</p>
              )}
              {inboxTab === 'requests' &&
                !conversationsLoading &&
                requestConversations.length === 0 && (
                <p className="messages-empty-hint">{t.messages.requestsEmpty}</p>
              )}
              {inboxTab === 'requests' &&
                !conversationsLoading &&
                requestConversations.map(renderConversationItem)}
              {inboxTab === 'messages' && conversationsLoading && (
                <p className="messages-empty-hint">{t.feed.loading}</p>
              )}
              {inboxTab === 'messages' &&
                !conversationsLoading &&
                inboxConversations.length === 0 && (
                <p className="messages-empty-hint">{t.messages.noConversations}</p>
              )}
              {inboxTab === 'messages' &&
                !conversationsLoading &&
                inboxConversations.map(renderConversationItem)}
            </div>
          </aside>

          {/* Khung chat — cột phải */}
          <section className="messages-thread">
            {!partnerIdParam ? (
              <div className="messages-thread-empty">
                <div className="messages-empty-icon">
                  <Send size={56} strokeWidth={1.2} />
                </div>
                <h2>{t.messages.emptyTitle}</h2>
                <p>{t.messages.emptySubtitle}</p>
              </div>
            ) : (
              <>
                <header className="messages-thread-header">
                  <button
                    type="button"
                    className="messages-back-btn"
                    aria-label={t.messages.back}
                    onClick={() => navigate('/messages')}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    type="button"
                    className="messages-thread-user"
                    onClick={() => navigate(`/profile/${partnerIdParam}`)}
                  >
                    {activePartner ? (
                      <img
                        src={avatarUrl(activePartner.id, activePartner.avatarUrl)}
                        alt=""
                        className="messages-thread-avatar"
                      />
                    ) : (
                      <div className="messages-thread-avatar-placeholder">
                        <UserCircle size={24} />
                      </div>
                    )}
                    <div className="messages-thread-user-text">
                      <span className="messages-thread-name">{partnerName}</span>
                      <span className="messages-thread-subtitle">{partnerActivityLabel}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="messages-info-btn"
                    aria-label={t.messages.viewProfile}
                    onClick={() => navigate(`/profile/${partnerIdParam}`)}
                  >
                    <Info size={22} />
                  </button>
                </header>

                <div className="messages-thread-body" ref={threadRef}>
                  {messagesLoading && messages.length === 0 && (
                    <p className="messages-empty-hint">{t.feed.loading}</p>
                  )}
                  {!messagesLoading && messages.length === 0 && (
                    <div className="messages-thread-start">
                      <img
                        src={avatarUrl(
                          activePartner?.id ?? partnerIdParam ?? '',
                          activePartner?.avatarUrl ?? null,
                        )}
                        alt=""
                        className="messages-start-avatar"
                      />
                      <h3>{partnerUsername}</h3>
                      <p>{partnerUsername} · {t.messages.startChat}</p>
                      <button
                        type="button"
                        className="messages-view-profile-btn"
                        onClick={() => navigate(`/profile/${partnerIdParam}`)}
                      >
                        {t.messages.viewProfile}
                      </button>
                    </div>
                  )}
                  {messageGroups.map((group) => (
                    <div key={group.date} className="messages-date-group">
                      <div className="messages-date-divider">
                        <span>{dateLabel(group.date, localeTag, t)}</span>
                      </div>
                      {group.items.map((msg, idx) => {
                        const prev = idx > 0 ? group.items[idx - 1] : null;
                        const showAvatar =
                          !msg.isMine && (!prev || prev.isMine || prev.sender.id !== msg.sender.id);
                        const isFirstInGroup =
                          !prev || prev.isMine !== msg.isMine || prev.sender.id !== msg.sender.id;
                        const isLastInGroup =
                          idx === group.items.length - 1 ||
                          group.items[idx + 1]?.isMine !== msg.isMine ||
                          group.items[idx + 1]?.sender.id !== msg.sender.id;

                        return (
                          <div
                            key={msg.id}
                            className={`messages-bubble-row${msg.isMine ? ' mine' : ' theirs'}${isFirstInGroup ? ' first' : ''}${isLastInGroup ? ' last' : ''}`}
                          >
                            {!msg.isMine && (
                              <div className="messages-bubble-avatar-slot">
                                {showAvatar ? (
                                  <UserLink
                                    userId={msg.sender.id}
                                    displayName={msg.sender.displayName}
                                    avatarUrl={msg.sender.avatarUrl}
                                    variant="avatar"
                                    className="messages-bubble-avatar-link"
                                  />
                                ) : (
                                  <span className="messages-bubble-avatar-spacer" />
                                )}
                              </div>
                            )}
                            <div className="messages-bubble-wrap">
                              <div className="messages-bubble">
                                <MessageContent content={msg.content} />
                              </div>
                              {isLastInGroup && (
                                <div className="messages-bubble-meta">
                                  <span className="messages-bubble-time">
                                    {formatMessageTime(msg.createdAt, localeTag)}
                                  </span>
                                  {msg.isMine &&
                                    msg.id === messages[messages.length - 1]?.id && (
                                    <span className="messages-bubble-status">
                                      {msg.isRead ? t.messages.seen : t.messages.sent}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <footer className="messages-composer">
                  <div className="messages-composer-inner">
                    <button
                      type="button"
                      className="messages-emoji-btn"
                      aria-label="Emoji"
                      tabIndex={-1}
                    >
                      <Smile size={22} />
                    </button>
                    <textarea
                      ref={inputRef}
                      className="messages-input"
                      placeholder={t.messages.inputPlaceholder}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      maxLength={2000}
                    />
                    {draft.trim() ? (
                      <button
                        type="button"
                        className="messages-send-btn"
                        disabled={sending}
                        aria-label={t.messages.send}
                        onClick={() => void handleSend()}
                      >
                        <Send size={20} strokeWidth={2} />
                      </button>
                    ) : null}
                  </div>
                </footer>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
