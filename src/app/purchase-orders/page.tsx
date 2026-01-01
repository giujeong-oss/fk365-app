'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { ProtectedRoute } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { Button, Spinner, Badge, EmptyState } from '@/components/ui';
import {
  getProducts,
  getVendors,
  getOrderSummaryByProduct,
  getStockMap,
  getPurchaseOrdersByDate,
  createPurchaseOrder,
  generateBuy1PurchaseOrder,
  generateBuy2PurchaseOrder,
  generateBuy3PurchaseOrder,
  getOrdersByCutoff,
} from '@/lib/firebase';
import type { Product, Vendor, PurchaseOrder, Cutoff } from '@/types';
import { Home, Printer, X, Download, FileDown } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';
import { exportToCsv, getDateForFilename, type CsvColumn } from '@/lib/utils';

type POType = 'buy1' | 'buy2' | 'buy3';

interface ProductSummary {
  product: Product;
  cut1: number;
  cut2: number;
  cut3: number;
  stock: number;
  buy1: number;
  buy2: number;
  buy3: number;
  overrideVendorCode?: string; // 임시 구매처 변경용
}

export default function PurchaseOrdersPage() {
  const { user, isAdmin, signOut } = useAuth();
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [productSummaries, setProductSummaries] = useState<ProductSummary[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<POType | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [activeTab, setActiveTab] = useState<POType>('buy1');
  const [printPO, setPrintPO] = useState<PurchaseOrder | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    setLoading(true);
    try {
      const selectedDate = new Date(date);
      const [productsData, vendorsData, stockMap, existingPOs] = await Promise.all([
        getProducts(true),
        getVendors(true),
        getStockMap(),
        getPurchaseOrdersByDate(selectedDate),
      ]);

      setProducts(productsData);
      setVendors(vendorsData);
      setPurchaseOrders(existingPOs);

      // cutoff별 주문 합계 계산
      const [cut1Orders, cut2Orders, cut3Orders] = await Promise.all([
        getOrdersByCutoff(selectedDate, 1),
        getOrdersByCutoff(selectedDate, 2),
        getOrdersByCutoff(selectedDate, 3),
      ]);

      // 제품별 수량 합산
      const cut1Map = new Map<string, number>();
      const cut2Map = new Map<string, number>();
      const cut3Map = new Map<string, number>();

      cut1Orders.forEach((order) => {
        order.items.forEach((item) => {
          cut1Map.set(item.productCode, (cut1Map.get(item.productCode) || 0) + item.qty);
        });
      });

      cut2Orders.forEach((order) => {
        order.items.forEach((item) => {
          cut2Map.set(item.productCode, (cut2Map.get(item.productCode) || 0) + item.qty);
        });
      });

      cut3Orders.forEach((order) => {
        order.items.forEach((item) => {
          cut3Map.set(item.productCode, (cut3Map.get(item.productCode) || 0) + item.qty);
        });
      });

      // 제품별 요약 생성
      const summaries: ProductSummary[] = productsData.map((product) => {
        const cut1 = cut1Map.get(product.code) || 0;
        const cut2 = cut2Map.get(product.code) || 0;
        const cut3 = cut3Map.get(product.code) || 0;
        const stock = stockMap.get(product.code) || 0;

        return {
          product,
          cut1,
          cut2,
          cut3,
          stock,
          buy1: Math.max(0, cut1 - stock),
          buy2: cut2,
          buy3: cut3,
        };
      });

      // buy 수량이 있는 제품만 필터
      setProductSummaries(summaries.filter((s) => s.buy1 > 0 || s.buy2 > 0 || s.buy3 > 0));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePO = async (type: POType) => {
    setGenerating(type);
    try {
      const selectedDate = new Date(date);

      if (type === 'buy1') {
        if (!selectedVendor) {
          alert('구매처를 선택해주세요.');
          return;
        }

        // 선택된 구매처 또는 해당 구매처로 override된 제품 모두 포함
        const vendorProducts = productSummaries.filter(
          (s) => getEffectiveVendorCode(s) === selectedVendor && s.buy1 > 0
        );

        if (vendorProducts.length === 0) {
          alert('해당 구매처의 발주 제품이 없습니다.');
          return;
        }

        await generateBuy1PurchaseOrder(
          selectedDate,
          selectedVendor,
          vendorProducts.map((s) => ({
            productCode: s.product.code,
            cut1: s.cut1,
            stock: s.stock,
          }))
        );
      } else if (type === 'buy2') {
        const buy2Products = productSummaries.filter((s) => s.buy2 > 0);
        if (buy2Products.length === 0) {
          alert('2차 발주 제품이 없습니다.');
          return;
        }

        await generateBuy2PurchaseOrder(
          selectedDate,
          buy2Products.map((s) => ({
            productCode: s.product.code,
            qty: s.buy2,
          }))
        );
      } else if (type === 'buy3') {
        const buy3Products = productSummaries.filter((s) => s.buy3 > 0);
        if (buy3Products.length === 0) {
          alert('3차 발주 제품이 없습니다.');
          return;
        }

        await generateBuy3PurchaseOrder(
          selectedDate,
          buy3Products.map((s) => ({
            productCode: s.product.code,
            qty: s.buy3,
          }))
        );
      }

      await loadData();
      alert('발주서가 생성되었습니다.');
    } catch (error) {
      console.error('Failed to generate PO:', error);
      alert('발주서 생성에 실패했습니다.');
    } finally {
      setGenerating(null);
    }
  };

  const getVendorName = (vendorCode: string) => {
    return vendors.find((v) => v.code === vendorCode)?.name || vendorCode;
  };

  // 제품별 구매처 임시 변경
  const handleVendorOverride = (productCode: string, newVendorCode: string) => {
    setProductSummaries((prev) =>
      prev.map((s) =>
        s.product.code === productCode
          ? { ...s, overrideVendorCode: newVendorCode || undefined }
          : s
      )
    );
  };

  // 실제 사용할 구매처 코드 반환 (override가 있으면 override 사용)
  const getEffectiveVendorCode = (summary: ProductSummary): string => {
    return summary.overrideVendorCode !== undefined
      ? summary.overrideVendorCode
      : summary.product.vendorCode;
  };

  const getProductName = (productCode: string) => {
    return products.find((p) => p.code === productCode)?.name_ko || productCode;
  };

  const getProductDetails = (productCode: string) => {
    return products.find((p) => p.code === productCode);
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>발주서 - ${printPO?.vendorCode ? getVendorName(printPO.vendorCode) : printPO?.note || ''}</title>
            <style>
              @page { size: A4; margin: 10mm; }
              body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .header h1 { margin: 0; font-size: 24px; }
              .header .date { font-size: 14px; color: #666; margin-top: 5px; }
              .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 8px; background: #f5f5f5; }
              .info-row span { font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background: #f0f0f0; font-weight: bold; }
              td.number { text-align: right; }
              .total { margin-top: 15px; text-align: right; font-size: 16px; font-weight: bold; }
              .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #888; }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            ${printRef.current.innerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  const getPOTypeLabel = (type: POType) => {
    switch (type) {
      case 'buy1': return '1차 발주 (정상)';
      case 'buy2': return '2차 발주 (끌렁떠이 추가)';
      case 'buy3': return '3차 발주 (라라무브 긴급)';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // 업체별 CSV 다운로드 (buy1 전용)
  const handleExportByVendor = () => {
    const buy1Products = productSummaries.filter((s) => s.buy1 > 0);
    if (buy1Products.length === 0) {
      alert('내보낼 제품이 없습니다.');
      return;
    }

    // 구매처별로 그룹화
    const vendorGroups = new Map<string, ProductSummary[]>();
    buy1Products.forEach((summary) => {
      const vendorCode = getEffectiveVendorCode(summary);
      if (!vendorCode) return;
      if (!vendorGroups.has(vendorCode)) {
        vendorGroups.set(vendorCode, []);
      }
      vendorGroups.get(vendorCode)!.push(summary);
    });

    if (vendorGroups.size === 0) {
      alert('구매처가 지정된 제품이 없습니다.');
      return;
    }

    // 각 구매처별로 CSV 생성
    vendorGroups.forEach((summaries, vendorCode) => {
      const vendorName = getVendorName(vendorCode);
      const columns: CsvColumn<ProductSummary>[] = [
        { header: '코드', accessor: (s) => s.product.code },
        { header: '제품명(한국어)', accessor: (s) => s.product.name_ko },
        { header: '제품명(태국어)', accessor: (s) => s.product.name_th },
        { header: '단위', accessor: (s) => s.product.unit },
        { header: '1차주문', accessor: (s) => s.cut1 },
        { header: '재고', accessor: (s) => s.stock },
        { header: '발주량', accessor: (s) => s.buy1 },
      ];

      const filename = `발주서_${vendorName}_${getDateForFilename()}.csv`;
      exportToCsv(summaries, columns, filename);
    });

    alert(`${vendorGroups.size}개 업체의 발주서가 다운로드되었습니다.`);
  };

  // 현재 탭의 전체 발주 목록 CSV 다운로드
  const handleExportCurrentTab = () => {
    const summaries = getFilteredSummaries();
    if (summaries.length === 0) {
      alert('내보낼 제품이 없습니다.');
      return;
    }

    const buyKey = activeTab === 'buy1' ? 'buy1' : activeTab === 'buy2' ? 'buy2' : 'buy3';
    const typeLabel = activeTab === 'buy1' ? '1차발주' : activeTab === 'buy2' ? '2차발주' : '3차발주';

    const columns: CsvColumn<ProductSummary>[] = [
      { header: '코드', accessor: (s) => s.product.code },
      { header: '제품명(한국어)', accessor: (s) => s.product.name_ko },
      { header: '제품명(태국어)', accessor: (s) => s.product.name_th },
      { header: '단위', accessor: (s) => s.product.unit },
      { header: '유형', accessor: (s) => s.product.priceType === 'fresh' ? '신선' : '공산품' },
      { header: '구매처', accessor: (s) => getVendorName(getEffectiveVendorCode(s)) },
      { header: '발주량', accessor: (s) => s[buyKey as 'buy1' | 'buy2' | 'buy3'] },
    ];

    const filename = `발주서_${typeLabel}_${getDateForFilename()}.csv`;
    exportToCsv(summaries, columns, filename);
  };

  // 탭별 데이터 필터링
  const getFilteredSummaries = () => {
    if (activeTab === 'buy1') {
      return selectedVendor
        ? productSummaries.filter((s) => getEffectiveVendorCode(s) === selectedVendor && s.buy1 > 0)
        : productSummaries.filter((s) => s.buy1 > 0);
    } else if (activeTab === 'buy2') {
      return productSummaries.filter((s) => s.buy2 > 0);
    } else {
      return productSummaries.filter((s) => s.buy3 > 0);
    }
  };

  const existingPOsForTab = purchaseOrders.filter((po) => po.type === activeTab);

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="발주서"
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
            <h1 className="text-2xl font-bold">발주서</h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Button variant="secondary" size="sm" onClick={handleExportCurrentTab}>
              <Download size={16} className="mr-1" />
              CSV
            </Button>
            {activeTab === 'buy1' && (
              <Button variant="secondary" size="sm" onClick={handleExportByVendor}>
                <FileDown size={16} className="mr-1" />
                업체별
              </Button>
            )}
          </div>
        </div>

        {/* 탭 */}
        <div className="flex border-b mb-6">
          <button
            onClick={() => setActiveTab('buy1')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'buy1'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            1차 발주 (buy1)
          </button>
          <button
            onClick={() => setActiveTab('buy2')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'buy2'
                ? 'border-b-2 border-yellow-500 text-yellow-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            2차 발주 (buy2)
          </button>
          <button
            onClick={() => setActiveTab('buy3')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'buy3'
                ? 'border-b-2 border-red-500 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            3차 발주 (buy3)
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* buy1 전용: 구매처 선택 */}
            {activeTab === 'buy1' && (
              <div className="flex items-center gap-4 mb-4">
                <select
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">전체 구매처</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.code}>
                      {vendor.name} ({vendor.code})
                    </option>
                  ))}
                </select>
                <Button
                  onClick={() => handleGeneratePO('buy1')}
                  disabled={generating === 'buy1' || !selectedVendor}
                >
                  {generating === 'buy1' ? '생성 중...' : '발주서 생성'}
                </Button>
              </div>
            )}

            {/* buy2/buy3: 발주서 생성 버튼 */}
            {(activeTab === 'buy2' || activeTab === 'buy3') && (
              <div className="flex items-center gap-4 mb-4">
                <Badge variant={activeTab === 'buy2' ? 'warning' : 'danger'}>
                  {activeTab === 'buy2' ? '끌렁떠이 추가' : '라라무브 긴급'}
                </Badge>
                <Button
                  onClick={() => handleGeneratePO(activeTab)}
                  disabled={generating === activeTab}
                  variant={activeTab === 'buy3' ? 'danger' : 'primary'}
                >
                  {generating === activeTab ? '생성 중...' : '발주서 생성'}
                </Button>
              </div>
            )}

            {/* 기존 발주서 목록 */}
            {existingPOsForTab.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-green-700 mb-2">생성된 발주서</h3>
                <div className="space-y-2">
                  {existingPOsForTab.map((po) => (
                    <div key={po.id} className="flex items-center justify-between bg-white p-3 rounded border">
                      <div>
                        <span className="font-medium">
                          {po.vendorCode ? getVendorName(po.vendorCode) : po.note}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          {po.items.length}개 품목
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPrintPO(po)}
                        >
                          <Printer size={16} className="mr-1" />
                          인쇄
                        </Button>
                        <div className="text-right">
                          <div className="font-medium">
                            {po.totalAmount ? formatCurrency(po.totalAmount) : '-'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {po.createdAt.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 발주 대상 제품 목록 */}
            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">제품</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">유형</th>
                    {activeTab === 'buy1' && (
                      <>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">1차 주문</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">재고</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">발주량</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">구매처</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {getFilteredSummaries().map((summary) => {
                    const effectiveVendorCode = getEffectiveVendorCode(summary);
                    const isOverridden = summary.overrideVendorCode !== undefined;

                    return (
                      <tr key={summary.product.code} className={`hover:bg-gray-50 ${isOverridden ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{summary.product.name_ko}</div>
                          <div className="text-sm text-gray-500">{summary.product.code}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={summary.product.priceType === 'fresh' ? 'success' : 'info'}
                            size="sm"
                          >
                            {summary.product.priceType === 'fresh' ? '신선' : '공산품'}
                          </Badge>
                        </td>
                        {activeTab === 'buy1' && (
                          <>
                            <td className="px-4 py-3 text-right">{summary.cut1}</td>
                            <td className="px-4 py-3 text-right">{summary.stock}</td>
                          </>
                        )}
                        <td className="px-4 py-3 text-right font-bold text-blue-600">
                          {activeTab === 'buy1' ? summary.buy1 : activeTab === 'buy2' ? summary.buy2 : summary.buy3}
                        </td>
                        <td className="px-4 py-3">
                          {/* 신선 제품은 구매처 변경 가능 */}
                          {summary.product.priceType === 'fresh' ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={effectiveVendorCode}
                                onChange={(e) => handleVendorOverride(summary.product.code, e.target.value)}
                                className={`px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 ${
                                  isOverridden ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
                                }`}
                              >
                                <option value="">선택 안함</option>
                                {vendors.map((v) => (
                                  <option key={v.code} value={v.code}>
                                    {v.name}
                                  </option>
                                ))}
                              </select>
                              {isOverridden && (
                                <button
                                  onClick={() => handleVendorOverride(summary.product.code, summary.product.vendorCode)}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                  title="원래 구매처로 복원"
                                >
                                  원복
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-700">
                              {getVendorName(summary.product.vendorCode)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {getFilteredSummaries().length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  발주할 제품이 없습니다.
                </div>
              )}
            </div>

            {/* 신선 제품 구매처 변경 안내 */}
            {activeTab === 'buy1' && productSummaries.some(s => s.product.priceType === 'fresh' && s.buy1 > 0) && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <strong>신선 제품 구매처 변경:</strong> 신선 제품은 당일 가격에 따라 구매처를 변경할 수 있습니다.
                드롭다운에서 다른 구매처를 선택하세요.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 발주서 인쇄 모달 */}
      {printPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">발주서 미리보기</h3>
              <div className="flex items-center gap-2">
                <Button onClick={handlePrint}>
                  <Printer size={18} className="mr-1" />
                  인쇄
                </Button>
                <button
                  onClick={() => setPrintPO(null)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div ref={printRef}>
                <div className="header">
                  <h1>발주서</h1>
                  <div className="date">{date}</div>
                </div>

                <div className="info-row">
                  <div>
                    <strong>발주 유형:</strong> {getPOTypeLabel(printPO.type as POType)}
                  </div>
                  <div>
                    <strong>구매처:</strong> {printPO.vendorCode ? getVendorName(printPO.vendorCode) : (printPO.note || '전체')}
                  </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>코드</th>
                      <th>제품명</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>유형</th>
                      <th style={{ width: '80px', textAlign: 'right' }}>수량</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>단가</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printPO.items.map((item, idx) => {
                      const product = getProductDetails(item.productCode);
                      const unitPrice = item.buyPrice || 0;
                      const amount = item.buyQty * unitPrice;
                      return (
                        <tr key={idx}>
                          <td>{item.productCode}</td>
                          <td>
                            <div>{product?.name_ko || item.productCode}</div>
                            {product?.name_th && (
                              <div style={{ fontSize: '11px', color: '#888' }}>{product.name_th}</div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {product?.priceType === 'fresh' ? '신선' : '공산품'}
                          </td>
                          <td className="number">{item.buyQty}</td>
                          <td className="number">{formatCurrency(unitPrice)}</td>
                          <td className="number">{formatCurrency(amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="total">
                  총 금액: {formatCurrency(printPO.totalAmount || 0)}
                </div>

                <div className="footer">
                  Fresh Kitchen 365 - {new Date().toLocaleDateString('ko-KR')} {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 생성
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </MainLayout>
    </ProtectedRoute>
  );
}
