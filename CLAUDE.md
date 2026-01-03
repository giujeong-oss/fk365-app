# FK365 프로젝트 컨텍스트

## 프로젝트 개요
| 항목 | 내용 |
|------|------|
| **이름** | FK365 (Fresh Kitchen 365) |
| **목적** | 채소/과일/식자재/소모품 주문-발주-재고-배송 통합 관리 웹앱 |
| **로컬 경로** | `C:\Users\Giuje\fk365-app` |
| **GitHub** | https://github.com/giujeong-oss/fk365-app |
| **Firebase** | fk365-e8f90 (프로젝트 번호: 242061459214) |

### 도메인 구성
| 도메인 | 용도 | Vercel 프로젝트 |
|--------|------|-----------------|
| freshkitchen365.com | 회사 소개 랜딩 페이지 | fk365-landing |
| app.freshkitchen365.com | 웹앱 (주문/발주/재고 관리) | fk365-app |

---

## 기술 스택

### Frontend
- **Next.js 16** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS 4**
- **React 19**

### Backend
- **Firebase Auth** (Google OAuth)
- **Firestore** (NoSQL Database)

### Deploy
- **Vercel** (Frontend)
- **Firebase** (Backend)

### 다국어
- 커스텀 i18n (ko/th/en)
- localStorage 저장

---

## 파일 구조 (개선됨)

```
src/
├── app/                          # Next.js App Router (페이지)
│   ├── layout.tsx               # 루트 레이아웃
│   ├── providers.tsx            # Context Providers
│   ├── page.tsx                 # 대시보드
│   ├── login/                   # 로그인
│   ├── orders/                  # 주문 관리
│   │   └── entry/[customerCode]/ # 주문 입력
│   ├── products/                # 제품 관리
│   ├── customers/               # 고객 관리
│   │   └── [id]/products/       # 고객별 제품 매핑
│   ├── vendors/                 # 구매처 관리
│   ├── purchase-orders/         # 발주서
│   ├── stock/                   # 재고
│   ├── prices/                  # 가격 관리
│   ├── margins/                 # 마진 설정
│   ├── delivery/                # 배송장
│   ├── settings/                # 설정
│   └── diagnostics/             # 진단 (관리자)
│
├── components/
│   ├── layout/                  # 레이아웃 컴포넌트
│   │   ├── MainLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── BottomTabs.tsx
│   │   └── MobileHeader.tsx
│   ├── ui/                      # 공통 UI 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Spinner.tsx
│   │   ├── Toast.tsx            # [NEW] Toast 알림
│   │   └── EmptyState.tsx
│   └── auth/
│       └── ProtectedRoute.tsx
│
├── lib/
│   ├── constants/               # [NEW] 상수 파일
│   │   ├── index.ts
│   │   ├── time.ts              # 시간 관련 상수
│   │   ├── grade.ts             # 등급 관련 상수
│   │   └── ui.ts                # UI 관련 상수
│   ├── hooks/                   # [NEW] 커스텀 훅
│   │   ├── index.ts
│   │   ├── useAsync.ts          # 비동기 상태 관리
│   │   ├── useProducts.ts       # 제품 데이터 훅
│   │   ├── useCustomers.ts      # 고객 데이터 훅
│   │   ├── useVendors.ts        # 구매처 데이터 훅
│   │   └── useThailandTime.ts   # 태국 시간 훅
│   ├── firebase/                # Firebase 서비스
│   │   ├── config.ts
│   │   ├── products.ts
│   │   ├── customers.ts
│   │   ├── vendors.ts
│   │   ├── orders.ts
│   │   ├── purchaseOrders.ts
│   │   ├── stock.ts
│   │   ├── priceHistory.ts
│   │   ├── margins.ts
│   │   └── users.ts
│   ├── context/                 # Context Providers
│   │   └── AuthContext.tsx
│   ├── i18n/                    # 다국어
│   │   ├── translations.ts
│   │   └── I18nContext.tsx
│   └── utils/                   # 유틸리티
│       ├── priceCalculation.ts
│       └── csvExport.ts         # [NEW] CSV 내보내기
│
├── types/
│   └── index.ts                 # TypeScript 타입 정의
│
└── public/
    ├── icon.svg
    └── manifest.json
```

