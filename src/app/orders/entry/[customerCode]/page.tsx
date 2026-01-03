'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context';
import { useI18n } from '@/lib/i18n/I18nContext';
import { ProtectedRoute } from '@/components/auth';
import { Button, Select, Spinner, Badge, Input } from '@/components/ui';
import {
  getCustomerByCode,
  getProducts,
  getOrdersByCustomer,
  createOrder,
  updateOrderItems,
  deleteOrder,
  getCustomerProductAdjs,
  getFreshMarginMap,
  getIndustrialMarginMap,
  getAllPriceHistory,
  updateCustomerProducts,
} from '@/lib/firebase';
import { CUTOFF_OPTIONS, formatCurrency } from '@/lib/constants';
import { calculateSellPrice as calcPrice } from '@/lib/utils';
import type { Customer, Product, Order, OrderItem, Cutoff, Grade, IndustrialMargin, DiscountReason, PriceType } from '@/types';
import Link from 'next/link';
import { Plus, Search, Check, X } from 'lucide-react';

// 할인 사유 옵션
const getDiscountReasons = (t: (key: any) => string): { value: DiscountReason; label: string }[] => [
  { value: 'quality', label: t('orders.discountQuality') },
  { value: 'loyal', label: t('orders.discountLoyal') },
  { value: 'bulk', label: t('orders.discountBulk') },
  { value: 'promotion', label: t('orders.discountPromotion') },
  { value: 'negotiation', label: t('orders.discountNegotiation') },
  { value: 'damage', label: t('orders.discountDamage') },
  { value: 'expiring', label: t('orders.discountExpiring') },
  { value: 'other', label: t('orders.discountOther') },
];

interface ProductOrderState {
  product: Product;
  qty: number;
  baseAdj: number;
  orderAdj: number;
  orderAdjReason?: DiscountReason;
  sellPrice: number;
}

