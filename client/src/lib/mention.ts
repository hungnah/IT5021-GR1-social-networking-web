/** Tạo handle @mention từ display name (giống Instagram). */
export function toMentionHandle(
  displayName: string | null | undefined,
  userId: string,
): string {
  const base = displayName?.trim();
  if (base) {
    const slug = base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9_]/g, '');
    if (slug.length >= 2) return slug;
  }
  return `user_${userId.replace(/-/g, '').slice(0, 8)}`;
}

export function mentionPrefix(handle: string): string {
  return `@${handle} `;
}

const MENTION_RE = /(@[a-zA-Z0-9_]+)/g;

export function splitMentionParts(content: string): string[] {
  return content.split(MENTION_RE).filter((part) => part.length > 0);
}
