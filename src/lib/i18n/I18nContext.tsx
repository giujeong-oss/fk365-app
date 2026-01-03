'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { translations, getTranslation, type TranslationKey } from './translations';
import type { UILanguage } from '@/types';

interface I18nContextType {
  language: UILanguage;
  setLanguage: (lang: UILanguage) => void;
  changeLanguage: (lang: UILanguage) => void; // URL 기반 언어 변경
  t: (key: TranslationKey) => string;
  getLocalizedPath: (path: string) => string; // 언어 접두사 포함 경로 반환
  availableLanguages: { code: UILanguage; label: string }[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'fk365_ui_language';

const availableLanguages: { code: UILanguage; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'th', label: 'ไทย' },
  { code: 'en', label: 'English' },
  { code: 'my', label: 'မြန်မာ' },
];

const locales = ['ko', 'th', 'en', 'my'];

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<UILanguage>('ko');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // URL에서 현재 언어 추출
  const getCurrentLangFromUrl = useCallback(() => {
    if (!pathname) return 'ko';
    const segments = pathname.split('/');
    const lang = segments[1];
    return locales.includes(lang) ? (lang as UILanguage) : 'ko';
  }, [pathname]);

  // 마운트 시 URL에서 언어 읽기
  useEffect(() => {
    setMounted(true);
    const urlLang = getCurrentLangFromUrl();
    setLanguageState(urlLang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, urlLang);
  }, [getCurrentLangFromUrl]);

  // 내부 상태 변경 (Context에서 직접 호출용)
  const setLanguage = useCallback((lang: UILanguage) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }, []);

  // URL 기반 언어 변경 (네비게이션 포함)
  const changeLanguage = useCallback((lang: UILanguage) => {
    const currentLang = getCurrentLangFromUrl();
    if (currentLang === lang) return;

    // 현재 경로에서 언어 부분만 교체
    const segments = pathname.split('/');
    if (locales.includes(segments[1])) {
      segments[1] = lang;
    } else {
      segments.splice(1, 0, lang);
    }
    const newPath = segments.join('/') || `/${lang}`;

    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    document.cookie = `fk365_ui_language=${lang}; path=/; max-age=31536000`;
    router.push(newPath);
  }, [pathname, router, getCurrentLangFromUrl]);

  // 언어 접두사 포함 경로 반환
  const getLocalizedPath = useCallback((path: string) => {
    // 이미 언어 접두사가 있는 경우
    const segments = path.split('/');
    if (locales.includes(segments[1])) {
      return path;
    }
    // 경로가 /로 시작하면 언어 추가
    if (path.startsWith('/')) {
      return `/${language}${path}`;
    }
    return `/${language}/${path}`;
  }, [language]);

  const t = useCallback(
    (key: TranslationKey) => getTranslation(key, language),
    [language]
  );

  // SSR에서는 기본값 사용
  if (!mounted) {
    return (
      <I18nContext.Provider
        value={{
          language: 'ko',
          setLanguage: () => {},
          changeLanguage: () => {},
          t: (key) => getTranslation(key, 'ko'),
          getLocalizedPath: (path) => `/ko${path.startsWith('/') ? path : '/' + path}`,
          availableLanguages,
        }}
      >
        {children}
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        changeLanguage,
        t,
        getLocalizedPath,
        availableLanguages,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function useTranslation() {
  const { t, language } = useI18n();
  return { t, language };
}
