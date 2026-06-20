import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Maximize2,
  MessageCircle,
  Smile,
  X,
} from 'lucide-react';
import {
  api,
  type ConversationItem,
  type ConversationPartner,
  type MessageItem,
} from '../../lib/api';
import {
  connectChatSocket,
  markChatRead,
  onChatMessage,
  onChatRead,
  sendChatMessage,
} from '../../lib/chatSocket';
import { avatarUrl } from '../../lib/avatar';
import { resolveUsername } from '../../lib/username';
import MessageContent from './MessageContent';
import { formatMsg, useLanguage } from '../../i18n/LanguageContext';
import { getStoredUser } from '../../store/authStore';
import './FloatingMessagesWidget.css';

type PanelView = 'closed' | 'list' | 'chat';

function formatConversationTime(
  iso: string,
  localeTag: string,
  t: { time: { justNow: string; minutes: string; hours: string; days: string } },
): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  const diff = (Date.now() - time) / 1000;
  if (diff < 60) return t.time.justNow;
  if (diff < 3600) return formatMsg(t.time.minutes, { n: Math.floor(diff / 60) });
  if (diff < 86400) return formatMsg(t.time.hours, { n: Math.floor(diff / 3600) });
  if (diff < 604800) return formatMsg(t.time.days, { n: Math.floor(diff / 86400) });
  return new Date(iso).toLocaleDateString(localeTag);
}

function messagePartnerId(msg: MessageItem): string {
  return msg.isMine ? msg.receiverId : msg.sender.id;
}

function partnerDisplayName(partner: ConversationPartner, fallback: string): string {
  return partner.displayName?.trim() || fallback;
}

