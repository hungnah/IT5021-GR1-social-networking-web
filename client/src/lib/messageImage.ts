export const MSG_IMAGE_MARKER = '__MSG_IMAGE__:';

export type MessageImagePayload = {
  imageUrl: string;
};

export function buildImageMessage(imageUrl: string): string {
  return `${MSG_IMAGE_MARKER}${JSON.stringify({ imageUrl })}`;
}

export function parseImageMessage(content: string): MessageImagePayload | null {
  if (!content.startsWith(MSG_IMAGE_MARKER)) return null;
  try {
    const parsed = JSON.parse(content.slice(MSG_IMAGE_MARKER.length)) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'imageUrl' in parsed &&
      typeof (parsed as MessageImagePayload).imageUrl === 'string'
    ) {
      return parsed as MessageImagePayload;
    }
  } catch {
    /* ignore */
  }
  return null;
}
