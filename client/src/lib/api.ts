import {
  clearSession,
  getAccessToken,
  refreshSession,
} from '../store/authStore';
import { API_BASE_URL } from '../config/apiBase';

const AUTH_ROUTES = ['/auth/refresh', '/auth/login', '/auth/signup', '/auth/google'];

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export type ApiErrorKind =
  | 'network'
  | 'auth'
  | 'validation'
  | 'server'
  | 'unknown';

export class ApiError extends Error {
  status?: number;
  kind: ApiErrorKind;

  constructor(message: string, options?: { status?: number; kind?: ApiErrorKind }) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status;
    this.kind = options?.kind ?? 'unknown';
  }
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function messageFromData(data: unknown): string | null {
  if (data && typeof data === 'object' && 'message' in data) {
    const m = (data as { message?: string | string[] }).message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
  }
  return null;
}

async function doRequest<T>(
  method: Method,
  url: string,
  body?: unknown | FormData,
  isForm = false,
): Promise<T> {
  const isAuthRoute = AUTH_ROUTES.some((p) => url.includes(p));

  const exec = async (): Promise<Response> => {
    const token = getAccessToken();
    const headers = new Headers();
    if (!isForm) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const initBody =
      isForm && body instanceof FormData
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined;
    return fetch(`${API_BASE_URL}${url}`, {
      method,
      headers,
      body: initBody as BodyInit | undefined,
    });
  };

  let res: Response;
  try {
    res = await exec();
  } catch {
    throw new ApiError(
      'Không kết nối được tới API. Hãy bật backend (vd: npm run start:dev), kiểm tra ' +
        'client/.env VITE_API_BASE_URL đúng với URL backend, và thử tải lại trang.',
      { kind: 'network' },
    );
  }

  if (res.status === 401 && !isAuthRoute) {
    const ok = await refreshSession();
    if (ok) {
      try {
        res = await exec();
      } catch {
        throw new ApiError(
          'Không kết nối được tới API. Hãy bật backend (vd: npm run start:dev), kiểm tra ' +
            'client/.env VITE_API_BASE_URL đúng với URL backend, và thử tải lại trang.',
          { kind: 'network' },
        );
      }
    } else {
      clearSession();
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
  }

  if (!res.ok) {
    const data = await readBody(res);
    const msg = messageFromData(data);
    if (res.status >= 500) {
      throw new ApiError(
        msg && msg !== 'Internal server error'
          ? msg
          : 'Lỗi máy chủ. Hãy khởi động lại backend (npm run start:dev) và thử lại.',
        { status: res.status, kind: 'server' },
      );
    }
    const kind: ApiErrorKind =
      res.status === 401 || res.status === 403
        ? 'auth'
        : res.status === 400 || res.status === 422
          ? 'validation'
          : 'unknown';
    throw new ApiError(msg ?? `HTTP ${res.status}`, {
      status: res.status,
      kind,
    });
  }

  if (res.status === 204) return undefined as T;
  return (await readBody(res)) as T;
}

async function request<T>(
  method: Method,
  url: string,
  body?: unknown | FormData,
  isForm = false,
): Promise<T> {
  try {
    return await doRequest<T>(method, url, body, isForm);
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new ApiError('Đã có lỗi xảy ra', { kind: 'unknown' });
  }
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body: unknown) => request<T>('POST', url, body),
  postForm: <T>(url: string, formData: FormData) =>
    request<T>('POST', url, formData, true),
  patch: <T>(url: string, body: unknown) => request<T>('PATCH', url, body),
  delete: <T>(url: string) => request<T>('DELETE', url),
};

export { getStoredUser, logout } from '../store/authStore';
export type { StoredUser } from '../store/authStore';

export interface UserProfile {
  id: string;
  username: string | null;
  displayName: string | null;
  email: string;
  bio: string | null;
  gender: string | null;
  location: string | null;
  website: string | null;
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

export interface TaggedUserSummary {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/** Bài trên bảng tin (backend GET /posts/feed). */
export interface FeedPost extends PostWithCounts {
  likedByMe?: boolean;
  savedByMe?: boolean;
  author: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  taggedUsers?: TaggedUserSummary[];
}

export interface SuggestedUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  mutualCount: number;
  isFollowing: boolean;
}

export type NotificationType = 'FOLLOW' | 'LIKE' | 'COMMENT' | 'MESSAGE' | 'TAG';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  postImageUrl?: string | null;
  postAuthorName?: string | null;
  commentSnippet?: string | null;
  commentIsReply?: boolean;
  viewerFollowsActor?: boolean;
}

export interface SearchUserHit {
  id: string;
  username: string | null;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface SearchResult {
  users: SearchUserHit[];
  posts: FeedPost[];
}

export interface CommentWithUser {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface ConversationPartner {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  email: string;
}

export interface ConversationItem {
  partner: ConversationPartner;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    isMine: boolean;
    isRead: boolean;
  };
  unreadCount: number;
}

export interface MessageItem {
  id: string;
  content: string;
  createdAt: string;
  isMine: boolean;
  isRead: boolean;
  receiverId: string;
  sender: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}