---

## 핵심 비즈니스 로직

### 가격 구조 (2가지)

**1. 신선제품 (fresh)**: 바트 고정 마진
| 등급 | 마진 |
|------|------|
| S | +5฿ |
| A | +8฿ |
| B | +10฿ |
| C | +12฿ |
| D | +15฿ |
| E | +18฿ |

**2. 공산품 (industrial)**: % 배율 마진
| 등급 | 계산식 |
|------|--------|
| S | Pur × 1.05 |
| A | Pur × 1.10 |
| B | Pur × 1.15 |
| C | Pur × 1.20 |
| D | MAX(Min, Mid) |
| E | Pur × 1.30 |

### 발주 프로세스 (3단계)
```
cut1 (정상) → buy1 = MAX(cut1 - stock, 0)  → 1차 장보기
cut2 (추가) → buy2 = cut2 (전량)           → 끌렁떠이
cut3 (긴급) → buy3 = cut3 (전량)           → 라라무브
```

### 주문 마감
- **마감 시간**: 새벽 4시 (태국 시간)
- **마감 후**: 추가/긴급 주문만 가능

### 고객별 제품 adj
- 고객-제품 매핑에 baseAdj 설정 가능
- **등급 변경 시 모든 adj → 0 초기화**

---

## Firestore 컬렉션

> 모든 컬렉션은 `fk365_` 접두사 사용

| 컬렉션 | 용도 |
|--------|------|
| `fk365_products` | 제품 마스터 |
| `fk365_customers` | 고객 마스터 |
| `fk365_vendors` | 구매처 마스터 |
| `fk365_orders` | 주문 |
| `fk365_purchaseOrders` | 발주서 |
| `fk365_stock` | 재고 |
| `fk365_priceHistory` | 매입가 히스토리 |
| `fk365_margins` | 마진 설정 |
| `fk365_marginHistory` | 마진 변경 이력 |
| `fk365_customerProductAdj` | 고객별 제품 adj |
| `fk365_users` | 사용자 |
| `fk365_locks` | 동시 편집 방지 |

---

## 주요 타입 정의

```typescript
type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
type Region = 'pattaya' | 'bangkok';
type PriceType = 'fresh' | 'industrial';
type Cutoff = 1 | 2 | 3;
type UserRole = 'admin' | 'user';
type UILanguage = 'ko' | 'th' | 'en';
```

---

## 코딩 컨벤션

### 네이밍
| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `ProductList.tsx` |
| 함수/변수 | camelCase | `getProducts()` |
| 상수 | UPPER_SNAKE_CASE | `ORDER_CUTOFF_HOUR` |
| 타입 | PascalCase | `type Customer` |

### 파일 구조
- 페이지 컴포넌트: `src/app/` (Next.js App Router)
- 공통 컴포넌트: `src/components/`
- 비즈니스 로직: `src/lib/`
- 타입: `src/types/`

### 커스텀 훅 사용 권장
```typescript
// 권장: 커스텀 훅 사용
const { products, loading, error, refetch } = useProducts();

// 비권장: 직접 상태 관리
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);
// ...
```

### 상수 사용 권장
```typescript
// 권장: 상수 import
import { ORDER_CUTOFF_HOUR, formatCurrency } from '@/lib/constants';

// 비권장: 매직 넘버 직접 사용
const cutoffHour = 4;
```

---

## UI/UX 가이드라인

### FK365 브랜드 컬러 시스템

**CSS 변수** (`globals.css :root`)
```css
--fk365-green: #6CA72C;
--fk365-green-light: #8BC34A;
--fk365-green-dark: #558B2F;
--fk365-orange: #D75C08;
--fk365-orange-light: #F57C00;
--fk365-orange-dark: #BF4A00;
--meat: #DC2626;
--vegetable: #6CA72C;
--seafood: #0EA5E9;
```

