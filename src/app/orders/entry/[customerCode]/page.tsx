'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context';
import { ProtectedRoute } from '@/components/auth';
import { Button, Select, Spinner, Badge, Input } from '@/components/ui';
import {
  getCustomerByCode,
  getProducts,
  getOrdersByCustomer,
  createOrder,
  updateOrderItems,
  deleteOrder,
  getCustomerProductAdj,
  getFreshMarginMap,
  getIndustrialMarginMap,
} from '@/lib/firebase';
import { calculateSellPrice as calcPrice } from '@/lib/utils';
import type { Customer, Product, Order, OrderItem, Cutoff, Grade, IndustrialMargin } from '@/types';
import Link from 'next/link';

const CUTOFF_OPTIONS = [
  { value: '1', label: '1차 (정상)' },
  { value: '2', label: '2차 (추가)' },
  { value: '3', label: '3차 (긴급)' },
];

interface ProductOrderState {
  product: Product;
  qty: number;
  baseAdj: number;
  orderAdj: number;
  sellPrice: number;
}

export default function OrderEntryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const customerCode = params.customerCode as string;
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [existingOrders, setExistingOrders] = useState<Order[]>([]);
  const [productStates, setProductStates] = useState<ProductOrderState[]>([]);
  const [cutoff, setCutoff] = useState<string>('1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [freshMarginMap, setFreshMarginMap] = useState<Map<Grade, number>>(new Map());
  const [industrialMarginMap, setIndustrialMarginMap] = useState<Map<Grade, IndustrialMargin>>(new Map());

  useEffect(() => {
    loadData();
  }, [customerCode, dateParam]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customerData, allProducts, freshMap, industrialMap] = await Promise.all([
        getCustomerByCode(customerCode),
        getProducts(true),
        getFreshMarginMap(),
        getIndustrialMarginMap(),
      ]);

      if (!customerData) {
        router.push('/orders');
        return;
      }

      setCustomer(customerData);
      setFreshMarginMap(freshMap);
      setIndustrialMarginMap(industrialMap);

      // 고객이 주문 가능한 제품만 필터
      const customerProducts = allProducts.filter((p) =>
        customerData.products.includes(p.code)
      );
      setProducts(customerProducts);

      // 기존 주문 로드
      const orders = await getOrdersByCustomer(customerCode, new Date(dateParam));
      setExistingOrders(orders);

      // 제품별 adj 로드 및 상태 초기화
      const states: ProductOrderState[] = await Promise.all(
        customerProducts.map(async (product) => {
          const adjData = await getCustomerProductAdj(customerCode, product.code);
          const baseAdj = adjData?.adj || 0;

          // 기존 주문에서 수량/adj 가져오기
          let qty = 0;
          let orderAdj = 0;
          orders.forEach((order) => {
            const item = order.items.find((i) => i.productCode === product.code);
            if (item) {
              qty += item.qty;
              orderAdj = item.orderAdj;
            }
          });

          // 제품에 저장된 등급별 판매가가 있으면 사용
          const preCalcPrice = (product as Product & { prices?: Record<string, number> }).prices?.[customerData.grade];
          const sellPrice = preCalcPrice
            ? preCalcPrice + baseAdj + orderAdj
            : calculateSellPriceWithMargin(product, customerData.grade, freshMap, industrialMap, baseAdj + orderAdj);

          return {
            product,
            qty,
            baseAdj,
            orderAdj,
            sellPrice,
          };
        })
      );

      setProductStates(states);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 마진을 적용한 판매가 계산
  const calculateSellPriceWithMargin = (
    product: Product,
    grade: Grade,
    freshMap: Map<Grade, number>,
    industrialMap: Map<Grade, IndustrialMargin>,
    totalAdj: number
  ): number => {
    const result = calcPrice(product, grade, freshMap, industrialMap, product.pur || 0, totalAdj);
    return result.sellPrice;
  };

  // 현재 상태에서 판매가 계산
  const calculateCurrentSellPrice = (product: Product, totalAdj: number): number => {
    if (!customer) return 0;

    // 제품에 저장된 등급별 판매가가 있으면 사용
    const preCalcPrice = (product as Product & { prices?: Record<string, number> }).prices?.[customer.grade];
    if (preCalcPrice) {
      return preCalcPrice + totalAdj;
    }

    return calculateSellPriceWithMargin(product, customer.grade, freshMarginMap, industrialMarginMap, totalAdj);
  };

  const handleQtyChange = (productCode: string, newQty: number) => {
    setProductStates((prev) =>
      prev.map((state) =>
        state.product.code === productCode
          ? { ...state, qty: Math.max(0, newQty) }
          : state
      )
    );
  };

  const handleOrderAdjChange = (productCode: string, newAdj: number) => {
    setProductStates((prev) =>
      prev.map((state) =>
        state.product.code === productCode
          ? {
              ...state,
              orderAdj: newAdj,
              sellPrice: calculateCurrentSellPrice(
                state.product,
                state.baseAdj + newAdj
              ),
            }
          : state
      )
    );
  };

  const saveOrder = async () => {
    if (!customer || !user) return;

    setSaving(true);
    try {
      // 주문 아이템 생성
      const items: OrderItem[] = productStates
        .filter((state) => state.qty > 0)
        .map((state) => ({
          productCode: state.product.code,
          qty: state.qty,
          baseAdj: state.baseAdj,
          orderAdj: state.orderAdj,
          sellPrice: state.sellPrice,
          amount: state.qty * state.sellPrice,
        }));

      if (items.length === 0) {
        // 기존 주문 삭제
        for (const order of existingOrders) {
          await deleteOrder(order.id);
        }
        router.push('/orders');
        return;
      }

      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

      if (existingOrders.length > 0) {
        // 기존 주문 업데이트
        await updateOrderItems(existingOrders[0].id, items, totalAmount);
      } else {
        // 새 주문 생성
        await createOrder({
          date: new Date(dateParam),
          customerCode,
          cutoff: Number(cutoff) as Cutoff,
          items,
          totalAmount,
          status: 'draft',
          createdBy: user.uid,
        });
      }

      router.push('/orders');
    } catch (error) {
      console.error('Failed to save order:', error);
      alert('주문 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const totalItems = productStates.filter((s) => s.qty > 0).length;
  const totalAmount = productStates.reduce(
    (sum, state) => sum + state.qty * state.sellPrice,
    0
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center items-center min-h-screen">
          <Spinner size="lg" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="p-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <Link href="/orders" className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg font-bold">{customer.fullName}</h1>
              <div className="w-6"></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="success">{customer.grade}</Badge>
                <span className="text-sm text-gray-500">{customer.code}</span>
                <span className="text-sm text-gray-500">|</span>
                <span className="text-sm text-gray-500">{dateParam}</span>
              </div>
              <Select
                value={cutoff}
                onChange={(e) => setCutoff(e.target.value)}
                className="w-32 text-sm"
                options={CUTOFF_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
              />
            </div>
          </div>
        </div>

        {/* 제품 목록 */}
        <div className="p-4 max-w-4xl mx-auto pb-32">
          {productStates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>주문 가능한 제품이 없습니다.</p>
              <Link href={`/customers/${customer.id}/products`} className="text-blue-600 hover:underline">
                제품 매핑 설정
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {productStates.map((state) => (
                <div
                  key={state.product.code}
                  className={`bg-white rounded-lg border p-4 ${
                    state.qty > 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{state.product.name_ko}</span>
                        <Badge
                          variant={state.product.priceType === 'fresh' ? 'success' : 'info'}
                          size="sm"
                        >
                          {state.product.priceType === 'fresh' ? '신선' : '공산품'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {state.product.name_th} / {state.product.name_mm}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        단위: {state.product.unit} | 기본adj: {state.baseAdj >= 0 ? '+' : ''}{state.baseAdj}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {formatCurrency(state.sellPrice)}
                      </div>
                      <div className="text-xs text-gray-500">판매가</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">수량:</label>
                      <div className="flex items-center">
                        <button
                          onClick={() => handleQtyChange(state.product.code, state.qty - 1)}
                          className="w-8 h-8 bg-gray-100 rounded-l border border-gray-300 hover:bg-gray-200"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={state.qty}
                          onChange={(e) =>
                            handleQtyChange(state.product.code, parseInt(e.target.value) || 0)
                          }
                          className="w-16 h-8 text-center border-t border-b border-gray-300 focus:outline-none"
                        />
                        <button
                          onClick={() => handleQtyChange(state.product.code, state.qty + 1)}
                          className="w-8 h-8 bg-gray-100 rounded-r border border-gray-300 hover:bg-gray-200"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">추가adj:</label>
                      <input
                        type="number"
                        value={state.orderAdj}
                        onChange={(e) =>
                          handleOrderAdjChange(state.product.code, parseInt(e.target.value) || 0)
                        }
                        className="w-20 h-8 px-2 text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {state.qty > 0 && (
                      <div className="ml-auto text-right">
                        <div className="text-sm font-medium text-blue-600">
                          {formatCurrency(state.qty * state.sellPrice)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 고정 바 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="p-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-gray-600">선택 품목: </span>
                <span className="font-bold">{totalItems}개</span>
              </div>
              <div>
                <span className="text-gray-600">총 금액: </span>
                <span className="text-xl font-bold text-blue-600">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
            <Button
              onClick={saveOrder}
              disabled={saving}
              className="w-full"
              size="lg"
            >
              {saving ? '저장 중...' : '주문 저장'}
            </Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
