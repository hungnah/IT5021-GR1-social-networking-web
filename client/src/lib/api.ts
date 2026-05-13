import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  clearSession,
  getAccessToken,
  refreshSession,
} from '../store/authStore';

// ===== Axios instance =====
// baseURL lấy từ env (VITE_API_URL hoặc VITE_API_BASE_URL),
// fallback về http://localhost:3000 cho dev.
const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:3000';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ----- Request interceptor -----
// Tự động gắn Bearer accessToken vào header mỗi request.
axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ----- Response interceptor -----
// Khi backend trả 401 → thử gọi /auth/refresh; nếu thành công → retry request cũ,
// nếu thất bại → clear session và redirect /login.
//
// Các route auth không cần retry để tránh vòng lặp vô tận.
const AUTH_ROUTES = ['/auth/refresh', '/auth/login', '/auth/signup', '/auth/google'];

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;

    const isAuthRoute = AUTH_ROUTES.some((url) =>
      originalRequest?.url?.includes(url),
    );

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRoute
    ) {
      originalRequest._retry = true;
      const ok = await refreshSession();
      if (ok) {
        // Gắn access token mới rồi gửi lại request cũ
        const newToken = getAccessToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return axiosInstance(originalRequest);
      }

      // Refresh fail → buộc đăng nhập lại
      clearSession();
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  },
);

// ----- Helper: bóc message lỗi từ NestJS ValidationPipe / HttpException -----
function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (typeof data?.message === 'string') return data.message;
    return error.message || 'Đã có lỗi xảy ra';
  }
  if (error instanceof Error) return error.message;
  return 'Đã có lỗi xảy ra';
}

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await axiosInstance.request<T>(config);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

// Giữ nguyên interface api.get/post/postForm/patch/delete để các page hiện tại
// (Login, Register, Profile, ForgotPassword) không phải sửa đáng kể.
export const api = {
  get: <T>(url: string) => request<T>({ method: 'GET', url }),
  post: <T>(url: string, body: unknown) =>
    request<T>({ method: 'POST', url, data: body }),
  postForm: <T>(url: string, formData: FormData) =>
    request<T>({
      method: 'POST',
      url,
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  patch: <T>(url: string, body: unknown) =>
    request<T>({ method: 'PATCH', url, data: body }),
  delete: <T>(url: string) => request<T>({ method: 'DELETE', url }),
};

// Re-export để giữ API tương thích với code cũ trong các page.
export { getStoredUser, logout } from '../store/authStore';
export type { StoredUser } from '../store/authStore';

// ===== Domain types (giữ nguyên từ phiên bản cũ) =====
export interface UserProfile {
  id: string;
  displayName: string | null;
  email: string;
  bio: string | null;
  gender: string | null;
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
  imageUrl: string | null;
  privacyStatus: 'Public' | 'Followers only' | 'Private';
  createdAt: string;
}

export interface PostWithCounts extends Post {
  reactionCount: number;
  commentCount: number;
}

export interface CommentWithUser {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}
