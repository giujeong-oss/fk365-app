# FK365 프로젝트 컨텍스트

## 프로젝트 경로
- **로컬**: `C:\Users\Giuje\fk365-app`
- **GitHub**: (추후 설정)

## 프로젝트 개요
- **이름**: FK365 (Fresh Kitchen 365)
- **목적**: 채소/과일/식자재/소모품 주문-발주-재고-배송 통합 관리 웹앱
- **Firebase**: fk365-e8f90 (프로젝트 번호: 242061459214)
- **GitHub**: https://github.com/giujeong-oss/fk365-app

### 도메인 구성
| 도메인 | 용도 | Vercel 프로젝트 |
|--------|------|-----------------|
| freshkitchen365.com | 회사 소개 랜딩 페이지 | fk365-landing |
| app.freshkitchen365.com | 웹앱 (주문/발주/재고 관리) | fk365-app |

### 랜딩 페이지 (fk365-landing)
- **경로**: `C:\Users\Giuje\fk365-landing`
- **URL**: https://freshkitchen365.com
- **기능**: 회사 소개, 서비스 안내, 연락처, 견적 문의 폼

## 기술 스택
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Cloud Functions)
- **Deploy**: Vercel (frontend), Firebase (backend)
- **다국어**: next-intl (한국어/태국어/영어)

## 핵심 비즈니스 로직

### 가격 구조 (2가지)
1. **신선제품** (fresh): 바트 고정 마진
   - S: +5฿, A: +8฿, B: +10฿, C: +12฿, D: +15฿
   
2. **공산품** (industrial): % 계산 마진
   - S: MAX(Pur×1.05, Min×0.75)
   - A: MAX(Pur×1.10, Min×0.85)
   - B: MAX(Pur×1.15, Min×0.90)
   - C: MAX(Pur×1.20, Min×0.93)
   - D: Mid×0.95 (마진 30%↑ 시)

### 발주 프로세스 (3단계)
```
buy1 = MAX(cut1 - stock, 0)  → 1차 장보기
buy2 = cut2 (전량)            → 끌렁떠이 추가
buy3 = cut3 (전량)            → 긴급 (라라무브)
```

### 고객별 제품 adj
- 고객-제품 매핑에 baseAdj 설정 가능
- **등급 변경 시 모든 adj → 0 초기화**

## Firestore 컬렉션 (fk365_ 접두사)
- fk365_products: 제품 마스터
- fk365_customers: 고객 마스터
- fk365_vendors: 구매처 마스터
- fk365_orders: 주문
- fk365_purchaseOrders: 발주서
- fk365_stock: 재고
- fk365_priceHistory: 매입가 히스토리
- fk365_margins: 마진 설정
- fk365_marginHistory: 마진 변경 이력
- fk365_customerProductAdj: 고객별 제품 adj
- fk365_users: 사용자
- fk365_locks: 동시 편집 방지

## 주요 타입 정의

```typescript
type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
type Region = 'pattaya' | 'bangkok';
type PriceType = 'fresh' | 'industrial';
type Cutoff = 1 | 2 | 3;
type UserRole = 'admin' | 'user';
type UILanguage = 'ko' | 'th' | 'en';
```

## 화면 구조
- PC: 사이드바 네비게이션 (lg:w-64)
- 모바일: 하단 탭 + 상단 헤더
- 반응형 브레이크포인트: lg (1024px)

## 파일 구조
```
src/
├── app/                    # Next.js App Router
├── components/
│   ├── layout/            # MainLayout, Sidebar, BottomTabs
│   ├── ui/                # 공통 UI 컴포넌트
│   └── forms/             # 폼 컴포넌트
├── lib/
│   ├── firebase/          # Firebase 설정
│   ├── hooks/             # 커스텀 훅
│   └── utils/             # 유틸리티 함수
├── types/                  # TypeScript 타입
└── i18n/
    └── locales/           # ko.json, th.json, en.json
```

## 코딩 컨벤션
- 컴포넌트: PascalCase
- 함수/변수: camelCase
- 상수: UPPER_SNAKE_CASE
- 파일: kebab-case 또는 PascalCase (컴포넌트)

## 참조 문서
- 요구사항: fk365_webapp_requirements.md (Claude 프로젝트)
- Meet365 프로젝트 지침: meet365_프로젝트_지침_v5.md

## 현재 진행 상황

