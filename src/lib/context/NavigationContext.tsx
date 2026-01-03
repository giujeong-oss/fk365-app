'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// 메뉴 순서 정의 (인덱스로 방향 결정)
const ROUTE_ORDER: Record<string, number> = {
  '/': 0,
  '/orders': 1,
  '/purchase-orders': 2,
  '/stock': 3,
  '/delivery': 4,
  '/products': 5,
  '/customers': 6,
  '/vendors': 7,
  '/margins': 8,
  '/prices': 9,
  '/settings': 10,
};

type Direction = 'left' | 'right' | 'none';

interface NavigationContextType {
  direction: Direction;
  setNavigationDirection: (from: string, to: string) => void;
  resetDirection: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [direction, setDirection] = useState<Direction>('none');

  const getRouteIndex = (path: string): number => {
    // 정확한 매칭 먼저
    if (ROUTE_ORDER[path] !== undefined) {
      return ROUTE_ORDER[path];
    }
    // 부분 매칭 (예: /orders/entry/xxx → /orders)
    for (const route of Object.keys(ROUTE_ORDER)) {
      if (path.startsWith(route + '/')) {
        return ROUTE_ORDER[route];
      }
    }
    return -1;
  };

  const setNavigationDirection = useCallback((from: string, to: string) => {
    const fromIndex = getRouteIndex(from);
    const toIndex = getRouteIndex(to);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      setDirection('none');
      return;
    }

    // from < to: 오른쪽으로 이동 (새 페이지가 오른쪽에서 들어옴)
    // from > to: 왼쪽으로 이동 (새 페이지가 왼쪽에서 들어옴)
    setDirection(fromIndex < toIndex ? 'right' : 'left');
  }, []);

  const resetDirection = useCallback(() => {
    setDirection('none');
  }, []);

  return (
    <NavigationContext.Provider value={{ direction, setNavigationDirection, resetDirection }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
