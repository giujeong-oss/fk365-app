'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context';
import { Apple, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, error, signIn } = useAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // 이미 로그인되어 있으면 대시보드로 리다이렉트
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setLocalError(null);

    try {
      await signIn();
      router.push('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setLocalError(message);
    } finally {
      setIsSigningIn(false);
    }
  };

  // 로딩 중일 때
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 이미 로그인된 경우
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-2xl mb-4 shadow-lg">
            <Apple className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">FK365</h1>
          <p className="text-gray-600 mt-2">Fresh Kitchen 365</p>
          <p className="text-sm text-gray-500 mt-1">
            채소/과일/식자재 주문-발주-재고-배송 통합 관리
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-center text-gray-800 mb-6">
            로그인
          </h2>

          {/* Error Message */}
          {(localError || error) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {localError || error}
            </div>
          )}

          {/* Google Login Button */}
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSigningIn ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                <span className="font-medium text-gray-700">로그인 중...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="font-medium text-gray-700">Google로 로그인</span>
              </>
            )}
          </button>

          {/* Domain Notice */}
          <p className="mt-4 text-xs text-center text-gray-500">
            @meet365.com 또는 @freshkitchen365.com 이메일로만 로그인 가능합니다
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          FK365 v0.1.0 | Fresh Kitchen 365
        </p>
      </div>
    </div>
  );
}
