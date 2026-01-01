'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import BottomTabs from './BottomTabs';
import MobileHeader from './MobileHeader';
import { useI18n } from '@/lib/i18n';

interface MainLayoutProps {
  children: ReactNode;
  isAdmin?: boolean;
  onLogout?: () => void;
  userName?: string;
  pageTitle?: string;
  showMobileBack?: boolean;
  onMobileBack?: () => void;
}

export default function MainLayout({
  children,
  isAdmin = false,
  onLogout,
  userName,
  pageTitle,
  showMobileBack = false,
  onMobileBack,
}: MainLayoutProps) {
  const { language, setLanguage } = useI18n();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* PC: Sidebar */}
      <Sidebar
        isAdmin={isAdmin}
        currentLanguage={language}
        onLanguageChange={setLanguage}
        onLogout={onLogout}
        userName={userName}
      />

      {/* Mobile: Header */}
      <MobileHeader
        title={pageTitle}
        showBack={showMobileBack}
        onBack={onMobileBack}
        currentLanguage={language}
        onLanguageChange={setLanguage}
        onLogout={onLogout}
        userName={userName}
      />

      {/* Main Content */}
      <main className="lg:pl-64">
        {/* Mobile: Add padding for header and bottom tabs */}
        <div className="pt-14 pb-20 lg:pt-0 lg:pb-0 min-h-screen">
          {children}
        </div>
      </main>

      {/* Mobile: Bottom Tabs */}
      <BottomTabs />
    </div>
  );
}
