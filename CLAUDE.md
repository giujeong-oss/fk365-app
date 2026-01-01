# FK365 프로젝트 컨텍스트

## 프로젝트 경로
- **로컬**: `C:\Users\Giuje\fk365-app`
- **GitHub**: (추후 설정)

## 프로젝트 개요
- **이름**: FK365 (Fresh Kitchen 365)
- **목적**: 채소/과일/식자재/소모품 주문-발주-재고-배송 통합 관리 웹앱
- **도메인**: freshkitchen365.com
- **Firebase**: fk365-e8f90 (프로젝트 번호: 242061459214)
- **Vercel**: https://fk365-app.vercel.app
- **GitHub**: https://github.com/giujeong-oss/fk365-app

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
- [x] 프로젝트 초기 설정
- [x] 기본 레이아웃 (PC/모바일)
- [x] 다국어 설정 (ko/th/en)
- [x] Firebase 인증 (Google OAuth, 권한 관리)
- [x] 구매처 관리 CRUD
- [x] 제품 관리 CRUD (구매처 연결, 신선/공산품 구분)
- [x] 고객 관리 CRUD (제품 매핑, adj 설정)
- [x] 주문 입력 (고객별 제품 주문, cutoff별 구분)
- [x] 발주서 생성 (buy1/buy2/buy3, 구매처별)
- [x] 배송장 출력 (지역별, 인보이스 모드)
- [ ] 판매가 계산 로직 (마진 적용)
- [ ] 가격 관리 페이지

## 주의사항
- Firebase 컬렉션은 반드시 fk365_ 접두사 사용
- 제품명은 항상 3개 언어 표시 (한국어/태국어/미얀마어)
- 마진 변경 시 반드시 히스토리 기록
- 고객 등급 변경 시 adj 초기화 로직 필수
