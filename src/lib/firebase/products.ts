// FK365 Products Firestore Service
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
import type { Product, PriceType } from '@/types';

const getDb = () => {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다.');
  return db;
};

// 모든 제품 조회
export async function getProducts(activeOnly = true): Promise<Product[]> {
  const productsRef = collection(getDb(), FK365_COLLECTIONS.PRODUCTS);
  let q = query(productsRef, orderBy('code', 'asc'));

  if (activeOnly) {
    q = query(productsRef, where('isActive', '==', true), orderBy('code', 'asc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  })) as Product[];
}

// 카테고리별 제품 조회
export async function getProductsByCategory(category: string): Promise<Product[]> {
  const productsRef = collection(getDb(), FK365_COLLECTIONS.PRODUCTS);
  const q = query(
    productsRef,
    where('isActive', '==', true),
    where('category', '==', category),
    orderBy('code', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  })) as Product[];
}

// 구매처별 제품 조회
export async function getProductsByVendor(vendorCode: string): Promise<Product[]> {
  const productsRef = collection(getDb(), FK365_COLLECTIONS.PRODUCTS);
  const q = query(
    productsRef,
    where('isActive', '==', true),
    where('vendorCode', '==', vendorCode),
    orderBy('code', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  })) as Product[];
}

// 가격 유형별 제품 조회
export async function getProductsByPriceType(priceType: PriceType): Promise<Product[]> {
  const productsRef = collection(getDb(), FK365_COLLECTIONS.PRODUCTS);
  const q = query(
    productsRef,
    where('isActive', '==', true),
    where('priceType', '==', priceType),
    orderBy('code', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  })) as Product[];
}

// 단일 제품 조회
export async function getProduct(id: string): Promise<Product | null> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.PRODUCTS, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as Product;
}

// 제품 코드로 조회
export async function getProductByCode(code: string): Promise<Product | null> {
  const productsRef = collection(getDb(), FK365_COLLECTIONS.PRODUCTS);
  const q = query(productsRef, where('code', '==', code));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as Product;
}

// 제품 코드 중복 확인
export async function isProductCodeExists(code: string, excludeId?: string): Promise<boolean> {
  const productsRef = collection(getDb(), FK365_COLLECTIONS.PRODUCTS);
  const q = query(productsRef, where('code', '==', code));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return false;
  if (excludeId && snapshot.docs[0].id === excludeId) return false;

  return true;
}

// 제품 생성
export async function createProduct(
  data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  // 코드 중복 확인
  const exists = await isProductCodeExists(data.code);
  if (exists) {
    throw new Error('이미 존재하는 제품 코드입니다.');
  }

  const productsRef = collection(getDb(), FK365_COLLECTIONS.PRODUCTS);
  const docRef = await addDoc(productsRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

// 제품 수정
export async function updateProduct(
  id: string,
  data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  // 코드 변경 시 중복 확인
  if (data.code) {
    const exists = await isProductCodeExists(data.code, id);
    if (exists) {
      throw new Error('이미 존재하는 제품 코드입니다.');
    }
  }

  const docRef = doc(getDb(), FK365_COLLECTIONS.PRODUCTS, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// 제품 삭제 (soft delete)
export async function deleteProduct(id: string): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.PRODUCTS, id);
  await updateDoc(docRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

// 제품 완전 삭제 (hard delete)
export async function hardDeleteProduct(id: string): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.PRODUCTS, id);
  await deleteDoc(docRef);
}

// 모든 카테고리 목록 조회
export async function getCategories(): Promise<string[]> {
  const products = await getProducts(true);
  const categories = new Set<string>();

  products.forEach((product) => {
    if (product.category) {
      categories.add(product.category);
    }
  });

  return Array.from(categories).sort();
}
