// 고객 products 배열에서 존재하지 않는 제품 코드 제거
// 실행: node scripts/cleanup-invalid-products.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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

// 삭제할 제품 코드 목록
const INVALID_CODES = ['E046', 'v012', 'V040', 'V061', 'V062', 'E052'];

async function cleanupInvalidProducts() {
  console.log('🧹 잘못된 제품 코드 정리 시작\n');
  console.log('삭제 대상 코드:', INVALID_CODES.join(', '));
  console.log('━'.repeat(50));

  // 모든 고객 조회
  const customersRef = collection(db, 'fk365_customers');
  const snapshot = await getDocs(customersRef);

  let totalRemoved = 0;

  for (const docSnap of snapshot.docs) {
    const customer = docSnap.data();
    const products = customer.products || [];

    // 제거할 코드 찾기
    const toRemove = products.filter(code =>
      INVALID_CODES.includes(code) || INVALID_CODES.includes(code.toLowerCase()) || INVALID_CODES.includes(code.toUpperCase())
    );

    if (toRemove.length > 0) {
      // 유효한 코드만 남기기
      const validProducts = products.filter(code =>
        !INVALID_CODES.includes(code) &&
        !INVALID_CODES.includes(code.toLowerCase()) &&
        !INVALID_CODES.includes(code.toUpperCase())
      );

      // 업데이트
      const customerRef = doc(db, 'fk365_customers', docSnap.id);
      await updateDoc(customerRef, { products: validProducts });

      console.log(`\n✓ ${customer.code}: ${toRemove.length}개 제거`);
      console.log(`  제거된 코드: ${toRemove.join(', ')}`);
      console.log(`  남은 제품 수: ${validProducts.length}개`);

      totalRemoved += toRemove.length;
    }
  }

  console.log('\n' + '━'.repeat(50));
  console.log(`🎉 정리 완료! 총 ${totalRemoved}개 코드 제거됨`);

  process.exit(0);
}

cleanupInvalidProducts().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
