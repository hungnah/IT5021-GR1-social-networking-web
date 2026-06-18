import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Heart,
  MessageCircle,
  Send,
  Smile,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import UserLink from '../common/UserLink';
import PostTaggedUsers from './PostTaggedUsers';
import {
  api,
  ApiError,
  type CommentWithUser,
  type FeedPost,
} from '../../lib/api';
import { avatarUrl } from '../../lib/avatar';
import { mentionHandleForUser, mentionPrefix, splitMentionParts } from '../../lib/mention';
import { useLanguage, formatMsg } from '../../i18n/LanguageContext';
import './PostCommentModal.css';

type DetailPost = FeedPost;

interface ReplyTarget {
  id: string;
  userId: string;
  displayName: string | null;
  mentionHandle: string;
}

function renderCommentContent(content: string) {
  return splitMentionParts(content).map((part, index) =>
    part.startsWith('@') ? (
      <span key={`${part}-${index}`} className="pcm-mention">
        {part}
      </span>
    ) : (
      <span key={`text-${index}`}>{part}</span>
    ),
  );
}

export interface PostCommentModalProps {
  postId: string;
  open: boolean;
  onClose: () => void;
  onPostUpdated?: (patch: Partial<Pick<FeedPost, 'commentCount' | 'reactionCount'>>) => void;
}

function buildCommentTree(comments: CommentWithUser[]) {
  const byParent = new Map<string | null, CommentWithUser[]>();
  for (const c of comments) {
    const key = c.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }
  return byParent;
}

function countReplyTree(
  commentId: string,
  tree: Map<string | null, CommentWithUser[]>,
): number {
  const direct = tree.get(commentId) ?? [];
  return direct.reduce(
    (sum, child) => sum + 1 + countReplyTree(child.id, tree),
    0,
  );
}

