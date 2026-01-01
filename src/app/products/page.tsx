'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/context';
import { Button, EmptyState, LoadingState, Badge } from '@/components/ui';
import { getProducts, deleteProduct, getVendors, updateProduct } from '@/lib/firebase';
import type { Product, Vendor, PriceType } from '@/types';
import { Plus, Pencil, Trash2, Apple, Search } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const { user, isAdmin, signOut } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'fresh' | 'industrial'>('all');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, vendorsData] = await Promise.all([
        getProducts(!showInactive),
        getVendors(true),
      ]);
      setProducts(productsData);
      setVendors(vendorsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [showInactive]);

  // Get vendor name by code
  const getVendorName = (vendorCode: string) => {
    const vendor = vendors.find((v) => v.code === vendorCode);
    return vendor?.name || vendorCode;
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name_ko.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name_th.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name_mm.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === 'all' || p.priceType === filterType;

    return matchesSearch && matchesType;
  });

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  // Update product priceType
  const handlePriceTypeChange = async (productId: string, newType: PriceType) => {
    try {
      await updateProduct(productId, { priceType: newType });
      // Update local state
      setProducts(prev =>
        prev.map(p => p.id === productId ? { ...p, priceType: newType } : p)
      );
    } catch (error) {
      console.error('Failed to update price type:', error);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="제품 관리"
        onLogout={signOut}
      >
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">제품 관리</h1>
            <Link href="/products/new">
              <Button>
                <Plus size={18} className="mr-2" />
                제품 추가
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
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterType === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setFilterType('fresh')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterType === 'fresh'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  신선
                </button>
                <button
                  onClick={() => setFilterType('industrial')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterType === 'industrial'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  공산품
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
            <LoadingState message="제품 목록을 불러오는 중..." />
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon={<Apple className="w-8 h-8 text-gray-400" />}
              title="등록된 제품이 없습니다"
              description="새 제품을 추가하여 시작하세요."
              action={
                <Link href="/products/new">
                  <Button>
                    <Plus size={18} className="mr-2" />
                    제품 추가
                  </Button>
                </Link>
              }
            />
          ) : (
            <>
              {/* PC Table */}
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          코드
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          유형
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          제품명
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          단위
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          구매처
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
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-sm text-gray-800 font-semibold">
                            {product.code}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={product.priceType}
                              onChange={(e) => handlePriceTypeChange(product.id, e.target.value as PriceType)}
                              className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-green-500 ${
                                product.priceType === 'fresh'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              <option value="fresh">신선</option>
                              <option value="industrial">공산품</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              <p className="text-sm font-semibold text-gray-900">{product.name_ko}</p>
                              <p className="text-xs text-gray-600">{product.name_th}</p>
                              <p className="text-xs text-gray-500">{product.name_mm}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">
                            {product.unit}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {getVendorName(product.vendorCode)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant={product.isActive ? 'success' : 'default'} size="sm">
                              {product.isActive ? '활성' : '비활성'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/products/${product.id}/edit`}>
                                <button
                                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="수정"
                                >
                                  <Pencil size={16} />
                                </button>
                              </Link>
                              <button
                                onClick={() => setDeleteTarget(product)}
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
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {product.code}
                        </span>
                        <select
                          value={product.priceType}
                          onChange={(e) => handlePriceTypeChange(product.id, e.target.value as PriceType)}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${
                            product.priceType === 'fresh'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          <option value="fresh">신선</option>
                          <option value="industrial">공산품</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link href={`/products/${product.id}/edit`}>
                          <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                            <Pencil size={18} />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(product)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    {/* 제품명 통합 셀 */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="font-semibold text-gray-900">{product.name_ko}</p>
                      <p className="text-sm text-gray-700">{product.name_th}</p>
                      <p className="text-sm text-gray-600">{product.name_mm}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-700 font-medium">
                      <span>단위: {product.unit}</span>
                      <span>구매처: {getVendorName(product.vendorCode)}</span>
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
                  제품 삭제
                </h3>
                <p className="text-gray-600 mb-4">
                  <span className="font-medium text-gray-900">
                    {deleteTarget.name_ko}
                  </span>
                  {' '}제품을 삭제하시겠습니까?
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
