import { api } from './api';
import type { StoredUser } from '../store/authStore';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function isGoogleAuthConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID?.trim());
}

export function getGoogleConfigHint(): string | null {
  if (isGoogleAuthConfigured()) return null;
  return 'Thêm VITE_GOOGLE_CLIENT_ID vào client/.env (xem client/.env.example), rồi khởi động lại npm run dev.';
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
            ux_mode?: 'popup' | 'redirect';
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (error: unknown) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

function mapGoogleError(error?: string, description?: string): string {
  if (error === 'popup_closed_by_user' || error === 'access_denied') {
    return 'Bạn đã hủy đăng nhập Google';
  }
  if (error === 'origin_mismatch') {
    return 'Origin chưa được thêm vào Google Cloud Console (Authorized JavaScript origins: http://localhost:5173)';
  }
  if (description) return description;
  if (error) return `Google OAuth lỗi: ${error}`;
  return 'Đăng nhập Google thất bại';
}

function waitForGoogleScript(timeoutMs = 10000): Promise<void> {
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
        reject(
          new Error(
            'Không tải được Google Sign-In. Kiểm tra kết nối mạng hoặc tải lại trang.',
          ),
        );
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
    return Promise.reject(new Error(getGoogleConfigHint() ?? 'Chưa cấu hình Google OAuth'));
  }

  return waitForGoogleScript().then(
    () =>
      new Promise<string>((resolve, reject) => {
        let settled = false;
        const finish = (fn: () => void) => {
          if (settled) return;
          settled = true;
          fn();
        };

        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          ux_mode: 'popup',
          callback: (response) => {
            if (response.error || !response.access_token) {
              finish(() =>
                reject(
                  new Error(mapGoogleError(response.error, response.error_description)),
                ),
              );
              return;
            }
            finish(() => resolve(response.access_token!));
          },
          error_callback: (error) => {
            finish(() =>
              reject(
                new Error(
                  error instanceof Error
                    ? error.message
                    : 'Không mở được cửa sổ đăng nhập Google',
                ),
              ),
            );
          },
        });

        client.requestAccessToken({ prompt: 'select_account' });
      }),
  );
}

export async function signInWithGoogle(): Promise<LoginResponse> {
  const accessToken = await fetchGoogleAccessToken();
  return api.post<LoginResponse>('/auth/google', { accessToken });
}
