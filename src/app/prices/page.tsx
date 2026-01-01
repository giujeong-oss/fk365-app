'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { ProtectedRoute } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { Button, Input, Spinner, Badge, EmptyState } from '@/components/ui';
import { getProducts, getVendors, updateProduct } from '@/lib/firebase';
import type { Product, Vendor, PriceType } from '@/types';
import { Home, Save, Search } from 'lucide-react';
import Link from 'next/link';

interface ProductPrice {
  product: Product;
  isModified: boolean;
  pur: number | undefined;
  min: number | undefined;
  mid: number | undefined;
}

export default function PricesPage() {
  const { user, isAdmin, signOut } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedType, setSelectedType] = useState<PriceType | ''>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, vendorsData] = await Promise.all([
        getProducts(true),
        getVendors(true),
      ]);

      setProducts(productsData);
      setVendors(vendorsData);

      const prices: ProductPrice[] = productsData.map((product) => ({
        product,
        isModified: false,
        pur: product.pur,
        min: product.min,
        mid: product.mid,
      }));

      setProductPrices(prices);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (
    productCode: string,
    field: 'pur' | 'min' | 'mid',
    value: string
  ) => {
    const numValue = value === '' ? undefined : Number(value);
    setProductPrices((prev) =>
      prev.map((pp) =>
        pp.product.code === productCode
          ? { ...pp, [field]: numValue, isModified: true }
          : pp
      )
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const modifiedItems = productPrices.filter((pp) => pp.isModified);

      if (modifiedItems.length === 0) {
        alert('변경된 항목이 없습니다.');
        return;
      }

      for (const item of modifiedItems) {
        await updateProduct(item.product.id, {
          pur: item.pur,
          min: item.min,
          mid: item.mid,
        });
      }

      setProductPrices((prev) =>
        prev.map((pp) => ({ ...pp, isModified: false }))
      );

      alert(`${modifiedItems.length}개 제품 가격이 저장되었습니다.`);
    } catch (error) {
      console.error('Failed to save prices:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    loadData();
  };

  const getVendorName = (vendorCode: string) => {
    return vendors.find((v) => v.code === vendorCode)?.name || vendorCode;
  };

  // 필터링
  const filteredPrices = productPrices.filter((pp) => {
    const matchesSearch =
      !searchTerm ||
      pp.product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pp.product.name_ko.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVendor = !selectedVendor || pp.product.vendorCode === selectedVendor;
    const matchesType = !selectedType || pp.product.priceType === selectedType;

    return matchesSearch && matchesVendor && matchesType;
  });

  const modifiedCount = productPrices.filter((pp) => pp.isModified).length;

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="제품 가격"
        onLogout={signOut}
      >
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="secondary" size="sm">
                  <Home size={18} className="mr-1" />
                  홈
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">제품 가격</h1>
                <p className="text-sm text-gray-600 mt-1">
                  총 {products.length}개 제품
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {modifiedCount > 0 && (
                <Badge variant="warning">{modifiedCount}개 변경됨</Badge>
              )}
              <Button variant="secondary" onClick={handleReset} disabled={modifiedCount === 0}>
                초기화
              </Button>
              <Button onClick={handleSaveAll} disabled={saving || modifiedCount === 0}>
                <Save size={16} className="mr-1" />
                {saving ? '저장 중...' : '모두 저장'}
              </Button>
            </div>
          </div>

          {/* 필터 */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="제품 코드 또는 이름으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">전체 구매처</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.code}>
                  {vendor.name}
                </option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as PriceType | '')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">전체 유형</option>
              <option value="fresh">신선제품</option>
              <option value="industrial">공산품</option>
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : filteredPrices.length === 0 ? (
            <EmptyState
              title="제품이 없습니다"
              description={searchTerm || selectedVendor || selectedType ? '검색 조건을 변경해보세요.' : '먼저 제품을 등록해주세요.'}
            />
          ) : (
            <div className="bg-white border rounded-lg overflow-hidden">
              {/* PC 테이블 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">코드</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">제품명</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">구매처</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">유형</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">매입가 (Pur)</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">최소가 (Min)</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">중간가 (Mid)</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPrices.map((pp) => (
                      <tr
                        key={pp.product.code}
                        className={`hover:bg-gray-50 ${pp.isModified ? 'bg-yellow-50' : ''}`}
                      >
                        <td className="px-4 py-3 font-mono text-sm text-gray-800 font-semibold">
                          {pp.product.code}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{pp.product.name_ko}</div>
                          <div className="text-sm text-gray-600">{pp.product.name_th}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {getVendorName(pp.product.vendorCode)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={pp.product.priceType === 'fresh' ? 'success' : 'info'}
                            size="sm"
                          >
                            {pp.product.priceType === 'fresh' ? '신선' : '공산품'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={pp.pur ?? ''}
                            onChange={(e) => handlePriceChange(pp.product.code, 'pur', e.target.value)}
                            className="w-24 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-green-500 text-gray-900"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={pp.min ?? ''}
                            onChange={(e) => handlePriceChange(pp.product.code, 'min', e.target.value)}
                            className="w-24 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-green-500 text-gray-900"
                            placeholder="0"
                            disabled={pp.product.priceType === 'fresh'}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={pp.mid ?? ''}
                            onChange={(e) => handlePriceChange(pp.product.code, 'mid', e.target.value)}
                            className="w-24 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-green-500 text-gray-900"
                            placeholder="0"
                            disabled={pp.product.priceType === 'fresh'}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {pp.isModified && (
                            <Badge variant="warning" size="sm">수정됨</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 */}
              <div className="md:hidden divide-y">
                {filteredPrices.map((pp) => (
                  <div
                    key={pp.product.code}
                    className={`p-4 ${pp.isModified ? 'bg-yellow-50' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{pp.product.name_ko}</span>
                          {pp.isModified && <Badge variant="warning" size="sm">수정됨</Badge>}
                        </div>
                        <div className="text-sm text-gray-700">{pp.product.code}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {getVendorName(pp.product.vendorCode)} |{' '}
                          {pp.product.priceType === 'fresh' ? '신선' : '공산품'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">매입가</label>
                        <input
                          type="number"
                          value={pp.pur ?? ''}
                          onChange={(e) => handlePriceChange(pp.product.code, 'pur', e.target.value)}
                          className="w-full px-2 py-1 text-center border border-gray-300 rounded text-sm text-gray-900"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">최소가</label>
                        <input
                          type="number"
                          value={pp.min ?? ''}
                          onChange={(e) => handlePriceChange(pp.product.code, 'min', e.target.value)}
                          className="w-full px-2 py-1 text-center border border-gray-300 rounded text-sm text-gray-900"
                          placeholder="0"
                          disabled={pp.product.priceType === 'fresh'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">중간가</label>
                        <input
                          type="number"
                          value={pp.mid ?? ''}
                          onChange={(e) => handlePriceChange(pp.product.code, 'mid', e.target.value)}
                          className="w-full px-2 py-1 text-center border border-gray-300 rounded text-sm text-gray-900"
                          placeholder="0"
                          disabled={pp.product.priceType === 'fresh'}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 하단 저장 바 (모바일) */}
          {modifiedCount > 0 && (
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">{modifiedCount}개 항목 변경됨</span>
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  초기화
                </Button>
              </div>
              <Button onClick={handleSaveAll} disabled={saving} className="w-full">
                <Save size={16} className="mr-1" />
                {saving ? '저장 중...' : '모두 저장'}
              </Button>
            </div>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
