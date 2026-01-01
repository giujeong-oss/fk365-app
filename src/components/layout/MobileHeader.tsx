'use client';

import { Menu, Globe, LogOut, ChevronLeft } from 'lucide-react';
import { useState } from 'react';

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  currentLanguage?: string;
  onLanguageChange?: (lang: string) => void;
  onLogout?: () => void;
  userName?: string;
}

export default function MobileHeader({
  title = 'FK365',
  showBack = false,
  onBack,
  currentLanguage = 'ko',
  onLanguageChange,
  onLogout,
  userName,
}: MobileHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);

  const languages = [
    { code: 'ko', label: '한국어' },
    { code: 'th', label: 'ไทย' },
    { code: 'en', label: 'EN' },
  ];

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Back or Logo */}
        <div className="flex items-center gap-2">
          {showBack ? (
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft size={24} />
            </button>
          ) : (
            <h1 className="text-lg font-bold text-green-600">FK365</h1>
          )}
          {showBack && <span className="font-medium">{title}</span>}
        </div>

        {/* Right: Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            <Menu size={24} />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                {/* User Info */}
                {userName && (
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {userName}
                    </p>
                  </div>
                )}

                {/* Language Selection */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-500">언어 / Language</span>
                  </div>
                  <div className="flex gap-1">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          onLanguageChange?.(lang.code);
                          setShowMenu(false);
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          currentLanguage === lang.code
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logout */}
                <button
                  onClick={() => {
                    onLogout?.();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  <span>로그아웃</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
