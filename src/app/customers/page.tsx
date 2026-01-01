'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/context';
import { Button, EmptyState, LoadingState, Badge } from '@/components/ui';
import { getCustomers, deleteCustomer } from '@/lib/firebase';
import type { Customer, Region } from '@/types';
import { Plus, Pencil, Trash2, Users, Search, Package } from 'lucide-react';
import Link from 'next/link';

const GRADE_COLORS: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
  S: 'success',
  A: 'info',
  B: 'default',
  C: 'warning',
  D: 'danger',
  E: 'danger',
};

const REGION_LABELS: Record<Region, string> = {
  pattaya: '파타야',
  bangkok: '방콕',
};

export default function CustomersPage() {
  const { user, isAdmin, signOut } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [filterRegion, setFilterRegion] = useState<'all' | Region>('all');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCustomers(!showInactive);
      setCustomers(data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [showInactive]);

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRegion =
      filterRegion === 'all' || c.region === filterRegion;

    return matchesSearch && matchesRegion;
  });

  // Sort by region (pattaya first) then by code
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (a.region !== b.region) {
      return a.region === 'pattaya' ? -1 : 1;
    }
    return a.code.localeCompare(b.code);
  });

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteCustomer(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="고객 관리"
        onLogout={signOut}
      >
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">고객 관리</h1>
            <Link href="/customers/new">
              <Button>
                <Plus size={18} className="mr-2" />
                고객 추가
              </Button>
            </Link>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="코드 또는 이름으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setFilterRegion('all')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterRegion === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setFilterRegion('pattaya')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterRegion === 'pattaya'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  파타야
                </button>
                <button
                  onClick={() => setFilterRegion('bangkok')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterRegion === 'bangkok'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  방콕
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                비활성 포함
              </label>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <LoadingState message="고객 목록을 불러오는 중..." />
          ) : sortedCustomers.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8 text-gray-400" />}
              title="등록된 고객이 없습니다"
              description="새 고객을 추가하여 시작하세요."
              action={
                <Link href="/customers/new">
                  <Button>
                    <Plus size={18} className="mr-2" />
                    고객 추가
                  </Button>
                </Link>
              }
            />
          ) : (
            <>
              {/* PC Table */}
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        코드
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        이름
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        등급
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        지역
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        배송시간
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        제품 수
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        상태
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-sm text-gray-900">
                          {customer.code}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {customer.fullName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={GRADE_COLORS[customer.grade] || 'default'} size="sm">
                            {customer.grade}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {REGION_LABELS[customer.region]}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {customer.deliveryTime || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {customer.products?.length || 0}개
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={customer.isActive ? 'success' : 'default'} size="sm">
                            {customer.isActive ? '활성' : '비활성'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/customers/${customer.id}/products`}>
                              <button
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="제품 매핑"
                              >
                                <Package size={16} />
                              </button>
                            </Link>
                            <Link href={`/customers/${customer.id}/edit`}>
                              <button
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="수정"
                              >
                                <Pencil size={16} />
                              </button>
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(customer)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3">
                {sortedCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {customer.code}
                        </span>
                        <Badge variant={GRADE_COLORS[customer.grade] || 'default'} size="sm">
                          {customer.grade}
                        </Badge>
                        <Badge
                          variant={customer.region === 'pattaya' ? 'info' : 'warning'}
                          size="sm"
                        >
                          {REGION_LABELS[customer.region]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link href={`/customers/${customer.id}/products`}>
                          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                            <Package size={18} />
                          </button>
                        </Link>
                        <Link href={`/customers/${customer.id}/edit`}>
                          <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                            <Pencil size={18} />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(customer)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <p className="font-medium text-gray-900">{customer.fullName}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>제품: {customer.products?.length || 0}개</span>
                      {customer.deliveryTime && <span>배송: {customer.deliveryTime}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setDeleteTarget(null)}
            />
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  고객 삭제
                </h3>
                <p className="text-gray-600 mb-4">
                  <span className="font-medium text-gray-900">
                    {deleteTarget.fullName}
                  </span>
                  {' '}고객을 삭제하시겠습니까?
                </p>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                    취소
                  </Button>
                  <Button variant="danger" onClick={handleDelete}>
                    삭제
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </MainLayout>
    </ProtectedRoute>
  );
}
