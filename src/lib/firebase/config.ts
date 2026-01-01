// FK365 Firebase Configuration
// Firebase 프로젝트: meet365-12ce8 (Meet365와 공유)

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Check if we're in browser and have config
const isBrowser = typeof window !== 'undefined';
const hasConfig = !!firebaseConfig.apiKey;

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

  // 회사 도메인만 허용
  googleProvider.setCustomParameters({
    hd: 'meet365.com', // 또는 freshkitchen365.com
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
