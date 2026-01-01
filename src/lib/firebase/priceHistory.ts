// FK365 Price History Firestore Service
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
} from 'firebase/firestore';
import { db, FK365_COLLECTIONS } from './config';
import type { PriceHistory } from '@/types';

const getDb = () => {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다.');
  return db;
};

// 날짜 포맷 (YYYY-MM-DD)
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 모든 가격 히스토리 조회
export async function getAllPriceHistory(): Promise<PriceHistory[]> {
  const phRef = collection(getDb(), FK365_COLLECTIONS.PRICE_HISTORY);
  const q = query(phRef, orderBy('code', 'asc'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as PriceHistory[];
}

// 특정 제품 가격 히스토리 조회
export async function getPriceHistory(productCode: string): Promise<PriceHistory | null> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.PRICE_HISTORY, productCode);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as PriceHistory;
}

// 특정 날짜 매입가 조회
export async function getPriceForDate(
  productCode: string,
  date: Date
): Promise<number | null> {
  const history = await getPriceHistory(productCode);
  if (!history) return null;

  const dateKey = formatDate(date);
  return history.prices[dateKey] ?? null;
}

// 매입가 설정 (특정 날짜)
export async function setPrice(
  productCode: string,
  date: Date,
  price: number
): Promise<void> {
  const dateKey = formatDate(date);
  const docRef = doc(getDb(), FK365_COLLECTIONS.PRICE_HISTORY, productCode);

  const existing = await getPriceHistory(productCode);

  if (existing) {
    // 기존 문서 업데이트
    const newPrices = { ...existing.prices, [dateKey]: price };
    const max3day = calculateMax3Day(newPrices, date);

    await updateDoc(docRef, {
      prices: newPrices,
      max3day,
    });
  } else {
    // 새 문서 생성
    await setDoc(docRef, {
      code: productCode,
      prices: { [dateKey]: price },
      max3day: price,
    });
  }
}

// 3일 최고가 계산
function calculateMax3Day(prices: Record<string, number>, referenceDate: Date): number {
  const dates: string[] = [];

  for (let i = 0; i < 3; i++) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    dates.push(formatDate(d));
  }

  let maxPrice = 0;
  dates.forEach((dateKey) => {
    if (prices[dateKey] && prices[dateKey] > maxPrice) {
      maxPrice = prices[dateKey];
    }
  });

  return maxPrice;
}

// 3일 최고가 조회
export async function getMax3DayPrice(
  productCode: string,
  date: Date = new Date()
): Promise<number> {
  const history = await getPriceHistory(productCode);
  if (!history) return 0;

  return calculateMax3Day(history.prices, date);
}

// 최근 N일 가격 조회
export async function getRecentPrices(
  productCode: string,
  days: number = 7,
  referenceDate: Date = new Date()
): Promise<Array<{ date: string; price: number }>> {
  const history = await getPriceHistory(productCode);
  if (!history) return [];

  const result: Array<{ date: string; price: number }> = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    const dateKey = formatDate(d);

    if (history.prices[dateKey] !== undefined) {
      result.push({ date: dateKey, price: history.prices[dateKey] });
    }
  }

  return result;
}

// 오늘 매입가 조회
export async function getTodayPrice(productCode: string): Promise<number | null> {
  return getPriceForDate(productCode, new Date());
}

// 오늘 매입가 설정
export async function setTodayPrice(productCode: string, price: number): Promise<void> {
  return setPrice(productCode, new Date(), price);
}
