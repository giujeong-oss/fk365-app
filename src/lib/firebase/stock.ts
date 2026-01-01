// FK365 Stock Firestore Service
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, FK365_COLLECTIONS } from './config';
import type { Stock } from '@/types';

const getDb = () => {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다.');
  return db;
};

// 모든 재고 조회
export async function getAllStock(): Promise<Stock[]> {
  const stockRef = collection(getDb(), FK365_COLLECTIONS.STOCK);
  const q = query(stockRef, orderBy('code', 'asc'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  })) as Stock[];
}

// 특정 제품 재고 조회
export async function getStock(productCode: string): Promise<Stock | null> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.STOCK, productCode);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as Stock;
}

// 재고 수량 가져오기 (없으면 0)
export async function getStockQty(productCode: string): Promise<number> {
  const stock = await getStock(productCode);
  return stock?.qty ?? 0;
}

// 재고 설정 (생성 또는 업데이트)
export async function setStock(productCode: string, qty: number): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.STOCK, productCode);
  await setDoc(docRef, {
    code: productCode,
    qty,
    updatedAt: serverTimestamp(),
  });
}

// 재고 수정
export async function updateStockQty(productCode: string, qty: number): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.STOCK, productCode);
  await updateDoc(docRef, {
    qty,
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    // 문서가 없으면 생성
    await setStock(productCode, qty);
  });
}

// 재고 증가
export async function increaseStock(productCode: string, amount: number): Promise<void> {
  const current = await getStockQty(productCode);
  await setStock(productCode, current + amount);
}

// 재고 감소
export async function decreaseStock(productCode: string, amount: number): Promise<void> {
  const current = await getStockQty(productCode);
  const newQty = Math.max(0, current - amount);
  await setStock(productCode, newQty);
}

// 여러 제품 재고 일괄 업데이트
export async function batchUpdateStock(
  items: Array<{ productCode: string; qty: number }>
): Promise<void> {
  const batch = writeBatch(getDb());

  items.forEach((item) => {
    const docRef = doc(getDb(), FK365_COLLECTIONS.STOCK, item.productCode);
    batch.set(docRef, {
      code: item.productCode,
      qty: item.qty,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

// 재고 맵 조회 (productCode -> qty)
export async function getStockMap(): Promise<Map<string, number>> {
  const stocks = await getAllStock();
  const map = new Map<string, number>();

  stocks.forEach((stock) => {
    map.set(stock.code, stock.qty);
  });

  return map;
}
