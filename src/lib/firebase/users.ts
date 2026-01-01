// FK365 Users Firestore Service
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, FK365_COLLECTIONS } from './config';
import type { User, UserRole, UserPermissions } from '@/types';

const getDb = () => {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다.');
  return db;
};

// 모든 사용자 조회
export async function getUsers(): Promise<User[]> {
  const usersRef = collection(getDb(), FK365_COLLECTIONS.USERS);
  const q = query(usersRef, orderBy('email', 'asc'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  })) as User[];
}

// 단일 사용자 조회
export async function getUser(id: string): Promise<User | null> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.USERS, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as User;
}

// 사용자 역할 변경
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.USERS, userId);
  await updateDoc(docRef, {
    role,
    updatedAt: serverTimestamp(),
  });
}

// 관리자 목록 조회
export async function getAdminUsers(): Promise<User[]> {
  const users = await getUsers();
  return users.filter((u) => u.role === 'admin');
}

// 사용자 활성화/비활성화
export async function updateUserStatus(
  userId: string,
  isActive: boolean
): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.USERS, userId);
  await updateDoc(docRef, {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

// 사용자 정보 업데이트
export async function updateUser(
  userId: string,
  data: Partial<Pick<User, 'name' | 'role' | 'isActive' | 'preferredLanguage'>>
): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.USERS, userId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// 사용자 권한 업데이트
export async function updateUserPermissions(
  userId: string,
  permissions: UserPermissions
): Promise<void> {
  const docRef = doc(getDb(), FK365_COLLECTIONS.USERS, userId);
  await updateDoc(docRef, {
    permissions,
    updatedAt: serverTimestamp(),
  });
}

// 이메일 중복 확인
export async function isEmailExists(email: string): Promise<boolean> {
  const usersRef = collection(getDb(), FK365_COLLECTIONS.USERS);
  const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// 이메일로 사용자 사전 등록 (로그인 전에 미리 등록)
export async function createUserByEmail(
  email: string,
  role: UserRole = 'user',
  name?: string
): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();

  // 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error('유효하지 않은 이메일 형식입니다.');
  }

  // 중복 확인
  const exists = await isEmailExists(normalizedEmail);
  if (exists) {
    throw new Error('이미 등록된 이메일입니다.');
  }

  // 이메일 기반 ID 생성 (Firebase Auth UID 대신 사용)
  const docId = normalizedEmail.replace(/[.@]/g, '_');
  const docRef = doc(getDb(), FK365_COLLECTIONS.USERS, docId);

  await setDoc(docRef, {
    email: normalizedEmail,
    name: name || '',
    role,
    isActive: true,
    preferredLanguage: 'ko',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docId;
}
