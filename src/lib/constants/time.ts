// FK365 Time Constants

// 태국 시간대 (UTC+7)
export const THAILAND_TIMEZONE_OFFSET_HOURS = 7;
export const THAILAND_TIMEZONE_OFFSET_MS = THAILAND_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000;

// 주문 마감 시간 (태국 시간 기준)
export const ORDER_CUTOFF_HOUR = 4; // 새벽 4시

// 시간 관련 유틸리티
export function getThailandTime(date: Date = new Date()): Date {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc + THAILAND_TIMEZONE_OFFSET_MS);
}

export function isAfterCutoff(date: Date = new Date()): boolean {
  const thailandTime = getThailandTime(date);
  return thailandTime.getHours() >= ORDER_CUTOFF_HOUR;
}

export function formatThaiTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatDateTime(date?: Date): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
