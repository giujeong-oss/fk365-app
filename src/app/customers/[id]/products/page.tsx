'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/context';
import { Button, LoadingState, Badge, Input } from '@/components/ui';
import {
  getCustomer,
  getProducts,
  updateCustomerProducts,
  getCustomerProductAdjs,
  setCustomerProductAdj,
} from '@/lib/firebase';
import type { Customer, Product, CustomerProductAdj } from '@/types';
import { ArrowLeft, Search, Check, X } from 'lucide-react';
import Link from 'next/link';

export default function CustomerProductsPage() {
  const params = useParams();
  const customerId = params.id as string;

  const { user, isAdmin, signOut } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [adjs, setAdjs] = useState<Map<string, number>>(new Map());
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [customerData, productsData, adjsData] = await Promise.all([
          getCustomer(customerId),
          getProducts(true),
          getCustomerProductAdjs(customerId),
        ]);

        if (!customerData) return;

        setCustomer(customerData);
        setProducts(productsData);

        // Set initial selected products
        setSelectedProducts(new Set(customerData.products || []));

        // Set initial adj values
        const adjMap = new Map<string, number>();
        adjsData.forEach((adj: CustomerProductAdj) => {
          adjMap.set(adj.productCode, adj.adj);
        });
        setAdjs(adjMap);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [customerId]);

  // Filter products
  const filteredProducts = products.filter(
    (p) =>
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name_ko.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name_th.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle product selection
  const toggleProduct = (productCode: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productCode)) {
      newSelected.delete(productCode);
    } else {
      newSelected.add(productCode);
    }
    setSelectedProducts(newSelected);
  };

  // Select/Deselect all
  const selectAll = () => {
    const allCodes = new Set(filteredProducts.map((p) => p.code));
    setSelectedProducts(allCodes);
  };

  const deselectAll = () => {
    setSelectedProducts(new Set());
  };

  // Update adj value
  const updateAdj = (productCode: string, value: number) => {
    const newAdjs = new Map(adjs);
    newAdjs.set(productCode, value);
    setAdjs(newAdjs);
  };

  // Save changes
  const handleSave = async () => {
    if (!customer) return;

    setSaving(true);
    try {
      // Save product assignments
      await updateCustomerProducts(customerId, Array.from(selectedProducts));

      // Save adj values for selected products
      const adjPromises = Array.from(selectedProducts).map(async (productCode) => {
        const adjValue = adjs.get(productCode) || 0;
        if (adjValue !== 0) {
          await setCustomerProductAdj(
            customer.code,
            productCode,
            adjValue,
            customer.grade
          );
        }
      });

      await Promise.all(adjPromises);

      // Reload data
      const updatedCustomer = await getCustomer(customerId);
      if (updatedCustomer) {
        setCustomer(updatedCustomer);
        setSelectedProducts(new Set(updatedCustomer.products || []));
      }
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
          pageTitle="제품 매핑"
          onLogout={signOut}
        >
          <LoadingState message="데이터를 불러오는 중..." />
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="제품 매핑"
        onLogout={signOut}
      >
        <div className="p-4 lg:p-8 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/customers">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <ArrowLeft size={20} />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">제품 매핑</h1>
              <p className="text-gray-500">
                {customer.code} - {customer.fullName}
                <Badge variant="info" size="sm" className="ml-2">
                  {customer.grade}등급
                </Badge>
              </p>
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
            <strong>adj</strong>: 제품별 기본 가격 조정 (마이너스: 할인, 플러스: 추가)
            <br />
            <span className="text-blue-600">등급 변경 시 모든 adj가 0으로 초기화됩니다.</span>
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
                      한국어
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      태국어
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      유형
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">
                      adj (฿)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProducts.has(product.code);
                    const adjValue = adjs.get(product.code) || 0;

                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-gray-50 ${isSelected ? 'bg-green-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleProduct(product.code)}
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
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {product.name_ko}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {product.name_th}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={product.priceType === 'fresh' ? 'success' : 'info'}
                            size="sm"
                          >
                            {product.priceType === 'fresh' ? '신선' : '공산품'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {isSelected && (
                            <input
                              type="number"
                              value={adjValue}
                              onChange={(e) =>
                                updateAdj(product.code, Number(e.target.value))
                              }
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              placeholder="0"
                            />
                          )}
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
                const isSelected = selectedProducts.has(product.code);
                const adjValue = adjs.get(product.code) || 0;

                return (
                  <div
                    key={product.id}
                    className={`p-4 ${isSelected ? 'bg-green-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleProduct(product.code)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
                          isSelected
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <Check size={14} />}
                      </button>
                      <div className="flex-1">
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
                        <p className="text-gray-900">{product.name_ko}</p>
                        <p className="text-sm text-gray-500">{product.name_th}</p>

                        {isSelected && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm text-gray-600">adj:</span>
                            <input
                              type="number"
                              value={adjValue}
                              onChange={(e) =>
                                updateAdj(product.code, Number(e.target.value))
                              }
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                              placeholder="0"
                            />
                            <span className="text-sm text-gray-500">฿</span>
                          </div>
                        )}
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
