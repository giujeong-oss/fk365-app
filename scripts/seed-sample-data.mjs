// FK365 샘플 데이터 시드 스크립트
// 실행: node scripts/seed-sample-data.mjs

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

const COLLECTIONS = {
  VENDORS: 'fk365_vendors',
  PRODUCTS: 'fk365_products',
  CUSTOMERS: 'fk365_customers',
  STOCK: 'fk365_stock',
  MARGINS: 'fk365_margins',
};

// 샘플 구매처
const vendors = [
  { code: 'V001', name: '방콕 청과시장' },
  { code: 'V002', name: '파타야 농산물 도매' },
  { code: 'V003', name: '태국 공산품 유통' },
  { code: 'V004', name: '신선식품 직거래' },
  { code: 'V005', name: '주방용품 도매상' },
];

// 샘플 제품 (신선 + 공산품)
const products = [
  // 신선제품 (채소)
  { code: 'F001', name_ko: '양배추', name_th: 'กะหล่ำปลี', name_mm: 'ဂေါ်ဖီထုပ်', unit: 'kg', priceType: 'fresh', vendorCode: 'V001', category: '채소', pur: 25 },
  { code: 'F002', name_ko: '당근', name_th: 'แครอท', name_mm: 'မုန်လာဥနီ', unit: 'kg', priceType: 'fresh', vendorCode: 'V001', category: '채소', pur: 35 },
  { code: 'F003', name_ko: '양파', name_th: 'หัวหอมใหญ่', name_mm: 'ကြက်သွန်နီ', unit: 'kg', priceType: 'fresh', vendorCode: 'V001', category: '채소', pur: 30 },
  { code: 'F004', name_ko: '감자', name_th: 'มันฝรั่ง', name_mm: 'အာလူး', unit: 'kg', priceType: 'fresh', vendorCode: 'V002', category: '채소', pur: 28 },
  { code: 'F005', name_ko: '토마토', name_th: 'มะเขือเทศ', name_mm: 'ခရမ်းချဉ်သီး', unit: 'kg', priceType: 'fresh', vendorCode: 'V002', category: '채소', pur: 45 },
  // 신선제품 (과일)
  { code: 'F006', name_ko: '사과', name_th: 'แอปเปิ้ล', name_mm: 'ပန်းသီး', unit: 'kg', priceType: 'fresh', vendorCode: 'V004', category: '과일', pur: 120 },
  { code: 'F007', name_ko: '바나나', name_th: 'กล้วย', name_mm: 'ငှက်ပျောသီး', unit: 'bundle', priceType: 'fresh', vendorCode: 'V004', category: '과일', pur: 35 },
  { code: 'F008', name_ko: '오렌지', name_th: 'ส้ม', name_mm: 'လိမ္မော်သီး', unit: 'kg', priceType: 'fresh', vendorCode: 'V004', category: '과일', pur: 80 },
  // 공산품
  { code: 'I001', name_ko: '식용유 1L', name_th: 'น้ำมันพืช 1L', name_mm: 'စားအုန်းဆီ', unit: 'bottle', priceType: 'industrial', vendorCode: 'V003', category: '조미료', pur: 55, min: 50, mid: 60 },
  { code: 'I002', name_ko: '간장 500ml', name_th: 'ซีอิ๊ว 500ml', name_mm: 'ပဲငံပြာရည်', unit: 'bottle', priceType: 'industrial', vendorCode: 'V003', category: '조미료', pur: 45, min: 40, mid: 50 },
  { code: 'I003', name_ko: '설탕 1kg', name_th: 'น้ำตาล 1kg', name_mm: 'သကြား', unit: 'pack', priceType: 'industrial', vendorCode: 'V003', category: '조미료', pur: 35, min: 32, mid: 38 },
  { code: 'I004', name_ko: '소금 500g', name_th: 'เกลือ 500g', name_mm: 'ဆား', unit: 'pack', priceType: 'industrial', vendorCode: 'V003', category: '조미료', pur: 15, min: 12, mid: 18 },
  { code: 'I005', name_ko: '밀가루 1kg', name_th: 'แป้งสาลี 1kg', name_mm: 'ဂျုံမှုန့်', unit: 'pack', priceType: 'industrial', vendorCode: 'V003', category: '식재료', pur: 40, min: 35, mid: 45 },
  // 주방용품
  { code: 'K001', name_ko: '일회용 장갑 (100매)', name_th: 'ถุงมือพลาสติก', name_mm: 'လက်အိတ်', unit: 'box', priceType: 'industrial', vendorCode: 'V005', category: '주방용품', pur: 80, min: 70, mid: 90 },
  { code: 'K002', name_ko: '위생백 대 (50매)', name_th: 'ถุงพลาสติก', name_mm: 'ပလပ်စတစ်အိတ်', unit: 'pack', priceType: 'industrial', vendorCode: 'V005', category: '주방용품', pur: 35, min: 30, mid: 40 },
];

