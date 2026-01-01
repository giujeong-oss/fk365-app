// 고객-제품 매핑 별도 컬렉션 생성
// 실행: node scripts/create-customer-products-collection.mjs

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  Timestamp
} from 'firebase/firestore';

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

const COLLECTIONS = {
  CUSTOMERS: 'fk365_customers',
  CUSTOMER_PRODUCTS: 'fk365_customerProducts',
  CUSTOMER_PRODUCT_ADJ: 'fk365_customerProductAdj',
};

async function createCustomerProductsCollection() {
  console.log('🚀 고객-제품 매핑 컬렉션 생성 시작\n');
  console.log('━'.repeat(50));

  // 1. 모든 고객 조회
  console.log('\n📋 고객 데이터 로딩 중...');
  const customersRef = collection(db, COLLECTIONS.CUSTOMERS);
  const customersSnapshot = await getDocs(customersRef);

  const customers = [];
  customersSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.code && data.code !== '_init') {
      customers.push({
        id: doc.id,
        code: data.code,
        grade: data.grade || 'B',
        products: data.products || []
      });
    }
  });
  console.log(`  ✓ ${customers.length}개 고객 로드 완료`);

  // 2. 기존 adj 데이터 로드
  console.log('\n💰 기존 adj 데이터 로딩 중...');
  const adjRef = collection(db, COLLECTIONS.CUSTOMER_PRODUCT_ADJ);
  const adjSnapshot = await getDocs(adjRef);

  const adjMap = new Map();
  adjSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.customerCode && data.productCode) {
      const key = `${data.customerCode}_${data.productCode}`;
      adjMap.set(key, data.adj || 0);
    }
  });
  console.log(`  ✓ ${adjMap.size}개 adj 데이터 로드 완료`);

  // 3. 고객-제품 매핑 문서 생성
  console.log('\n📦 고객-제품 매핑 문서 생성 중...');

  let totalCount = 0;
  let createdCount = 0;

  for (const customer of customers) {
    const productCodes = customer.products || [];

    for (const productCode of productCodes) {
      totalCount++;

      // 문서 ID: customerCode_productCode
      const docId = `${customer.code}_${productCode}`;
      const docRef = doc(db, COLLECTIONS.CUSTOMER_PRODUCTS, docId);

      // adj 값 가져오기
      const adjKey = `${customer.code}_${productCode}`;
      const adj = adjMap.get(adjKey) || 0;

      await setDoc(docRef, {
        customerCode: customer.code,
        productCode: productCode,
        customerGrade: customer.grade,
        adj: adj,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      createdCount++;

      // 진행률 표시 (100개마다)
      if (createdCount % 100 === 0) {
        process.stdout.write(`\r  생성 중: ${createdCount}개...`);
      }
    }
  }

  console.log(`\r  ✓ ${createdCount}개 매핑 문서 생성 완료`);

  // 4. 통계 출력
  console.log('\n' + '━'.repeat(50));
  console.log('🎉 컬렉션 생성 완료!\n');

  console.log('📊 통계:');
  console.log(`  - 고객 수: ${customers.length}개`);
  console.log(`  - 총 매핑 수: ${createdCount}개`);
  console.log(`  - 평균 제품/고객: ${Math.round(createdCount / customers.length)}개`);

  console.log('\n📌 컬렉션 구조:');
  console.log('  fk365_customerProducts/{customerCode}_{productCode}');
  console.log('  {');
  console.log('    customerCode: string,');
  console.log('    productCode: string,');
  console.log('    customerGrade: string,');
  console.log('    adj: number,');
  console.log('    isActive: boolean,');
  console.log('    createdAt: timestamp,');
  console.log('    updatedAt: timestamp');
  console.log('  }');

  console.log('\n📝 가능한 쿼리:');
  console.log('  - 고객의 모든 제품: where("customerCode", "==", "B2")');
  console.log('  - 제품을 구매하는 모든 고객: where("productCode", "==", "F001-S")');
  console.log('  - 특정 등급 고객의 제품: where("customerGrade", "==", "A")');

  process.exit(0);
}

createCustomerProductsCollection().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
