import { API_BASE_URL } from '../config/apiBase';

// ===== Auth Store =====
// Quản lý trạng thái đăng nhập ở phía client:
// - accessToken: lưu trong MEMORY (biến module-level) → an toàn hơn localStorage
// - refreshToken: lưu localStorage để tồn tại qua F5 (chấp nhận cho đồ án)
// - currentUser: lưu localStorage để biết userId khi gọi refresh sau F5
//
// Dùng fetch thay axios để tránh lỗi Vite "Failed to resolve import axios" khi client/node_modules thiếu.

export interface StoredUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  googleId: string | null;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}

const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'currentUser';

let accessTokenInMemory: string | null = null;

type AuthListener = (user: StoredUser | null) => void;
const listeners = new Set<AuthListener>();

function notify() {
  const user = getStoredUser();
  listeners.forEach((cb) => cb(user));
}

export function subscribeAuth(cb: AuthListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getAccessToken(): string | null {
  return accessTokenInMemory;
}

export function setAccessToken(token: string | null): void {
  accessTokenInMemory = token;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null): void {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser | null): void {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function setSession(data: LoginResponse): void {
  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  setStoredUser(data.user);
  notify();
}

export function clearSession(): void {
  setAccessToken(null);
  setRefreshToken(null);
  setStoredUser(null);
  notify();
}

let refreshInflight: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  if (refreshInflight) return refreshInflight;

  const refreshToken = getRefreshToken();
  const user = getStoredUser();
  if (!refreshToken || !user) {
    return Promise.resolve(false);
  }

  refreshInflight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, refreshToken }),
      });
      if (!res.ok) {
        clearSession();
        return false;
      }
      const data = (await res.json()) as LoginResponse;
      setSession(data);
      return true;
    } catch {
      clearSession();
      return false;
    } finally {
      refreshInflight = null;
    }
  })();

  return refreshInflight;
}

export async function hydrateAuth(): Promise<void> {
  if (getRefreshToken() && getStoredUser()) {
    await refreshSession();
  }
}

export async function logout(): Promise<void> {
  const token = getAccessToken();
  try {
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: '{}',
      });
    }
  } catch {
    // Backend lỗi vẫn cứ logout phía client cho UX
  }
  clearSession();
}
