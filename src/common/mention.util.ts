/** Tạo handle @mention từ display name (khớp logic frontend). */
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

export function extractMentionHandles(content: string): string[] {
  const found = new Set<string>();
  for (const match of content.matchAll(/@([a-zA-Z0-9_]+)/g)) {
    found.add(match[1]);
  }
  return [...found];
}
