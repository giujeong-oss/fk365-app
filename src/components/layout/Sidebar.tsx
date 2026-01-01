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

interface NavItem {
  href: string;
  labelKey: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: '/', labelKey: 'dashboard', label: '대시보드', icon: <LayoutDashboard size={20} /> },
  { href: '/orders', labelKey: 'orders', label: '주문', icon: <ShoppingCart size={20} /> },
  { href: '/purchase-orders', labelKey: 'purchaseOrders', label: '발주서', icon: <ClipboardList size={20} />, adminOnly: true },
  { href: '/stock', labelKey: 'stock', label: '재고', icon: <Package size={20} />, adminOnly: true },
  { href: '/delivery', labelKey: 'delivery', label: '배송장', icon: <Truck size={20} /> },
  { href: '/products', labelKey: 'products', label: '제품', icon: <Apple size={20} />, adminOnly: true },
  { href: '/customers', labelKey: 'customers', label: '고객', icon: <Users size={20} />, adminOnly: true },
  { href: '/vendors', labelKey: 'vendors', label: '구매처', icon: <Store size={20} />, adminOnly: true },
  { href: '/margins', labelKey: 'margins', label: '마진', icon: <Percent size={20} />, adminOnly: true },
  { href: '/prices', labelKey: 'prices', label: '가격', icon: <DollarSign size={20} />, adminOnly: true },
  { href: '/settings', labelKey: 'settings', label: '설정', icon: <Settings size={20} />, adminOnly: true },
];

interface SidebarProps {
  isAdmin?: boolean;
  currentLanguage?: string;
  onLanguageChange?: (lang: string) => void;
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

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  const languages = [
    { code: 'ko', label: '한국어' },
    { code: 'th', label: 'ไทย' },
    { code: 'en', label: 'EN' },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 bg-gray-800">
        <h1 className="text-xl font-bold text-green-400">FK365</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
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
                onClick={() => onLanguageChange?.(lang.code)}
                className={`px-2 py-1 text-xs rounded ${
                  currentLanguage === lang.code
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
