'use client';

import { useState } from 'react';
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
  Menu,
  X,
} from 'lucide-react';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useNavigation } from '@/lib/context';

interface TabItem {
  href: string;
  labelKey: TranslationKey;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

// 기본 탭 (모든 사용자)
const mainTabItems: TabItem[] = [
  { href: '/', labelKey: 'nav.dashboard', icon: <LayoutDashboard size={20} /> },
  { href: '/orders', labelKey: 'nav.orders', icon: <ShoppingCart size={20} /> },
  { href: '/delivery', labelKey: 'nav.delivery', icon: <Truck size={20} /> },
];

// 관리자 전용 탭
const adminTabItems: TabItem[] = [
  { href: '/purchase-orders', labelKey: 'nav.purchaseOrders', icon: <ClipboardList size={20} />, adminOnly: true },
  { href: '/stock', labelKey: 'nav.stock', icon: <Package size={20} />, adminOnly: true },
  { href: '/products', labelKey: 'nav.products', icon: <Apple size={20} />, adminOnly: true },
  { href: '/customers', labelKey: 'nav.customers', icon: <Users size={20} />, adminOnly: true },
  { href: '/vendors', labelKey: 'nav.vendors', icon: <Store size={20} />, adminOnly: true },
  { href: '/margins', labelKey: 'nav.margins', icon: <Percent size={20} />, adminOnly: true },
  { href: '/prices', labelKey: 'nav.prices', icon: <DollarSign size={20} />, adminOnly: true },
  { href: '/settings', labelKey: 'nav.settings', icon: <Settings size={20} />, adminOnly: true },
];

interface BottomTabsProps {
  isAdmin?: boolean;
}

export default function BottomTabs({ isAdmin = false }: BottomTabsProps) {
  const pathname = usePathname();
  const { t, getLocalizedPath } = useI18n();
  const { setNavigationDirection } = useNavigation();
  const [showMore, setShowMore] = useState(false);

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

  // 관리자가 아니면 기본 탭만 표시
  const visibleTabs = isAdmin
    ? mainTabItems
    : mainTabItems;

  // More 메뉴에 표시할 항목들
  const moreMenuItems = isAdmin
    ? adminTabItems
    : [];

  const isMoreActive = moreMenuItems.some(item => currentPathWithoutLang === item.href || currentPathWithoutLang.startsWith(item.href + '/'));

  return (
    <>
      {/* More 메뉴 오버레이 */}
      {showMore && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More 메뉴 패널 */}
      {showMore && isAdmin && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg rounded-t-2xl max-h-[60vh] overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{t('common.adminMenu')}</h3>
              <button
                onClick={() => setShowMore(false)}
                className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {moreMenuItems.map((item) => {
                const isActive = currentPathWithoutLang === item.href || currentPathWithoutLang.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={getLocalizedPath(item.href)}
                    onClick={() => {
                      handleNavClick(item.href);
                      setShowMore(false);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-green-100 text-green-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    <span className="text-xs mt-1 text-center leading-tight">{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 하단 탭 바 */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <ul className="flex justify-around items-center h-16">
          {visibleTabs.map((item) => {
            const isActive = currentPathWithoutLang === item.href || currentPathWithoutLang === item.href + '/';
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={getLocalizedPath(item.href)}
                  onClick={() => handleNavClick(item.href)}
                  className={`flex flex-col items-center justify-center h-full gap-1 ${
                    isActive
                      ? 'text-green-600'
                      : 'text-gray-600 hover:text-gray-700'
                  }`}
                >
                  {item.icon}
                  <span className="text-xs">{t(item.labelKey)}</span>
                </Link>
              </li>
            );
          })}

          {/* 관리자 전용: More 버튼 */}
          {isAdmin && (
            <li className="flex-1">
              <button
                onClick={() => setShowMore(!showMore)}
                className={`w-full flex flex-col items-center justify-center h-full gap-1 ${
                  showMore || isMoreActive
                    ? 'text-green-600'
                    : 'text-gray-600 hover:text-gray-700'
                }`}
              >
                <Menu size={20} />
                <span className="text-xs">{t('common.more')}</span>
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  );
}