// 샘플 고객
const customers = [
  { code: 'C001', fullName: '파타야 레스토랑 A', grade: 'S', region: 'pattaya', products: ['F001', 'F002', 'F003', 'F004', 'F005', 'I001', 'I002'] },
  { code: 'C002', fullName: '방콕 호텔 주방', grade: 'A', region: 'bangkok', products: ['F001', 'F002', 'F003', 'F006', 'F007', 'I001', 'I003'] },
  { code: 'C003', fullName: '파타야 카페 B', grade: 'B', region: 'pattaya', products: ['F006', 'F007', 'F008', 'I002', 'I003', 'I004'] },
  { code: 'C004', fullName: '방콕 식당 C', grade: 'C', region: 'bangkok', products: ['F001', 'F003', 'F004', 'F005', 'I001', 'I002', 'I005'] },
  { code: 'C005', fullName: '파타야 리조트 D', grade: 'A', region: 'pattaya', products: ['F001', 'F002', 'F003', 'F004', 'F005', 'F006', 'F007', 'F008', 'I001', 'I002', 'I003', 'K001', 'K002'] },
];

// 마진 설정 (신선/공산품)
const margins = {
  fresh: [
    { grade: 'S', marginBaht: 5 },
    { grade: 'A', marginBaht: 8 },
    { grade: 'B', marginBaht: 10 },
    { grade: 'C', marginBaht: 12 },
    { grade: 'D', marginBaht: 15 },
    { grade: 'E', marginBaht: 18 },
  ],
  industrial: [
    { grade: 'S', purMultiplier: 1.05, minMultiplier: 0.75, formula: 'MAX(Pur*1.05, Min*0.75)' },
    { grade: 'A', purMultiplier: 1.10, minMultiplier: 0.85, formula: 'MAX(Pur*1.10, Min*0.85)' },
    { grade: 'B', purMultiplier: 1.15, minMultiplier: 0.90, formula: 'MAX(Pur*1.15, Min*0.90)' },
    { grade: 'C', purMultiplier: 1.20, minMultiplier: 0.93, formula: 'MAX(Pur*1.20, Min*0.93)' },
    { grade: 'D', purMultiplier: 1.25, minMultiplier: 0.95, midMultiplier: 0.95, formula: 'Mid*0.95' },
    { grade: 'E', purMultiplier: 1.30, minMultiplier: 1.00, formula: 'MAX(Pur*1.30, Min*1.00)' },
  ],
};

