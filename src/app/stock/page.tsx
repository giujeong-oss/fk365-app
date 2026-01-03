'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/context';
import { useI18n } from '@/lib/i18n/I18nContext';
import type { TranslationKey } from '@/lib/i18n/translations';
import { ProtectedRoute } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { Button, Input, Spinner, Badge, EmptyState, Modal } from '@/components/ui';
import { getProducts, getAllStock, setStock, batchUpdateStock, getStockHistory } from '@/lib/firebase';
import type { Product, Stock, StockHistory } from '@/types';
import { Home, Download, Settings, History, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { exportToCsv, getDateForFilename, type CsvColumn } from '@/lib/utils';

// 보관장소 옵션 (다국어 키 사용)
const LOCATION_KEYS: { value: string; labelKey: TranslationKey }[] = [
  { value: '', labelKey: 'stock.noLocation' },
  { value: 'freezer', labelKey: 'stock.freezer' },
  { value: 'fridge', labelKey: 'stock.fridge' },
  { value: 'zone-a', labelKey: 'stock.zoneA' },
  { value: 'zone-b', labelKey: 'stock.zoneB' },
];

interface ProductStock {
  product: Product;
  qty: number;
  location: string;
  minStock: number;
  isModified: boolean;
}

export default function StockPage() {
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [productStocks, setProductStocks] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriceType, setSelectedPriceType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<string | null>(null); // productCode
  const [stockHistoryData, setStockHistoryData] = useState<StockHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 다국어 지원 보관장소 옵션 생성
  const getLocationOptions = () => LOCATION_KEYS.map(loc => ({
    value: loc.value,
    label: t(loc.labelKey)
  }));

  // 유형 라벨 가져오기
  const getPriceTypeLabel = (priceType: string) => {
    return priceType === 'fresh' ? t('products.fresh') : t('products.industrial');
  };

  // Tab 키 네비게이션을 위한 refs
  const qtyInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Tab 키로 다음 행 이동
  const handleKeyDown = (e: React.KeyboardEvent, productCode: string) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const codes = filteredStocks.map(ps => ps.product.code);
      const currentIndex = codes.indexOf(productCode);
      const nextIndex = currentIndex + 1;
      if (nextIndex < codes.length) {
        qtyInputRefs.current.get(codes[nextIndex])?.focus();
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      const codes = filteredStocks.map(ps => ps.product.code);
      const currentIndex = codes.indexOf(productCode);
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        qtyInputRefs.current.get(codes[prevIndex])?.focus();
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, stockData] = await Promise.all([
        getProducts(true),
        getAllStock(),
      ]);

      setProducts(productsData);

      // 카테고리 추출 삭제 - priceType 필터로 변경됨

      // 재고 맵 생성 (qty, location, minStock 포함)
      const stockMap = new Map<string, { qty: number; location: string; minStock: number }>();
      stockData.forEach((s) => {
        stockMap.set(s.code, { qty: s.qty, location: s.location || '', minStock: s.minStock || 0 });
      });

      // 제품별 재고 상태 생성
      const stocks: ProductStock[] = productsData.map((product) => {
        const stockInfo = stockMap.get(product.code);
        return {
          product,
          qty: stockInfo?.qty || 0,
          location: stockInfo?.location || '',
          minStock: stockInfo?.minStock || 0,
          isModified: false,
        };
      });

      setProductStocks(stocks);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (productCode: string, newQty: number) => {
    setProductStocks((prev) =>
      prev.map((ps) =>
        ps.product.code === productCode
          ? { ...ps, qty: Math.max(0, newQty), isModified: true }
          : ps
      )
    );
  };

  const handleLocationChange = (productCode: string, newLocation: string) => {
    setProductStocks((prev) =>
      prev.map((ps) =>
        ps.product.code === productCode
          ? { ...ps, location: newLocation, isModified: true }
          : ps
      )
    );
  };

  const handleMinStockChange = (productCode: string, newMinStock: number) => {
    setProductStocks((prev) =>
      prev.map((ps) =>
        ps.product.code === productCode
          ? { ...ps, minStock: Math.max(0, newMinStock), isModified: true }
          : ps
      )
    );
  };

  // 재고 히스토리 보기
  const handleViewHistory = async (productCode: string) => {
    setShowHistoryModal(productCode);
    setLoadingHistory(true);
    try {
      const history = await getStockHistory(productCode, 20);
      setStockHistoryData(history);
    } catch (error) {
      console.error('Failed to load stock history:', error);
      setStockHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const modifiedItems = productStocks
        .filter((ps) => ps.isModified)
        .map((ps) => ({
          productCode: ps.product.code,
          qty: ps.qty,
          location: ps.location,
          minStock: ps.minStock,
        }));

      if (modifiedItems.length === 0) {
        alert(t('common.noChanges'));
        return;
      }

      await batchUpdateStock(modifiedItems);

      // 수정 상태 초기화
      setProductStocks((prev) =>
        prev.map((ps) => ({ ...ps, isModified: false }))
      );

      alert(`${modifiedItems.length}${t('common.itemsSaved')}`);
    } catch (error) {
      console.error('Failed to save stock:', error);
      alert(t('common.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = () => {
    loadData();
  };

  // CSV Export handler
  const handleExportCsv = () => {
    const locationOptions = getLocationOptions();
    const getLocationLabel = (loc: string) => {
      const option = locationOptions.find(o => o.value === loc);
      return option?.label || loc || '';
    };

    const columns: CsvColumn<ProductStock>[] = [
      { header: t('products.code'), accessor: (ps) => ps.product.code },
      { header: t('products.name') + ' (KO)', accessor: (ps) => ps.product.name_ko },
      { header: t('products.name') + ' (TH)', accessor: (ps) => ps.product.name_th },
      { header: t('products.name') + ' (MM)', accessor: (ps) => ps.product.name_mm },
      { header: t('products.unit'), accessor: (ps) => ps.product.unit },
      { header: t('products.type'), accessor: (ps) => getPriceTypeLabel(ps.product.priceType) },
      { header: t('stock.location'), accessor: (ps) => getLocationLabel(ps.location) },
      { header: t('stock.qty'), accessor: (ps) => ps.qty },
    ];

    const filename = `stock_${getDateForFilename()}.csv`;
    exportToCsv(filteredStocks, columns, filename);
  };

  // 필터링
  const filteredStocks = productStocks.filter((ps) => {
    const matchesSearch =
      !searchTerm ||
      ps.product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ps.product.name_ko.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ps.product.name_th.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriceType = !selectedPriceType || ps.product.priceType === selectedPriceType;

    const matchesLocation = !selectedLocation || ps.location === selectedLocation;

    return matchesSearch && matchesPriceType && matchesLocation;
  });

  const modifiedCount = productStocks.filter((ps) => ps.isModified).length;
  const totalStock = productStocks.reduce((sum, ps) => sum + ps.qty, 0);

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle={t('stock.title')}
        onLogout={signOut}
      >
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="secondary" size="sm">
                <Home size={18} className="mr-1" />
                {t('common.home')}
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{t('stock.title')}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {t('stock.totalProducts')} {products.length}{t('common.count')} / {t('stock.totalStock')} {totalStock}{t('common.count')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {modifiedCount > 0 && (
              <Badge variant="warning">{modifiedCount}{t('common.count')} {t('stock.changed')}</Badge>
            )}
            <Button variant="secondary" onClick={handleExportCsv}>
              <Download size={18} className="mr-1" />
              CSV
            </Button>
            <Button variant="secondary" onClick={handleResetAll} disabled={modifiedCount === 0}>
              {t('common.reset')}
            </Button>
            <Button onClick={handleSaveAll} disabled={saving || modifiedCount === 0}>
              {saving ? t('common.saving') : t('stock.saveAll')}
            </Button>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              type="text"
              placeholder={`${t('products.code')} / ${t('products.name')} ${t('common.search')}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={selectedPriceType}
            onChange={(e) => setSelectedPriceType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">{t('common.all')} {t('products.type')}</option>
            <option value="fresh">{t('products.fresh')}</option>
            <option value="industrial">{t('products.industrial')}</option>
          </select>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">{t('common.all')} {t('stock.location')}</option>
            {getLocationOptions().filter(opt => opt.value).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={() => setShowLocationModal(true)}>
            <Settings size={18} className="mr-1" />
            {t('stock.locationManage')}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredStocks.length === 0 ? (
          <EmptyState
            title={t('stock.noProducts')}
            description={searchTerm || selectedPriceType ? t('stock.changeCondition') : t('stock.addProductFirst')}
          />
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            {/* PC 테이블 뷰 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-800">{t('products.code')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-800">{t('products.name')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-800">{t('products.unit')}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-800">{t('stock.location')}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-800">{t('stock.minStock')}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-800">{t('common.status')}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-800">{t('stock.stockQty')}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-800"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStocks.map((ps) => (
                    <tr
                      key={ps.product.code}
                      className={`hover:bg-gray-50 ${ps.isModified ? 'bg-yellow-50' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-sm text-gray-800 font-semibold">{ps.product.code}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{ps.product.name_ko}</div>
                        <div className="text-sm text-gray-700">{ps.product.name_th}</div>
                        <div className="text-sm text-gray-600">{ps.product.name_mm}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">{ps.product.unit}</td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={ps.location}
                          onChange={(e) => handleLocationChange(ps.product.code, e.target.value)}
                          className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                        >
                          {getLocationOptions().map((opt) => (
                            <option key={opt.value} value={opt.value} className="text-gray-900">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          value={ps.minStock || ''}
                          onChange={(e) =>
                            handleMinStockChange(ps.product.code, parseInt(e.target.value) || 0)
                          }
                          placeholder="0"
                          className="w-16 h-8 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {ps.isModified && (
                          <Badge variant="warning" size="sm">{t('stock.modified')}</Badge>
                        )}
                        {!ps.isModified && ps.qty === 0 && (
                          <Badge variant="danger" size="sm">{t('stock.outOfStock')}</Badge>
                        )}
                        {!ps.isModified && ps.qty > 0 && ps.minStock > 0 && ps.qty <= ps.minStock && (
                          <div className="flex items-center justify-center gap-1">
                            <AlertTriangle size={14} className="text-orange-500" />
                            <Badge variant="warning" size="sm">{t('stock.low')}</Badge>
                          </div>
                        )}
                        {!ps.isModified && ps.minStock === 0 && ps.qty > 0 && ps.qty <= 5 && (
                          <Badge variant="warning" size="sm">{t('stock.low')}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(ps.product.code, ps.qty - 1)}
                            className="w-8 h-8 bg-gray-200 rounded-l border border-gray-400 hover:bg-gray-300 text-gray-700 font-bold"
                          >
                            -
                          </button>
                          <input
                            ref={(el) => {
                              if (el) qtyInputRefs.current.set(ps.product.code, el);
                            }}
                            type="number"
                            value={ps.qty}
                            onChange={(e) =>
                              handleQtyChange(ps.product.code, parseInt(e.target.value) || 0)
                            }
                            onKeyDown={(e) => handleKeyDown(e, ps.product.code)}
                            className="w-20 h-8 text-center border-t border-b border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleQtyChange(ps.product.code, ps.qty + 1)}
                            className="w-8 h-8 bg-gray-200 rounded-r border border-gray-400 hover:bg-gray-300 text-gray-700 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleViewHistory(ps.product.code)}
                          className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title={t('stock.history')}
                        >
                          <History size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 뷰 */}
            <div className="md:hidden divide-y">
              {filteredStocks.map((ps) => (
                <div
                  key={ps.product.code}
                  className={`p-4 ${ps.isModified ? 'bg-yellow-50' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{ps.product.name_ko}</span>
                        {ps.isModified && <Badge variant="warning" size="sm">{t('stock.modified')}</Badge>}
                      </div>
                      <div className="text-sm text-gray-700">{ps.product.name_th}</div>
                      <div className="text-sm text-gray-600">{ps.product.name_mm}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {ps.product.code} | {ps.product.category || '-'} | {ps.product.unit}
                      </div>
                    </div>
                    {!ps.isModified && ps.qty === 0 && (
                      <Badge variant="danger" size="sm">{t('stock.outOfStock')}</Badge>
                    )}
                    {!ps.isModified && ps.qty > 0 && ps.qty <= 5 && (
                      <Badge variant="warning" size="sm">{t('stock.low')}</Badge>
                    )}
                  </div>

                  {/* 보관장소 선택 */}
                  <div className="mb-3">
                    <label className="text-xs text-gray-700 font-medium mb-1 block">{t('stock.location')}</label>
                    <select
                      value={ps.location}
                      onChange={(e) => handleLocationChange(ps.product.code, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                    >
                      {getLocationOptions().map((opt) => (
                        <option key={opt.value} value={opt.value} className="text-gray-900">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => handleQtyChange(ps.product.code, ps.qty - 1)}
                      className="w-10 h-10 bg-gray-200 rounded-l border border-gray-400 hover:bg-gray-300 text-lg text-gray-700 font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={ps.qty}
                      onChange={(e) =>
                        handleQtyChange(ps.product.code, parseInt(e.target.value) || 0)
                      }
                      className="w-24 h-10 text-center border-t border-b border-gray-400 focus:outline-none text-lg font-bold text-gray-900"
                    />
                    <button
                      onClick={() => handleQtyChange(ps.product.code, ps.qty + 1)}
                      className="w-10 h-10 bg-gray-200 rounded-r border border-gray-400 hover:bg-gray-300 text-lg text-gray-700 font-bold"
                    >
                      +
                    </button>
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
              <span className="text-sm text-gray-700">{modifiedCount}{t('common.count')} {t('stock.changed')}</span>
              <Button variant="secondary" size="sm" onClick={handleResetAll}>
                {t('common.reset')}
              </Button>
            </div>
            <Button onClick={handleSaveAll} disabled={saving} className="w-full">
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        )}
      </div>

      {/* 보관장소 관리 모달 */}
      <Modal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title={t('stock.locationManage')}
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            {t('stock.locationManageDesc')}
          </p>
          <div className="space-y-2">
            {getLocationOptions().filter(opt => opt.value).map((opt) => (
              <div key={opt.value} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">{opt.label}</span>
                <span className="text-sm text-gray-600">{opt.value}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600">
            * {t('stock.locationNote')}
          </p>
          <div className="flex justify-end pt-4">
            <Button variant="secondary" onClick={() => setShowLocationModal(false)}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 재고 히스토리 모달 */}
      <Modal
        isOpen={!!showHistoryModal}
        onClose={() => {
          setShowHistoryModal(null);
          setStockHistoryData([]);
        }}
        title={t('stock.historyTitle')}
      >
        <div className="space-y-4">
          {showHistoryModal && (
            <div className="text-sm text-gray-600 mb-2">
              {t('products.product')}: {products.find(p => p.code === showHistoryModal)?.name_ko || showHistoryModal}
            </div>
          )}

          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : stockHistoryData.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              {t('stock.noHistory')}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left">{t('stock.datetime')}</th>
                    <th className="px-2 py-2 text-center">{t('stock.changeType')}</th>
                    <th className="px-2 py-2 text-right">{t('stock.change')}</th>
                    <th className="px-2 py-2 text-right">{t('stock.result')}</th>
                    <th className="px-2 py-2 text-left">{t('stock.reason')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stockHistoryData.map((history) => (
                    <tr key={history.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 text-gray-600">
                        {history.createdAt.toLocaleDateString()}<br />
                        <span className="text-xs">{history.createdAt.toLocaleTimeString()}</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Badge
                          variant={history.type === 'in' ? 'success' : history.type === 'out' ? 'danger' : 'info'}
                          size="sm"
                        >
                          {history.type === 'in' ? t('stock.typeIn') : history.type === 'out' ? t('stock.typeOut') : t('stock.typeAdjust')}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        <span className={history.qty >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {history.qty >= 0 ? '+' : ''}{history.qty}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span className="text-gray-600">{history.prevQty}</span>
                        <span className="mx-1">→</span>
                        <span className="font-medium">{history.newQty}</span>
                      </td>
                      <td className="px-2 py-2 text-gray-600">{history.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button variant="secondary" onClick={() => {
              setShowHistoryModal(null);
              setStockHistoryData([]);
            }}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      </Modal>
      </MainLayout>
    </ProtectedRoute>
  );
}
