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
import { Home } from 'lucide-react';
import Link from 'next/link';

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

        const vendorProducts = productSummaries.filter(
          (s) => s.product.vendorCode === selectedVendor && s.buy1 > 0
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

  const getProductName = (productCode: string) => {
    return products.find((p) => p.code === productCode)?.name_ko || productCode;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // 탭별 데이터 필터링
  const getFilteredSummaries = () => {
    if (activeTab === 'buy1') {
      return selectedVendor
        ? productSummaries.filter((s) => s.product.vendorCode === selectedVendor && s.buy1 > 0)
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
                      <div className="text-right">
                        <div className="font-medium">
                          {po.totalAmount ? formatCurrency(po.totalAmount) : '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {po.createdAt.toLocaleTimeString()}
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
                    {activeTab === 'buy1' && (
                      <>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">1차 주문</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">재고</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">발주량</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">구매처</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {getFilteredSummaries().map((summary) => (
                    <tr key={summary.product.code} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{summary.product.name_ko}</div>
                        <div className="text-sm text-gray-500">{summary.product.code}</div>
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
                      <td className="px-4 py-3 text-right text-sm text-gray-500">
                        {getVendorName(summary.product.vendorCode)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {getFilteredSummaries().length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  발주할 제품이 없습니다.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
