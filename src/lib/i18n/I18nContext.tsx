'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { translations, getTranslation, type TranslationKey } from './translations';
import type { UILanguage } from '@/types';

interface I18nContextType {
  language: UILanguage;
  setLanguage: (lang: UILanguage) => void;
  t: (key: TranslationKey) => string;
  availableLanguages: { code: UILanguage; label: string }[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'fk365_ui_language';

const availableLanguages: { code: UILanguage; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'th', label: 'ไทย' },
  { code: 'en', label: 'English' },
];

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<UILanguage>('ko');
  const [mounted, setMounted] = useState(false);

  // 로컬 스토리지에서 언어 설정 로드
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as UILanguage | null;
    if (saved && ['ko', 'th', 'en'].includes(saved)) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = useCallback((lang: UILanguage) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }, []);

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
          t: (key) => getTranslation(key, 'ko'),
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
        t,
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
