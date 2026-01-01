'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/context';
import { Button, LoadingState, Badge } from '@/components/ui';
import {
  getVendor,
  getProducts,
  updateProduct,
  getCategories,
} from '@/lib/firebase';
import type { Vendor, Product } from '@/types';
import { ArrowLeft, Search, Check } from 'lucide-react';
import Link from 'next/link';

export default function VendorProductsPage() {
  const params = useParams();
  const vendorId = params.id as string;

  const { user, isAdmin, signOut } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [vendorData, productsData, categoriesData] = await Promise.all([
          getVendor(vendorId),
          getProducts(false), // Include all products
          getCategories(),
        ]);

        if (!vendorData) return;

        setVendor(vendorData);
        setProducts(productsData);
        setCategories(categoriesData);

        // Set initial selected products (products that have this vendor)
        const vendorProducts = productsData.filter(p => p.vendorCode === vendorData.code);
        setSelectedProducts(new Set(vendorProducts.map(p => p.id)));
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [vendorId]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.name_ko.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.name_th.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.name_mm.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        activeTab === 'all' || p.category === activeTab;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, activeTab]);

  // Toggle product selection
  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  // Select/Deselect all in current view
  const selectAll = () => {
    const allIds = new Set(selectedProducts);
    filteredProducts.forEach(p => allIds.add(p.id));
    setSelectedProducts(allIds);
  };

  const deselectAll = () => {
    const newSelected = new Set(selectedProducts);
    filteredProducts.forEach(p => newSelected.delete(p.id));
    setSelectedProducts(newSelected);
  };

  // Save changes
  const handleSave = async () => {
    if (!vendor) return;

    setSaving(true);
    try {
      // Update products - assign vendor code to selected, remove from unselected
      const updatePromises = products.map(async (product) => {
        const isSelected = selectedProducts.has(product.id);
        const wasVendorProduct = product.vendorCode === vendor.code;

        if (isSelected && !wasVendorProduct) {
          // Assign this vendor to the product
          await updateProduct(product.id, { vendorCode: vendor.code });
        } else if (!isSelected && wasVendorProduct) {
          // Remove vendor assignment (set to empty)
          await updateProduct(product.id, { vendorCode: '' });
        }
      });

      await Promise.all(updatePromises);

      // Reload products
      const updatedProducts = await getProducts(false);
      setProducts(updatedProducts);

      const vendorProducts = updatedProducts.filter(p => p.vendorCode === vendor.code);
      setSelectedProducts(new Set(vendorProducts.map(p => p.id)));
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute adminOnly>
        <MainLayout
          isAdmin={isAdmin}
          userName={user?.email || ''}
          pageTitle="구매 제품 매핑"
          onLogout={signOut}
        >
          <LoadingState message="데이터를 불러오는 중..." />
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (!vendor) {
    return null;
  }

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="구매 제품 매핑"
        onLogout={signOut}
      >
        <div className="p-4 lg:p-8 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/vendors">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <ArrowLeft size={20} />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">구매 제품 매핑</h1>
              <p className="text-gray-600">
                <span className="font-mono font-medium">{vendor.code}</span> - {vendor.name}
              </p>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="mb-4 overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === cat
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="제품 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={selectAll}>
                전체 선택
              </Button>
              <Button variant="secondary" size="sm" onClick={deselectAll}>
                선택 해제
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            선택된 제품은 이 구매처에서 매입하는 제품으로 설정됩니다.
          </div>

          {/* Product List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* PC Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                      선택
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      코드
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      제품명
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      유형
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      카테고리
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      현재 구매처
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProducts.has(product.id);

                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-gray-50 ${isSelected ? 'bg-green-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleProduct(product.id)}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-green-600 border-green-600 text-white'
                                : 'border-gray-300 hover:border-green-500'
                            }`}
                          >
                            {isSelected && <Check size={14} />}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-900">
                          {product.code}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-gray-900">{product.name_ko}</p>
                            <p className="text-xs text-gray-600">{product.name_th}</p>
                            <p className="text-xs text-gray-500">{product.name_mm}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={product.priceType === 'fresh' ? 'success' : 'info'}
                            size="sm"
                          >
                            {product.priceType === 'fresh' ? '신선' : '공산품'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {product.category || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {product.vendorCode || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const isSelected = selectedProducts.has(product.id);

                return (
                  <div
                    key={product.id}
                    className={`p-4 ${isSelected ? 'bg-green-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleProduct(product.id)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
                          isSelected
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <Check size={14} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">
                            {product.code}
                          </span>
                          <Badge
                            variant={product.priceType === 'fresh' ? 'success' : 'info'}
                            size="sm"
                          >
                            {product.priceType === 'fresh' ? '신선' : '공산품'}
                          </Badge>
                        </div>
                        {/* 제품명 통합 표시 */}
                        <div className="bg-gray-100 rounded p-2 mb-2">
                          <p className="text-sm font-semibold text-gray-900">{product.name_ko}</p>
                          <p className="text-xs text-gray-600">{product.name_th}</p>
                          <p className="text-xs text-gray-500">{product.name_mm}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>카테고리: {product.category || '-'}</span>
                          <span>현재: {product.vendorCode || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary & Save */}
          <div className="mt-6 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600">
              선택된 제품: <strong>{selectedProducts.size}개</strong>
            </p>
            <Button onClick={handleSave} loading={saving}>
              저장
            </Button>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
