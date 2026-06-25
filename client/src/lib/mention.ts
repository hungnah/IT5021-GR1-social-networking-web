import {
  extractMentionHandles,
  isValidUsername,
  mentionHandleForUser,
  normalizeUsername,
  suggestUsernameFromEmail,
  toMentionHandle,
} from './username';

export {
  extractMentionHandles,
  isValidUsername,
  mentionHandleForUser,
  normalizeUsername,
  suggestUsernameFromEmail,
  toMentionHandle,
};

export function mentionPrefix(handle: string): string {
  return `@${normalizeUsername(handle)} `;
}

const MENTION_RE = /(@[a-zA-Z0-9._]{1,30})/g;

export function splitMentionParts(content: string): string[] {
  return content.split(MENTION_RE).filter((part) => part.length > 0);
}
