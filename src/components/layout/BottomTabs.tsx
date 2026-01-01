'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Package,
  Truck,
  Settings,
} from 'lucide-react';

interface TabItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const tabItems: TabItem[] = [
  { href: '/', label: '홈', icon: <LayoutDashboard size={20} /> },
  { href: '/orders', label: '주문', icon: <ShoppingCart size={20} /> },
  { href: '/purchase-orders', label: '발주', icon: <ClipboardList size={20} /> },
  { href: '/stock', label: '재고', icon: <Package size={20} /> },
  { href: '/delivery', label: '배송', icon: <Truck size={20} /> },
];

export default function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <ul className="flex justify-around items-center h-16">
        {tabItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center h-full gap-1 ${
                  isActive
                    ? 'text-green-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.icon}
                <span className="text-xs">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
