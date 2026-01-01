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
│       └── priceCalculation.ts
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

### 텍스트 색상 (가독성 기준)
| 용도 | 클래스 |
|------|--------|
| 본문 | `text-gray-900` 또는 `text-gray-800` |
| 보조 텍스트 | `text-gray-700` 또는 `text-gray-600` |
| 비활성 | `text-gray-500` (최소 기준) |

⚠️ `text-gray-400`, `text-gray-300` 사용 금지 (가독성 저하)

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

### 2026-01-01
- Firebase 로그인 에러 수정 (환경변수 trim 처리)
- 제품/구매처/고객 페이지 UI 개선
- 대시보드 마감시간 실시간 반영
- 랜딩 페이지 Meet365 섹션 추가
