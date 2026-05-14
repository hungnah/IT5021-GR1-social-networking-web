import axios from 'axios';

// ===== Auth Store =====
// Quản lý trạng thái đăng nhập ở phía client:
// - accessToken: lưu trong MEMORY (biến module-level) → an toàn hơn localStorage
// - refreshToken: lưu localStorage để tồn tại qua F5 (chấp nhận cho đồ án)
// - currentUser: lưu localStorage để biết userId khi gọi refresh sau F5
//
// Lưu ý: store dùng raw axios cho /auth/refresh để tránh circular import với api.ts.

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

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:3000';

// accessToken được giữ trong memory, mất đi khi F5 (lúc đó dùng refreshToken để xin lại)
let accessTokenInMemory: string | null = null;

// Cho phép các component đăng ký lắng nghe thay đổi trạng thái auth (logout, refresh fail, ...)
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

// ---------- accessToken (memory) ----------
export function getAccessToken(): string | null {
  return accessTokenInMemory;
}

export function setAccessToken(token: string | null): void {
  accessTokenInMemory = token;
}

// ---------- refreshToken (localStorage) ----------
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null): void {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ---------- currentUser (localStorage) ----------
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

// ---------- Session helpers ----------
// Lưu session sau login / refresh thành công
export function setSession(data: LoginResponse): void {
  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  setStoredUser(data.user);
  notify();
}

// Xoá toàn bộ session (logout hoặc refresh fail)
export function clearSession(): void {
  setAccessToken(null);
  setRefreshToken(null);
  setStoredUser(null);
  notify();
}

// ---------- Refresh & Hydrate ----------
// Gọi /auth/refresh để xin cặp token mới.
// Dùng raw axios để KHÔNG đi qua interceptor của api.ts (tránh vòng lặp 401 → refresh → 401).
let refreshInflight: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  if (refreshInflight) return refreshInflight;

  const refreshToken = getRefreshToken();
  const user = getStoredUser();
  if (!refreshToken || !user) {
    return Promise.resolve(false);
  }

  refreshInflight = axios
    .post<LoginResponse>(`${API_BASE_URL}/auth/refresh`, {
      userId: user.id,
      refreshToken,
    })
    .then((response) => {
      setSession(response.data);
      return true;
    })
    .catch(() => {
      clearSession();
      return false;
    })
    .finally(() => {
      refreshInflight = null;
    }) as Promise<boolean>;

  return refreshInflight;
}

// Gọi ở khởi động app (main.tsx): nếu có refreshToken trong localStorage thì
// tự động xin access token mới để duy trì phiên đăng nhập sau F5.
export async function hydrateAuth(): Promise<void> {
  if (getRefreshToken() && getStoredUser()) {
    await refreshSession();
  }
}

// Đăng xuất: gọi backend (best-effort) để xoá refresh token trong DB, rồi clear local.
export async function logout(): Promise<void> {
  const token = getAccessToken();
  try {
    if (token) {
      await axios.post(
        `${API_BASE_URL}/auth/logout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    }
  } catch {
    // Backend lỗi vẫn cứ logout phía client cho UX
  }
  clearSession();
}