**Tailwind 클래스** (`@theme inline`)
| 용도 | 클래스 | 색상 |
|------|--------|------|
| 메인 그린 | `bg-fk365-green`, `text-fk365-green` | #6CA72C |
| 라이트 그린 | `bg-fk365-green-light` | #8BC34A |
| 다크 그린 | `bg-fk365-green-dark` | #558B2F |
| 메인 오렌지 | `bg-fk365-orange`, `text-fk365-orange` | #D75C08 |
| 라이트 오렌지 | `bg-fk365-orange-light` | #F57C00 |
| 다크 오렌지 | `bg-fk365-orange-dark` | #BF4A00 |
| 육류 | `bg-meat`, `text-meat` | #DC2626 |
| 채소 | `bg-vegetable`, `text-vegetable` | #6CA72C |
| 해산물 | `bg-seafood`, `text-seafood` | #0EA5E9 |

### 텍스트 색상 (가독성 기준)
| 용도 | 클래스 |
|------|--------|
| 본문 | `text-gray-900` 또는 `text-gray-800` |
| 보조 텍스트 | `text-gray-700` 또는 `text-gray-600` |
| 비활성/힌트 | `text-gray-600` (최소 기준) |
| 다크 배경 (Sidebar) | `text-gray-400` |

⚠️ `text-gray-500`, `text-gray-400`, `text-gray-300` 사용 금지 (밝은 배경에서 가독성 저하)
⚠️ 단, 다크 배경(bg-gray-900 등)에서는 `text-gray-400` 사용 가능

### 반응형 디자인
- PC: 사이드바 네비게이션 (`lg:w-64`)
- 모바일: 하단 탭 + 상단 헤더
- 브레이크포인트: `lg` (1024px)

### Toast 알림 사용
```typescript
const { showSuccess, showError } = useToast();

// 성공 시
showSuccess('저장되었습니다.');

// 에러 시
showError('저장에 실패했습니다.');
```

---

## 현재 진행 상황

### 완료된 기능
- [x] 프로젝트 초기 설정 (Next.js 16, TypeScript, Tailwind)
- [x] 기본 레이아웃 (PC 사이드바 / 모바일 헤더+하단탭)
- [x] 다국어 설정 (ko/th/en)
- [x] Firebase 인증 (Google OAuth, 도메인 제한)
- [x] 제품 관리 CRUD
- [x] 고객 관리 CRUD
- [x] 구매처 관리 CRUD
- [x] 고객별 제품 매핑
- [x] 재고 관리
- [x] 마진 설정 관리
- [x] 주문 입력 (등급별 판매가 계산)
- [x] 발주서 생성 (buy1/buy2/buy3)
- [x] 배송장 출력
- [x] 가격 페이지 (공산품/신선제품 탭 분리)
- [x] 설정 페이지 (사용자 권한 관리)
- [x] Firebase 데이터 진단 페이지
- [x] 코드 품질 개선 (2026-01-02)
  - 상수 파일 분리 (`lib/constants/`)
  - 커스텀 훅 추출 (`lib/hooks/`)
  - N+1 쿼리 해결
  - Toast 알림 시스템

### 완료된 기능 (2026-01-02 추가)
- [x] 가격 관리 페이지 - 매입가 일괄 수정 기능 (체크박스 선택, %/고정값 조정)
- [x] 주문 확정 및 마감 처리 (단일/일괄 확정, 확정 취소)
- [x] 발주서 인쇄 기능 (미리보기 및 인쇄)
- [x] 대시보드 실시간 데이터 연동 (매출 현황, 고객/제품 수, 자동 새로고침)

### 향후 고려 사항
- [ ] 보안 테스트 및 개선
- [ ] 성능 최적화 (대용량 데이터 처리)
- [ ] 모바일 UX 추가 개선

---

## 문제 해결 가이드

### "주문 가능한 제품이 없습니다" 문제

**증상**: 고객에게 제품이 매핑되어 있지만 주문 페이지에서 표시되지 않음

**원인**: `fk365_products` 컬렉션에 제품 데이터가 없음

**해결**:
```bash
# 시드 스크립트 실행
node scripts/seed-data.mjs
```

**진단 방법**:
1. `/diagnostics` 페이지 접속
2. 제품 수 확인
3. 고객 코드로 매칭 테스트

### Firebase OAuth 에러

**증상**: `auth/unauthorized-domain` 에러

