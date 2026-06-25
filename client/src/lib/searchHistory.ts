import type { SearchUserHit } from './api';

const SEARCH_HISTORY_KEY = 'feedme_search_history';
const MAX_ITEMS = 12;

export type SearchHistoryEntry = SearchUserHit & {
  searchedAt: number;
};

export function loadSearchHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SearchHistoryEntry =>
        item &&
        typeof item === 'object' &&
        typeof (item as SearchHistoryEntry).id === 'string',
    );
  } catch {
    return [];
  }
}

function saveSearchHistory(items: SearchHistoryEntry[]): void {
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function addToSearchHistory(user: SearchUserHit): void {
  const entry: SearchHistoryEntry = { ...user, searchedAt: Date.now() };
  const rest = loadSearchHistory().filter((item) => item.id !== user.id);
  saveSearchHistory([entry, ...rest]);
}

export function removeFromSearchHistory(userId: string): void {
  saveSearchHistory(loadSearchHistory().filter((item) => item.id !== userId));
}

export function clearSearchHistory(): void {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}
