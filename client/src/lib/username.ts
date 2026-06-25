const USERNAME_PATTERN = /^[a-z0-9._]{1,30}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export function sanitizeUsernameBase(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/_{2,}/g, '_')
    .replace(/^[._]+|[._]+$/g, '')
    .slice(0, 30);
}

export function suggestUsernameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? 'user';
  const base = sanitizeUsernameBase(local);
  return base.length >= 3 ? base : `user${base}`.slice(0, 30);
}

export function extractMentionHandles(content: string): string[] {
  const found = new Set<string>();
  for (const match of content.matchAll(/@([a-zA-Z0-9._]{1,30})/g)) {
    found.add(normalizeUsername(match[1]));
  }
  return [...found];
}

export function toMentionHandle(
  displayName: string | null | undefined,
  userId: string,
): string {
  const base = displayName?.trim();
  if (base) {
    const slug = sanitizeUsernameBase(base.replace(/\s+/g, '.'));
    if (slug.length >= 3) return slug;
  }
  return `user_${userId.replace(/-/g, '').slice(0, 8)}`;
}

export function mentionHandleForUser(
  username: string | null | undefined,
  displayName: string | null | undefined,
  userId: string,
): string {
  const normalized = username ? normalizeUsername(username) : '';
  if (normalized && isValidUsername(normalized)) return normalized;
  return toMentionHandle(displayName, userId);
}

export function formatUsernameLabel(
  username: string | null | undefined,
  displayName?: string | null,
  userId?: string,
): string {
  if (username?.trim()) return `@${normalizeUsername(username)}`;
  if (displayName && userId) return `@${toMentionHandle(displayName, userId)}`;
  return '';
}

export function resolveUsername(
  username: string | null | undefined,
  displayName: string | null | undefined,
  userId: string,
  email?: string,
): string {
  const handle = mentionHandleForUser(username, displayName, userId);
  if (handle) return handle;
  return email?.split('@')[0] ?? 'user';
}
