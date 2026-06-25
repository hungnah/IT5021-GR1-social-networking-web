export const POST_SHARE_MARKER = '__POST_SHARE__:';

export type PostSharePayload = {
  postId: string;
  note?: string;
};

export function buildPostShareMessage(postId: string, note?: string): string {
  const payload: PostSharePayload = { postId };
  if (note?.trim()) payload.note = note.trim();
  return `${POST_SHARE_MARKER}${JSON.stringify(payload)}`;
}

export function parsePostShareMessage(content: string): PostSharePayload | null {
  if (!content.startsWith(POST_SHARE_MARKER)) return null;
  try {
    const parsed = JSON.parse(content.slice(POST_SHARE_MARKER.length)) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'postId' in parsed &&
      typeof (parsed as PostSharePayload).postId === 'string'
    ) {
      return parsed as PostSharePayload;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function formatMessagePreview(
  content: string,
  sharedLabel: string,
  imageLabel?: string,
): string {
  if (parsePostShareMessage(content)) return sharedLabel;
  if (content.startsWith('__MSG_IMAGE__:')) {
    return imageLabel ?? '📷';
  }
  return content;
}