### 완료된 기능
- [x] 프로젝트 초기 설정 (Next.js 16, TypeScript, Tailwind)
- [x] 기본 레이아웃 (PC 사이드바 / 모바일 헤더+하단탭)
- [x] 다국어 설정 (ko/th/en, localStorage 저장)
- [x] Firebase 인증 (Google OAuth, 도메인 제한, 관리자 권한)
- [x] 구매처 관리 CRUD (/vendors)
- [x] 제품 관리 CRUD (/products, /products/new, /products/[id]/edit)
- [x] 고객 관리 CRUD (/customers, /customers/new, /customers/[id]/edit)
- [x] 고객별 제품 매핑 (/customers/[id]/products)
- [x] 재고 관리 (/stock)
- [x] 마진 설정 관리 (/margins)
- [x] 주문 목록 (/orders)
- [x] 주문 입력 (/orders/entry/[customerCode]) - 등급별 판매가 계산
- [x] 발주서 생성 (/purchase-orders) - buy1/buy2/buy3
- [x] 배송장 출력 (/delivery)
- [x] 실제 데이터 시드 (scripts/seed-data.mjs)

### 진행 예정
- [ ] 가격 관리 페이지 (/prices) - 매입가 일괄 수정
- [ ] 설정 페이지 (/settings)
- [ ] 주문 확정 및 마감 처리
- [ ] 발주서 인쇄 기능
- [ ] 대시보드 실시간 데이터 연동

## 주의사항
- Firebase 컬렉션은 반드시 fk365_ 접두사 사용
- 제품명은 항상 3개 언어 표시 (한국어/태국어/미얀마어)
- 마진 변경 시 반드시 히스토리 기록
- 고객 등급 변경 시 adj 초기화 로직 필수

## UI/UX 가이드라인
- **텍스트 색상**: 가독성이 떨어지는 연한 회색(text-gray-400, text-gray-300 등) 사용 금지
  - 본문: text-gray-900 또는 text-gray-800
  - 보조 텍스트: text-gray-700 또는 text-gray-600
  - 비활성: text-gray-500 (최소 기준)

## 추가 요구사항 (2025-01)
- [x] 구매처에 구매제품 매핑 추가 (어떤 제품을 어디서 구매하는지)
- [x] 과거 주문 내역 조회 기능
- [x] 대시보드 실제 데이터 연동 (정상/추가/긴급 주문 수)
- [x] 제품 가격 페이지 (/prices)
- [x] 다국어 네비게이션 - Sidebar/BottomTabs에 i18n 적용 (언어 변경 시 메뉴 번역)
- [x] 재고 페이지 제품명 3개 언어 표시 (한국어/태국어/미얀마어)
- [x] 고객 제품 매핑 null 체크 수정 (주문 입력 시 products 배열 체크)
- [x] 가격 페이지 탭 분리 (공산품/신선제품)
  - 공산품: 매입가(VAT포함), 최소가, 중간가 입력
  - 신선제품: 3일 최고가 표시, 오늘 매입가 입력, 최근 3일 가격 히스토리
- [x] 마진 페이지 MainLayout 추가 및 홈 버튼 추가
- [x] 모바일 관리자 "더보기" 메뉴 추가 (BottomTabs)
  - 관리자 전용 메뉴(발주서, 재고, 가격, 마진, 구매처, 설정) 접근 가능
- [x] 설정 페이지 사용자 권한 관리 고도화
  - 역할 변경 (admin/user)
  - 계정 활성화/비활성화
  - 사용자 통계 표시
- [x] Firebase API 키 하드코딩 제거 (보안 개선)
  - 환경변수 필수 사용으로 변경
- [x] User 타입에 isActive, lastLoginAt 필드 추가
- [x] 회사 소개 웹사이트 생성 (freshkitchen365.com)

## 업데이트 이력 (2026-01-01)

### Firebase 로그인 에러 수정
- 환경변수 값에 줄바꿈/공백이 포함된 경우를 대비해 `.trim()` 처리 추가
- 파일: `src/lib/firebase/config.ts`

### 제품 페이지 UI 개선
- 유형 컬럼을 코드 다음으로 이동
- 유형(신선/공산품)을 드롭다운으로 직접 수정 가능
- 제품명 3개 언어(한국어/태국어/미얀마어)를 하나의 셀에 통합 표시
- 파일: `src/app/products/page.tsx`

### 구매처 제품 매핑 기능
- 구매처별 제품 매핑 페이지 추가 (`/vendors/[id]/products`)
- 구매처 목록에 "매핑" 버튼 추가 (코드 다음 컬럼)
- 카테고리별 탭 필터링, 제품명 3개 언어 통합 표시
- 파일: `src/app/vendors/page.tsx`, `src/app/vendors/[id]/products/page.tsx`

### 고객 제품 매핑 페이지 개선
- 카테고리별 탭 필터링 추가
- 제품명 3개 언어(한국어/태국어/미얀마어)를 하나의 셀에 통합 표시
- 파일: `src/app/customers/[id]/products/page.tsx`

### 대시보드 마감시간 실시간 반영
- 태국 시간(UTC+7) 기준 실시간 시계 표시
- 새벽 4시 기준 일반 주문 마감
- 마감 후 "추가/긴급 주문만 가능" 표시
- 추가/긴급 주문은 시간 제한 없음 (관리자 판단)
- 파일: `src/app/page.tsx`

