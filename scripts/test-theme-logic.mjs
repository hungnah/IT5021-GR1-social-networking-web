#!/usr/bin/env node
/**
 * Kiểm thử logic ThemeContext (không cần browser).
 */
import assert from 'node:assert/strict';

const THEME_STORAGE_KEY = 'feedme_theme';

function readStoredTheme(store) {
  try {
    const raw = store.getItem(THEME_STORAGE_KEY);
    if (raw === 'light' || raw === 'dark') return raw;
  } catch {
    /* ignore */
  }
  return 'dark';
}

function applyTheme(doc, theme) {
  doc.documentElement.setAttribute('data-theme', theme);
  doc.documentElement.style.colorScheme = theme;
}

function setTheme(store, doc, theme) {
  store.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(doc, theme);
}

function toggleTheme(store, doc, current) {
  setTheme(store, doc, current === 'dark' ? 'light' : 'dark');
}

// Mock localStorage + document
const mem = new Map();
const store = {
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => mem.set(k, v),
  removeItem: (k) => mem.delete(k),
};
const attrs = new Map();
const doc = {
  documentElement: {
    setAttribute: (k, v) => attrs.set(k, v),
    getAttribute: (k) => attrs.get(k) ?? null,
    style: { colorScheme: '' },
  },
};

assert.equal(readStoredTheme(store), 'dark', 'mặc định dark');

store.setItem(THEME_STORAGE_KEY, 'light');
assert.equal(readStoredTheme(store), 'light');

store.setItem(THEME_STORAGE_KEY, 'invalid');
assert.equal(readStoredTheme(store), 'dark', 'giá trị lỗi → dark');

setTheme(store, doc, 'light');
assert.equal(attrs.get('data-theme'), 'light');
assert.equal(doc.documentElement.style.colorScheme, 'light');

toggleTheme(store, doc, 'light');
assert.equal(mem.get(THEME_STORAGE_KEY), 'dark');
assert.equal(attrs.get('data-theme'), 'dark');

toggleTheme(store, doc, 'dark');
assert.equal(mem.get(THEME_STORAGE_KEY), 'light');

console.log('✅ Logic theme (localStorage + data-theme) PASS');
