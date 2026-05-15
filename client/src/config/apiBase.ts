/** URL backend cho fetch (trùng logic với trước khi dùng axios). */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:3000';