async function seedVendors() {
  console.log('📦 구매처 데이터 등록 중...');
  for (const vendor of vendors) {
    const docRef = doc(db, COLLECTIONS.VENDORS, vendor.code);
    await setDoc(docRef, {
      code: vendor.code,
      name: vendor.name,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`  ✓ ${vendor.code}: ${vendor.name}`);
  }
  console.log(`✅ 구매처 ${vendors.length}개 등록 완료\n`);
}

async function seedProducts() {
  console.log('🥬 제품 데이터 등록 중...');
  for (const product of products) {
    const docRef = doc(db, COLLECTIONS.PRODUCTS, product.code);
    await setDoc(docRef, {
      code: product.code,
      name_ko: product.name_ko,
      name_th: product.name_th,
      name_mm: product.name_mm,
      unit: product.unit,
      priceType: product.priceType,
      vendorCode: product.vendorCode,
      category: product.category,
      pur: product.pur,
      min: product.min || null,
      mid: product.mid || null,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`  ✓ ${product.code}: ${product.name_ko}`);
  }
  console.log(`✅ 제품 ${products.length}개 등록 완료\n`);
}

async function seedCustomers() {
  console.log('👥 고객 데이터 등록 중...');
  for (const customer of customers) {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, customer.code);
    await setDoc(docRef, {
      code: customer.code,
      fullName: customer.fullName,
      grade: customer.grade,
      region: customer.region,
      products: customer.products,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`  ✓ ${customer.code}: ${customer.fullName} (${customer.grade}등급, ${customer.products.length}개 제품)`);
  }
  console.log(`✅ 고객 ${customers.length}개 등록 완료\n`);
}

async function seedStock() {
  console.log('📊 재고 데이터 등록 중...');
  for (const product of products) {
    const qty = Math.floor(Math.random() * 50) + 10; // 10~60 랜덤 재고
    const minStock = Math.floor(qty * 0.3); // 30% 안전재고

    const docRef = doc(db, COLLECTIONS.STOCK, product.code);
    await setDoc(docRef, {
      code: product.code,
      qty: qty,
      minStock: minStock,
      location: ['freezer', 'fridge', 'zone-a', 'zone-b'][Math.floor(Math.random() * 4)],
      updatedAt: Timestamp.now(),
    });
    console.log(`  ✓ ${product.code}: ${qty}개 (안전재고: ${minStock})`);
  }
  console.log(`✅ 재고 ${products.length}개 등록 완료\n`);
}

async function seedMargins() {
  console.log('💰 마진 설정 등록 중...');

  // 신선제품 마진
  for (const margin of margins.fresh) {
    const docRef = doc(db, COLLECTIONS.MARGINS, `fresh_${margin.grade}`);
    await setDoc(docRef, {
      type: 'fresh',
      grade: margin.grade,
      marginBaht: margin.marginBaht,
      updatedAt: Timestamp.now(),
    });
    console.log(`  ✓ 신선 ${margin.grade}등급: +${margin.marginBaht}฿`);
  }

  // 공산품 마진
  for (const margin of margins.industrial) {
    const docRef = doc(db, COLLECTIONS.MARGINS, `industrial_${margin.grade}`);
    await setDoc(docRef, {
      type: 'industrial',
      grade: margin.grade,
      purMultiplier: margin.purMultiplier,
      minMultiplier: margin.minMultiplier,
      midMultiplier: margin.midMultiplier || null,
      formula: margin.formula,
      updatedAt: Timestamp.now(),
    });
    console.log(`  ✓ 공산품 ${margin.grade}등급: ${margin.formula}`);
  }
  console.log(`✅ 마진 설정 완료\n`);
}

async function main() {
  console.log('🚀 FK365 샘플 데이터 시드 시작\n');
  console.log('━'.repeat(50));

  try {
    await seedVendors();
    await seedProducts();
    await seedCustomers();
    await seedStock();
    await seedMargins();

    console.log('━'.repeat(50));
    console.log('🎉 모든 샘플 데이터 등록 완료!');
    console.log('\n테스트 페이지에서 확인하세요:');
    console.log('👉 https://app.freshkitchen365.com/test\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.log('\n⚠️  Firebase 규칙을 확인해주세요:');
    console.log('   https://console.firebase.google.com/project/fk365-e8f90/firestore/rules\n');
  }

  process.exit(0);
}

main();
