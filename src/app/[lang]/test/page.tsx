'use client';

import { useState, useEffect } from 'react';
import {
  getProducts,
  getCustomers,
  getAllStock,
  getStockHistory,
  getPurchaseOrdersByDate,
  getOrdersByCutoff,
} from '@/lib/firebase';
import type { Product, Customer, Stock, StockHistory, PurchaseOrder, Order } from '@/types';
import { Check, X, AlertTriangle, RefreshCw } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: unknown;
}

export default function TestPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const addResult = (name: string, status: 'success' | 'error', message: string, data?: unknown) => {
    setResults(prev => [...prev, { name, status, message, data }]);
  };

  const runAllTests = async () => {
    setLoading(true);
    setResults([]);

    // Test 1: Products API
    try {
      const productsData = await getProducts(true);
      setProducts(productsData);
      addResult('제품 조회 API', 'success', `${productsData.length}개 제품 로드 완료`, productsData.slice(0, 3));
    } catch (error) {
      addResult('제품 조회 API', 'error', `에러: ${error}`);
    }

    // Test 2: Customers API
    try {
      const customersData = await getCustomers(true);
      setCustomers(customersData);
      addResult('고객 조회 API', 'success', `${customersData.length}개 고객 로드 완료`, customersData.slice(0, 3));
    } catch (error) {
      addResult('고객 조회 API', 'error', `에러: ${error}`);
    }

    // Test 3: Stock API
    try {
      const stockData = await getAllStock();
      setStocks(stockData);
      const withMinStock = stockData.filter(s => s.minStock && s.minStock > 0);
      addResult('재고 조회 API', 'success', `${stockData.length}개 재고, ${withMinStock.length}개 안전재고 설정됨`, stockData.slice(0, 3));
    } catch (error) {
      addResult('재고 조회 API', 'error', `에러: ${error}`);
    }

    // Test 4: Stock History API
    try {
      const stocks = await getAllStock();
      if (stocks.length > 0) {
        const history = await getStockHistory(stocks[0].code, 5);
        addResult('재고 히스토리 API', 'success', `${stocks[0].code} 히스토리 ${history.length}건`, history);
      } else {
        addResult('재고 히스토리 API', 'success', '재고 데이터 없음 (테스트 스킵)');
      }
    } catch (error) {
      addResult('재고 히스토리 API', 'error', `에러: ${error}`);
    }

    // Test 5: Orders API
    try {
      const today = new Date();
      const [cut1, cut2, cut3] = await Promise.all([
        getOrdersByCutoff(today, 1),
        getOrdersByCutoff(today, 2),
        getOrdersByCutoff(today, 3),
      ]);
      const allOrders = [...cut1, ...cut2, ...cut3];
      setOrders(allOrders);

      // 할인 적용된 주문 확인
      const withDiscount = allOrders.filter(o => o.totalDiscount && o.totalDiscount > 0);
      addResult('주문 조회 API', 'success',
        `오늘 주문: cut1=${cut1.length}, cut2=${cut2.length}, cut3=${cut3.length}, 할인적용=${withDiscount.length}건`,
        allOrders.slice(0, 3)
      );
    } catch (error) {
      addResult('주문 조회 API', 'error', `에러: ${error}`);
    }

    // Test 6: Purchase Orders API
    try {
      const today = new Date();
      const poData = await getPurchaseOrdersByDate(today);
      setPurchaseOrders(poData);

      // 영수증 이미지 있는 발주서 확인
      const withReceipt = poData.filter(po => po.receiptImageUrl);
      addResult('발주서 조회 API', 'success',
        `오늘 발주서: ${poData.length}건, 영수증첨부=${withReceipt.length}건`,
        poData.slice(0, 3)
      );
    } catch (error) {
      addResult('발주서 조회 API', 'error', `에러: ${error}`);
    }

    setLoading(false);
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <Check className="w-5 h-5 text-green-600" />;
      case 'error': return <X className="w-5 h-5 text-red-600" />;
      default: return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FK365 테스트 페이지</h1>
              <p className="text-gray-600 mt-1">인증 없이 새 기능을 테스트합니다</p>
            </div>
            <button
              onClick={runAllTests}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? '테스트 중...' : '다시 테스트'}
            </button>
          </div>

          {/* Test Results */}
          <div className="space-y-3">
            {results.map((result, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  result.status === 'success' ? 'bg-green-50 border-green-200' :
                  result.status === 'error' ? 'bg-red-50 border-red-200' :
                  'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{result.name}</div>
                    <div className="text-sm text-gray-700">{result.message}</div>
                  </div>
                </div>
                {result.data ? (
                  <details className="mt-2">
                    <summary className="text-sm text-blue-600 cursor-pointer">데이터 보기</summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Feature Tests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 재고 - 안전재고 테스트 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">재고 - 안전재고 테스트</h2>
            {stocks.length === 0 ? (
              <p className="text-gray-600">재고 데이터 없음</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-auto">
                {stocks.slice(0, 10).map((stock) => (
                  <div
                    key={stock.code}
                    className={`p-3 rounded border ${
                      stock.minStock && stock.qty <= stock.minStock
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-sm">{stock.code}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">
                          재고: <strong className={stock.qty === 0 ? 'text-red-600' : 'text-gray-900'}>{stock.qty}</strong>
                        </span>
                        <span className="text-sm">
                          안전재고: <strong className="text-orange-600">{stock.minStock || 0}</strong>
                        </span>
                        {stock.minStock && stock.qty <= stock.minStock && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 주문 - 할인 테스트 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">주문 - 할인 테스트</h2>
            {orders.length === 0 ? (
              <p className="text-gray-600">오늘 주문 없음</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-auto">
                {orders.slice(0, 10).map((order) => (
                  <div key={order.id} className="p-3 rounded border bg-gray-50 border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{order.customerCode}</span>
                      <span className="text-sm text-gray-600">Cut {order.cutoff}</span>
                    </div>
                    <div className="mt-1 text-sm">
                      <span>합계: {order.totalAmount?.toLocaleString()}฿</span>
                      {order.totalDiscount && order.totalDiscount > 0 && (
                        <>
                          <span className="text-red-600 ml-2">-{order.totalDiscount?.toLocaleString()}฿</span>
                          <span className="text-green-600 ml-2 font-medium">
                            = {order.finalAmount?.toLocaleString()}฿
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 발주서 - 영수증 테스트 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">발주서 - 영수증 테스트</h2>
            {purchaseOrders.length === 0 ? (
              <p className="text-gray-600">오늘 발주서 없음</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-auto">
                {purchaseOrders.map((po) => (
                  <div key={po.id} className="p-3 rounded border bg-gray-50 border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{po.type}</span>
                      <span className="text-sm text-gray-600">{po.items.length}개 품목</span>
                    </div>
                    {po.receiptImageUrl && (
                      <div className="mt-2">
                        <a
                          href={po.receiptImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          영수증 이미지 보기
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 고객 - 제품 매핑 테스트 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">고객 - 제품 매핑</h2>
            {customers.length === 0 ? (
              <p className="text-gray-600">고객 데이터 없음</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-auto">
                {customers.slice(0, 10).map((customer) => (
                  <div key={customer.id} className="p-3 rounded border bg-gray-50 border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{customer.fullName}</span>
                        <span className="text-sm text-gray-600 ml-2">({customer.code})</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        customer.products && customer.products.length > 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {customer.products?.length || 0}개 제품
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">테스트 요약</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{products.length}</div>
              <div className="text-sm text-gray-600">제품</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{customers.length}</div>
              <div className="text-sm text-gray-600">고객</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stocks.length}</div>
              <div className="text-sm text-gray-600">재고</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{orders.length}</div>
              <div className="text-sm text-gray-600">오늘 주문</div>
            </div>
          </div>
        </div>

        <footer className="mt-6 text-center text-sm text-gray-600">
          FK365 Test Page - 인증 없이 API 테스트
        </footer>
      </div>
    </div>
  );
}
