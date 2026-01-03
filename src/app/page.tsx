'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/context';
import { useI18n } from '@/lib/i18n/I18nContext';
import { getOrderCountByCutoff, getCutoffSummary, getCustomers, getProducts } from '@/lib/firebase';
import { formatCurrency } from '@/lib/constants';
import {
  ShoppingCart,
  ClipboardList,
  Truck,
  Clock,
  TrendingUp,
  AlertCircle,
  Ban,
  Users,
  Package,
  RefreshCw,
  DollarSign,
  BarChart2,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

// 태국 시간대 기준 오늘 날짜 반환
const getThailandToday = (): string => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const thailandTime = new Date(utc + (7 * 60 * 60 * 1000));
  return thailandTime.toISOString().split('T')[0];
};

// 태국 시간대 (UTC+7)
const THAILAND_OFFSET = 7 * 60 * 60 * 1000;

// 마감 시간 설정 (새벽 4시 기준)
const CUTOFF_HOUR = 4; // 새벽 4시

interface DailySales {
  date: string;
  label: string;
  total: number;
}

export default function Dashboard() {
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useI18n();
  const [selectedDate, setSelectedDate] = useState(() => getThailandToday());
  const [orderCounts, setOrderCounts] = useState({ cut1: 0, cut2: 0, cut3: 0, total: 0 });
  const [orderSummary, setOrderSummary] = useState({ cut1: 0, cut2: 0, cut3: 0, total: 0 });
  const [customerCount, setCustomerCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [weeklySales, setWeeklySales] = useState<DailySales[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 실시간 시계 업데이트 (1초마다)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async (isRefresh = false, date?: string) => {
    if (isRefresh) setRefreshing(true);
    try {
      const targetDate = date ? new Date(date) : new Date(selectedDate);
      const [counts, summary, customers, products] = await Promise.all([
        getOrderCountByCutoff(targetDate),
        getCutoffSummary(targetDate),
        getCustomers(true),
        getProducts(true),
      ]);
      setOrderCounts(counts);
      setOrderSummary(summary);
      setCustomerCount(customers.length);
      setProductCount(products.length);

      // 7일간 매출 데이터 로드
      const weeklyData: DailySales[] = [];
      const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(targetDate);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const daySummary = await getCutoffSummary(d);
        weeklyData.push({
          date: dateStr,
          label: dayLabels[d.getDay()],
          total: daySummary.total,
        });
      }
      setWeeklySales(weeklyData);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData(false, selectedDate);
  }, [selectedDate]);

  // 날짜 변경 핸들러
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setLoading(true);
  };

  // 오늘로 이동
  const goToToday = () => {
    const today = getThailandToday();
    setSelectedDate(today);
    setLoading(true);
  };

  // 선택된 날짜가 오늘인지 확인
  const isToday = selectedDate === getThailandToday();

  // 태국 시간 계산
  const getThailandTime = () => {
    const utc = currentTime.getTime() + (currentTime.getTimezoneOffset() * 60000);
    return new Date(utc + THAILAND_OFFSET);
  };

  const thailandTime = getThailandTime();
  const currentHour = thailandTime.getHours();
  const currentMinute = thailandTime.getMinutes();
  const currentSecond = thailandTime.getSeconds();

  // 일반 주문 마감 여부 (새벽 4시 이후 마감)
  const isNormalOrderClosed = currentHour >= CUTOFF_HOUR;

  // 마감까지 남은 시간 계산
  const getCutoffTimeRemaining = () => {
    if (isNormalOrderClosed) {
      // 이미 마감됨 - 다음날 마감까지 시간
      const nextCutoff = new Date(thailandTime);
      nextCutoff.setDate(nextCutoff.getDate() + 1);
      nextCutoff.setHours(CUTOFF_HOUR, 0, 0, 0);
      const diffMs = nextCutoff.getTime() - thailandTime.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return { closed: true, hours, mins, nextDay: true };
    } else {
      // 오늘 마감까지 남은 시간
      const todayCutoff = new Date(thailandTime);
      todayCutoff.setHours(CUTOFF_HOUR, 0, 0, 0);
      const diffMs = todayCutoff.getTime() - thailandTime.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      return { closed: false, hours, mins, secs };
    }
  };

  const cutoffStatus = getCutoffTimeRemaining();

  // 시간 포맷
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <ProtectedRoute>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle={t('dashboard.title')}
        onLogout={signOut}
      >
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Page Title (PC only) */}
        <h1 className="hidden lg:block text-2xl font-bold text-gray-900 mb-6">
          {t('dashboard.title')}
        </h1>

        {/* Date Selection & Time */}
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900 text-sm"
              />
            </div>
            {!isToday && (
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
              >
                {t('dashboard.goToToday')}
              </button>
            )}
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {t('dashboard.refresh')}
            </button>
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-mono">{formatTime(thailandTime)}</span>
            <span className="ml-2 text-gray-600">({t('dashboard.thailandTime')})</span>
          </div>
        </div>

        {/* Selected Date Indicator */}
        {!isToday && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>{selectedDate}</strong> 날짜의 데이터를 표시 중입니다.
            </p>
          </div>
        )}

        {/* Order Summary Cards */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-600" />
            {t('dashboard.todayOrders')} {!isToday && `(${selectedDate})`}
          </h2>
          <div className="grid grid-cols-3 gap-3 lg:gap-6">
            {/* Cut 1: Normal */}
            <div className={`rounded-xl shadow-sm border p-4 lg:p-6 ${
              isNormalOrderClosed
                ? 'bg-gray-100 border-gray-200'
                : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{t('dashboard.normal')} (1)</span>
                <span className={`w-2 h-2 rounded-full ${
                  isNormalOrderClosed ? 'bg-gray-400' : 'bg-green-500'
                }`}></span>
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">
                {loading ? '-' : orderCounts.cut1}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {isNormalOrderClosed ? (
                  <>
                    <Ban size={12} className="text-red-500" />
                    <span className="text-xs text-red-600 font-medium">{t('dashboard.closed')}</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-600">{t('dashboard.before04')}</span>
                )}
              </div>
            </div>

            {/* Cut 2: Additional */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{t('dashboard.additional')} (2)</span>
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">
                {loading ? '-' : orderCounts.cut2}
              </p>
              <p className="text-xs text-gray-600 mt-1">끌렁떠이</p>
            </div>

            {/* Cut 3: Urgent */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{t('dashboard.urgent')} (3)</span>
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">
                {loading ? '-' : orderCounts.cut3}
              </p>
              <p className="text-xs text-gray-600 mt-1">라라무브</p>
            </div>
          </div>
        </section>

        {/* Today's Revenue */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-600" />
            {isToday ? t('dashboard.todaySales') : `${selectedDate} ${t('dashboard.salesStatus')}`}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 lg:p-6 border border-emerald-200">
              <p className="text-sm text-emerald-700 mb-1">{t('dashboard.totalSales')}</p>
              <p className="text-xl lg:text-2xl font-bold text-emerald-800">
                {loading ? '-' : formatCurrency(orderSummary.cut1 + orderSummary.cut2 + orderSummary.cut3)}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                {!loading && `(${formatCurrency(orderSummary.cut1)} + ${formatCurrency(orderSummary.cut2)} + ${formatCurrency(orderSummary.cut3)})`}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6">
              <p className="text-sm text-gray-600 mb-1">{t('dashboard.cut1Sales')}</p>
              <p className="text-lg lg:text-xl font-bold text-gray-800">
                {loading ? '-' : formatCurrency(orderSummary.cut1)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6">
              <p className="text-sm text-gray-600 mb-1">{t('dashboard.cut2Sales')}</p>
              <p className="text-lg lg:text-xl font-bold text-gray-800">
                {loading ? '-' : formatCurrency(orderSummary.cut2)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6">
              <p className="text-sm text-gray-600 mb-1">{t('dashboard.cut3Sales')}</p>
              <p className="text-lg lg:text-xl font-bold text-gray-800">
                {loading ? '-' : formatCurrency(orderSummary.cut3)}
              </p>
            </div>
          </div>
        </section>

        {/* Weekly Sales Chart */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart2 size={20} className="text-indigo-600" />
            {t('dashboard.weeklySales')}
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6">
            {loading ? (
              <div className="h-48 flex items-center justify-center text-gray-500">
                로딩 중...
              </div>
            ) : weeklySales.length > 0 ? (
              <div className="space-y-2">
                {/* 바 차트 영역 */}
                <div className="flex items-end justify-between gap-2 h-32">
                  {weeklySales.map((day) => {
                    const maxSales = Math.max(...weeklySales.map(d => d.total), 1);
                    const heightPercent = (day.total / maxSales) * 100;
                    const isSelected = day.date === selectedDate;
                    const barHeight = Math.max(heightPercent, 8);

                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center justify-end h-full"
                      >
                        <div
                          className={`w-full max-w-[40px] mx-auto rounded-t-md transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-green-500 hover:bg-green-600'
                              : 'bg-indigo-400 hover:bg-indigo-500'
                          }`}
                          style={{ height: `${barHeight}%`, minHeight: '8px' }}
                          title={`${day.date}: ${formatCurrency(day.total)}`}
                        />
                      </div>
                    );
                  })}
                </div>
                {/* 금액 라벨 */}
                <div className="flex justify-between gap-2">
                  {weeklySales.map((day) => {
                    const isSelected = day.date === selectedDate;
                    return (
                      <div key={`amount-${day.date}`} className="flex-1 text-center">
                        <span className={`text-xs font-medium ${isSelected ? 'text-green-700' : 'text-gray-700'}`}>
                          {formatCurrency(day.total)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* 날짜 라벨 */}
                <div className="flex justify-between gap-2">
                  {weeklySales.map((day) => {
                    const isSelected = day.date === selectedDate;
                    return (
                      <div key={`label-${day.date}`} className="flex-1 text-center">
                        <span className={`text-xs font-medium ${isSelected ? 'text-green-700' : 'text-gray-700'}`}>
                          {day.label}
                        </span>
                        <br />
                        <span className={`text-xs ${isSelected ? 'text-green-600' : 'text-gray-500'}`}>
                          {day.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500">
                데이터가 없습니다
              </div>
            )}
          </div>
        </section>

        {/* Business Stats */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600" />
            {t('dashboard.basicStats')}
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-700">{t('dashboard.activeCustomers')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '-' : customerCount}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package size={24} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-700">{t('dashboard.activeProducts')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '-' : productCount}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Time Until Cutoff */}
        <section className="mb-8">
          <div className={`rounded-xl p-4 lg:p-6 flex items-center gap-4 ${
            isNormalOrderClosed
              ? 'bg-red-50 border border-red-200'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <Clock size={24} className={isNormalOrderClosed ? 'text-red-600' : 'text-blue-600'} />
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                {isNormalOrderClosed ? t('dashboard.afterCutoff') : t('dashboard.timeRemaining')}
              </p>
              {isNormalOrderClosed ? (
                <p className="text-xl font-bold text-red-700">
                  {t('dashboard.afterCutoff')}
                </p>
              ) : (
                <p className="text-xl font-bold text-blue-700 font-mono">
                  {cutoffStatus.hours}시간 {cutoffStatus.mins}분 {cutoffStatus.secs}초
                </p>
              )}
            </div>
            {isNormalOrderClosed && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle size={20} />
              </div>
            )}
          </div>
          {/* 추가 설명 */}
          <p className="mt-2 text-xs text-gray-500">
            * 추가/긴급 주문은 시간 제한 없이 관리자 판단에 따라 입력 가능합니다.
          </p>
        </section>

        {/* Quick Menu */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('dashboard.quickMenu')}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/orders"
              className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-green-300 hover:shadow-md transition-all"
            >
              <ShoppingCart size={32} className="text-green-600" />
              <span className="font-medium text-gray-800">{t('dashboard.orderEntry')}</span>
            </Link>

            <Link
              href="/purchase-orders"
              className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-green-300 hover:shadow-md transition-all"
            >
              <ClipboardList size={32} className="text-green-600" />
              <span className="font-medium text-gray-800">{t('nav.purchaseOrders')}</span>
            </Link>

            <Link
              href="/delivery"
              className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-green-300 hover:shadow-md transition-all"
            >
              <Truck size={32} className="text-green-600" />
              <span className="font-medium text-gray-800">{t('nav.delivery')}</span>
            </Link>

            <Link
              href="/stock"
              className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-green-300 hover:shadow-md transition-all"
            >
              <TrendingUp size={32} className="text-green-600" />
              <span className="font-medium text-gray-800">{t('nav.stock')}</span>
            </Link>
          </div>
        </section>

        {/* Version Info */}
        <footer className="mt-12 text-center text-xs text-gray-600">
          FK365 v0.1.0 | Fresh Kitchen 365
        </footer>
      </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