export default function PostCommentModal({
  postId,
  open,
  onClose,
  onPostUpdated,
}: PostCommentModalProps) {
  const { t, localeTag } = useLanguage();
  const [post, setPost] = useState<DetailPost | null>(null);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [commentLikeBusy, setCommentLikeBusy] = useState<Record<string, boolean>>({});
  const [expandedReplyThreads, setExpandedReplyThreads] = useState<Set<string>>(
    () => new Set(),
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  const formatRelativeTime = useCallback(
    (iso: string) => {
      const time = new Date(iso).getTime();
      if (Number.isNaN(time)) return '';
      const diff = (Date.now() - time) / 1000;
      if (diff < 60) return t.time.justNow;
      if (diff < 3600) {
        return formatMsg(t.time.minutes, { n: Math.floor(diff / 60) });
      }
      if (diff < 86400) {
        return formatMsg(t.time.hours, { n: Math.floor(diff / 3600) });
      }
      if (diff < 604800) {
        return formatMsg(t.time.days, { n: Math.floor(diff / 86400) });
      }
      return new Date(iso).toLocaleDateString(localeTag);
    },
    [localeTag, t],
  );

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const errorMessage = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError) {
        if (e.kind === 'auth') return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        return e.message;
      }
      return e instanceof Error ? e.message : t.feed.loadError;
    },
    [t.feed.loadError],
  );

  const fetchPostAndComments = useCallback(async () => {
    if (!postId) return;
    const [p, c, likedRes, savedRes] = await Promise.all([
      api.get<DetailPost>(`/posts/${postId}`),
      api.get<CommentWithUser[]>(`/posts/${postId}/comments`),
      api.get<{ liked: boolean }>(`/posts/${postId}/reaction-status`),
      api.get<{ saved: boolean }>(`/posts/${postId}/save-status`),
    ]);
    setPost(p);
    setComments(Array.isArray(c) ? c : []);
    setLiked(!!likedRes.liked);
    setSaved(!!savedRes.saved);
  }, [postId]);

  useEffect(() => {
    if (!open || !postId) return;
    setLoading(true);
    setError(null);
    setCommentDraft('');
    setReplyTo(null);
    setExpandedReplyThreads(new Set());
    void fetchPostAndComments()
      .catch((e) => {
        setError(errorMessage(e));
        setPost(null);
        setComments([]);
      })
      .finally(() => setLoading(false));
  }, [errorMessage, fetchPostAndComments, open, postId]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (replyTo) {
          e.preventDefault();
          cancelReply();
        } else onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose, open, replyTo]);

  useEffect(() => {
    if (!replyTo) return;
    const timer = window.setTimeout(() => commentInputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [replyTo]);

  const handleToggleLike = async () => {
    if (!postId || !post || actionBusy) return;
    setActionBusy(true);
    const prevLiked = liked;
    const prevCount = post.reactionCount;
    setLiked(!prevLiked);
    const nextCount = Math.max(0, prevCount + (prevLiked ? -1 : 1));
    setPost({ ...post, reactionCount: nextCount });
    onPostUpdated?.({ reactionCount: nextCount });
    try {
      const res = await api.post<{ liked: boolean; reactionCount: number }>(
        `/posts/${postId}/reactions`,
        {},
      );
      setLiked(!!res.liked);
      setPost((prev) => (prev ? { ...prev, reactionCount: res.reactionCount } : prev));
      onPostUpdated?.({ reactionCount: res.reactionCount });
      window.dispatchEvent(new CustomEvent('feedme:activity'));
    } catch (e) {
      setLiked(prevLiked);
      setPost((prev) => (prev ? { ...prev, reactionCount: prevCount } : prev));
      onPostUpdated?.({ reactionCount: prevCount });
      showToast(errorMessage(e));
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleSave = async () => {
    if (!postId || actionBusy) return;
    setActionBusy(true);
    const prevSaved = saved;
    setSaved(!prevSaved);
    try {
      const res = await api.post<{ saved: boolean }>(`/posts/${postId}/saves`, {});
      setSaved(!!res.saved);
      window.dispatchEvent(new CustomEvent('feedme:activity'));
    } catch (e) {
      setSaved(prevSaved);
      showToast(errorMessage(e));
    } finally {
      setActionBusy(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!postId) return;
    const text = commentDraft.trim();
    if (!text) return;
    try {
      const created = await api.post<CommentWithUser>(`/posts/${postId}/comments`, {
        content: text,
        ...(replyTo ? { parentId: replyTo.id } : {}),
      });
      setComments((prev) => [...prev, created]);
      setCommentDraft('');
      if (replyTo) {
        setExpandedReplyThreads((prev) => {
          const next = new Set(prev);
          next.add(replyTo.id);
          return next;
        });
      }
      setReplyTo(null);
      setPost((prev) => {
        if (!prev) return prev;
        const next = { ...prev, commentCount: prev.commentCount + 1 };
        onPostUpdated?.({ commentCount: next.commentCount });
        return next;
      });
      window.dispatchEvent(new CustomEvent('feedme:activity'));
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  const handleReply = (comment: CommentWithUser) => {
    const mentionHandle = mentionHandleForUser(
      comment.user.username,
      comment.user.displayName,
      comment.user.id,
    );
    setReplyTo({
      id: comment.id,
      userId: comment.user.id,
      displayName: comment.user.displayName,
      mentionHandle,
    });
    setCommentDraft(mentionPrefix(mentionHandle));
    window.requestAnimationFrame(() => {
      const input = commentInputRef.current;
      if (!input) return;
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    });
  };

  const cancelReply = () => {
    if (replyTo) {
      const prefix = mentionPrefix(replyTo.mentionHandle);
      setCommentDraft((draft) => (draft.startsWith(prefix) ? draft.slice(prefix.length) : draft));
    }
    setReplyTo(null);
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (!postId || commentLikeBusy[commentId]) return;
    const target = comments.find((c) => c.id === commentId);
    if (!target) return;

    setCommentLikeBusy((prev) => ({ ...prev, [commentId]: true }));
    const prevLiked = target.likedByMe;
    const prevCount = target.likeCount;
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              likedByMe: !prevLiked,
              likeCount: Math.max(0, prevCount + (prevLiked ? -1 : 1)),
            }
          : c,
      ),
    );

    try {
      const res = await api.post<{ liked: boolean; likeCount: number }>(
        `/posts/${postId}/comments/${commentId}/reactions`,
        {},
      );
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, likedByMe: res.liked, likeCount: res.likeCount }
            : c,
        ),
      );
    } catch (e) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, likedByMe: prevLiked, likeCount: prevCount }
            : c,
        ),
      );
      showToast(errorMessage(e));
    } finally {
      setCommentLikeBusy((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const handleShare = async () => {
    if (!postId) return;
    const shareUrl = `${window.location.origin}/post/${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'FeedMe', url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Da sao chep lien ket bai viet');
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      showToast(errorMessage(e));
    }
  };

  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  const toggleReplyThread = (commentId: string) => {
    setExpandedReplyThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const renderComment = (comment: CommentWithUser, depth = 0) => {
    const replies = commentTree.get(comment.id) ?? [];
    const replyCount = countReplyTree(comment.id, commentTree);
    const repliesExpanded = expandedReplyThreads.has(comment.id);
    const indentPx = depth > 0 ? 12 + depth * 28 : 0;

    return (
      <div key={comment.id} className="pcm-comment-thread">
        <div className="pcm-comment-row">
          <div
            className="pcm-comment-main"
            style={indentPx > 0 ? { paddingLeft: `${indentPx}px` } : undefined}
          >
            <img
              className={`pcm-comment-avatar${depth > 0 ? ' pcm-comment-avatar--small' : ''}`}
              src={avatarUrl(comment.user.id, comment.user.avatarUrl)}
              alt=""
            />
            <div className="pcm-comment-body">
              <div className="pcm-comment-text">
                <UserLink
                  userId={comment.user.id}
                  displayName={comment.user.displayName}
                  variant="comment"
                />{' '}
                <span>{renderCommentContent(comment.content)}</span>
              </div>
              <div className="pcm-comment-meta">
                <time>{formatRelativeTime(comment.createdAt)}</time>
                {comment.likeCount > 0 ? (
                  <span>
                    {formatMsg(t.feed.commentLikeCount, { count: String(comment.likeCount) })}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="pcm-meta-btn"
                  onClick={() => handleReply(comment)}
                >
                  {t.feed.reply}
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="pcm-comment-like"
            disabled={commentLikeBusy[comment.id]}
            aria-label="like comment"
            onClick={() => void handleToggleCommentLike(comment.id)}
          >
            <Heart
              size={12}
              className={comment.likedByMe ? 'liked' : ''}
              fill={comment.likedByMe ? 'currentColor' : 'none'}
              strokeWidth={comment.likedByMe ? 0 : 2}
            />
          </button>
        </div>

        {replies.length > 0 ? (
          repliesExpanded ? (
            <>
              {replies.map((child) => renderComment(child, depth + 1))}
              <button
                type="button"
                className="pcm-view-replies pcm-hide-replies"
                style={{ paddingLeft: `${16 + indentPx + 40}px` }}
                onClick={() => toggleReplyThread(comment.id)}
              >
                {t.feed.hideReplies}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="pcm-view-replies"
              style={{ paddingLeft: `${16 + indentPx + 40}px` }}
              onClick={() => toggleReplyThread(comment.id)}
            >
              {formatMsg(t.feed.showReplies, { count: String(replyCount) })}
            </button>
          )
        ) : null}
      </div>
    );
  };

  if (!open) return null;

  const title = post?.content?.trim() || 'Post';

  return createPortal(
    <div
      className="pcm-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pcm-dialog" role="dialog" aria-modal="true" aria-label={t.feed.comments}>
        <button type="button" className="pcm-close" aria-label={t.suggestions.close} onClick={onClose}>
          <X size={20} />
        </button>

        {loading && (
          <div className="pcm-loading">
            <p>{t.feed.loading}</p>
          </div>
        )}

        {error && !loading && (
          <div className="pcm-loading pcm-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && post && (
          <>
            <div className="pcm-media">
              {post.imageUrl ? (
                <img src={post.imageUrl} alt={title} />
              ) : (
                <div className="pcm-media-placeholder">
                  <p>{post.content ?? ''}</p>
                </div>
              )}
            </div>

            <div className="pcm-panel">
              <header className="pcm-panel-header">
                <UserLink
                  userId={post.author.id}
                  displayName={post.author.displayName}
                  avatarUrl={post.author.avatarUrl}
                  variant="header"
                />
              </header>

              <div className="pcm-scroll">
                <div className="pcm-caption">
                  <img
                    className="pcm-comment-avatar"
                    src={avatarUrl(post.author.id, post.author.avatarUrl)}
                    alt=""
                  />
                  <div className="pcm-comment-body">
                    <div className="pcm-comment-text">
                      <UserLink
                        userId={post.author.id}
                        displayName={post.author.displayName}
                        variant="comment"
                      />{' '}
                      <span>{post.content ?? ''}</span>
                    </div>
                    {post.taggedUsers && post.taggedUsers.length > 0 ? (
                      <PostTaggedUsers taggedUsers={post.taggedUsers} />
                    ) : null}
                    <div className="pcm-comment-meta">
                      <time>{formatRelativeTime(post.createdAt)}</time>
                    </div>
                  </div>
                </div>

                {(commentTree.get(null) ?? []).map((c) => renderComment(c))}

                {comments.length === 0 ? (
                  <p className="pcm-empty">{t.feed.noCommentsYet}</p>
                ) : null}
              </div>

              <footer className="pcm-footer">
                <div className="pcm-actions">
                  <div className="pcm-actions-left">
                    <button
                      type="button"
                      className="pcm-icon-btn"
                      disabled={actionBusy}
                      aria-label="like"
                      onClick={() => void handleToggleLike()}
                    >
                      <Heart
                        size={24}
                        className={liked ? 'liked' : ''}
                        fill={liked ? 'currentColor' : 'none'}
                        strokeWidth={liked ? 0 : 2}
                      />
                    </button>
                    <button type="button" className="pcm-icon-btn" aria-label="comment">
                      <MessageCircle size={24} />
                    </button>
                    <button
                      type="button"
                      className="pcm-icon-btn"
                      aria-label="share"
                      onClick={() => void handleShare()}
                    >
                      <Send size={24} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="pcm-icon-btn"
                    disabled={actionBusy}
                    aria-label="save"
                    onClick={() => void handleToggleSave()}
                  >
                    <Bookmark
                      size={24}
                      fill={saved ? 'currentColor' : 'none'}
                      className={saved ? 'saved' : ''}
                    />
                  </button>
                </div>

                <p className="pcm-likes">
                  {post.reactionCount} {t.feed.likes}
                </p>
                <p className="pcm-time">{formatRelativeTime(post.createdAt)}</p>

                <div className="pcm-composer">
                  {replyTo ? (
                    <div className="pcm-reply-tab">
                      <span>
                        {formatMsg(t.feed.replyingTo, {
                          name: replyTo.displayName?.trim() || t.feed.defaultUser,
                        })}
                      </span>
                      <button
                        type="button"
                        className="pcm-reply-tab-close"
                        aria-label={t.feed.cancelReply}
                        onClick={cancelReply}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : null}
                  <div className="pcm-composer-row">
                    <button type="button" className="pcm-emoji-btn" aria-hidden tabIndex={-1}>
                      <Smile size={22} />
                    </button>
                    <textarea
                      ref={commentInputRef}
                      className="pcm-composer-input"
                      rows={1}
                      placeholder={t.feed.commentPlaceholder}
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape' && replyTo) {
                          e.preventDefault();
                          cancelReply();
                          return;
                        }
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSubmitComment();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={`pcm-post-btn${commentDraft.trim() ? ' active' : ''}`}
                      disabled={!commentDraft.trim()}
                      onClick={() => void handleSubmitComment()}
                    >
                      {t.feed.postComment}
                    </button>
                  </div>
                </div>
              </footer>
            </div>
          </>
        )}

        {toastMsg ? <div className="pcm-toast">{toastMsg}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
