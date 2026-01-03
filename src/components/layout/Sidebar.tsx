'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Package,
  Truck,
  Apple,
  Users,
  Store,
  Percent,
  DollarSign,
  Settings,
  LogOut,
  Globe,
} from 'lucide-react';
import type { UILanguage } from '@/types';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useNavigation } from '@/lib/context';

interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: '/', labelKey: 'nav.dashboard', icon: <LayoutDashboard size={20} /> },
  { href: '/orders', labelKey: 'nav.orders', icon: <ShoppingCart size={20} /> },
  { href: '/purchase-orders', labelKey: 'nav.purchaseOrders', icon: <ClipboardList size={20} />, adminOnly: true },
  { href: '/stock', labelKey: 'nav.stock', icon: <Package size={20} />, adminOnly: true },
  { href: '/delivery', labelKey: 'nav.delivery', icon: <Truck size={20} /> },
  { href: '/products', labelKey: 'nav.products', icon: <Apple size={20} />, adminOnly: true },
  { href: '/customers', labelKey: 'nav.customers', icon: <Users size={20} />, adminOnly: true },
  { href: '/vendors', labelKey: 'nav.vendors', icon: <Store size={20} />, adminOnly: true },
  { href: '/margins', labelKey: 'nav.margins', icon: <Percent size={20} />, adminOnly: true },
  { href: '/prices', labelKey: 'nav.prices', icon: <DollarSign size={20} />, adminOnly: true },
  { href: '/settings', labelKey: 'nav.settings', icon: <Settings size={20} />, adminOnly: true },
];

interface SidebarProps {
  isAdmin?: boolean;
  currentLanguage?: UILanguage;
  onLanguageChange?: (lang: UILanguage) => void;
  onLogout?: () => void;
  userName?: string;
}

export default function Sidebar({
  isAdmin = false,
  currentLanguage = 'ko',
  onLanguageChange,
  onLogout,
  userName = 'User',
}: SidebarProps) {
  const pathname = usePathname();
  const { t, getLocalizedPath, changeLanguage } = useI18n();
  const { setNavigationDirection } = useNavigation();

  // 현재 경로에서 언어 접두사 제거
  const getPathWithoutLang = (path: string) => {
    const segments = path.split('/');
    if (['ko', 'th', 'en'].includes(segments[1])) {
      return '/' + segments.slice(2).join('/') || '/';
    }
    return path;
  };

  const currentPathWithoutLang = getPathWithoutLang(pathname);

  const handleNavClick = (href: string) => {
    const localizedHref = getLocalizedPath(href);
    setNavigationDirection(pathname, localizedHref);
  };

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  const languages: { code: UILanguage; label: string }[] = [
    { code: 'ko', label: '한국어' },
    { code: 'th', label: 'ไทย' },
    { code: 'en', label: 'EN' },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-gray-900 text-white">
      {/* Logo */}
      <Link href={getLocalizedPath('/')} className="flex items-center justify-center h-16 px-4 bg-gray-800 hover:bg-gray-700 transition-colors">
        <h1 className="text-xl font-bold text-green-400">FK365</h1>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {filteredNavItems.map((item) => {
            const isActive = currentPathWithoutLang === item.href || currentPathWithoutLang === item.href + '/';
            return (
              <li key={item.href}>
                <Link
                  href={getLocalizedPath(item.href)}
                  onClick={() => handleNavClick(item.href)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{t(item.labelKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-700">
        {/* Language Selector */}
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-gray-400" />
          <div className="flex gap-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`px-2 py-1 text-xs rounded ${
                  currentLanguage === lang.code
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400 truncate">{userName}</span>
          <button
            onClick={onLogout}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            title="로그아웃"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
