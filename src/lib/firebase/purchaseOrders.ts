// FK365 Purchase Orders Firestore Service
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
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage, FK365_COLLECTIONS } from './config';
import type { PurchaseOrder, PurchaseOrderItem } from '@/types';

const getDb = () => {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다.');
  return db;
};

type PurchaseOrderType = 'buy1' | 'buy2' | 'buy3';

// 날짜별 발주서 조회
export async function getPurchaseOrdersByDate(date: Date): Promise<PurchaseOrder[]> {
  const poRef = collection(getDb(), FK365_COLLECTIONS.PURCHASE_ORDERS);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    poRef,
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
  })) as PurchaseOrder[];
}

// 타입별 발주서 조회 (특정 날짜)
export async function getPurchaseOrdersByType(
  date: Date,
  type: PurchaseOrderType
): Promise<PurchaseOrder[]> {
  const poRef = collection(getDb(), FK365_COLLECTIONS.PURCHASE_ORDERS);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    poRef,
    where('type', '==', type),
    where('date', '>=', Timestamp.fromDate(startOfDay)),
    where('date', '<=', Timestamp.fromDate(endOfDay))
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    date: docSnap.data().date?.toDate() || new Date(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
  })) as PurchaseOrder[];
}

// 구매처별 발주서 조회 (buy1용)
export async function getPurchaseOrdersByVendor(
  date: Date,
  vendorCode: string
): Promise<PurchaseOrder[]> {
  const poRef = collection(getDb(), FK365_COLLECTIONS.PURCHASE_ORDERS);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    poRef,
    where('vendorCode', '==', vendorCode),
    where('date', '>=', Timestamp.fromDate(startOfDay)),
    where('date', '<=', Timestamp.fromDate(endOfDay))
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    date: docSnap.data().date?.toDate() || new Date(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
  })) as PurchaseOrder[];
}

// 단일 발주서 조회
export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.PURCHASE_ORDERS, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
    date: docSnap.data().date?.toDate() || new Date(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
  } as PurchaseOrder;
}

// 발주서 생성
export async function createPurchaseOrder(
  data: Omit<PurchaseOrder, 'id' | 'createdAt'>
): Promise<string> {
  const poRef = collection(getDb(), FK365_COLLECTIONS.PURCHASE_ORDERS);
  const docRef = await addDoc(poRef, {
    ...data,
    date: Timestamp.fromDate(data.date),
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

// 발주서 수정
export async function updatePurchaseOrder(
  id: string,
  data: Partial<Omit<PurchaseOrder, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.PURCHASE_ORDERS, id);
  const updateData: Record<string, unknown> = { ...data };

  if (data.date) {
    updateData.date = Timestamp.fromDate(data.date);
  }

  await updateDoc(docRef, updateData);
}

// 발주서 아이템 업데이트
export async function updatePurchaseOrderItems(
  id: string,
  items: PurchaseOrderItem[],
  totalAmount?: number
): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.PURCHASE_ORDERS, id);
  const updateData: Record<string, unknown> = { items };

  if (totalAmount !== undefined) {
    updateData.totalAmount = totalAmount;
  }

  await updateDoc(docRef, updateData);
}

// 발주서 삭제
export async function deletePurchaseOrder(id: string): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.PURCHASE_ORDERS, id);
  await deleteDoc(docRef);
}

// buy1 발주서 자동 생성 (cut1 - stock)
export async function generateBuy1PurchaseOrder(
  date: Date,
  vendorCode: string,
  items: Array<{
    productCode: string;
    cut1: number;
    stock: number;
  }>
): Promise<string> {
  const poItems: PurchaseOrderItem[] = items
    .filter((item) => item.cut1 - item.stock > 0)
    .map((item) => ({
      productCode: item.productCode,
      cut1: item.cut1,
      stock: item.stock,
      buyQty: item.cut1 - item.stock,
    }));

  if (poItems.length === 0) {
    throw new Error('발주할 제품이 없습니다.');
  }

  return createPurchaseOrder({
    date,
    type: 'buy1',
    vendorCode,
    items: poItems,
  });
}

// buy2 발주서 생성 (cut2 전량)
export async function generateBuy2PurchaseOrder(
  date: Date,
  items: Array<{
    productCode: string;
    qty: number;
  }>
): Promise<string> {
  const poItems: PurchaseOrderItem[] = items
    .filter((item) => item.qty > 0)
    .map((item) => ({
      productCode: item.productCode,
      buyQty: item.qty,
    }));

  if (poItems.length === 0) {
    throw new Error('발주할 제품이 없습니다.');
  }

  return createPurchaseOrder({
    date,
    type: 'buy2',
    items: poItems,
    note: '끌렁떠이 추가',
  });
}

// buy3 발주서 생성 (cut3 전량 - 긴급)
export async function generateBuy3PurchaseOrder(
  date: Date,
  items: Array<{
    productCode: string;
    qty: number;
  }>
): Promise<string> {
  const poItems: PurchaseOrderItem[] = items
    .filter((item) => item.qty > 0)
    .map((item) => ({
      productCode: item.productCode,
      buyQty: item.qty,
    }));

  if (poItems.length === 0) {
    throw new Error('발주할 제품이 없습니다.');
  }

  return createPurchaseOrder({
    date,
    type: 'buy3',
    items: poItems,
    note: '라라무브 긴급',
  });
}

// 영수증 사진 업로드
export async function uploadReceiptImage(
  purchaseOrderId: string,
  file: File
): Promise<string> {
  if (!storage) throw new Error('Storage가 초기화되지 않았습니다.');

  // 파일명 생성: receipts/{poId}/{timestamp}_{filename}
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const storagePath = `receipts/${purchaseOrderId}/${timestamp}_${sanitizedName}`;

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);

  // 발주서에 영수증 URL 저장
  await updatePurchaseOrder(purchaseOrderId, {
    receiptImageUrl: downloadUrl,
  });

  return downloadUrl;
}

// 영수증 사진 삭제
export async function deleteReceiptImage(
  purchaseOrderId: string,
  imageUrl: string
): Promise<void> {
  if (!storage) throw new Error('Storage가 초기화되지 않았습니다.');

  try {
    // URL에서 storage path 추출
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Failed to delete receipt image:', error);
  }

  // 발주서에서 영수증 URL 제거
  await updatePurchaseOrder(purchaseOrderId, {
    receiptImageUrl: undefined,
  });
}
