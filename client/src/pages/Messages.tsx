import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Info,
  Send,
  UserCircle,
} from 'lucide-react';
import AppSidebar from '../components/app-shell/AppSidebar';
import UserLink from '../components/common/UserLink';
import {
  api,
  ApiError,
  type ConversationItem,
  type MessageItem,
  type ConversationPartner,
} from '../lib/api';
import {
  connectChatSocket,
  markChatRead,
  onChatMessage,
  sendChatMessage,
} from '../lib/chatSocket';
import { avatarUrl } from '../lib/avatar';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
  }, [loadConversations, navigate]);

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
    if (!partnerIdParam) {
      setActivePartner(null);
      setMessages([]);
      return;
    }
    void loadPartner(partnerIdParam);
    void loadThread(partnerIdParam);
  }, [partnerIdParam, loadPartner, loadThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        const handle = c.partner.email.split('@')[0].toLowerCase();
        return name.includes(q) || handle.includes(q);
      })
    : conversations;

  const partnerName =
    activePartner?.displayName?.trim() ||
    activePartner?.email.split('@')[0] ||
    t.feed.defaultUser;

  const partnerHandle = activePartner
    ? `@${activePartner.email.split('@')[0]}`
    : '';

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="app-shell-page messages-page">
      <AppSidebar />

      <main className="messages-main">
        <div className={`messages-layout${partnerIdParam ? ' has-thread' : ''}`}>
          {/* Danh sách hội thoại — cột trái */}
          <aside className="messages-inbox">
            <header className="messages-inbox-header">
              <h1>{t.messages.title}</h1>
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
            <div className="messages-conversation-list">
              {conversationsLoading && (
                <p className="messages-empty-hint">{t.feed.loading}</p>
              )}
              {!conversationsLoading && filteredConversations.length === 0 && (
                <p className="messages-empty-hint">{t.messages.noConversations}</p>
              )}
              {!conversationsLoading &&
                filteredConversations.map((conv) => {
                  const name =
                    conv.partner.displayName?.trim() || t.feed.defaultUser;
                  const handle = conv.partner.email.split('@')[0];
                  const isActive = partnerIdParam === conv.partner.id;
                  const preview =
                    conv.lastMessage.isMine && conv.lastMessage.content
                      ? `${t.messages.you}: ${conv.lastMessage.content}`
                      : conv.lastMessage.content;
                  return (
                    <div
                      key={conv.partner.id}
                      className={`messages-conv-item${isActive ? ' active' : ''}${conv.unreadCount > 0 ? ' unread' : ''}`}
                    >
                      <div className="messages-conv-avatar-wrap">
                        <UserLink
                          userId={conv.partner.id}
                          displayName={conv.partner.displayName}
                          avatarUrl={conv.partner.avatarUrl}
                          variant="avatar"
                          className="messages-conv-avatar-link"
                        />
                        {conv.unreadCount > 0 && (
                          <span className="messages-unread-dot" aria-hidden />
                        )}
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
                            {formatConversationTime(
                              conv.lastMessage.createdAt,
                              localeTag,
                              t,
                            )}
                          </span>
                        </div>
                        <p className="messages-conv-preview">
                          <span className="messages-conv-handle">@{handle}</span>
                          {' · '}
                          {preview}
                        </p>
                      </div>
                      </button>
                    </div>
                  );
                })}
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
                        <UserCircle size={32} />
                      </div>
                    )}
                    <div className="messages-thread-user-text">
                      <span className="messages-thread-name">{partnerName}</span>
                      <span className="messages-thread-status">{partnerHandle}</span>
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
                      <h3>{partnerName}</h3>
                      <p>{partnerHandle} · {t.messages.startChat}</p>
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
                                <p>{msg.content}</p>
                              </div>
                              {isLastInGroup && (
                                <span className="messages-bubble-time">
                                  {formatMessageTime(msg.createdAt, localeTag)}
                                </span>
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
                    <button
                      type="button"
                      className="messages-send-btn"
                      disabled={!draft.trim() || sending}
                      aria-label={t.messages.send}
                      onClick={() => void handleSend()}
                    >
                      {sending ? '…' : t.messages.send}
                    </button>
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
