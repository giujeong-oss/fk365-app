'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import type { UILanguage } from '@/types';

const validLocales = ['ko', 'th', 'en'];

export default function LangLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const { setLanguage } = useI18n();
  const lang = params.lang as string;

  useEffect(() => {
    // URL의 언어 파라미터가 유효하면 Context와 동기화
    if (lang && validLocales.includes(lang)) {
      setLanguage(lang as UILanguage);
      // 쿠키에도 저장 (middleware에서 사용)
      document.cookie = `fk365_ui_language=${lang}; path=/; max-age=31536000`;
    }
  }, [lang, setLanguage]);

  return <>{children}</>;
}
