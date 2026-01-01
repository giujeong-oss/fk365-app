// FK365 실제 데이터 시드 스크립트
// 실행: node scripts/seed-data.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  VENDORS: 'fk365_vendors',
  PRODUCTS: 'fk365_products',
  CUSTOMERS: 'fk365_customers',
  MARGINS: 'fk365_margins',
  CUSTOMER_PRODUCT_ADJ: 'fk365_customerProductAdj',
};

// CSV 파싱 함수
function parseCSV(content) {
  const lines = content.trim().split('\n');
  // BOM 제거
  if (lines[0].charCodeAt(0) === 0xFEFF) {
    lines[0] = lines[0].slice(1);
  }
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });
      data.push(row);
    }
  }
  return data;
}

// 파일 읽기
function readCSV(filename) {
  const filePath = join(__dirname, '..', 'output', filename);
  const content = readFileSync(filePath, 'utf-8');
  return parseCSV(content);
}

// ============================================
// 구매처 시드
// ============================================
async function seedVendors() {
  console.log('📦 구매처 데이터 등록 중...');
  const vendors = readCSV('vendors_utf8.csv');
  let count = 0;

  for (const vendor of vendors) {
    if (!vendor.vendor_code) continue;

    const docRef = doc(db, COLLECTIONS.VENDORS, vendor.vendor_code);
    await setDoc(docRef, {
      code: vendor.vendor_code,
      name: vendor.vendor_name || vendor.vendor_code,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    count++;
    process.stdout.write(`\r  등록: ${count}/${vendors.length}`);
  }
  console.log(`\n✅ 구매처 ${count}개 등록 완료\n`);
}

// ============================================
// 제품 시드
// ============================================
async function seedProducts() {
  console.log('🥬 제품 데이터 등록 중...');

  // 제품 기본 정보
  const products = readCSV('products.csv');
  // 제품-구매처 매핑
  const productVendors = readCSV('product_vendors.csv');
  // 매입가 정보
  const buyPrices = readCSV('buy_prices_multilang.csv');
  // 마진(판매가) 정보
  const margins = readCSV('margins_pivot.csv');

  // 매핑 객체 생성
  const vendorMap = {};
  productVendors.forEach(pv => {
    if (pv.product_code) {
      vendorMap[pv.product_code] = pv.vendor_code;
    }
  });

  const buyPriceMap = {};
  buyPrices.forEach(bp => {
    if (bp.code) {
      buyPriceMap[bp.code] = parseFloat(bp.buy_price) || 0;
    }
  });

  const marginMap = {};
  margins.forEach(m => {
    if (m.code) {
      marginMap[m.code] = {
        S: parseFloat(m.S) || 0,
        A: parseFloat(m.A) || 0,
        B: parseFloat(m.B) || 0,
        C: parseFloat(m.C) || 0,
        D: parseFloat(m.D) || 0,
        E: parseFloat(m.E) || 0,
      };
    }
  });

  let count = 0;
  for (const product of products) {
    if (!product.code) continue;

    // priceType 결정 (카테고리 기반)
    const freshCategories = ['Vegetable', 'Fruit', 'Seafood', 'Chicken'];
    const priceType = freshCategories.includes(product.category) ? 'fresh' : 'industrial';

    const docRef = doc(db, COLLECTIONS.PRODUCTS, product.code);
    await setDoc(docRef, {
      code: product.code,
      name_ko: product.name_ko || '',
      name_th: product.name_th || '',
      name_mm: product.name_mm || '',
      name_en: product.name_en || '',
      unit: product.unit || 'kg',
      color: product.color || '',
      category: product.category || '',
      priceType: priceType,
      vendorCode: vendorMap[product.code] || '',
      pur: buyPriceMap[product.code] || 0,
      // 등급별 판매가
      prices: marginMap[product.code] || {},
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    count++;
    process.stdout.write(`\r  등록: ${count}/${products.length}`);
  }
  console.log(`\n✅ 제품 ${count}개 등록 완료\n`);
}

// ============================================
// 고객 시드
// ============================================
async function seedCustomers() {
  console.log('👥 고객 데이터 등록 중...');

  const customers = readCSV('customers_v2.csv');
  const customerProducts = readCSV('customer_products.csv');

  // 고객별 제품 매핑
  const productMap = {};
  customerProducts.forEach(cp => {
    if (!productMap[cp.customer_code]) {
      productMap[cp.customer_code] = [];
    }
    productMap[cp.customer_code].push(cp.product_code);
  });

  let count = 0;
  for (const customer of customers) {
    if (!customer.code) continue;

    // 등급 결정 (grade_final 우선, 없으면 grade, 기본 B)
    const grade = customer.grade_final || customer.grade || 'B';

    const docRef = doc(db, COLLECTIONS.CUSTOMERS, customer.code);
    await setDoc(docRef, {
      code: customer.code,
      fullName: customer.full_name || customer.code,
      grade: grade,
      region: 'bangkok', // 기본값
      deliveryTime: customer.delivery_time || '',
      products: productMap[customer.code] || [],
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    count++;
    process.stdout.write(`\r  등록: ${count}/${customers.length}`);
  }
  console.log(`\n✅ 고객 ${count}개 등록 완료\n`);
}

// ============================================
// 마진 설정 시드
// ============================================
async function seedMargins() {
  console.log('💰 마진 설정 등록 중...');

  // CLAUDE.md 기준 마진 설정
  const margins = [
    // 신선제품 마진 (바트 고정)
    { id: 'fresh_S', type: 'fresh', grade: 'S', marginBaht: 5, formula: 'buyPrice + 5' },
    { id: 'fresh_A', type: 'fresh', grade: 'A', marginBaht: 8, formula: 'buyPrice + 8' },
    { id: 'fresh_B', type: 'fresh', grade: 'B', marginBaht: 10, formula: 'buyPrice + 10' },
    { id: 'fresh_C', type: 'fresh', grade: 'C', marginBaht: 12, formula: 'buyPrice + 12' },
    { id: 'fresh_D', type: 'fresh', grade: 'D', marginBaht: 15, formula: 'buyPrice + 15' },
    { id: 'fresh_E', type: 'fresh', grade: 'E', marginBaht: 8, formula: 'buyPrice + 8' },

    // 공산품 마진 (% 계산)
    { id: 'industrial_S', type: 'industrial', grade: 'S', purMultiplier: 1.05, minMultiplier: 0.75, formula: 'MAX(Pur×1.05, Min×0.75)' },
    { id: 'industrial_A', type: 'industrial', grade: 'A', purMultiplier: 1.10, minMultiplier: 0.85, formula: 'MAX(Pur×1.10, Min×0.85)' },
    { id: 'industrial_B', type: 'industrial', grade: 'B', purMultiplier: 1.15, minMultiplier: 0.90, formula: 'MAX(Pur×1.15, Min×0.90)' },
    { id: 'industrial_C', type: 'industrial', grade: 'C', purMultiplier: 1.20, minMultiplier: 0.93, formula: 'MAX(Pur×1.20, Min×0.93)' },
    { id: 'industrial_D', type: 'industrial', grade: 'D', midMultiplier: 0.95, minMarginCheck: 1.30, formula: 'Mid×0.95 (마진 30%↑ 시)' },
    { id: 'industrial_E', type: 'industrial', grade: 'E', purMultiplier: 1.10, minMultiplier: 0.85, formula: 'MAX(Pur×1.10, Min×0.85)' },
  ];

  for (const margin of margins) {
    const docRef = doc(db, COLLECTIONS.MARGINS, margin.id);
    await setDoc(docRef, {
      ...margin,
      updatedAt: Timestamp.now(),
    });
    console.log(`  ✓ ${margin.id}: ${margin.formula}`);
  }
  console.log(`✅ 마진 설정 ${margins.length}개 등록 완료\n`);
}

// ============================================
// 메인 실행
// ============================================
async function main() {
  console.log('🚀 FK365 실제 데이터 시드 시작\n');
  console.log('━'.repeat(50));

  try {
    await seedVendors();
    await seedProducts();
    await seedCustomers();
    await seedMargins();

    console.log('━'.repeat(50));
    console.log('🎉 모든 데이터 등록 완료!');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error('\n⚠️  Firebase 규칙을 확인해주세요:');
    console.error('   https://console.firebase.google.com/project/fk365-e8f90/firestore/rules');
    console.error('\n   테스트용 규칙:');
    console.error('   rules_version = \'2\';');
    console.error('   service cloud.firestore {');
    console.error('     match /databases/{database}/documents {');
    console.error('       match /{document=**} {');
    console.error('         allow read, write: if true;');
    console.error('       }');
    console.error('     }');
    console.error('   }');
    process.exit(1);
  }
}

main();
