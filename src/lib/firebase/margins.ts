// FK365 Margins Firestore Service
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, FK365_COLLECTIONS } from './config';
import type { FreshMargin, IndustrialMargin, MarginHistory, Grade, PriceType } from '@/types';

const getDb = () => {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다.');
  return db;
};

// ============================================
// 신선제품 마진 (Fresh Margins)
// ============================================

// 모든 신선제품 마진 조회
export async function getFreshMargins(): Promise<FreshMargin[]> {
  const marginsRef = collection(getDb(), FK365_COLLECTIONS.MARGINS);
  const q = query(marginsRef, where('type', '==', 'fresh'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    grade: docSnap.data().grade as Grade,
    marginBaht: docSnap.data().marginBaht,
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  }));
}

// 특정 등급 신선제품 마진 조회
export async function getFreshMargin(grade: Grade): Promise<FreshMargin | null> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.MARGINS, `fresh_${grade}`);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    grade: docSnap.data().grade as Grade,
    marginBaht: docSnap.data().marginBaht,
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  };
}

// 신선제품 마진 설정
export async function setFreshMargin(
  grade: Grade,
  marginBaht: number,
  changedBy: string,
  changedByEmail: string,
  changedByName?: string
): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.MARGINS, `fresh_${grade}`);
  const existing = await getFreshMargin(grade);

  // 변경 히스토리 기록
  if (existing && existing.marginBaht !== marginBaht) {
    await addMarginHistory({
      type: 'fresh',
      grade,
      field: 'marginBaht',
      oldValue: existing.marginBaht,
      newValue: marginBaht,
      changedBy,
      changedByEmail,
      changedByName,
    });
  }

  await setDoc(docRef, {
    type: 'fresh',
    grade,
    marginBaht,
    updatedAt: serverTimestamp(),
  });
}

// 기본 신선제품 마진 초기화
export async function initializeFreshMargins(): Promise<void> {
  const defaults: Record<Grade, number> = {
    S: 5,
    A: 8,
    B: 10,
    C: 12,
    D: 15,
    E: 18,
  };

  for (const [grade, marginBaht] of Object.entries(defaults)) {
    const existing = await getFreshMargin(grade as Grade);
    if (!existing) {
      const docRef = doc(getDb(), FK365_COLLECTIONS.MARGINS, `fresh_${grade}`);
      await setDoc(docRef, {
        type: 'fresh',
        grade,
        marginBaht,
        updatedAt: serverTimestamp(),
      });
    }
  }
}

// ============================================
// 공산품 마진 (Industrial Margins)
// ============================================

// 모든 공산품 마진 조회
export async function getIndustrialMargins(): Promise<IndustrialMargin[]> {
  const marginsRef = collection(getDb(), FK365_COLLECTIONS.MARGINS);
  const q = query(marginsRef, where('type', '==', 'industrial'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    grade: docSnap.data().grade as Grade,
    purMultiplier: docSnap.data().purMultiplier,
    minMultiplier: docSnap.data().minMultiplier,
    midMultiplier: docSnap.data().midMultiplier,
    minMarginCheck: docSnap.data().minMarginCheck,
    formula: docSnap.data().formula,
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  }));
}

// 특정 등급 공산품 마진 조회
export async function getIndustrialMargin(grade: Grade): Promise<IndustrialMargin | null> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.MARGINS, `industrial_${grade}`);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    grade: docSnap.data().grade as Grade,
    purMultiplier: docSnap.data().purMultiplier,
    minMultiplier: docSnap.data().minMultiplier,
    midMultiplier: docSnap.data().midMultiplier,
    minMarginCheck: docSnap.data().minMarginCheck,
    formula: docSnap.data().formula,
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  };
}

