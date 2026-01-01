// FK365 Firebase Configuration
// Firebase 프로젝트: fk365-e8f90 (프로젝트 번호: 242061459214)

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase 환경 변수 검증 (줄바꿈/공백 제거)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
};

// Check if we're in browser and have complete config
const isBrowser = typeof window !== 'undefined';
const hasConfig = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

// 개발 환경에서 환경 변수 누락 경고
if (isBrowser && !hasConfig && process.env.NODE_ENV === 'development') {
  console.warn(
    'Firebase 환경 변수가 설정되지 않았습니다.',
    '다음 환경 변수를 .env.local에 설정하세요:',
    'NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  );
}

// Initialize Firebase (singleton pattern) - only in browser with valid config
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isBrowser && hasConfig) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();

  // 회사 도메인 로그인 힌트 (Google Workspace 도메인)
  googleProvider.setCustomParameters({
    hd: 'freshkitchen365.com',
  });
}

export { auth, db, googleProvider };

// FK365 컬렉션 경로 상수
export const FK365_COLLECTIONS = {
  PRODUCTS: 'fk365_products',
  CUSTOMERS: 'fk365_customers',
  VENDORS: 'fk365_vendors',
  ORDERS: 'fk365_orders',
  PURCHASE_ORDERS: 'fk365_purchaseOrders',
  STOCK: 'fk365_stock',
  PRICE_HISTORY: 'fk365_priceHistory',
  MARGINS: 'fk365_margins',
  MARGIN_HISTORY: 'fk365_marginHistory',
  CUSTOMER_PRODUCT_ADJ: 'fk365_customerProductAdj',
  SETTINGS: 'fk365_settings',
  USERS: 'fk365_users',
  LOCKS: 'fk365_locks',
  I18N: 'fk365_i18n',
} as const;

export default app;
