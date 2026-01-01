// FK365 Type Definitions

// ============================================
// 기본 타입
// ============================================

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
export type Region = 'pattaya' | 'bangkok';
export type PriceType = 'fresh' | 'industrial';
export type Cutoff = 1 | 2 | 3;
export type UserRole = 'admin' | 'user';
export type UILanguage = 'ko' | 'th' | 'en';

// ============================================
// 제품 (Products)
// ============================================

export interface Product {
  id: string;
  code: string;
  name_ko: string;
  name_th: string;
  name_mm: string;
  name_en?: string;
  unit: string;
  color?: string;
  category?: string;
  priceType: PriceType;
  // 공산품 전용
  pur?: number;  // 매입가 (부가세 포함)
  min?: number;  // 시장 최소가
  mid?: number;  // 시장 중간가
  vendorCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// 고객 (Customers)
// ============================================

export interface Customer {
  id: string;
  code: string;
  fullName: string;
  grade: Grade;
  prevGrade?: Grade;  // 등급 변경 감지용
  region: Region;
  deliveryTime?: string;
  products: string[];  // 주문 가능 제품 코드 목록
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// 고객별 제품 adj (CustomerProductAdj)
// ============================================

export interface CustomerProductAdj {
  id: string;
  customerCode: string;
  productCode: string;
  adj: number;  // 기본 할인(-) 또는 추가(+)
  gradeAtSet: Grade;  // adj 설정 당시 등급
  resetReason?: string;
  resetAt?: Date;
  updatedAt: Date;
}

// ============================================
// 구매처 (Vendors)
// ============================================

export interface Vendor {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// 주문 (Orders)
// ============================================

export interface OrderItem {
  productCode: string;
  qty: number;
  baseAdj: number;   // 고객별 기본 adj
  orderAdj: number;  // 주문 시 추가 adj
  sellPrice: number;
  amount: number;
}

export interface Order {
  id: string;
  date: Date;
  customerCode: string;
  cutoff: Cutoff;
  items: OrderItem[];
  totalAmount: number;
  status: 'draft' | 'confirmed';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// 발주서 (PurchaseOrders)
// ============================================

export interface PurchaseOrderItem {
  productCode: string;
  cut1?: number;
  stock?: number;
  buyQty: number;
  buyPrice?: number;
  amount?: number;
}

export interface PurchaseOrder {
  id: string;
  date: Date;
  type: 'buy1' | 'buy2' | 'buy3';
  vendorCode?: string;  // buy1만 해당
  items: PurchaseOrderItem[];
  totalAmount?: number;
  note?: string;
  createdAt: Date;
}

// ============================================
// 재고 (Stock)
// ============================================

export interface Stock {
  id: string;
  code: string;
  qty: number;
  updatedAt: Date;
}

// ============================================
// 가격 히스토리 (PriceHistory)
// ============================================

export interface PriceHistory {
  id: string;
  code: string;
  prices: Record<string, number>;  // { "2025-01-01": 28, ... }
  max3day: number;
}

// ============================================
// 마진 설정 (Margins)
// ============================================

export interface FreshMargin {
  grade: Grade;
  marginBaht: number;  // 고정 바트
  updatedAt: Date;
}

export interface IndustrialMargin {
  grade: Grade;
  purMultiplier: number;  // Pur 배율
  minMultiplier: number;  // Min 배율
  midMultiplier?: number; // Mid 배율 (D등급용)
  minMarginCheck?: number; // 재협상 기준
  formula: string;
  updatedAt: Date;
}

// ============================================
// 마진 변경 히스토리 (MarginHistory)
// ============================================

export interface MarginHistory {
  id: string;
  type: PriceType;
  grade: Grade;
  field: string;
  oldValue: number;
  newValue: number;
  reason?: string;
  changedBy: string;
  changedByEmail: string;
  changedByName?: string;
  changedAt: Date;
}

// ============================================
// 사용자 (Users)
// ============================================

export interface User {
  id: string;
  uid: string;
  email: string;
  name?: string;
  role: UserRole;
  isActive: boolean;
  preferredLanguage: UILanguage;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// 설정 (Settings)
// ============================================

export interface Settings {
  orderDate: Date;
  cutoffTime: string;  // "11:00"
  defaultGrade: Grade;
  supportedUILanguages: UILanguage[];
}

// ============================================
// 락 (Locks) - 동시 편집 방지
// ============================================

export interface Lock {
  id: string;
  lockedBy: string;
  lockedByEmail: string;
  lockedAt: Date;
  expiresAt: Date;
}
