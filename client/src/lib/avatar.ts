export function avatarUrl(userId: string, url: string | null): string {
  if (url) return url;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userId)}`;
}
