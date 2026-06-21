import { parsePostShareMessage } from '../../lib/postShare';
import { parseImageMessage } from '../../lib/messageImage';
import SharedPostMessage from './SharedPostMessage';
import MessageImageContent from './MessageImageContent';

type MessageContentProps = {
  content: string;
};

export default function MessageContent({ content }: MessageContentProps) {
  const share = parsePostShareMessage(content);
  if (share) {
    return (
      <>
        {share.note ? <p className="message-text-note">{share.note}</p> : null}
        <SharedPostMessage content={content} />
      </>
    );
  }
  if (parseImageMessage(content)) {
    return <MessageImageContent content={content} />;
  }
  return <p>{content}</p>;
}
