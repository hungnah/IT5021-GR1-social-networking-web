import { parsePostShareMessage } from '../../lib/postShare';
import SharedPostMessage from './SharedPostMessage';

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
  return <p>{content}</p>;
}
