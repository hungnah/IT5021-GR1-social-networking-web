import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  LOCALE_STORAGE_KEY,
  translations,
  type Locale,
} from './translations';

type Dict = (typeof translations)[Locale];

function readStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw === 'en' || raw === 'vi' || raw === 'ja') return raw;
  } catch {
    /* ignore */
  }
  return 'vi';
}

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dict;
  localeTag: string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const localeTag =
      locale === 'vi' ? 'vi-VN' : locale === 'ja' ? 'ja-JP' : 'en-US';
    return {
      locale,
      setLocale,
      t: translations[locale],
      localeTag,
    };
  }, [locale, setLocale]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}

/** Thay {n} trong chuỗi dịch */
export function formatMsg(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    template,
  );
}
