// FK365 Price Calculation Utilities
import type { Product, Grade, FreshMargin, IndustrialMargin } from '@/types';

/**
 * 신선제품 판매가 계산
 * 공식: 매입가(3일최고가) + 마진(바트고정) + adj
 */
export function calculateFreshSellPrice(
  buyPrice: number,      // 매입가 (3일 최고가)
  marginBaht: number,    // 등급별 마진 (바트)
  adj: number = 0        // 고객별 조정가
): number {
  return buyPrice + marginBaht + adj;
}

/**
 * 공산품 판매가 계산 (S, A, B, C, E 등급)
 * 공식: Pur × 배율 + adj
 */
export function calculateIndustrialSellPrice(
  pur: number,           // 매입가 (부가세 포함)
  multiplier: number,    // 등급별 배율
  adj: number = 0        // 고객별 조정가
): number {
  return Math.round(pur * multiplier) + adj;
}

/**
 * D등급 공산품 판매가 계산
 * 공식: max(Min, Mid) + adj (재협상 체크 포함)
 */
export function calculateDGradeIndustrialSellPrice(
  min: number,           // 시장 최소가
  mid: number,           // 시장 중간가
  pur: number,           // 매입가
  minMarginCheck: number = 5,  // 최소 마진 체크 (%)
  adj: number = 0        // 고객별 조정가
): { sellPrice: number; needsRenegotiation: boolean; marginPercent: number } {
  const basePrice = Math.max(min, mid);
  const sellPrice = basePrice + adj;

  // 마진율 체크
  const marginPercent = pur > 0 ? ((sellPrice - pur) / pur) * 100 : 0;
  const needsRenegotiation = marginPercent < minMarginCheck;

  return {
    sellPrice,
    needsRenegotiation,
    marginPercent: Math.round(marginPercent * 10) / 10,
  };
}

/**
 * 제품 유형에 따른 판매가 계산
 */
export function calculateSellPrice(
  product: Product,
  grade: Grade,
  freshMarginMap: Map<Grade, number>,
  industrialMarginMap: Map<Grade, IndustrialMargin>,
  buyPrice: number = 0,  // 신선제품용 매입가
  adj: number = 0
): { sellPrice: number; needsRenegotiation?: boolean; marginPercent?: number } {
  if (product.priceType === 'fresh') {
    const marginBaht = freshMarginMap.get(grade) || 0;
    return {
      sellPrice: calculateFreshSellPrice(buyPrice, marginBaht, adj),
    };
  } else {
    // 공산품
    const margin = industrialMarginMap.get(grade);
    if (!margin) {
      return { sellPrice: (product.pur || 0) + adj };
    }

    if (grade === 'D') {
      return calculateDGradeIndustrialSellPrice(
        product.min || 0,
        product.mid || 0,
        product.pur || 0,
        margin.minMarginCheck,
        adj
      );
    } else {
      return {
        sellPrice: calculateIndustrialSellPrice(
          product.pur || 0,
          margin.purMultiplier,
          adj
        ),
      };
    }
  }
}

/**
 * 마진율 계산
 */
export function calculateMarginPercent(sellPrice: number, buyPrice: number): number {
  if (buyPrice <= 0) return 0;
  return Math.round(((sellPrice - buyPrice) / buyPrice) * 1000) / 10;
}

/**
 * 마진 금액 계산
 */
export function calculateMarginAmount(sellPrice: number, buyPrice: number): number {
  return sellPrice - buyPrice;
}

/**
 * 통화 포맷
 */
export function formatCurrency(amount: number, currency: string = 'THB'): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * 퍼센트 포맷
 */
export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/**
 * 등급별 기본 마진 설명
 */
export const GRADE_DESCRIPTIONS: Record<Grade, string> = {
  S: '최우수 고객 (최저 마진)',
  A: '우수 고객',
  B: '일반 우수',
  C: '일반 고객',
  D: '시장가 고객 (재협상 필요)',
  E: '신규/소량 고객 (최고 마진)',
};

/**
 * 등급 순서 (마진 낮은 순)
 */
export const GRADE_ORDER: Grade[] = ['S', 'A', 'B', 'C', 'D', 'E'];
