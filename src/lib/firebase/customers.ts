// FK365 Customers Firestore Service
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
  writeBatch,
} from 'firebase/firestore';
import { db, FK365_COLLECTIONS } from './config';
import type { Customer, Grade, Region, CustomerProductAdj } from '@/types';

const getDb = () => {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다.');
  return db;
};

// 모든 고객 조회
export async function getCustomers(activeOnly = true): Promise<Customer[]> {
  const customersRef = collection(getDb(), FK365_COLLECTIONS.CUSTOMERS);
  let q = query(customersRef, orderBy('code', 'asc'));

  if (activeOnly) {
    q = query(customersRef, where('isActive', '==', true), orderBy('code', 'asc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  })) as Customer[];
}

// 지역별 고객 조회
export async function getCustomersByRegion(region: Region): Promise<Customer[]> {
  const customersRef = collection(getDb(), FK365_COLLECTIONS.CUSTOMERS);
  const q = query(
    customersRef,
    where('isActive', '==', true),
    where('region', '==', region),
    orderBy('code', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  })) as Customer[];
}

// 등급별 고객 조회
export async function getCustomersByGrade(grade: Grade): Promise<Customer[]> {
  const customersRef = collection(getDb(), FK365_COLLECTIONS.CUSTOMERS);
  const q = query(
    customersRef,
    where('isActive', '==', true),
    where('grade', '==', grade),
    orderBy('code', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  })) as Customer[];
}

// 단일 고객 조회
export async function getCustomer(id: string): Promise<Customer | null> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.CUSTOMERS, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as Customer;
}

// 고객 코드로 조회
export async function getCustomerByCode(code: string): Promise<Customer | null> {
  const customersRef = collection(getDb(), FK365_COLLECTIONS.CUSTOMERS);
  const q = query(customersRef, where('code', '==', code));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as Customer;
}

// 고객 코드 중복 확인
export async function isCustomerCodeExists(code: string, excludeId?: string): Promise<boolean> {
  const customersRef = collection(getDb(), FK365_COLLECTIONS.CUSTOMERS);
  const q = query(customersRef, where('code', '==', code));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return false;
  if (excludeId && snapshot.docs[0].id === excludeId) return false;

  return true;
}

// 고객 생성
export async function createCustomer(
  data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  // 코드 중복 확인
  const exists = await isCustomerCodeExists(data.code);
  if (exists) {
    throw new Error('이미 존재하는 고객 코드입니다.');
  }

  const customersRef = collection(getDb(), FK365_COLLECTIONS.CUSTOMERS);
  const docRef = await addDoc(customersRef, {
    ...data,
    prevGrade: data.grade, // 초기 등급 저장
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

// 고객 수정
export async function updateCustomer(
  id: string,
  data: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  // 코드 변경 시 중복 확인
  if (data.code) {
    const exists = await isCustomerCodeExists(data.code, id);
    if (exists) {
      throw new Error('이미 존재하는 고객 코드입니다.');
    }
  }

  // 등급 변경 시 adj 초기화
  if (data.grade) {
    const customer = await getCustomer(id);
    if (customer && customer.grade !== data.grade) {
      await resetCustomerProductAdj(customer.code, customer.grade, data.grade);
      data.prevGrade = customer.grade;
    }
  }

  const docRef = doc(getDb(), FK365_COLLECTIONS.CUSTOMERS, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// 고객 삭제 (soft delete)
export async function deleteCustomer(id: string): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.CUSTOMERS, id);
  await updateDoc(docRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

// 고객 완전 삭제 (hard delete)
export async function hardDeleteCustomer(id: string): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.CUSTOMERS, id);
  await deleteDoc(docRef);
}

// ============================================
// 고객별 제품 adj 관련
// ============================================

// 고객의 모든 제품 adj 조회
export async function getCustomerProductAdjs(customerCode: string): Promise<CustomerProductAdj[]> {
  const customerProductAdjRef = collection(getDb(), FK365_COLLECTIONS.CUSTOMER_PRODUCT_ADJ);
  const q = query(customerProductAdjRef, where('customerCode', '==', customerCode));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
    resetAt: docSnap.data().resetAt?.toDate(),
  })) as CustomerProductAdj[];
}

// 특정 고객-제품 adj 조회
export async function getCustomerProductAdj(
  customerCode: string,
  productCode: string
): Promise<CustomerProductAdj | null> {
  const docId = `${customerCode}_${productCode}`;
  const docRef = doc(getDb(), FK365_COLLECTIONS.CUSTOMER_PRODUCT_ADJ, docId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
    resetAt: docSnap.data().resetAt?.toDate(),
  } as CustomerProductAdj;
}

// 고객-제품 adj 설정/수정
export async function setCustomerProductAdj(
  customerCode: string,
  productCode: string,
  adj: number,
  currentGrade: Grade
): Promise<void> {
  const docId = `${customerCode}_${productCode}`;
  const docRef = doc(getDb(), FK365_COLLECTIONS.CUSTOMER_PRODUCT_ADJ, docId);
  const customerProductAdjRef = collection(getDb(), FK365_COLLECTIONS.CUSTOMER_PRODUCT_ADJ);

  await updateDoc(docRef, {
    customerCode,
    productCode,
    adj,
    gradeAtSet: currentGrade,
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    // 문서가 없으면 생성
    await addDoc(customerProductAdjRef, {
      customerCode,
      productCode,
      adj,
      gradeAtSet: currentGrade,
      updatedAt: serverTimestamp(),
    });
  });
}

// 등급 변경 시 해당 고객의 모든 adj 초기화
export async function resetCustomerProductAdj(
  customerCode: string,
  oldGrade: Grade,
  newGrade: Grade
): Promise<void> {
  const customerProductAdjRef = collection(getDb(), FK365_COLLECTIONS.CUSTOMER_PRODUCT_ADJ);
  const q = query(customerProductAdjRef, where('customerCode', '==', customerCode));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  const batch = writeBatch(getDb());

  snapshot.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, {
      adj: 0,
      resetReason: `등급 변경: ${oldGrade} → ${newGrade}`,
      resetAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

// 고객 제품 목록 업데이트
export async function updateCustomerProducts(
  customerId: string,
  productCodes: string[]
): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.CUSTOMERS, customerId);
  await updateDoc(docRef, {
    products: productCodes,
    updatedAt: serverTimestamp(),
  });
}
