'use client';

import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/context';
import {
  ShoppingCart,
  ClipboardList,
  Truck,
  Clock,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

// 임시 데이터 (나중에 Firebase에서 가져옴)
const mockOrderSummary = {
  cut1: 45,
  cut2: 12,
  cut3: 3,
};

export default function Dashboard() {
  const { user, isAdmin, signOut } = useAuth();

  // 마감까지 남은 시간 계산 (임시)
  const now = new Date();
  const cutoff = new Date();
  cutoff.setHours(11, 0, 0, 0);
  const diffMs = cutoff.getTime() - now.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  const timeUntilCutoff = diffMs > 0 ? `${hours}시간 ${mins}분` : '마감됨';

  return (
    <ProtectedRoute>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="대시보드"
        onLogout={signOut}
      >
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Page Title (PC only) */}
        <h1 className="hidden lg:block text-2xl font-bold text-gray-900 mb-6">
          대시보드
        </h1>

        {/* Order Summary Cards */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-600" />
            오늘 주문 현황
          </h2>
          <div className="grid grid-cols-3 gap-3 lg:gap-6">
            {/* Cut 1: Normal */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">정상 (1)</span>
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">
                {mockOrderSummary.cut1}
              </p>
              <p className="text-xs text-gray-400 mt-1">11시 전</p>
            </div>

            {/* Cut 2: Additional */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">추가 (2)</span>
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">
                {mockOrderSummary.cut2}
              </p>
              <p className="text-xs text-gray-400 mt-1">끌렁떠이</p>
            </div>

            {/* Cut 3: Urgent */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">긴급 (3)</span>
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">
                {mockOrderSummary.cut3}
              </p>
              <p className="text-xs text-gray-400 mt-1">라라무브</p>
            </div>
          </div>
        </section>

        {/* Time Until Cutoff */}
        <section className="mb-8">
          <div className={`rounded-xl p-4 lg:p-6 flex items-center gap-4 ${
            diffMs > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-100 border border-gray-200'
          }`}>
            <Clock size={24} className={diffMs > 0 ? 'text-blue-600' : 'text-gray-400'} />
            <div>
              <p className="text-sm text-gray-600">마감까지</p>
              <p className={`text-xl font-bold ${diffMs > 0 ? 'text-blue-700' : 'text-gray-500'}`}>
                {timeUntilCutoff}
              </p>
            </div>
            {diffMs <= 0 && (
              <div className="ml-auto flex items-center gap-2 text-amber-600">
                <AlertCircle size={16} />
                <span className="text-sm font-medium">추가주문만 가능</span>
              </div>
            )}
          </div>
        </section>

        {/* Quick Menu */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">빠른 메뉴</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/orders"
              className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-green-300 hover:shadow-md transition-all"
            >
              <ShoppingCart size={32} className="text-green-600" />
              <span className="font-medium text-gray-700">주문 입력</span>
            </Link>

            <Link
              href="/purchase-orders"
              className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-green-300 hover:shadow-md transition-all"
            >
              <ClipboardList size={32} className="text-green-600" />
              <span className="font-medium text-gray-700">발주서</span>
            </Link>

            <Link
              href="/delivery"
              className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-green-300 hover:shadow-md transition-all"
            >
              <Truck size={32} className="text-green-600" />
              <span className="font-medium text-gray-700">배송장</span>
            </Link>

            <Link
              href="/stock"
              className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-green-300 hover:shadow-md transition-all"
            >
              <TrendingUp size={32} className="text-green-600" />
              <span className="font-medium text-gray-700">재고 현황</span>
            </Link>
          </div>
        </section>

        {/* Version Info */}
        <footer className="mt-12 text-center text-xs text-gray-400">
          FK365 v0.1.0 | Fresh Kitchen 365
        </footer>
      </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