## 업데이트 이력 (2026-01-02)

### 주문 페이지 안내 메시지 개선
- "주문 가능한 제품이 없다" 메시지를 더 명확하게 개선
- 고객에게 제품 매핑이 필요하다는 안내 및 설정 링크 제공
- 파일: `src/app/orders/entry/[customerCode]/page.tsx`

### 구매처 제품 매핑 페이지 개선
- 카테고리 탭을 **유형(신선/공산품)**으로 변경 (기존: category 기반)
- 검색창 하단에 **선택된 제품 리스트** 섹션 추가 (태그 형태로 표시, X 버튼으로 제거)
- **저장 버튼을 플로팅**으로 변경 (화면 우측 하단에 고정)
- 파일: `src/app/vendors/[id]/products/page.tsx`

### 고객 제품 매핑 페이지 개선
- **저장 버튼을 플로팅**으로 변경 (화면 우측 하단에 고정)
- 파일: `src/app/customers/[id]/products/page.tsx`

### 구매처 관리 페이지 개선
- 제품 목록 모달에 **제품 제거 버튼(X)** 추가
- 해당 구매처에서 개별 제품을 즉시 제거 가능
- 파일: `src/app/vendors/page.tsx`

### 발주서 페이지 개선 (신선 제품 구매처 변경)
- 발주 대상 제품 목록에 **유형 컬럼** 추가
- **신선 제품은 구매처 드롭다운**으로 변경 가능 (공산품은 변경 불가)
- 변경된 구매처는 노란색 하이라이트로 표시
- "원복" 버튼으로 원래 구매처로 복원 가능
- 파일: `src/app/purchase-orders/page.tsx`

### 설정 페이지 사용자 추가 기능
- **이메일로 사용자 사전 등록** 기능 추가
- 사용자 추가 모달: 이메일(필수), 이름(선택), 역할(일반/관리자) 입력
- 등록된 이메일로 로그인 시 해당 권한으로 접근 가능
- 파일: `src/app/settings/page.tsx`, `src/lib/firebase/users.ts`

### PWA 아이콘 에러 수정
- `icon-192.png`, `icon-512.png` 404 에러 해결
- SVG 아이콘 파일 생성 (`public/icon.svg`)
- `manifest.json` 업데이트 - SVG 아이콘 참조로 변경
- 파일: `public/icon.svg`, `public/manifest.json`

### 랜딩 페이지 사업 소개 수정 (fk365-landing)
- 회사 사업 분야를 **채소, 과일, 주방 비품 전문 유통**으로 명확화
- 기존 "프리미엄 식자재" 표현을 구체적인 사업 영역으로 변경
- Hero 섹션, About 섹션, Products 섹션, Footer 모두 일관성 있게 수정
- 취급 제품에서 육류/수산물 제거 (채소류, 과일류, 가공식품, 주방 비품, 소모품)
- 파일: `C:\Users\Giuje\fk365-landing\src\app\page.tsx`

### Meet365 자매회사 소개 섹션 추가 (fk365-landing)
- Products 섹션과 Contact 섹션 사이에 Meet365 홍보 섹션 추가
- "고기 주문은 Meet365에서!" 안내 문구
- 프리미엄 돼지고기, 소고기, 닭고기 취급 안내
- Meet365 방문하기 버튼 (https://www.meet365.net 링크)
- Footer에 자매회사 섹션 추가
- 파일: `C:\Users\Giuje\fk365-landing\src\app\page.tsx`

### 랜딩 페이지 메타데이터 업데이트 (fk365-landing)
- 페이지 타이틀: "Fresh Kitchen 365 | 채소, 과일, 주방 비품 전문 유통"
- description에 Meet365 자매회사 언급 추가
- keywords에 채소, 과일, 주방 비품, Meet365 추가
- 파일: `C:\Users\Giuje\fk365-landing\src\app\layout.tsx`

### Firebase OAuth 도메인 설정 안내
- `auth/unauthorized-domain` 에러 해결 방법 문서화
- Google Cloud Console에서 OAuth 리디렉션 URI 설정 필요:
  - Authorized JavaScript origins: `https://app.freshkitchen365.com`
  - Authorized redirect URIs: `https://app.freshkitchen365.com/__/auth/handler`

## 관련 프로젝트 연동

### Meet365 (자매회사)
- **URL**: https://www.meet365.net
- **사업 분야**: 프리미엄 육류 도매 (돼지고기, 소고기, 닭고기)
- **연락처**: 093-653-6504, order@meet365.net
- **LINE**: @928dyodb
- FK365 랜딩 페이지에서 육류 주문 시 Meet365로 안내
