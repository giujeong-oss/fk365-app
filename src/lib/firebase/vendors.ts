// FK365 Vendors Firestore Service
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, FK365_COLLECTIONS } from './config';
import type { Vendor } from '@/types';

const getDb = () => {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다.');
  return db;
};

// 모든 구매처 조회
export async function getVendors(activeOnly = true): Promise<Vendor[]> {
  const vendorsRef = collection(getDb(), FK365_COLLECTIONS.VENDORS);
  let q = query(vendorsRef, orderBy('code', 'asc'));

  if (activeOnly) {
    q = query(vendorsRef, where('isActive', '==', true), orderBy('code', 'asc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  })) as Vendor[];
}

// 단일 구매처 조회
export async function getVendor(id: string): Promise<Vendor | null> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.VENDORS, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as Vendor;
}

// 구매처 코드로 조회
export async function getVendorByCode(code: string): Promise<Vendor | null> {
  const vendorsRef = collection(getDb(), FK365_COLLECTIONS.VENDORS);
  const q = query(vendorsRef, where('code', '==', code));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as Vendor;
}

// 구매처 코드 중복 확인
export async function isVendorCodeExists(code: string, excludeId?: string): Promise<boolean> {
  const vendorsRef = collection(getDb(), FK365_COLLECTIONS.VENDORS);
  const q = query(vendorsRef, where('code', '==', code));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return false;
  if (excludeId && snapshot.docs[0].id === excludeId) return false;

  return true;
}

// 구매처 생성
export async function createVendor(
  data: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  // 코드 중복 확인
  const exists = await isVendorCodeExists(data.code);
  if (exists) {
    throw new Error('이미 존재하는 구매처 코드입니다.');
  }

  const vendorsRef = collection(getDb(), FK365_COLLECTIONS.VENDORS);
  const docRef = await addDoc(vendorsRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

// 구매처 수정
export async function updateVendor(
  id: string,
  data: Partial<Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  // 코드 변경 시 중복 확인
  if (data.code) {
    const exists = await isVendorCodeExists(data.code, id);
    if (exists) {
      throw new Error('이미 존재하는 구매처 코드입니다.');
    }
  }

  const docRef = doc(getDb(), FK365_COLLECTIONS.VENDORS, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// 구매처 삭제 (soft delete)
export async function deleteVendor(id: string): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.VENDORS, id);
  await updateDoc(docRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

// 구매처 완전 삭제 (hard delete)
export async function hardDeleteVendor(id: string): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.VENDORS, id);
  await deleteDoc(docRef);
}
