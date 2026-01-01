// FK365 Orders Firestore Service
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
  Timestamp,
} from 'firebase/firestore';
import { db, FK365_COLLECTIONS } from './config';
import type { Order, OrderItem, Cutoff } from '@/types';

const getDb = () => {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다.');
  return db;
};

// 날짜별 주문 조회
export async function getOrdersByDate(date: Date): Promise<Order[]> {
  const ordersRef = collection(getDb(), FK365_COLLECTIONS.ORDERS);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    ordersRef,
    where('date', '>=', Timestamp.fromDate(startOfDay)),
    where('date', '<=', Timestamp.fromDate(endOfDay)),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    date: docSnap.data().date?.toDate() || new Date(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  })) as Order[];
}

// 고객별 주문 조회 (특정 날짜)
export async function getOrdersByCustomer(
  customerCode: string,
  date: Date
): Promise<Order[]> {
  const ordersRef = collection(getDb(), FK365_COLLECTIONS.ORDERS);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    ordersRef,
    where('customerCode', '==', customerCode),
    where('date', '>=', Timestamp.fromDate(startOfDay)),
    where('date', '<=', Timestamp.fromDate(endOfDay))
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    date: docSnap.data().date?.toDate() || new Date(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  })) as Order[];
}

// cutoff별 주문 조회
export async function getOrdersByCutoff(
  date: Date,
  cutoff: Cutoff
): Promise<Order[]> {
  const ordersRef = collection(getDb(), FK365_COLLECTIONS.ORDERS);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    ordersRef,
    where('cutoff', '==', cutoff),
    where('date', '>=', Timestamp.fromDate(startOfDay)),
    where('date', '<=', Timestamp.fromDate(endOfDay))
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    date: docSnap.data().date?.toDate() || new Date(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  })) as Order[];
}

// 단일 주문 조회
export async function getOrder(id: string): Promise<Order | null> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.ORDERS, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
    date: docSnap.data().date?.toDate() || new Date(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as Order;
}

// 주문 생성
export async function createOrder(
  data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ordersRef = collection(getDb(), FK365_COLLECTIONS.ORDERS);
  const docRef = await addDoc(ordersRef, {
    ...data,
    date: Timestamp.fromDate(data.date),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

// 주문 수정
export async function updateOrder(
  id: string,
  data: Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.ORDERS, id);
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (data.date) {
    updateData.date = Timestamp.fromDate(data.date);
  }

  await updateDoc(docRef, updateData);
}

// 주문 아이템 업데이트
export async function updateOrderItems(
  id: string,
  items: OrderItem[],
  totalAmount: number
): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.ORDERS, id);
  await updateDoc(docRef, {
    items,
    totalAmount,
    updatedAt: serverTimestamp(),
  });
}

// 주문 삭제
export async function deleteOrder(id: string): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.ORDERS, id);
  await deleteDoc(docRef);
}

// 주문 확정
export async function confirmOrder(id: string): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.ORDERS, id);
  await updateDoc(docRef, {
    status: 'confirmed',
    updatedAt: serverTimestamp(),
  });
}

// 제품별 주문 합계 (발주용)
export async function getOrderSummaryByProduct(
  date: Date,
  cutoff?: Cutoff
): Promise<Map<string, number>> {
  let orders: Order[];

  if (cutoff) {
    orders = await getOrdersByCutoff(date, cutoff);
  } else {
    orders = await getOrdersByDate(date);
  }

  const summary = new Map<string, number>();

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const current = summary.get(item.productCode) || 0;
      summary.set(item.productCode, current + item.qty);
    });
  });

  return summary;
}

// cutoff별 주문 합계 조회
export async function getCutoffSummary(date: Date): Promise<{
  cut1: number;
  cut2: number;
  cut3: number;
  total: number;
}> {
  const orders = await getOrdersByDate(date);

  const summary = { cut1: 0, cut2: 0, cut3: 0, total: 0 };

  orders.forEach((order) => {
    if (order.cutoff === 1) summary.cut1 += order.totalAmount;
    else if (order.cutoff === 2) summary.cut2 += order.totalAmount;
    else if (order.cutoff === 3) summary.cut3 += order.totalAmount;
    summary.total += order.totalAmount;
  });

  return summary;
}

// cutoff별 주문 건수 조회 (대시보드용)
export async function getOrderCountByCutoff(date: Date): Promise<{
  cut1: number;
  cut2: number;
  cut3: number;
  total: number;
}> {
  const orders = await getOrdersByDate(date);

  const counts = { cut1: 0, cut2: 0, cut3: 0, total: orders.length };

  orders.forEach((order) => {
    if (order.cutoff === 1) counts.cut1++;
    else if (order.cutoff === 2) counts.cut2++;
    else if (order.cutoff === 3) counts.cut3++;
  });

  return counts;
}
