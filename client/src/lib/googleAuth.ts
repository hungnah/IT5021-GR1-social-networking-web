import { api } from './api';
import type { StoredUser } from '../store/authStore';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function isGoogleAuthConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID?.trim());
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
            error_callback?: () => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

function waitForGoogleScript(timeoutMs = 8000): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error('Không tải được Google Sign-In. Hãy thử tải lại trang.'));
        return;
      }
      window.setTimeout(tick, 100);
    };
    tick();
  });
}

function fetchGoogleAccessToken(): Promise<string> {
  const clientId = GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return Promise.reject(
      new Error('Chưa cấu hình VITE_GOOGLE_CLIENT_ID trong client/.env'),
    );
  }

  return waitForGoogleScript().then(
    () =>
      new Promise<string>((resolve, reject) => {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: (response) => {
            if (response.error || !response.access_token) {
              reject(new Error('Đăng nhập Google bị hủy hoặc thất bại'));
              return;
            }
            resolve(response.access_token);
          },
          error_callback: () => {
            reject(new Error('Đăng nhập Google thất bại'));
          },
        });
        client.requestAccessToken();
      }),
  );
}

async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error('Không lấy được thông tin tài khoản Google');
  }
  return (await res.json()) as GoogleUserInfo;
}

export async function signInWithGoogle(): Promise<LoginResponse> {
  const accessToken = await fetchGoogleAccessToken();
  const userinfo = await fetchGoogleUserInfo(accessToken);

  if (!userinfo.sub || !userinfo.email) {
    throw new Error('Tài khoản Google thiếu email hoặc ID');
  }

  return api.post<LoginResponse>('/auth/google', {
    googleId: userinfo.sub,
    email: userinfo.email,
    firstName: userinfo.given_name?.trim() || 'User',
    lastName: userinfo.family_name?.trim() || '',
    avatarUrl: userinfo.picture,
  });
}
