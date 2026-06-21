import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, type FeedPost } from '../../lib/api';
import { avatarUrl } from '../../lib/avatar';
import { getPostImageUrls } from '../post/PostImageCarousel';
import { parsePostShareMessage } from '../../lib/postShare';
import { useLanguage } from '../../i18n/LanguageContext';
import './SharedPostMessage.css';

type SharedPostMessageProps = {
  content: string;
};

const previewCache = new Map<string, FeedPost>();

export default function SharedPostMessage({ content }: SharedPostMessageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const share = parsePostShareMessage(content);
  const [post, setPost] = useState<FeedPost | null>(
    share ? previewCache.get(share.postId) ?? null : null,
  );
  const [loading, setLoading] = useState(Boolean(share && !previewCache.has(share.postId)));

  useEffect(() => {
    if (!share) return;
    const cached = previewCache.get(share.postId);
    if (cached) {
      setPost(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void api
      .get<FeedPost>(`/posts/${share.postId}`)
      .then((data) => {
        if (cancelled) return;
        previewCache.set(share.postId, data);
        setPost(data);
      })
      .catch(() => {
        if (!cancelled) setPost(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [share?.postId]);

  if (!share) return null;

  const images = post ? getPostImageUrls(post) : [];
  const thumb = images[0] ?? null;
  const authorName = post?.author.displayName?.trim() || t.feed.defaultUser;
  const authorId = post?.author.id ?? '';
  const authorAvatar = post?.author.avatarUrl ?? null;
  const caption = post?.content?.trim() || share.note || '';
  const multi = images.length > 1;

  const openPost = () =>
    navigate(`/post/${share.postId}`, { state: { returnTo: location.pathname } });

  return (
    <button
      type="button"
      className="shared-post-message"
      onClick={openPost}
    >
      {loading ? (
        <div className="shared-post-message-loading">{t.sharePost.loadingPost}</div>
      ) : (
        <>
          <header className="shared-post-message-header">
            <img
              src={avatarUrl(authorId, authorAvatar)}
              alt=""
              className="shared-post-message-header-avatar"
            />
            <span className="shared-post-message-header-name">{authorName}</span>
          </header>

          <div className="shared-post-message-media">
            {thumb ? (
              <img src={thumb} alt="" className="shared-post-message-thumb" />
            ) : (
              <div className="shared-post-message-thumb shared-post-message-thumb--empty">
                {caption.slice(0, 80) || t.sharePost.viewPost}
              </div>
            )}
            {multi ? (
              <span className="shared-post-message-multi" aria-hidden>
                <Copy size={14} />
              </span>
            ) : null}
          </div>

          {caption ? (
            <div className="shared-post-message-caption">
              <strong>{authorName}</strong>
              <span>{caption}</span>
            </div>
          ) : null}
        </>
      )}
    </button>
  );
}