// 공산품 마진 설정
export async function setIndustrialMargin(
  grade: Grade,
  data: Omit<IndustrialMargin, 'grade' | 'updatedAt'>,
  changedBy: string,
  changedByEmail: string,
  changedByName?: string
): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.MARGINS, `industrial_${grade}`);
  const existing = await getIndustrialMargin(grade);

  // 변경 히스토리 기록
  if (existing) {
    const fields = ['purMultiplier', 'minMultiplier', 'midMultiplier', 'minMarginCheck'] as const;
    for (const field of fields) {
      if (data[field] !== undefined && existing[field] !== data[field]) {
        await addMarginHistory({
          type: 'industrial',
          grade,
          field,
          oldValue: existing[field] || 0,
          newValue: data[field] || 0,
          changedBy,
          changedByEmail,
          changedByName,
        });
      }
    }
  }

  await setDoc(docRef, {
    type: 'industrial',
    grade,
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// 기본 공산품 마진 초기화
export async function initializeIndustrialMargins(): Promise<void> {
  const defaults: Record<Grade, Omit<IndustrialMargin, 'grade' | 'updatedAt'>> = {
    S: { purMultiplier: 1.08, minMultiplier: 0, formula: 'Pur × 1.08' },
    A: { purMultiplier: 1.10, minMultiplier: 0, formula: 'Pur × 1.10' },
    B: { purMultiplier: 1.12, minMultiplier: 0, formula: 'Pur × 1.12' },
    C: { purMultiplier: 1.15, minMultiplier: 0, formula: 'Pur × 1.15' },
    D: { purMultiplier: 0, minMultiplier: 1.0, midMultiplier: 1.0, minMarginCheck: 5, formula: 'max(Min, Mid) - 재협상' },
    E: { purMultiplier: 1.20, minMultiplier: 0, formula: 'Pur × 1.20' },
  };

  for (const [grade, data] of Object.entries(defaults)) {
    const existing = await getIndustrialMargin(grade as Grade);
    if (!existing) {
      const docRef = doc(getDb(), FK365_COLLECTIONS.MARGINS, `industrial_${grade}`);
      await setDoc(docRef, {
        type: 'industrial',
        grade,
        ...data,
        updatedAt: serverTimestamp(),
      });
    }
  }
}

// ============================================
// 마진 변경 히스토리 (Margin History)
// ============================================

// 마진 히스토리 추가
async function addMarginHistory(data: Omit<MarginHistory, 'id' | 'changedAt'>): Promise<void> {
  const historyRef = collection(getDb(), FK365_COLLECTIONS.MARGIN_HISTORY);
  await addDoc(historyRef, {
    ...data,
    changedAt: serverTimestamp(),
  });
}

// 마진 히스토리 조회
export async function getMarginHistory(
  type?: PriceType,
  grade?: Grade,
  limit: number = 50
): Promise<MarginHistory[]> {
  const historyRef = collection(getDb(), FK365_COLLECTIONS.MARGIN_HISTORY);
  let q = query(historyRef, orderBy('changedAt', 'desc'));

  if (type) {
    q = query(historyRef, where('type', '==', type), orderBy('changedAt', 'desc'));
  }

  const snapshot = await getDocs(q);
  let results = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    type: docSnap.data().type as PriceType,
    grade: docSnap.data().grade as Grade,
    field: docSnap.data().field,
    oldValue: docSnap.data().oldValue,
    newValue: docSnap.data().newValue,
    reason: docSnap.data().reason,
    changedBy: docSnap.data().changedBy,
    changedByEmail: docSnap.data().changedByEmail,
    changedByName: docSnap.data().changedByName,
    changedAt: docSnap.data().changedAt?.toDate() || new Date(),
  }));

  if (grade) {
    results = results.filter((r) => r.grade === grade);
  }

  return results.slice(0, limit);
}

// ============================================
// 마진 맵 조회 (빠른 접근용)
// ============================================

export async function getFreshMarginMap(): Promise<Map<Grade, number>> {
  const margins = await getFreshMargins();
  const map = new Map<Grade, number>();
  margins.forEach((m) => map.set(m.grade, m.marginBaht));
  return map;
}

export async function getIndustrialMarginMap(): Promise<Map<Grade, IndustrialMargin>> {
  const margins = await getIndustrialMargins();
  const map = new Map<Grade, IndustrialMargin>();
  margins.forEach((m) => map.set(m.grade, m));
  return map;
}
