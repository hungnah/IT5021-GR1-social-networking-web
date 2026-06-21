import { parseImageMessage } from '../../lib/messageImage';
import './MessageImageContent.css';

type MessageImageContentProps = {
  content: string;
};

export default function MessageImageContent({ content }: MessageImageContentProps) {
  const payload = parseImageMessage(content);
  if (!payload) return null;

  return (
    <a
      href={payload.imageUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="message-image-content"
      onClick={(e) => e.stopPropagation()}
    >
      <img src={payload.imageUrl} alt="" />
    </a>
  );
}