export default function OrderEntryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();

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
  const [max3DayPriceMap, setMax3DayPriceMap] = useState<Map<string, number>>(new Map());
  const [showingAllProducts, setShowingAllProducts] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalDiscount, setTotalDiscount] = useState(0); // 합계 할인
  const [discountReason, setDiscountReason] = useState<DiscountReason | ''>(''); // 합계 할인 사유

  // 제품 추가 모달 상태
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]); // 전체 제품 목록
  const [addProductSearch, setAddProductSearch] = useState('');
  const [addProductTab, setAddProductTab] = useState<PriceType | 'all'>('all');
  const [selectedNewProducts, setSelectedNewProducts] = useState<Set<string>>(new Set());
  const [addingProducts, setAddingProducts] = useState(false);

  // Tab 키 네비게이션을 위한 refs
  const qtyInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Tab 키로 다음 행 이동
  const handleKeyDown = (e: React.KeyboardEvent, productCode: string) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const productCodes = productStates.map(s => s.product.code);
      const currentIndex = productCodes.indexOf(productCode);
      const nextIndex = currentIndex + 1;
      if (nextIndex < productCodes.length) {
        const nextCode = productCodes[nextIndex];
        qtyInputRefs.current.get(nextCode)?.focus();
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      const productCodes = productStates.map(s => s.product.code);
      const currentIndex = productCodes.indexOf(productCode);
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        const prevCode = productCodes[prevIndex];
        qtyInputRefs.current.get(prevCode)?.focus();
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [customerCode, dateParam]);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // 고객 코드 정규화 (공백 제거)
      const normalizedCode = decodeURIComponent(customerCode).trim();

      // 병렬로 모든 기본 데이터 로드
      const [customerData, allProducts, freshMap, industrialMap, priceHistories] = await Promise.all([
        getCustomerByCode(normalizedCode),
        getProducts(true),
        getFreshMarginMap(),
        getIndustrialMarginMap(),
        getAllPriceHistory(),
      ]);

      // 신선제품용 3일 최고가 맵 생성
      const max3DayMap = new Map<string, number>();
      const today = new Date(dateParam);
      priceHistories.forEach((ph) => {
        // 3일 최고가 계산
        let maxPrice = 0;
        for (let i = 0; i < 3; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateKey = d.toISOString().split('T')[0];
          if (ph.prices[dateKey] && ph.prices[dateKey] > maxPrice) {
            maxPrice = ph.prices[dateKey];
          }
        }
        if (maxPrice > 0) {
          max3DayMap.set(ph.code, maxPrice);
        }
      });
      setMax3DayPriceMap(max3DayMap);

      if (!customerData) {
        setLoadError(`${t('orders.customerNotFoundDesc')} (${normalizedCode})`);
        setLoading(false);
        return;
      }

      setCustomer(customerData);
      setFreshMarginMap(freshMap);
      setIndustrialMarginMap(industrialMap);
      setAllProducts(allProducts); // 전체 제품 저장 (제품 추가 모달용)

      // 고객이 주문 가능한 제품 필터
      let customerProducts: Product[] = [];

      if (customerData.products && customerData.products.length > 0) {
        // 고객에게 매핑된 제품이 있으면 해당 제품만 표시
        customerProducts = allProducts.filter((p) =>
          customerData.products!.includes(p.code)
        );
      }

      // 매핑된 제품이 없거나 매칭되는 제품이 없으면 모든 활성 제품 표시
      if (customerProducts.length === 0) {
        customerProducts = allProducts;
        setShowingAllProducts(true);
      } else {
        setShowingAllProducts(false);
      }

      setProducts(customerProducts);

      // N+1 쿼리 해결: 고객의 모든 제품 adj를 한 번에 조회
      const [orders, productAdjs] = await Promise.all([
        getOrdersByCustomer(customerCode, new Date(dateParam)),
        getCustomerProductAdjs(customerCode),
      ]);
      setExistingOrders(orders);

      // adj를 Map으로 변환 (productCode -> adj)
      const adjMap = new Map(productAdjs.map(a => [a.productCode, a.adj]));

      // 제품별 상태 초기화 (더 이상 N+1 쿼리 없음)
      const states: ProductOrderState[] = customerProducts.map((product) => {
        const baseAdj = adjMap.get(product.code) || 0;

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

        // 신선제품은 3일 최고가 사용, 공산품은 pur 사용
        const buyPrice = product.priceType === 'fresh'
          ? (max3DayMap.get(product.code) || product.pur || 0)
          : (product.pur || 0);

        const sellPrice = preCalcPrice
          ? preCalcPrice + baseAdj + orderAdj
          : calculateSellPriceWithMargin(product, customerData.grade, freshMap, industrialMap, buyPrice, baseAdj + orderAdj);

        return {
          product,
          qty,
          baseAdj,
          orderAdj,
          sellPrice,
        };
      });

      setProductStates(states);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoadError(t('orders.loadFailed'));
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
    buyPrice: number,
    totalAdj: number
  ): number => {
    const result = calcPrice(product, grade, freshMap, industrialMap, buyPrice, totalAdj);
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

    // 신선제품은 3일 최고가 사용, 공산품은 pur 사용
    const buyPrice = product.priceType === 'fresh'
      ? (max3DayPriceMap.get(product.code) || product.pur || 0)
      : (product.pur || 0);

    return calculateSellPriceWithMargin(product, customer.grade, freshMarginMap, industrialMarginMap, buyPrice, totalAdj);
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
              // 할인이 0이면 사유도 초기화
              orderAdjReason: newAdj === 0 ? undefined : state.orderAdjReason,
              sellPrice: calculateCurrentSellPrice(
                state.product,
                state.baseAdj + newAdj
              ),
            }
          : state
      )
    );
  };

  const handleOrderAdjReasonChange = (productCode: string, reason: DiscountReason | '') => {
    setProductStates((prev) =>
      prev.map((state) =>
        state.product.code === productCode
          ? { ...state, orderAdjReason: reason || undefined }
          : state
      )
    );
  };

  // 매핑되지 않은 제품 필터링
  const unmappedProducts = allProducts.filter((p) => {
    // 이미 매핑된 제품은 제외
    const isMapped = customer?.products?.includes(p.code) || productStates.some(s => s.product.code === p.code);
    if (isMapped) return false;

    // 검색어 필터
    const matchesSearch = addProductSearch === '' ||
      p.code.toLowerCase().includes(addProductSearch.toLowerCase()) ||
      p.name_ko.toLowerCase().includes(addProductSearch.toLowerCase()) ||
      p.name_th.toLowerCase().includes(addProductSearch.toLowerCase());

    // 유형 필터
    const matchesTab = addProductTab === 'all' || p.priceType === addProductTab;

    return matchesSearch && matchesTab;
  });

  // 새 제품 추가 처리
  const handleAddProducts = async () => {
    if (!customer || selectedNewProducts.size === 0) return;

    setAddingProducts(true);
    try {
      // 기존 매핑된 제품 코드 + 새로 선택된 제품 코드
      const existingCodes = customer.products || [];
      const newCodes = Array.from(selectedNewProducts);
      const updatedCodes = [...existingCodes, ...newCodes];

      // Firebase에 고객 제품 매핑 업데이트
      await updateCustomerProducts(customer.id, updatedCodes);

      // 새로 추가된 제품들의 상태 생성
      const newProductStates: ProductOrderState[] = [];
      for (const code of newCodes) {
        const product = allProducts.find(p => p.code === code);
        if (!product) continue;

        // 신선제품은 3일 최고가 사용, 공산품은 pur 사용
        const buyPrice = product.priceType === 'fresh'
          ? (max3DayPriceMap.get(product.code) || product.pur || 0)
          : (product.pur || 0);

        const sellPrice = calculateSellPriceWithMargin(
          product,
          customer.grade,
          freshMarginMap,
          industrialMarginMap,
          buyPrice,
          0 // 초기 adj는 0
        );

        newProductStates.push({
          product,
          qty: 0,
          baseAdj: 0,
          orderAdj: 0,
          sellPrice,
        });
      }

      // 상태 업데이트
      setProductStates(prev => [...prev, ...newProductStates]);
      setProducts(prev => [...prev, ...newProductStates.map(s => s.product)]);

      // 고객 정보도 업데이트
      setCustomer(prev => prev ? { ...prev, products: updatedCodes } : prev);

      // 모달 초기화 및 닫기
      setSelectedNewProducts(new Set());
      setAddProductSearch('');
      setShowAddProductModal(false);
      setShowingAllProducts(false); // 이제 제품이 매핑되었으므로
    } catch (error) {
      console.error('Failed to add products:', error);
      alert(t('orders.addProductFailed'));
    } finally {
      setAddingProducts(false);
    }
  };

  // 새 제품 선택 토글
  const toggleNewProduct = (code: string) => {
    setSelectedNewProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  const saveOrder = async () => {
    if (!customer || !user) return;

    setSaving(true);
    try {
      // 주문 아이템 생성
      const items: OrderItem[] = productStates
        .filter((state) => state.qty > 0)
        .map((state) => {
          const item: OrderItem = {
            productCode: state.product.code,
            qty: state.qty,
            baseAdj: state.baseAdj,
            orderAdj: state.orderAdj,
            sellPrice: state.sellPrice,
            amount: state.qty * state.sellPrice,
          };
          // 개별 할인 사유가 있으면 추가
          if (state.orderAdj !== 0 && state.orderAdjReason) {
            item.orderAdjReason = state.orderAdjReason;
          }
          return item;
        });

      if (items.length === 0) {
        // 기존 주문 삭제
        for (const order of existingOrders) {
          await deleteOrder(order.id);
        }
        router.push('/orders');
        return;
      }

      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      const finalAmount = totalAmount - totalDiscount;

      if (existingOrders.length > 0) {
        // 기존 주문 업데이트
        await updateOrderItems(existingOrders[0].id, items, totalAmount);
        // 할인 정보도 업데이트
        if (totalDiscount > 0) {
          await import('@/lib/firebase').then(({ updateOrder }) =>
            updateOrder(existingOrders[0].id, { totalDiscount, finalAmount })
          );
        }
      } else {
        // 새 주문 생성
        const orderData: Parameters<typeof createOrder>[0] = {
          date: new Date(dateParam),
          customerCode,
          cutoff: Number(cutoff) as Cutoff,
          items,
          totalAmount,
          status: 'draft',
          createdBy: user.uid,
        };
        // 할인이 있을 때만 필드 추가 (Firebase는 undefined를 허용하지 않음)
        if (totalDiscount > 0) {
          orderData.totalDiscount = totalDiscount;
          orderData.finalAmount = finalAmount;
          if (discountReason) {
            orderData.discountReason = discountReason as DiscountReason;
          }
        }
        await createOrder(orderData);
      }

      router.push('/orders');
    } catch (error) {
      console.error('Failed to save order:', error);
      alert(t('orders.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const totalItems = productStates.filter((s) => s.qty > 0).length;
  const totalAmount = productStates.reduce(
    (sum, state) => sum + state.qty * state.sellPrice,
    0
  );

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center items-center min-h-screen">
          <Spinner size="lg" />
        </div>
      </ProtectedRoute>
    );
  }

  // 에러 또는 고객을 찾을 수 없는 경우
  if (loadError || !customer) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('orders.customerNotFound')}</h2>
            <p className="text-gray-600 mb-6">
              {loadError || `${t('orders.customerNotFoundDesc')} (${customerCode})`}
            </p>
            <div className="space-y-3">
              <Link href="/orders" className="block">
                <Button variant="primary" className="w-full">
                  {t('orders.backToOrders')}
                </Button>
              </Link>
              <Link href="/customers/new" className="block">
                <Button variant="secondary" className="w-full">
                  {t('orders.registerNewCustomer')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="p-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <Link href="/orders" className="text-green-600 hover:text-green-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg font-bold">{customer.fullName}</h1>
              <button
                onClick={() => setShowAddProductModal(true)}
                className="w-8 h-8 flex items-center justify-center bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                title={t('orders.addProduct')}
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="success">{customer.grade}</Badge>
                <span className="text-sm text-gray-700">{customer.code}</span>
                <span className="text-sm text-gray-700">|</span>
                <span className="text-sm text-gray-700">{dateParam}</span>
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
        <div className="p-4 max-w-4xl mx-auto pb-56">
          {/* 전체 제품 표시 경고 */}
          {showingAllProducts && productStates.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">{t('orders.showingAllProducts')}</p>
                <p className="text-xs text-amber-700 mt-1">
                  {t('orders.noMappingWarning')}
                  <Link href={`/customers/${customer.id}/products`} className="ml-1 underline font-medium">
                    {t('orders.productMappingSettings')}
                  </Link>
                </p>
              </div>
            </div>
          )}

          {productStates.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">{t('orders.noOrderableProducts')}</p>
              <p className="text-sm text-gray-600 mb-4">
                {t('orders.noProductsMappedDesc')}<br />
                {t('orders.contactAdminOrSetup')}
              </p>
              {/* 디버깅 정보 */}
              <div className="mb-4 p-3 bg-gray-100 rounded-lg text-xs text-gray-600 text-left max-w-md mx-auto">
                <p><strong>{t('customers.code')}:</strong> {customer.id}</p>
                <p><strong>{t('customers.code')}:</strong> {customer.code}</p>
                <p><strong>{t('orders.mappedProductCount')}:</strong> {customer.products?.length || 0}{t('common.count')}</p>
                {customer.products && customer.products.length > 0 && (
                  <p><strong>{t('orders.productCode')}:</strong> {customer.products.slice(0, 5).join(', ')}{customer.products.length > 5 ? '...' : ''}</p>
                )}
              </div>
              <Link
                href={`/customers/${customer.id}/products`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('orders.setupProductMapping')}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {productStates.map((state) => (
                <div
                  key={state.product.code}
                  className={`bg-white rounded-lg border p-4 ${
                    state.qty > 0 ? 'border-green-300 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded font-semibold">{state.product.code}</span>
                        <span className="font-medium text-green-700">{state.product.name_ko}</span>
                        <Badge
                          variant={state.product.priceType === 'fresh' ? 'success' : 'info'}
                          size="sm"
                        >
                          {state.product.priceType === 'fresh' ? t('products.fresh') : t('products.industrial')}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-800">
                        {state.product.name_th} / {state.product.name_mm}
                      </div>
                      <div className="text-xs text-gray-700 mt-1">
                        {t('products.unit')}: {state.product.unit} | {t('orders.baseAdj')}: <span className="text-green-600 font-medium">{state.baseAdj >= 0 ? '+' : ''}{state.baseAdj}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(state.sellPrice)}
                      </div>
                      <div className="text-xs text-gray-700">{t('orders.sellPrice')}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-800 font-medium">{t('orders.qty')}:</label>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(state.product.code, state.qty - 1)}
                          className="w-8 h-8 bg-gray-100 rounded-l border border-gray-300 hover:bg-gray-200 text-gray-800 font-bold"
                        >
                          -
                        </button>
                        <input
                          ref={(el) => {
                            if (el) qtyInputRefs.current.set(state.product.code, el);
                          }}
                          type="number"
                          value={state.qty}
                          onChange={(e) =>
                            handleQtyChange(state.product.code, parseInt(e.target.value) || 0)
                          }
                          onKeyDown={(e) => handleKeyDown(e, state.product.code)}
                          className="w-16 h-8 text-center border-t border-b border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 text-green-700 font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => handleQtyChange(state.product.code, state.qty + 1)}
                          className="w-8 h-8 bg-gray-100 rounded-r border border-gray-300 hover:bg-gray-200 text-gray-800 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-800 font-medium">{t('orders.orderAdj')}:</label>
                      <input
                        type="number"
                        value={state.orderAdj}
                        onChange={(e) =>
                          handleOrderAdjChange(state.product.code, parseInt(e.target.value) || 0)
                        }
                        className="w-20 h-8 px-2 text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-green-600 font-medium"
                      />
                      {/* 개별 할인 사유 (할인이 0이 아닐 때만 표시) */}
                      {state.orderAdj !== 0 && (
                        <select
                          value={state.orderAdjReason || ''}
                          onChange={(e) => handleOrderAdjReasonChange(state.product.code, e.target.value as DiscountReason | '')}
                          className="h-8 px-2 border border-orange-300 rounded bg-orange-50 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="">{t('orders.selectReason')}</option>
                          {getDiscountReasons(t).map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {state.qty > 0 && (
                      <div className="ml-auto text-right">
                        <div className="text-sm font-bold text-green-600">
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
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-gray-800">{t('orders.selectedItems')}: </span>
                <span className="font-bold text-green-600">{totalItems}{t('common.count')}</span>
              </div>
              <div>
                <span className="text-gray-800">{t('orders.totalAmount')}: </span>
                <span className="text-lg font-bold text-gray-800">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
            {/* 합계 할인 입력 */}
            <div className="flex flex-col gap-2 mb-3 pb-2 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-800 text-sm font-medium">{t('orders.totalDiscountLabel')}:</span>
                  <input
                    type="number"
                    value={totalDiscount || ''}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setTotalDiscount(val);
                      if (val === 0) setDiscountReason('');
                    }}
                    placeholder="0"
                    className="w-24 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-green-500 text-red-600 font-medium"
                  />
                  <span className="text-gray-700 text-sm">฿</span>
                  {/* 합계 할인 사유 (할인이 0보다 클 때만 표시) */}
                  {totalDiscount > 0 && (
                    <select
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value as DiscountReason | '')}
                      className="h-8 px-2 border border-red-300 rounded bg-red-50 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      <option value="">{t('orders.selectDiscountReason')}</option>
                      {getDiscountReasons(t).map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <span className="text-gray-800 text-sm">{t('orders.finalAmountLabel')}: </span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(totalAmount - totalDiscount)}
                  </span>
                  {totalDiscount > 0 && (
                    <span className="text-sm text-red-500 ml-2">(-{formatCurrency(totalDiscount)})</span>
                  )}
                </div>
              </div>
            </div>
            <Button
              onClick={saveOrder}
              disabled={saving}
              className="w-full"
              size="lg"
            >
              {saving ? t('common.saving') : t('orders.saveOrder')}
            </Button>
          </div>
        </div>

        {/* 제품 추가 모달 */}
        {showAddProductModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => {
                setShowAddProductModal(false);
                setSelectedNewProducts(new Set());
                setAddProductSearch('');
              }}
            />

            {/* Modal Container */}
            <div className="flex min-h-full items-center justify-center p-4">
              <div
                className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl transform transition-all max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">{t('orders.addProduct')}</h2>
                  <button
                    onClick={() => {
                      setShowAddProductModal(false);
                      setSelectedNewProducts(new Set());
                      setAddProductSearch('');
                    }}
                    className="p-1 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Search & Filter */}
                <div className="px-6 py-3 border-b border-gray-100">
                  <div className="relative mb-3">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder={t('orders.searchProductPlaceholder')}
                      value={addProductSearch}
                      onChange={(e) => setAddProductSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAddProductTab('all')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        addProductTab === 'all'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {t('common.all')}
                    </button>
                    <button
                      onClick={() => setAddProductTab('fresh')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        addProductTab === 'fresh'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {t('products.fresh')}
                    </button>
                    <button
                      onClick={() => setAddProductTab('industrial')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        addProductTab === 'industrial'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {t('products.industrial')}
                    </button>
                    <span className="ml-auto text-sm text-gray-600">
                      {unmappedProducts.length}{t('orders.productsCount')}
                    </span>
                  </div>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto px-6 py-3">
                  {unmappedProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {t('orders.noProductsToAdd')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {unmappedProducts.map((product) => {
                        const isSelected = selectedNewProducts.has(product.code);
                        return (
                          <div
                            key={product.code}
                            onClick={() => toggleNewProduct(product.code)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isSelected
                                    ? 'bg-green-600 border-green-600 text-white'
                                    : 'border-gray-300'
                                }`}
                              >
                                {isSelected && <Check size={14} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-medium text-green-700">
                                    {product.code}
                                  </span>
                                  <Badge
                                    variant={product.priceType === 'fresh' ? 'success' : 'info'}
                                    size="sm"
                                  >
                                    {product.priceType === 'fresh' ? t('products.fresh') : t('products.industrial')}
                                  </Badge>
                                </div>
                                <p className="font-medium text-gray-900">{product.name_ko}</p>
                                <p className="text-xs text-gray-600">
                                  {product.name_th} / {product.name_mm}
                                </p>
                              </div>
                              <div className="text-right text-sm text-gray-700">
                                {formatCurrency(product.pur || 0)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">
                      {t('orders.selectedProducts')}: <strong className="text-green-600">{selectedNewProducts.size}{t('common.count')}</strong>
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowAddProductModal(false);
                          setSelectedNewProducts(new Set());
                          setAddProductSearch('');
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        onClick={handleAddProducts}
                        disabled={selectedNewProducts.size === 0 || addingProducts}
                        loading={addingProducts}
                      >
                        {addingProducts ? t('orders.adding') : `${selectedNewProducts.size}${t('orders.addCount')}`}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
