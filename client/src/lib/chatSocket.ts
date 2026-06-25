import { io, type Socket } from 'socket.io-client';
import type { MessageItem } from './api';
import { API_BASE_URL } from '../config/apiBase';
import {
  getAccessToken,
  getStoredUser,
  refreshSession,
  subscribeAuth,
} from '../store/authStore';

type MessageHandler = (msg: MessageItem) => void;
type ReadHandler = (payload: { readerId: string; partnerId: string }) => void;

let socket: Socket | null = null;
let boundUserId: string | null = null;
const messageHandlers = new Set<MessageHandler>();
const readHandlers = new Set<ReadHandler>();

function attachSocketListeners(s: Socket): void {
  s.off('message:new');
  s.off('message:read');
  s.off('connect_error');

  s.on('message:new', (msg: MessageItem) => {
    messageHandlers.forEach((h) => h(msg));
    window.dispatchEvent(new CustomEvent('feedme:message-new', { detail: msg }));
  });

  s.on('message:read', (payload: { readerId: string; partnerId: string }) => {
    readHandlers.forEach((h) => h(payload));
  });

  s.on('connect_error', async () => {
    const ok = await refreshSession();
    if (ok && socket) {
      socket.auth = { token: getAccessToken() ?? '' };
      socket.connect();
    }
  });
}

export function connectChatSocket(): Socket | null {
  const token = getAccessToken();
  const user = getStoredUser();
  if (!token || !user) return null;

  if (socket && boundUserId !== user.id) {
    socket.disconnect();
    socket = null;
  }

  if (socket?.connected) return socket;

  if (socket) {
    socket.auth = { token };
    boundUserId = user.id;
    socket.connect();
    return socket;
  }

  boundUserId = user.id;
  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  attachSocketListeners(socket);
  return socket;
}

export function disconnectChatSocket(): void {
  socket?.disconnect();
  socket = null;
  boundUserId = null;
}

export function onChatMessage(handler: MessageHandler): () => void {
  messageHandlers.add(handler);
  return () => messageHandlers.delete(handler);
}

export function onChatRead(handler: ReadHandler): () => void {
  readHandlers.add(handler);
  return () => readHandlers.delete(handler);
}

export function sendChatMessage(
  receiverId: string,
  content: string,
): Promise<MessageItem> {
  return new Promise((resolve, reject) => {
    const s = connectChatSocket();
    if (!s) {
      reject(new Error('Not authenticated'));
      return;
    }

    const doSend = () => {
      s.timeout(15000).emit(
        'message:send',
        { receiverId, content },
        (err: Error | null, response?: MessageItem) => {
          if (err) reject(err);
          else if (response) resolve(response);
          else reject(new Error('No response from server'));
        },
      );
    };

    if (s.connected) doSend();
    else s.once('connect', doSend);
  });
}

export function markChatRead(partnerId: string): void {
  const s = connectChatSocket();
  if (!s) return;

  const doMark = () => {
    s.emit('message:read', { partnerId });
  };

  if (s.connected) doMark();
  else s.once('connect', doMark);
}

subscribeAuth((user) => {
  if (user) connectChatSocket();
  else disconnectChatSocket();
});
