'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { ProtectedRoute } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { Button, Select, Spinner, EmptyState, Badge } from '@/components/ui';
import { getCustomers, getOrdersByDate, getCutoffSummary } from '@/lib/firebase';
import type { Customer, Order, Cutoff } from '@/types';
import { Home } from 'lucide-react';
import Link from 'next/link';

const CUTOFF_OPTIONS = [
  { value: '1', label: '1차 (정상 - 11시 전)' },
  { value: '2', label: '2차 (추가 - 장보는 중)' },
  { value: '3', label: '3차 (긴급 - 장본 후)' },
];

export default function OrdersPage() {
  const { user, isAdmin, signOut } = useAuth();
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cutoffSummary, setCutoffSummary] = useState({ cut1: 0, cut2: 0, cut3: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedCutoff, setSelectedCutoff] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    setLoading(true);
    try {
      const selectedDate = new Date(date);
      const [customersData, ordersData, summary] = await Promise.all([
        getCustomers(true),
        getOrdersByDate(selectedDate),
        getCutoffSummary(selectedDate),
      ]);
      setCustomers(customersData);
      setOrders(ordersData);
      setCutoffSummary(summary);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerOrders = (customerCode: string): Order[] => {
    return orders.filter((o) => o.customerCode === customerCode);
  };

  const getOrderTotal = (customerCode: string): number => {
    return getCustomerOrders(customerCode).reduce((sum, o) => sum + o.totalAmount, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredOrders = selectedCutoff
    ? orders.filter((o) => o.cutoff === Number(selectedCutoff))
    : orders;

  const orderedCustomerCodes = [...new Set(filteredOrders.map((o) => o.customerCode))];
  const orderedCustomers = customers.filter((c) => orderedCustomerCodes.includes(c.code));
  const unorderedCustomers = customers.filter((c) => !orderedCustomerCodes.includes(c.code));

  return (
    <ProtectedRoute>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="주문 입력"
        onLogout={signOut}
      >
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="secondary" size="sm">
                <Home size={18} className="mr-1" />
                홈
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">주문 입력</h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 mb-1">1차 (정상)</div>
            <div className="text-xl font-bold text-blue-700">{formatCurrency(cutoffSummary.cut1)}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm text-yellow-600 mb-1">2차 (추가)</div>
            <div className="text-xl font-bold text-yellow-700">{formatCurrency(cutoffSummary.cut2)}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-600 mb-1">3차 (긴급)</div>
            <div className="text-xl font-bold text-red-700">{formatCurrency(cutoffSummary.cut3)}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 mb-1">총 합계</div>
            <div className="text-xl font-bold text-green-700">{formatCurrency(cutoffSummary.total)}</div>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex items-center gap-4 mb-6">
          <Select
            value={selectedCutoff}
            onChange={(e) => setSelectedCutoff(e.target.value)}
            className="w-48"
            options={[
              { value: '', label: '전체 마감' },
              ...CUTOFF_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))
            ]}
          />
          <span className="text-sm text-gray-500">
            주문: {orderedCustomers.length}개 업체 / 미주문: {unorderedCustomers.length}개 업체
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 주문 있는 고객 */}
            {orderedCustomers.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  주문 완료
                </h2>
                <div className="grid gap-3">
                  {orderedCustomers.map((customer) => (
                    <Link
                      key={customer.id}
                      href={`/orders/entry/${customer.code}?date=${date}`}
                      className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="success" size="sm">{customer.grade}</Badge>
                          <span className="font-semibold text-gray-800">{customer.code}</span>
                          <span className="text-gray-700 font-medium">{customer.fullName}</span>
                          <Badge variant="info" size="sm">{customer.region === 'pattaya' ? '파타야' : '방콕'}</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm text-gray-500">
                              {getCustomerOrders(customer.code).length}건
                            </div>
                            <div className="font-bold text-green-600">
                              {formatCurrency(getOrderTotal(customer.code))}
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 주문 없는 고객 */}
            {unorderedCustomers.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-gray-300 rounded-full"></span>
                  미주문
                </h2>
                <div className="grid gap-3">
                  {unorderedCustomers.map((customer) => (
                    <Link
                      key={customer.id}
                      href={`/orders/entry/${customer.code}?date=${date}`}
                      className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="default" size="sm">{customer.grade}</Badge>
                          <span className="font-semibold text-gray-800">{customer.code}</span>
                          <span className="text-gray-700 font-medium">{customer.fullName}</span>
                          <Badge variant="info" size="sm">{customer.region === 'pattaya' ? '파타야' : '방콕'}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">주문 입력</span>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {customers.length === 0 && (
              <EmptyState
                title="등록된 고객이 없습니다"
                description="먼저 고객을 등록해주세요."
                action={
                  <Link href="/customers/new">
                    <Button>고객 등록</Button>
                  </Link>
                }
              />
            )}
          </div>
        )}
      </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
