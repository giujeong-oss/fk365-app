// FK365 Firebase 컬렉션 초기화
// 실행: node scripts/init-collections.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBWYkijZRFzqEd0vJlT8Nq5YgvC2PlNSvU",
  authDomain: "fk365-e8f90.firebaseapp.com",
  projectId: "fk365-e8f90",
  storageBucket: "fk365-e8f90.firebasestorage.app",
  messagingSenderId: "242061459214",
  appId: "1:242061459214:web:721cd1e14ec49cdb75a15f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 컬렉션 이름
const COLLECTIONS = {
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
};

async function initCollections() {
  console.log('🚀 FK365 Firebase 컬렉션 초기화 시작\n');
  console.log('━'.repeat(50));

  // 1. 설정 초기화
  console.log('\n⚙️  설정 초기화 중...');
  const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'app');
  await setDoc(settingsRef, {
    appName: 'FK365',
    version: '1.0.0',
    defaultLanguage: 'ko',
    supportedLanguages: ['ko', 'th', 'en'],
    cutoffTimes: {
      cut1: '04:00', // 1차 마감 (새벽 4시)
      cut2: '10:00', // 2차 마감
      cut3: '14:00', // 3차 마감
    },
    timezone: 'Asia/Bangkok',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log('  ✓ fk365_settings 초기화 완료');

  // 2. 사용자 초기화 (관리자)
  console.log('\n👤 사용자 초기화 중...');
  const adminUsers = [
    { email: 'admin@freshkitchen365.com', name: 'Admin', role: 'admin' },
    { email: 'giujeong.oss@gmail.com', name: 'Giujeong', role: 'admin' },
  ];

  for (const user of adminUsers) {
    const userId = user.email.replace(/[.@]/g, '_');
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await setDoc(userRef, {
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: true,
      preferredLanguage: 'ko',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`  ✓ ${user.email} (${user.role})`);
  }

  // 3. 재고 초기화 (샘플)
  console.log('\n📦 재고 컬렉션 초기화 중...');
  const stockRef = doc(db, COLLECTIONS.STOCK, '_init');
  await setDoc(stockRef, {
    _description: '재고 컬렉션 초기화 문서',
    createdAt: Timestamp.now(),
  });
  console.log('  ✓ fk365_stock 초기화 완료');

  // 4. 주문 컬렉션 초기화
  console.log('\n🛒 주문 컬렉션 초기화 중...');
  const ordersRef = doc(db, COLLECTIONS.ORDERS, '_init');
  await setDoc(ordersRef, {
    _description: '주문 컬렉션 초기화 문서',
    createdAt: Timestamp.now(),
  });
  console.log('  ✓ fk365_orders 초기화 완료');

  // 5. 발주서 컬렉션 초기화
  console.log('\n📋 발주서 컬렉션 초기화 중...');
  const poRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, '_init');
  await setDoc(poRef, {
    _description: '발주서 컬렉션 초기화 문서',
    createdAt: Timestamp.now(),
  });
  console.log('  ✓ fk365_purchaseOrders 초기화 완료');

  // 6. 가격 히스토리 컬렉션 초기화
  console.log('\n💰 가격 히스토리 컬렉션 초기화 중...');
  const priceHistoryRef = doc(db, COLLECTIONS.PRICE_HISTORY, '_init');
  await setDoc(priceHistoryRef, {
    _description: '가격 히스토리 컬렉션 초기화 문서',
    createdAt: Timestamp.now(),
  });
  console.log('  ✓ fk365_priceHistory 초기화 완료');

  // 7. 마진 히스토리 컬렉션 초기화
  console.log('\n📊 마진 히스토리 컬렉션 초기화 중...');
  const marginHistoryRef = doc(db, COLLECTIONS.MARGIN_HISTORY, '_init');
  await setDoc(marginHistoryRef, {
    _description: '마진 히스토리 컬렉션 초기화 문서',
    createdAt: Timestamp.now(),
  });
  console.log('  ✓ fk365_marginHistory 초기화 완료');

  // 8. 고객별 제품 adj 컬렉션 초기화
  console.log('\n🔧 고객별 제품 adj 컬렉션 초기화 중...');
  const adjRef = doc(db, COLLECTIONS.CUSTOMER_PRODUCT_ADJ, '_init');
  await setDoc(adjRef, {
    _description: '고객별 제품 adj 컬렉션 초기화 문서',
    createdAt: Timestamp.now(),
  });
  console.log('  ✓ fk365_customerProductAdj 초기화 완료');

  // 9. 동시 편집 방지 컬렉션 초기화
  console.log('\n🔒 잠금 컬렉션 초기화 중...');
  const locksRef = doc(db, COLLECTIONS.LOCKS, '_init');
  await setDoc(locksRef, {
    _description: '잠금 컬렉션 초기화 문서',
    createdAt: Timestamp.now(),
  });
  console.log('  ✓ fk365_locks 초기화 완료');

  // 10. 다국어 컬렉션 초기화
  console.log('\n🌐 다국어 컬렉션 초기화 중...');
  const i18nRef = doc(db, COLLECTIONS.I18N, 'config');
  await setDoc(i18nRef, {
    defaultLocale: 'ko',
    supportedLocales: ['ko', 'th', 'en'],
    updatedAt: Timestamp.now(),
  });
  console.log('  ✓ fk365_i18n 초기화 완료');

  console.log('\n' + '━'.repeat(50));
  console.log('🎉 모든 컬렉션 초기화 완료!\n');

  console.log('📌 생성된 컬렉션:');
  console.log('  - fk365_products (기존)');
  console.log('  - fk365_customers (기존)');
  console.log('  - fk365_vendors (기존)');
  console.log('  - fk365_margins (기존)');
  console.log('  - fk365_settings ✨');
  console.log('  - fk365_users ✨');
  console.log('  - fk365_stock ✨');
  console.log('  - fk365_orders ✨');
  console.log('  - fk365_purchaseOrders ✨');
  console.log('  - fk365_priceHistory ✨');
  console.log('  - fk365_marginHistory ✨');
  console.log('  - fk365_customerProductAdj ✨');
  console.log('  - fk365_locks ✨');
  console.log('  - fk365_i18n ✨');

  process.exit(0);
}

initCollections().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
