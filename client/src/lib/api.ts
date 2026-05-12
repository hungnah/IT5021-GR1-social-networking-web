const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

function getHeaders(extra?: HeadersInit): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: getHeaders(options?.headers as HeadersInit),
  });
  const data = (await response.json()) as { message?: string | string[] } & T;
  if (!response.ok) {
    const msg = Array.isArray(data?.message)
      ? data.message.join(', ')
      : (data?.message ?? 'Đã có lỗi xảy ra');
    throw new Error(msg);
  }
  return data;
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};

export interface UserProfile {
  id: string;
  displayName: string | null;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  createdAt: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

export interface Post {
  id: string;
  userId: string;
  content: string | null;
  privacyStatus: 'Public' | 'Followers only' | 'Private';
  createdAt: string;
}

export interface StoredUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  googleId: string | null;
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem('currentUser');
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('currentUser');
}
