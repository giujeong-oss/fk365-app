'use client';

import { AuthProvider, NavigationProvider } from '@/lib/context';
import { I18nProvider } from '@/lib/i18n';
import { ToastProvider } from '@/components/ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <NavigationProvider>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </NavigationProvider>
    </I18nProvider>
  );
}
