'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { ProtectedRoute } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { Button, Spinner, Badge, EmptyState } from '@/components/ui';
import { getProducts, getVendors, updateProduct, getAllPriceHistory, setTodayPrice } from '@/lib/firebase';
import type { Product, Vendor, PriceType, PriceHistory } from '@/types';
import { Home, Save, Search } from 'lucide-react';
import Link from 'next/link';

interface ProductPrice {
  product: Product;
  isModified: boolean;
  pur: number | undefined;
  min: number | undefined;
  mid: number | undefined;
}

interface FreshProductPrice {
  product: Product;
  priceHistory: PriceHistory | null;
  todayPrice: number | undefined;
  max3day: number;
  isModified: boolean;
}

export default function PricesPage() {
  const { user, isAdmin, signOut } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);
  const [freshPrices, setFreshPrices] = useState<FreshProductPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [activeTab, setActiveTab] = useState<'industrial' | 'fresh'>('industrial');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, vendorsData, priceHistoryData] = await Promise.all([
        getProducts(true),
        getVendors(true),
        getAllPriceHistory(),
      ]);

      setProducts(productsData);
      setVendors(vendorsData);

      // 공산품 가격 상태
      const industrialProducts = productsData.filter(p => p.priceType === 'industrial');
      const prices: ProductPrice[] = industrialProducts.map((product) => ({
        product,
        isModified: false,
        pur: product.pur,
        min: product.min,
        mid: product.mid,
      }));
      setProductPrices(prices);

      // 신선제품 가격 상태
      const freshProducts = productsData.filter(p => p.priceType === 'fresh');
      const priceHistoryMap = new Map<string, PriceHistory>();
      priceHistoryData.forEach(ph => priceHistoryMap.set(ph.code, ph));

      const freshPriceStates: FreshProductPrice[] = freshProducts.map(product => {
        const history = priceHistoryMap.get(product.code) || null;
        const todayPriceValue = history?.prices[today];
        return {
          product,
          priceHistory: history,
          todayPrice: todayPriceValue,
          max3day: history?.max3day || 0,
          isModified: false,
        };
      });
      setFreshPrices(freshPriceStates);
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

  const handleFreshPriceChange = (productCode: string, value: string) => {
    const numValue = value === '' ? undefined : Number(value);
    setFreshPrices((prev) =>
      prev.map((fp) =>
        fp.product.code === productCode
          ? { ...fp, todayPrice: numValue, isModified: true }
          : fp
      )
    );
  };

  const handleSaveIndustrial = async () => {
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

  const handleSaveFresh = async () => {
    setSaving(true);
    try {
      const modifiedItems = freshPrices.filter((fp) => fp.isModified && fp.todayPrice !== undefined);

      if (modifiedItems.length === 0) {
        alert('변경된 항목이 없습니다.');
        return;
      }

      for (const item of modifiedItems) {
        if (item.todayPrice !== undefined) {
          await setTodayPrice(item.product.code, item.todayPrice);
        }
      }

      // 데이터 다시 로드하여 max3day 업데이트
      await loadData();

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

  // 최근 7일 날짜 배열 생성
  const getRecentDates = (days: number = 7) => {
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const recentDates = getRecentDates(7);

  // 필터링 - 공산품
  const filteredIndustrial = productPrices.filter((pp) => {
    const matchesSearch =
      !searchTerm ||
      pp.product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pp.product.name_ko.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVendor = !selectedVendor || pp.product.vendorCode === selectedVendor;
    return matchesSearch && matchesVendor;
  });

  // 필터링 - 신선제품
  const filteredFresh = freshPrices.filter((fp) => {
    const matchesSearch =
      !searchTerm ||
      fp.product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fp.product.name_ko.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVendor = !selectedVendor || fp.product.vendorCode === selectedVendor;
    return matchesSearch && matchesVendor;
  });

  const modifiedIndustrialCount = productPrices.filter((pp) => pp.isModified).length;
  const modifiedFreshCount = freshPrices.filter((fp) => fp.isModified).length;
  const currentModifiedCount = activeTab === 'industrial' ? modifiedIndustrialCount : modifiedFreshCount;

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
                  공산품 {productPrices.length}개 / 신선제품 {freshPrices.length}개
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentModifiedCount > 0 && (
                <Badge variant="warning">{currentModifiedCount}개 변경됨</Badge>
              )}
              <Button variant="secondary" onClick={handleReset} disabled={currentModifiedCount === 0}>
                초기화
              </Button>
              <Button
                onClick={activeTab === 'industrial' ? handleSaveIndustrial : handleSaveFresh}
                disabled={saving || currentModifiedCount === 0}
              >
                <Save size={16} className="mr-1" />
                {saving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>

          {/* 탭 */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('industrial')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'industrial'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              공산품 ({productPrices.length})
            </button>
            <button
              onClick={() => setActiveTab('fresh')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'fresh'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              신선제품 ({freshPrices.length})
            </button>
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
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : activeTab === 'industrial' ? (
            // 공산품 탭
            filteredIndustrial.length === 0 ? (
              <EmptyState
                title="공산품이 없습니다"
                description={searchTerm || selectedVendor ? '검색 조건을 변경해보세요.' : '먼저 공산품을 등록해주세요.'}
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
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">매입가 (VAT포함)</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">최소가 (Min)</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">중간가 (Mid)</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredIndustrial.map((pp) => (
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
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={pp.mid ?? ''}
                              onChange={(e) => handlePriceChange(pp.product.code, 'mid', e.target.value)}
                              className="w-24 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-green-500 text-gray-900"
                              placeholder="0"
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
                  {filteredIndustrial.map((pp) => (
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
                            {getVendorName(pp.product.vendorCode)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">매입가(VAT)</label>
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
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            // 신선제품 탭
            filteredFresh.length === 0 ? (
              <EmptyState
                title="신선제품이 없습니다"
                description={searchTerm || selectedVendor ? '검색 조건을 변경해보세요.' : '먼저 신선제품을 등록해주세요.'}
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
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 bg-green-50">
                          3일 최고가
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 bg-blue-50">
                          오늘 ({today.slice(5)})
                        </th>
                        {recentDates.slice(1, 4).map(date => (
                          <th key={date} className="px-3 py-3 text-center text-sm font-medium text-gray-500">
                            {date.slice(5)}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredFresh.map((fp) => (
                        <tr
                          key={fp.product.code}
                          className={`hover:bg-gray-50 ${fp.isModified ? 'bg-yellow-50' : ''}`}
                        >
                          <td className="px-4 py-3 font-mono text-sm text-gray-800 font-semibold">
                            {fp.product.code}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{fp.product.name_ko}</div>
                            <div className="text-sm text-gray-600">{fp.product.name_th}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {getVendorName(fp.product.vendorCode)}
                          </td>
                          <td className="px-4 py-3 text-center bg-green-50">
                            <span className="text-lg font-bold text-green-600">
                              {fp.max3day || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 bg-blue-50">
                            <input
                              type="number"
                              value={fp.todayPrice ?? ''}
                              onChange={(e) => handleFreshPriceChange(fp.product.code, e.target.value)}
                              className="w-20 px-2 py-1 text-center border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 text-gray-900 font-semibold"
                              placeholder="0"
                            />
                          </td>
                          {recentDates.slice(1, 4).map(date => (
                            <td key={date} className="px-3 py-3 text-center text-sm text-gray-600">
                              {fp.priceHistory?.prices[date] || '-'}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center">
                            {fp.isModified && (
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
                  {filteredFresh.map((fp) => (
                    <div
                      key={fp.product.code}
                      className={`p-4 ${fp.isModified ? 'bg-yellow-50' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{fp.product.name_ko}</span>
                            {fp.isModified && <Badge variant="warning" size="sm">수정됨</Badge>}
                          </div>
                          <div className="text-sm text-gray-700">{fp.product.code}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {getVendorName(fp.product.vendorCode)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">3일 최고가</div>
                          <div className="text-xl font-bold text-green-600">{fp.max3day || '-'}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">오늘 매입가</label>
                          <input
                            type="number"
                            value={fp.todayPrice ?? ''}
                            onChange={(e) => handleFreshPriceChange(fp.product.code, e.target.value)}
                            className="w-full px-3 py-2 text-center border border-blue-300 rounded text-lg font-semibold text-gray-900"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 text-xs text-gray-500">
                        {recentDates.slice(1, 4).map(date => (
                          <div key={date} className="flex-1 text-center bg-gray-100 rounded py-1">
                            <div>{date.slice(5)}</div>
                            <div className="font-medium text-gray-700">
                              {fp.priceHistory?.prices[date] || '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* 하단 저장 바 (모바일) */}
          {currentModifiedCount > 0 && (
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">{currentModifiedCount}개 항목 변경됨</span>
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  초기화
                </Button>
              </div>
              <Button
                onClick={activeTab === 'industrial' ? handleSaveIndustrial : handleSaveFresh}
                disabled={saving}
                className="w-full"
              >
                <Save size={16} className="mr-1" />
                {saving ? '저장 중...' : '저장'}
              </Button>
            </div>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
