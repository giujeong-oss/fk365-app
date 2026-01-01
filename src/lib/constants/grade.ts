// FK365 Grade Constants

import type { Grade } from '@/types';

// 등급 순서 (마진 낮은 순)
export const GRADE_ORDER: Grade[] = ['S', 'A', 'B', 'C', 'D', 'E'];

// 등급별 설명
export const GRADE_DESCRIPTIONS: Record<Grade, string> = {
  S: '최우수 고객 (최저 마진)',
  A: '우수 고객',
  B: '일반 우수',
  C: '일반 고객',
  D: '시장가 고객 (재협상 필요)',
  E: '신규/소량 고객 (최고 마진)',
};

// 등급별 라벨 (짧은 버전)
export const GRADE_LABELS: Record<Grade, string> = {
  S: 'S (최우수)',
  A: 'A (우수)',
  B: 'B (일반우수)',
  C: 'C (일반)',
  D: 'D (시장가)',
  E: 'E (신규)',
};

// 등급별 색상 (Tailwind 클래스)
export const GRADE_COLORS: Record<Grade, { bg: string; text: string }> = {
  S: { bg: 'bg-purple-100', text: 'text-purple-800' },
  A: { bg: 'bg-blue-100', text: 'text-blue-800' },
  B: { bg: 'bg-green-100', text: 'text-green-800' },
  C: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  D: { bg: 'bg-orange-100', text: 'text-orange-800' },
  E: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

// 신선제품 등급별 기본 마진 (바트)
export const FRESH_DEFAULT_MARGINS: Record<Grade, number> = {
  S: 5,
  A: 8,
  B: 10,
  C: 12,
  D: 15,
  E: 18,
};

// 공산품 등급별 기본 배율
export const INDUSTRIAL_DEFAULT_MULTIPLIERS: Record<Grade, number> = {
  S: 1.05,
  A: 1.10,
  B: 1.15,
  C: 1.20,
  D: 1.25,
  E: 1.30,
};
