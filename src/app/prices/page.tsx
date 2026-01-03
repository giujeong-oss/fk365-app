'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { useI18n } from '@/lib/i18n';
import { ProtectedRoute } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { Button, Spinner, Badge, EmptyState, Modal, useToast } from '@/components/ui';
import { getProducts, getVendors, updateProduct, getAllPriceHistory, setTodayPrice } from '@/lib/firebase';
import type { Product, Vendor, PriceType, PriceHistory } from '@/types';
import { Home, Save, Search, Percent, CheckSquare, Square } from 'lucide-react';
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
  const { t } = useI18n();
  const { showSuccess, showError, showWarning } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);
  const [freshPrices, setFreshPrices] = useState<FreshProductPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [activeTab, setActiveTab] = useState<'industrial' | 'fresh'>('fresh');

  // 일괄 수정 관련 상태
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkEditModal, setBulkEditModal] = useState(false);
  const [bulkEditType, setBulkEditType] = useState<'pur' | 'min' | 'mid' | 'all'>('all');
  const [bulkEditMode, setBulkEditMode] = useState<'percent' | 'fixed'>('percent');
  const [bulkEditValue, setBulkEditValue] = useState('');

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

  // 제품 선택 토글
  const toggleProductSelection = (code: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    const currentProducts = activeTab === 'industrial' ? filteredIndustrial : filteredFresh;
    const allCodes = currentProducts.map(p =>
      activeTab === 'industrial' ? (p as ProductPrice).product.code : (p as FreshProductPrice).product.code
    );

    if (selectedProducts.size === allCodes.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(allCodes));
    }
  };

  // 일괄 수정 적용
  const applyBulkEdit = () => {
    const value = parseFloat(bulkEditValue);
    if (isNaN(value)) {
      showWarning(t('common.required'));
      return;
    }

    setProductPrices(prev => prev.map(pp => {
      if (!selectedProducts.has(pp.product.code)) return pp;

      const applyChange = (original: number | undefined): number | undefined => {
        if (original === undefined) return undefined;
        if (bulkEditMode === 'percent') {
          return Math.round(original * (1 + value / 100));
        } else {
          return original + value;
        }
      };

      const newPp = { ...pp, isModified: true };
      if (bulkEditType === 'all' || bulkEditType === 'pur') {
        newPp.pur = applyChange(pp.pur);
      }
      if (bulkEditType === 'all' || bulkEditType === 'min') {
        newPp.min = applyChange(pp.min);
      }
      if (bulkEditType === 'all' || bulkEditType === 'mid') {
        newPp.mid = applyChange(pp.mid);
      }
      return newPp;
    }));

    showSuccess(`${selectedProducts.size}${t('prices.bulkApplied')}`);
    setBulkEditModal(false);
    setBulkEditValue('');
    setSelectedProducts(new Set());
  };

  const handleSaveIndustrial = async () => {
    setSaving(true);
    try {
      const modifiedItems = productPrices.filter((pp) => pp.isModified);

      if (modifiedItems.length === 0) {
        showWarning(t('common.noChanges'));
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

      showSuccess(`${modifiedItems.length}${t('common.itemsSaved')}`);
    } catch (error) {
      console.error('Failed to save prices:', error);
      showError(t('common.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFresh = async () => {
    setSaving(true);
    try {
      const modifiedItems = freshPrices.filter((fp) => fp.isModified && fp.todayPrice !== undefined);

      if (modifiedItems.length === 0) {
        showWarning(t('common.noChanges'));
        return;
      }

      for (const item of modifiedItems) {
        if (item.todayPrice !== undefined) {
          await setTodayPrice(item.product.code, item.todayPrice);
        }
      }

      // 데이터 다시 로드하여 max3day 업데이트
      await loadData();

      showSuccess(`${modifiedItems.length}${t('common.itemsSaved')}`);
    } catch (error) {
      console.error('Failed to save prices:', error);
      showError(t('common.saveFailed'));
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
        pageTitle={t('prices.title')}
        onLogout={signOut}
      >
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="secondary" size="sm">
                  <Home size={18} className="mr-1" />
                  {t('common.home')}
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('prices.title')}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {t('prices.industrialTab')} {productPrices.length}{t('common.count')} / {t('prices.freshTab')} {freshPrices.length}{t('common.count')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedProducts.size > 0 && activeTab === 'industrial' && (
                <Button
                  variant="secondary"
                  onClick={() => setBulkEditModal(true)}
                >
                  <Percent size={16} className="mr-1" />
                  {t('prices.bulkAdjust')} ({selectedProducts.size}{t('common.count')})
                </Button>
              )}
              {currentModifiedCount > 0 && (
                <Badge variant="warning">{currentModifiedCount}{t('common.modified')}</Badge>
              )}
              <Button variant="secondary" onClick={handleReset} disabled={currentModifiedCount === 0}>
                {t('common.reset')}
              </Button>
              <Button
                onClick={activeTab === 'industrial' ? handleSaveIndustrial : handleSaveFresh}
                disabled={saving || currentModifiedCount === 0}
              >
                <Save size={16} className="mr-1" />
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>

          {/* 탭 */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('fresh')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'fresh'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('prices.freshTab')} ({freshPrices.length})
            </button>
            <button
              onClick={() => setActiveTab('industrial')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'industrial'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('prices.industrialTab')} ({productPrices.length})
            </button>
          </div>

          {/* 필터 */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder={t('products.searchPlaceholder')}
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
              <option value="">{t('common.all')} {t('vendors.vendor')}</option>
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
                title={t('prices.noIndustrial')}
                description={searchTerm || selectedVendor ? t('stock.changeCondition') : t('stock.addProductFirst')}
              />
            ) : (
              <div className="bg-white border rounded-lg overflow-hidden">
                {/* PC 테이블 */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-3 text-center">
                          <button
                            onClick={toggleSelectAll}
                            className="p-1 hover:bg-gray-200 rounded"
                            title={selectedProducts.size === filteredIndustrial.length ? t('common.deselect') : t('common.selectAll')}
                          >
                            {selectedProducts.size === filteredIndustrial.length && filteredIndustrial.length > 0 ? (
                              <CheckSquare size={18} className="text-green-600" />
                            ) : (
                              <Square size={18} className="text-gray-500" />
                            )}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('table.code')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('table.name')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('table.vendor')}</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">{t('prices.purPrice')}</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">{t('prices.minPrice')}</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">{t('prices.midPrice')}</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">{t('table.status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredIndustrial.map((pp) => (
                        <tr
                          key={pp.product.code}
                          className={`hover:bg-gray-50 ${pp.isModified ? 'bg-yellow-50' : ''} ${selectedProducts.has(pp.product.code) ? 'bg-blue-50' : ''}`}
                        >
                          <td className="px-2 py-3 text-center">
                            <button
                              onClick={() => toggleProductSelection(pp.product.code)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              {selectedProducts.has(pp.product.code) ? (
                                <CheckSquare size={18} className="text-green-600" />
                              ) : (
                                <Square size={18} className="text-gray-500" />
                              )}
                            </button>
                          </td>
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
                              <Badge variant="warning" size="sm">{t('common.modified')}</Badge>
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
                            {pp.isModified && <Badge variant="warning" size="sm">{t('common.modified')}</Badge>}
                          </div>
                          <div className="text-sm text-gray-700">{pp.product.code}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {getVendorName(pp.product.vendorCode)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">{t('prices.purPrice')}</label>
                          <input
                            type="number"
                            value={pp.pur ?? ''}
                            onChange={(e) => handlePriceChange(pp.product.code, 'pur', e.target.value)}
                            className="w-full px-2 py-1 text-center border border-gray-300 rounded text-sm text-gray-900"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">{t('prices.minPrice')}</label>
                          <input
                            type="number"
                            value={pp.min ?? ''}
                            onChange={(e) => handlePriceChange(pp.product.code, 'min', e.target.value)}
                            className="w-full px-2 py-1 text-center border border-gray-300 rounded text-sm text-gray-900"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">{t('prices.midPrice')}</label>
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
                title={t('prices.noFresh')}
                description={searchTerm || selectedVendor ? t('stock.changeCondition') : t('stock.addProductFirst')}
              />
            ) : (
              <div className="bg-white border rounded-lg overflow-hidden">
                {/* PC 테이블 */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('table.code')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('table.name')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('table.vendor')}</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 bg-green-50">
                          {t('prices.max3Day')}
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 bg-blue-50">
                          {t('dashboard.today')} ({today.slice(5)})
                        </th>
                        {recentDates.slice(1, 4).map(date => (
                          <th key={date} className="px-3 py-3 text-center text-sm font-medium text-gray-500">
                            {date.slice(5)}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">{t('table.status')}</th>
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
                              <Badge variant="warning" size="sm">{t('common.modified')}</Badge>
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
                            {fp.isModified && <Badge variant="warning" size="sm">{t('common.modified')}</Badge>}
                          </div>
                          <div className="text-sm text-gray-700">{fp.product.code}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {getVendorName(fp.product.vendorCode)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">{t('prices.max3Day')}</div>
                          <div className="text-xl font-bold text-green-600">{fp.max3day || '-'}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">{t('prices.todayPrice')}</label>
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
                <span className="text-sm text-gray-700">{currentModifiedCount}{t('common.modified')}</span>
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  {t('common.reset')}
                </Button>
              </div>
              <Button
                onClick={activeTab === 'industrial' ? handleSaveIndustrial : handleSaveFresh}
                disabled={saving}
                className="w-full"
              >
                <Save size={16} className="mr-1" />
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          )}
        </div>

        {/* 일괄 수정 모달 */}
        <Modal
          isOpen={bulkEditModal}
          onClose={() => {
            setBulkEditModal(false);
            setBulkEditValue('');
          }}
          title={t('prices.bulkEditTitle')}
        >
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              {t('common.selected')}: <strong>{selectedProducts.size}{t('common.count')}</strong>
            </p>

            <div className="space-y-4">
              {/* 수정 대상 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('prices.adjustTarget')}</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'all', label: t('prices.allPrices') },
                    { value: 'pur', label: t('prices.onlyPur') },
                    { value: 'min', label: t('prices.onlyMin') },
                    { value: 'mid', label: t('prices.onlyMid') },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setBulkEditType(opt.value as 'all' | 'pur' | 'min' | 'mid')}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        bulkEditType === opt.value
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 수정 방식 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('prices.adjustMethod')}</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBulkEditMode('percent')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      bulkEditMode === 'percent'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Percent size={16} className="inline mr-1" />
                    {t('prices.percentMode')}
                  </button>
                  <button
                    onClick={() => setBulkEditMode('fixed')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      bulkEditMode === 'fixed'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t('prices.fixedMode')}
                  </button>
                </div>
              </div>

              {/* 수정 값 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('prices.adjustValue')}
                </label>
                <input
                  type="number"
                  value={bulkEditValue}
                  onChange={(e) => setBulkEditValue(e.target.value)}
                  placeholder={bulkEditMode === 'percent' ? t('prices.percentHint') : t('prices.fixedHint')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('prices.positiveIncrease')}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setBulkEditModal(false);
                  setBulkEditValue('');
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={applyBulkEdit}>
                {t('prices.apply')}
              </Button>
            </div>
          </div>
        </Modal>
      </MainLayout>
    </ProtectedRoute>
  );
}
