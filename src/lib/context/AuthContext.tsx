'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  User as FirebaseUser,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db, FK365_COLLECTIONS } from '../firebase/config';
import type { User, UserRole, UILanguage } from '@/types';

// Check if Firebase is initialized
const isFirebaseReady = () => !!auth && !!db && !!googleProvider;

// 허용된 이메일 도메인
const ALLOWED_DOMAINS = process.env.NEXT_PUBLIC_ALLOWED_DOMAINS?.split(',') || [
  'meet365.com',
  'freshkitchen365.com',
  'meet365.net',
];

// 관리자 이메일 목록
const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [
  'giujeong@freshkitchen365.com',
  'giujeong@meet365.net',
];

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 이메일 도메인 검증
  const isAllowedDomain = (email: string): boolean => {
    const domain = email.split('@')[1];
    return ALLOWED_DOMAINS.includes(domain);
  };

  // Firestore에서 사용자 정보 가져오기 또는 생성
  const getOrCreateUser = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    if (!firebaseUser.email || !db) return null;

    const userRef = doc(db, FK365_COLLECTIONS.USERS, firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      let role = userData.role as UserRole;

      // 관리자 이메일인데 role이 admin이 아니면 업데이트
      const shouldBeAdmin = ADMIN_EMAILS.includes(firebaseUser.email);
      if (shouldBeAdmin && role !== 'admin') {
        role = 'admin';
        await setDoc(userRef, { ...userData, role: 'admin', updatedAt: serverTimestamp() }, { merge: true });
      }

      return {
        id: userSnap.id,
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: userData.name || firebaseUser.displayName || '',
        role,
        preferredLanguage: userData.preferredLanguage as UILanguage || 'ko',
        createdAt: userData.createdAt?.toDate() || new Date(),
        updatedAt: userData.updatedAt?.toDate() || new Date(),
      };
    }

    // 새 사용자 생성 (관리자 이메일이면 admin, 아니면 user)
    const isAdmin = ADMIN_EMAILS.includes(firebaseUser.email);
    const newUser: Omit<User, 'id'> = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName || '',
      role: isAdmin ? 'admin' : 'user',
      preferredLanguage: 'ko',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(userRef, {
      ...newUser,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { id: firebaseUser.uid, ...newUser };
  };

  // Google 로그인
  const signIn = async () => {
    if (!auth || !googleProvider) {
      setError('Firebase가 초기화되지 않았습니다.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email;

      if (!email || !isAllowedDomain(email)) {
        await firebaseSignOut(auth);
        throw new Error('허용되지 않은 이메일 도메인입니다. 회사 이메일로 로그인해주세요.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setError(message);
      setLoading(false);
      throw err;
    }
  };

  // 로그아웃
  const signOut = async () => {
    if (!auth) return;

    try {
      await firebaseSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그아웃에 실패했습니다.';
      setError(message);
    }
  };

  // Auth 상태 변화 감지
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);

      if (fbUser && fbUser.email && isAllowedDomain(fbUser.email)) {
        setFirebaseUser(fbUser);
        try {
          const userData = await getOrCreateUser(fbUser);
          setUser(userData);
        } catch (err) {
          console.error('Failed to get user data:', err);
          setError('사용자 정보를 불러오는데 실패했습니다.');
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        error,
        signIn,
        signOut,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
