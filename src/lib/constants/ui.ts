// FK365 UI Constants

// 주문 마감 옵션
export const CUTOFF_OPTIONS = [
  { value: '1', label: '1차 (정상)' },
  { value: '2', label: '2차 (추가)' },
  { value: '3', label: '3차 (긴급)' },
] as const;

// 지역 옵션
export const REGION_OPTIONS = [
  { value: 'pattaya', label: '파타야' },
  { value: 'bangkok', label: '방콕' },
] as const;

// 가격 유형 옵션
export const PRICE_TYPE_OPTIONS = [
  { value: 'fresh', label: '신선제품' },
  { value: 'industrial', label: '공산품' },
] as const;

// 언어 옵션
export const LANGUAGE_OPTIONS = [
  { value: 'ko', label: '한국어' },
  { value: 'th', label: 'ไทย' },
  { value: 'en', label: 'English' },
] as const;

// 페이지네이션 기본값
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

// 반응형 브레이크포인트 (px)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// 통화 포맷
export function formatCurrency(amount: number, currency: string = 'THB'): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// 퍼센트 포맷
export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}