export default function FloatingMessagesWidget() {
  const navigate = useNavigate();
  const { t, localeTag } = useLanguage();

  const [view, setView] = useState<PanelView>('closed');
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activePartner, setActivePartner] = useState<ConversationPartner | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const activePartnerIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  activePartnerIdRef.current = activePartner?.id ?? null;

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.get<ConversationItem[]>('/messages/conversations');
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      setConversations([]);
    }
  }, []);

  const openChat = useCallback(async (partnerId: string) => {
    setView('chat');
    setMessagesLoading(true);
    try {
      const [partner, thread] = await Promise.all([
        api.get<ConversationPartner>(`/messages/partner/${partnerId}`),
        api.get<MessageItem[]>(`/messages/with/${partnerId}?limit=50`),
      ]);
      setActivePartner(partner);
      setMessages(Array.isArray(thread) ? thread : []);
      markChatRead(partnerId);
      setConversations((prev) =>
        prev.map((c) =>
          c.partner.id === partnerId ? { ...c, unreadCount: 0 } : c,
        ),
      );
      window.dispatchEvent(new CustomEvent('feedme:messages-read'));
    } catch {
      setActivePartner(null);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getStoredUser()) return;
    connectChatSocket();
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const unsubMsg = onChatMessage((msg) => {
      const partnerId = messagePartnerId(msg);
      const openId = activePartnerIdRef.current;

      if (openId === partnerId) {
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
        if (!existing) {
          void loadConversations();
          return prev;
        }
        const updated: ConversationItem = {
          ...existing,
          lastMessage: {
            id: msg.id,
            content: msg.content,
            createdAt: msg.createdAt,
            isMine: msg.isMine,
            isRead: msg.isRead,
          },
          unreadCount:
            openId === partnerId ? 0 : existing.unreadCount + (!msg.isMine ? 1 : 0),
        };
        const rest = prev.filter((c) => c.partner.id !== partnerId);
        return [updated, ...rest];
      });
    });

    const unsubRead = onChatRead((payload) => {
      if (activePartnerIdRef.current === payload.readerId) {
        setMessages((prev) =>
          prev.map((m) => (m.isMine ? { ...m, isRead: true } : m)),
        );
      }
    });

    return () => {
      unsubMsg();
      unsubRead();
    };
  }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (view === 'chat') {
      const id = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(id);
    }
  }, [view, activePartner?.id]);

  const handleSend = async () => {
    const content = draft.trim();
    const partnerId = activePartner?.id;
    if (!content || !partnerId || sending) return;
    setSending(true);
    setDraft('');
    try {
      const sent = await sendChatMessage(partnerId, content);
      setMessages((prev) => [...prev, sent]);
      setConversations((prev) => {
        const existing = prev.find((c) => c.partner.id === partnerId);
        if (!existing) return prev;
        const updated: ConversationItem = {
          ...existing,
          lastMessage: {
            id: sent.id,
            content: sent.content,
            createdAt: sent.createdAt,
            isMine: true,
            isRead: false,
          },
          unreadCount: 0,
        };
        const rest = prev.filter((c) => c.partner.id !== partnerId);
        return [updated, ...rest];
      });
    } catch {
      setDraft(content);
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

  const previewAvatars = conversations.slice(0, 3);
  const partnerName = activePartner
    ? partnerDisplayName(activePartner, t.feed.defaultUser)
    : '';
  const partnerUsername = activePartner
    ? resolveUsername(
        activePartner.username,
        activePartner.displayName,
        activePartner.id,
        activePartner.email,
      )
    : '';

  if (!getStoredUser()) return null;

  return (
    <div className="float-msg-root">
      {view === 'closed' && (
        <button
          type="button"
          className="float-msg-collapsed"
          onClick={() => setView('list')}
          aria-label={t.messages.title}
        >
          <MessageCircle size={20} />
          <span>{t.messages.title}</span>
          {previewAvatars.length > 0 && (
            <span className="float-msg-collapsed-avatars">
              {previewAvatars.map((conv, i) => (
                <img
                  key={conv.partner.id}
                  src={avatarUrl(conv.partner.id, conv.partner.avatarUrl)}
                  alt=""
                  style={{ zIndex: 3 - i }}
                />
              ))}
            </span>
          )}
        </button>
      )}

      {view !== 'closed' && (
        <div className={`float-msg-panel${view === 'chat' ? ' chat-open' : ''}`}>
          {view === 'list' && (
            <>
              <header className="float-msg-header">
                <h2>{t.messages.title}</h2>
                <div className="float-msg-header-actions">
                  <button
                    type="button"
                    className="float-msg-icon-btn"
                    aria-label={t.messages.title}
                    onClick={() => navigate('/messages')}
                  >
                    <Maximize2 size={18} />
                  </button>
                  <button
                    type="button"
                    className="float-msg-icon-btn"
                    aria-label={t.suggestions.close}
                    onClick={() => setView('closed')}
                  >
                    <X size={20} />
                  </button>
                </div>
              </header>
              <div className="float-msg-list">
                {conversations.length === 0 && (
                  <p className="float-msg-empty">{t.messages.noConversations}</p>
                )}
                {conversations.map((conv) => {
                  const name = partnerDisplayName(conv.partner, t.feed.defaultUser);
                  const preview =
                    conv.lastMessage.isMine && conv.lastMessage.content
                      ? `${t.messages.you}: ${conv.lastMessage.content}`
                      : conv.lastMessage.content;
                  return (
                    <button
                      key={conv.partner.id}
                      type="button"
                      className={`float-msg-list-item${conv.unreadCount > 0 ? ' unread' : ''}`}
                      onClick={() => void openChat(conv.partner.id)}
                    >
                      <img
                        src={avatarUrl(conv.partner.id, conv.partner.avatarUrl)}
                        alt=""
                        className="float-msg-list-avatar"
                      />
                      <div className="float-msg-list-body">
                        <div className="float-msg-list-top">
                          <span className="float-msg-list-name">{name}</span>
                          <span className="float-msg-list-time">
                            {formatConversationTime(
                              conv.lastMessage.createdAt,
                              localeTag,
                              t,
                            )}
                          </span>
                        </div>
                        <p className="float-msg-list-preview">{preview}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {view === 'chat' && activePartner && (
            <>
              <header className="float-msg-header">
                <button
                  type="button"
                  className="float-msg-icon-btn"
                  aria-label={t.messages.back}
                  onClick={() => {
                    setView('list');
                    setActivePartner(null);
                    setMessages([]);
                  }}
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  className="float-msg-chat-user"
                  onClick={() => navigate(`/profile/${activePartner.id}`)}
                >
                  <img
                    src={avatarUrl(activePartner.id, activePartner.avatarUrl)}
                    alt=""
                    className="float-msg-chat-avatar"
                  />
                  <div className="float-msg-chat-user-text">
                    <span className="float-msg-chat-name">{partnerName}</span>
                    <span className="float-msg-chat-handle">@{partnerUsername}</span>
                  </div>
                </button>
                <div className="float-msg-header-actions">
                  <button
                    type="button"
                    className="float-msg-icon-btn"
                    aria-label={t.messages.title}
                    onClick={() => navigate(`/messages/${activePartner.id}`)}
                  >
                    <Maximize2 size={18} />
                  </button>
                  <button
                    type="button"
                    className="float-msg-icon-btn"
                    aria-label={t.suggestions.close}
                    onClick={() => {
                      setView('closed');
                      setActivePartner(null);
                      setMessages([]);
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </header>

              <div className="float-msg-thread">
                {messagesLoading && messages.length === 0 && (
                  <p className="float-msg-empty">{t.feed.loading}</p>
                )}
                {!messagesLoading && messages.length === 0 && (
                  <p className="float-msg-empty-hint">{t.messages.emptySubtitle}</p>
                )}
                {messages.map((msg, idx) => {
                  const isLast = idx === messages.length - 1;
                  return (
                    <div
                      key={msg.id}
                      className={`float-msg-bubble-row${msg.isMine ? ' mine' : ' theirs'}`}
                    >
                      {!msg.isMine && (
                        <img
                          src={avatarUrl(msg.sender.id, msg.sender.avatarUrl)}
                          alt=""
                          className="float-msg-bubble-avatar"
                        />
                      )}
                      <div className="float-msg-bubble-wrap">
                        <div className="float-msg-bubble">
                          <MessageContent content={msg.content} />
                        </div>
                        {isLast && msg.isMine && (
                          <span className="float-msg-status">
                            {msg.isRead ? t.messages.seen : t.messages.sent}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <footer className="float-msg-composer">
                <button type="button" className="float-msg-emoji-btn" tabIndex={-1}>
                  <Smile size={20} />
                </button>
                <textarea
                  ref={inputRef}
                  className="float-msg-input"
                  placeholder={t.messages.inputPlaceholder}
                  value={draft}
                  rows={1}
                  maxLength={2000}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                {draft.trim() ? (
                  <button
                    type="button"
                    className="float-msg-send-btn"
                    disabled={sending}
                    onClick={() => void handleSend()}
                  >
                    {sending ? '…' : t.messages.send}
                  </button>
                ) : null}
              </footer>
            </>
          )}

          {view === 'chat' && !activePartner && !messagesLoading && (
            <div className="float-msg-empty">{t.messages.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