**해결**: Google Cloud Console에서 OAuth 설정
- Authorized JavaScript origins: `https://app.freshkitchen365.com`
- Authorized redirect URIs: `https://app.freshkitchen365.com/__/auth/handler`

---

## 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 린트
npm run lint

# 시드 데이터 생성
node scripts/seed-data.mjs
```

---

## 관련 프로젝트

### FK365 랜딩 페이지
- **경로**: `C:\Users\Giuje\fk365-landing`
- **URL**: https://freshkitchen365.com

### Meet365 (자매회사)
- **URL**: https://www.meet365.net
- **사업**: 프리미엄 육류 도매
- FK365 랜딩에서 육류 주문 시 Meet365로 안내

---

## 주의사항

1. **Firebase 컬렉션**: 반드시 `fk365_` 접두사 사용
2. **제품명**: 항상 3개 언어 표시 (한국어/태국어/미얀마어)
3. **마진 변경**: 반드시 히스토리 기록
4. **등급 변경**: adj 초기화 로직 필수
5. **N+1 쿼리**: `getCustomerProductAdjs()` 사용 (개별 조회 금지)

---

## 업데이트 이력

### 2026-01-03 (브랜드 컬러 시스템 및 가독성 개선)

**FK365 브랜드 컬러 시스템 적용**
- `globals.css`에 CSS 변수 추가 (`:root` 섹션)
- `globals.css`에 Tailwind 커스텀 색상 추가 (`@theme inline` 섹션)
- 브랜드 컬러: fk365-green (#6CA72C), fk365-orange (#D75C08)
- 카테고리 컬러: meat (#DC2626), vegetable (#6CA72C), seafood (#0EA5E9)
- 파일: `src/app/globals.css`

**전체 페이지 텍스트 가독성 개선**
- `text-gray-500` → `text-gray-600` 일괄 수정 (27개 파일)
- `bg-gray-400` → `bg-gray-600` 수정 (미주문 마커)
- 다크 배경(Sidebar)은 `text-gray-400` 유지 (가독성 확보)
- 수정된 컴포넌트:
  - UI: EmptyState, Modal, Select, Input, Spinner, ProtectedRoute
  - Layout: MobileHeader, BottomTabs
  - Pages: 대시보드, 로그인, 배송, 구매처, 설정, 가격, 재고, 제품, 고객, 발주서, 주문, 진단, 테스트 등

### 2026-01-03 (전체 페이지 다국어(i18n) 완전 적용)

**모든 주요 페이지 i18n 완료**
- `products/page.tsx`: 제품 관리 페이지 다국어 적용
- `customers/page.tsx`: 고객 관리 페이지 다국어 적용
- `vendors/page.tsx`: 구매처 관리 페이지 다국어 적용
- `margins/page.tsx`: 마진 설정 페이지 다국어 적용
- `prices/page.tsx`: 가격 관리 페이지 다국어 적용
- `delivery/page.tsx`: 배송장 페이지 다국어 적용
- `settings/page.tsx`: 설정 페이지 다국어 적용
- `login/page.tsx`: 로그인 페이지 다국어 적용
- `orders/page.tsx`: 주문 목록 페이지 추가 다국어 적용 (할인, 확정/취소 상태 등)
- `orders/entry/[customerCode]/page.tsx`: 주문 입력 페이지 추가 다국어 적용 (할인 사유, 에러 메시지, 제품 추가 모달 등)

**translations.ts 확장**
- 마진 관련 키 추가: description, freshMargin, industrialMargin, freshFormula, freshFormulaDesc, industrialFormula, industrialFormulaDesc1/2, dateTime, oldValue, newValue
- 가격 관련 키 추가: purPrice, minPrice, midPrice, noIndustrial, noFresh, bulkEditTitle, adjustTarget, adjustMethod, adjustValue 등
- 배송 관련 키 추가: totalCustomers, totalItems, noDelivery, noOrderForDate, product, thai, myanmar, subtotal, places
- 설정 관련 키 추가: totalUsers, adminUsers, activeUsers, email, role, roleAdmin, roleUser, loginInfo, activate, deactivate 등
- 공통 키 추가: modified, noSearchResults, description, remove
- 주문 관련 키 추가 (50개 이상):
  - 상태: discount, unconfirmed, partialConfirmed, cutoff1Full, cutoff2Full, cutoff3Full
  - 할인 사유: discountQuality, discountLoyal, discountBulk, discountPromotion, discountNegotiation, discountDamage, discountExpiring, discountOther
  - 에러 메시지: customerNotFound, customerNotFoundDesc, loadFailed, addProductFailed, saveFailed
  - 모달/UI: confirmQuestion, bulkConfirmQuestion, cancelOrder, cancelQuestion, cancelWarning
  - Toast 메시지: orderConfirmed, confirmFailed, bulkConfirmed, confirmCanceled, orderCanceled
  - 제품 추가: addProduct, showingAllProducts, noMappingWarning, noOrderableProducts, noProductsMappedDesc, selectProductsToAdd
- 로그인 관련 키 추가: title, subtitle, loading, loggingIn, loginWithGoogle, loginFailed, emailRestriction

**지원 언어**
- 한국어 (ko)
- 태국어 (th)
- 영어 (en)

### 2026-01-03 (주문 페이지 합계 금액 추가)

**주문 목록 페이지 - 주문완료 옆에 합계 표시**
- 주문 완료된 고객 행에 합계 금액 표시 (초록색 볼드)
- `getOrderTotal()` 함수로 finalAmount 우선 사용
- 파일: `src/app/orders/page.tsx`

**배송 인보이스 할인 금액 정상 반영**
- 고객별 총 할인 금액을 개별 주문에서 합산하여 표시
- 할인이 있을 경우 원가, 할인 금액, 최종 금액 3줄로 표시
- 파일: `src/app/delivery/page.tsx`

### 2026-01-03 (주문/발주 페이지 개선)

**주문 페이지 - 검색에 제품명 포함**
- 검색어로 제품명(한국어/태국어/미얀마어)도 검색 가능
- 해당 제품을 주문한 고객 자동 필터링
- `getProducts()` 호출하여 제품 데이터 로드
- 파일: `src/app/orders/page.tsx`

**발주서 페이지 UI 개선**
- **구매처 2줄 표시**: 첫줄 코드, 둘째줄 이름 (기존: `코드 | 이름`)
- **주문 상세 레이아웃 개선**:
  - 첫줄: 합계 숫자 + 주문자 보기 버튼
  - 둘째줄: (1차+2차+3차) 상세 내역
- **발주 아이템 정렬**: 구매처 코드 기준 정렬
- 파일: `src/app/purchase-orders/page.tsx`

### 2026-01-03 (주문 할인 금액 반영 수정)

**주문 목록 페이지 할인 정보 표시**
- 고객별 할인 금액(`-₿xxx`) 빨간색으로 표시
- 할인 사유 배지로 표시 (품질/단골/대량/프로모션 등)
- `getOrderTotal()` 수정: `finalAmount` 우선 사용
- `getTotalDiscount()`, `getDiscountReasons()` 함수 추가
- 파일: `src/app/orders/page.tsx`

**요약 카드 금액 할인 반영**
- `getCutoffSummary()` 수정: `finalAmount ?? totalAmount` 사용
- 1차/2차/3차/총합계 모두 할인 적용된 최종 금액으로 표시
- 파일: `src/lib/firebase/orders.ts`

### 2026-01-03 (주문 입력 - 제품 추가 기능)

**주문 입력 페이지 제품 추가 기능**
- 헤더에 "+" 버튼 추가 (제품 추가 모달 열기)
- **제품 추가 모달** 구현:
  - 매핑되지 않은 제품 목록 표시
  - 검색 기능 (코드/이름으로 검색)
  - 유형 필터 (전체/신선/공산품)
  - 체크박스로 다중 선택
  - 선택한 제품 즉시 고객에게 매핑 (`updateCustomerProducts()`)
  - 추가된 제품이 주문 목록에 실시간 반영
- 파일: `src/app/orders/entry/[customerCode]/page.tsx`

### 2026-01-02 (테스트 피드백 반영 5차)

**주문 페이지 - 주문 취소 기능**
- 주문 완료된 고객 행에 휴지통 아이콘 버튼 추가
- 취소 확인 모달로 실수 방지
- `deleteOrder()` Firebase 함수 연동
- 파일: `src/app/orders/page.tsx`

**발주서 페이지 전면 개선**
1. **색상 개선**: 연한 회색(text-gray-500/600) → 진한 회색(text-gray-800/900)
2. **구매처 표시**: "코드 | 이름" 형식으로 변경, 드롭다운에서 검색 가능
3. **제품 컬럼 개선**: 제품 코드 컬럼 추가, 제품명 3개 언어 통합 표시
4. **구매처 변경 시 자동 저장**: 신선 제품 구매처 변경 시 vendor.products에 자동 추가
5. **실제 매입량 기능**:
   - "실제 매입량" 컬럼 추가 (영수증 숫자 입력)
   - "추가량" 자동 계산 (실제매입량 - 발주량)
   - 저장 시 재고에 자동 반영 (`increaseStock()`)
6. **PDF 인쇄**: 영어 헤더 적용 (Purchase Order, Code, Product, Type, Qty, Unit Price, Amount)
- 파일: `src/app/purchase-orders/page.tsx`

**재고 페이지 다국어 적용**
- 유형(신선/공산품) 다국어 표시
- 보관장소 다국어 표시 (냉동창고/냉장창고/A zone/B zone)
- 보관장소 관리 버튼 및 모달 추가
- 추가 번역 키: `stock.location`, `stock.noLocation`, `stock.freezer`, `stock.fridge`, `stock.zoneA`, `stock.zoneB`, `stock.locationManage`, `stock.locationManageDesc`
- 파일: `src/app/stock/page.tsx`, `src/lib/i18n/translations.ts`

**타입 정의 수정**
- `Vendor` 인터페이스에 `products?: string[]` 필드 추가
- 파일: `src/types/index.ts`

### 2026-01-02 (테스트 피드백 반영 4차)

**대시보드 빠른 메뉴 다국어 적용**
- "주문 입력", "발주서", "배송장", "재고 현황" 버튼 i18n 적용
- 기존 번역 키 사용: `dashboard.orderEntry`, `nav.purchaseOrders`, `nav.delivery`, `nav.stock`
- 파일: `src/app/page.tsx`

**주문 페이지 전면 개선**
- 연한 회색(text-gray-600) → 진한 색상(text-gray-800/900) 변경
- 고객 코드 → 초록색(text-green-700) 변경
- 수량/가격 → 초록색(text-green-600) 강조
- hover 효과: border-blue-500 → border-green-500
- 화살표 아이콘 → 초록색 변경

**주문 페이지 다국어 완전 적용**
- 페이지 타이틀, 요약 카드(1차/2차/3차/총합계)
- 검색 placeholder, 주문/미주문 카운트
- "주문 완료", "미주문" 섹션 헤더
- 파타야/방콕 지역명, 확정/취소 버튼
- EmptyState, Modal 텍스트
- 파일: `src/app/orders/page.tsx`

### 2026-01-02 (테스트 피드백 반영 3차)

**대시보드 1주일 매출 바 차트 수정**
- 기존: 바 차트가 보이지 않는 문제
- 수정: 바 차트 구조 개선 (h-32 고정 높이 컨테이너, 금액/날짜 라벨 분리)
- 시각적 막대 차트로 매출 추이 확인 가능
- 파일: `src/app/page.tsx`

**대시보드 전체 다국어(i18n) 완전 적용**
- 오늘 매출 현황 섹션: 총 매출, 1차/2차/3차 매출
- 기본 현황 섹션: 활성 고객, 활성 제품
- 버튼: 오늘로, 새로고침
- 상태: 마감됨, 04시 전, 태국 시간
- 한국어/태국어/영어 3개 언어 모두 지원
- 파일: `src/app/page.tsx`, `src/lib/i18n/translations.ts`

**추가된 번역 키 (17개)**
```
dashboard.todaySales, dashboard.salesStatus, dashboard.totalSales
dashboard.cut1Sales, dashboard.cut2Sales, dashboard.cut3Sales
dashboard.basicStats, dashboard.activeCustomers, dashboard.activeProducts
dashboard.today, dashboard.goToToday, dashboard.refresh
dashboard.thailandTime, dashboard.closed, dashboard.before04
```

### 2026-01-02 (테스트 피드백 반영 2차)

**[Critical] 신선제품 판매가 계산 오류 수정**
- 신선제품이 `product.pur` 대신 3일 최고가(`max3DayPrice`)를 사용하도록 수정
- `getAllPriceHistory()` 호출하여 가격 히스토리 로드
- 3일 최고가 맵 생성 및 판매가 계산에 적용
- 파일: `src/app/orders/entry/[customerCode]/page.tsx`

**주문 페이지 UI 개선**
- 검색 아이콘: `text-gray-400` → `text-green-600`
- 뒤로가기 아이콘: `text-gray-500` → `text-green-600`
- 고객 정보 텍스트: `text-gray-500` → `text-gray-700`
- 판매가 라벨: `text-gray-500` → `text-gray-700`

**발주서 매입가 입력 기능 추가**
- 발주서 테이블에 매입가 입력 컬럼 추가
- "매입가 저장" 버튼으로 가격 히스토리에 일괄 저장
- `setPrice()` 연동하여 당일 매입가 반영
- 파일: `src/app/purchase-orders/page.tsx`

**구매처 제품코드 검색 기능**
- 구매처 검색창에서 제품코드로 해당 구매처 검색 가능
- 구매처 코드/이름 + 제품코드 복합 검색
- 검색 placeholder 업데이트: "구매처 또는 제품코드로 검색..."
- 파일: `src/app/vendors/page.tsx`

**대시보드 다국어 적용**
- `useI18n()` 훅 사용하여 번역 함수 호출
- 페이지 타이틀, 주문 현황, 빠른 메뉴 등 다국어 적용
- 번역 키 추가: `dashboard.title`, `dashboard.todayOrders`, `dashboard.quickMenu` 등
- 한국어/태국어/영어 3개 언어 지원
- 파일: `src/app/page.tsx`, `src/lib/i18n/translations.ts`

### 2026-01-02 (테스트 피드백 반영 - 이전)

**UI 가독성 개선**
- 발주서 페이지: 탭, 테이블 헤더, 구매처명 등 연한 회색 → 진한 색상으로 변경
- 재고 페이지: 보관장소 select 텍스트 색상 개선
- 구매처 제품 매핑 페이지: 테이블 헤더, 제품명 연한 회색 개선

**대시보드 개선**
- 날짜 검색 기능 추가 (과거 날짜 주문 현황 조회 가능)
- 7일간 매출 그래프 추가 (CSS 기반 바 차트)
- "오늘로" 버튼 추가 (과거 날짜 조회 후 복귀)
- 선택된 날짜 표시 개선

**주문 페이지 개선**
- 주문 목록: 태국 시간대(UTC+7) 기준 오늘 날짜 표시
- 주문 입력: 제품 코드 표시 추가 (제품명 왼쪽에 코드 배지)

**고객 관리 개선**
- GPS 좌표 단일 입력 필드 추가 (Google Maps 복사-붙여넣기 지원)
  - "13.780798, 100.596319" 형식 자동 파싱
- 배송시간 undefined 표시 버그 수정 ("undefined" → "-")

**재고 페이지 개선**
- 보관장소별 필터 추가 (냉동/냉장/A zone/B zone)
- 카테고리 필터와 함께 사용 가능

**발주서 페이지 개선**
- 구매처 검색 기능 추가 (이름/코드로 필터링)

**구매처 페이지 개선**
- 제품 목록 모달에 검색 기능 추가
- 검색 결과 수 표시

### 2026-01-02 (기능 개선)
- **주문 페이지 개선**
  - 고객 코드/이름 검색 기능 추가
  - 신규 고객 접속 시 에러 처리 개선 (사용자 친화적 메시지)
  - Tab 키로 다음 행 이동 기능 (수량 입력 시)
- **고객 관리 개선**
  - 배송시간 드롭다운 선택 (06:00~17:00)
  - GPS 좌표 필드 추가 (gpsLat, gpsLng)
  - 연락처 필드 추가 (contact1, contact2)
  - 고객 수정 페이지에 현재 매핑된 제품 목록 표시
- **재고 페이지 개선**
  - 보관장소 선택 추가 (냉동창고/냉장창고/A zone/B zone)
  - 수량 조절 버튼 위치 개선 (우측 배치)
  - Tab 키 네비게이션 지원
- **제품 페이지 개선**
  - 체크박스 일괄 선택 및 삭제 기능
  - 선택된 제품 수 표시
- **다국어 지원 확장**
  - 테이블 헤더 다국어 키 추가 (table 섹션)
  - 재고 페이지 다국어 키 추가 (stock 섹션)
- **CSV 다운로드 기능**
  - 제품 페이지: CSV 내보내기
  - 고객 페이지: CSV 내보내기
  - 재고 페이지: CSV 내보내기
  - 발주서 페이지: 전체/업체별 CSV 다운로드
- **유틸리티 추가**
  - `lib/utils/csvExport.ts`: CSV 내보내기 유틸리티

### 2026-01-02 (UI 가독성 개선)
- 연한 회색 텍스트(`text-gray-400`) → `text-gray-500` 수정
  - 주문 입력 페이지: 제품 단위/adj 정보
  - 대시보드: 태국 시간 표시
  - 로그인 페이지: 안내 문구 및 푸터
  - 제품 등록 페이지: 가격유형 설명
  - 설정 페이지: 로그인 기록 플레이스홀더
  - EmptyState 컴포넌트: 기본 아이콘

### 2026-01-02 (코드 품질 개선)
- 상수 파일 분리 (`lib/constants/`)
  - `time.ts`: 시간 관련 상수 및 유틸
  - `grade.ts`: 등급 관련 상수
  - `ui.ts`: UI 관련 상수
- 커스텀 훅 추출 (`lib/hooks/`)
  - `useAsync`: 비동기 상태 관리
  - `useProducts`: 제품 데이터 조회
  - `useCustomers`: 고객 데이터 조회
  - `useVendors`: 구매처 데이터 조회
  - `useThailandTime`: 태국 시간 관리
- N+1 쿼리 해결
  - 주문 입력 페이지에서 adj 일괄 조회
- Toast 알림 시스템 추가
  - `useToast` 훅으로 사용자 피드백 개선

### 2026-01-02 (이전)
- Firebase 데이터 진단 페이지 추가
- 고객 제품 매핑 저장 피드백 추가
- 발주서 페이지 신선 제품 구매처 변경 기능
- 설정 페이지 사용자 추가 기능

### 2026-01-02 (UI/UX 및 다국어 개선)
- **주문 페이지**
  - 캘린더 날짜 색상 검은색으로 변경 (가독성 개선)
  - 고객 코드, 수량, 가격 초록색 적용
- **주문 입력 페이지**
  - 제품명, 수량, adj, 판매가에 초록색 적용
  - 하단 저장 바 다국어 지원 (선택 항목, 주문 저장)
- **발주서 페이지**
  - 테이블 헤더 다국어 지원 (제품, 유형, 1차 주문량, 재고, 발주 수량, 매입가, 구매처)
  - 연한 회색 → 검은색, 재고 → 초록색으로 가독성 개선
- **재고 페이지**
  - 카테고리 필터를 유형(신선/공산품)으로 변경
- **가격 페이지**
  - 탭 순서 변경: 신선제품이 먼저, 공산품이 두 번째로
- **번역 키 추가** (translations.ts)
  - `common.count`, `common.saving`
  - `products.product`, `products.type`
  - `vendors.vendor`
  - `orders.baseAdj`, `orders.orderAdj`, `orders.sellPrice`, `orders.selectedItems`, `orders.totalAmount`, `orders.saveOrder`
  - `purchaseOrders.cut1Order`, `purchaseOrders.orderQty`, `purchaseOrders.buyPrice`

### 2026-01-01
- Firebase 로그인 에러 수정 (환경변수 trim 처리)
- 제품/구매처/고객 페이지 UI 개선
- 대시보드 마감시간 실시간 반영
- 랜딩 페이지 Meet365 섹션 추가
