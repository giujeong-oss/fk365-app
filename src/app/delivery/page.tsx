'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/context';
import { useI18n } from '@/lib/i18n';
import { ProtectedRoute } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { Button, Spinner, Badge, EmptyState } from '@/components/ui';
import {
  getOrdersByDate,
  getCustomers,
  getProducts,
} from '@/lib/firebase';
import { formatCurrency } from '@/lib/utils';
import type { Order, Customer, Product, Region } from '@/types';
import { Home } from 'lucide-react';
import Link from 'next/link';

interface DeliveryNote {
  customer: Customer;
  orders: Order[];
  items: Array<{
    product: Product;
    qty: number;
    sellPrice: number;
    amount: number;
  }>;
  totalAmount: number;
  totalDiscount: number;
  finalAmount: number;
}

export default function DeliveryPage() {
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useI18n();
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<Region | ''>('');
  const [viewMode, setViewMode] = useState<'delivery' | 'invoice'>('delivery');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    setLoading(true);
    try {
      const selectedDate = new Date(date);
      const [ordersData, customersData, productsData] = await Promise.all([
        getOrdersByDate(selectedDate),
        getCustomers(true),
        getProducts(true),
      ]);

      setCustomers(customersData);
      setProducts(productsData);

      // 고객별로 주문 그룹화
      const customerOrderMap = new Map<string, Order[]>();
      ordersData.forEach((order) => {
        const existing = customerOrderMap.get(order.customerCode) || [];
        customerOrderMap.set(order.customerCode, [...existing, order]);
      });

      // 배송장 데이터 생성
      const notes: DeliveryNote[] = [];

      customerOrderMap.forEach((orders, customerCode) => {
        const customer = customersData.find((c) => c.code === customerCode);
        if (!customer) return;

        // 제품별 수량 합산
        const itemMap = new Map<string, { qty: number; sellPrice: number; amount: number }>();
        orders.forEach((order) => {
          order.items.forEach((item) => {
            const existing = itemMap.get(item.productCode);
            if (existing) {
              existing.qty += item.qty;
              existing.amount += item.amount;
            } else {
              itemMap.set(item.productCode, {
                qty: item.qty,
                sellPrice: item.sellPrice,
                amount: item.amount,
              });
            }
          });
        });

        // 배송장 아이템 생성
        const items = Array.from(itemMap.entries()).map(([productCode, data]) => {
          const product = productsData.find((p) => p.code === productCode);
          return {
            product: product!,
            ...data,
          };
        }).filter((item) => item.product);

        const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0);

        // 주문 단위 할인 합산
        const totalDiscount = orders.reduce((sum, order) => sum + (order.totalDiscount || 0), 0);

        // 최종 금액: finalAmount 우선 사용, 없으면 할인 적용
        const finalAmount = orders.reduce((sum, order) => sum + (order.finalAmount ?? order.totalAmount), 0);

        notes.push({
          customer,
          orders,
          items,
          totalAmount: itemsTotal,
          totalDiscount,
          finalAmount,
        });
      });

      // 지역 순서대로 정렬 (파타야 -> 방콕)
      notes.sort((a, b) => {
        if (a.customer.region === 'pattaya' && b.customer.region === 'bangkok') return -1;
        if (a.customer.region === 'bangkok' && b.customer.region === 'pattaya') return 1;
        return a.customer.code.localeCompare(b.customer.code);
      });

      setDeliveryNotes(notes);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = selectedRegion
    ? deliveryNotes.filter((n) => n.customer.region === selectedRegion)
    : deliveryNotes;

  const handlePrint = () => {
    window.print();
  };

  const pattayaNotes = filteredNotes.filter((n) => n.customer.region === 'pattaya');
  const bangkokNotes = filteredNotes.filter((n) => n.customer.region === 'bangkok');

  const renderDeliveryNote = (note: DeliveryNote, showPrice: boolean) => (
    <div
      key={note.customer.code}
      className={`bg-white border rounded-lg p-4 mb-4 ${
        selectedCustomer === note.customer.code ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => setSelectedCustomer(
        selectedCustomer === note.customer.code ? null : note.customer.code
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <div className="flex items-center gap-3">
          <Badge variant={note.customer.region === 'pattaya' ? 'info' : 'warning'}>
            {note.customer.region === 'pattaya' ? t('customers.pattaya') : t('customers.bangkok')}
          </Badge>
          <span className="font-bold text-lg">{note.customer.fullName}</span>
          <span className="text-sm text-gray-500">({note.customer.code})</span>
        </div>
        <div className="text-sm text-gray-500">
          {note.customer.deliveryTime || '-'}
        </div>
      </div>

      {/* 아이템 목록 */}
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-2 py-1 text-left">{t('delivery.product')}</th>
            <th className="px-2 py-1 text-left text-gray-600">{t('delivery.thai')}</th>
            <th className="px-2 py-1 text-left text-gray-600">{t('delivery.myanmar')}</th>
            <th className="px-2 py-1 text-center">{t('orders.qty')}</th>
            {showPrice && (
              <>
                <th className="px-2 py-1 text-right">{t('orders.price')}</th>
                <th className="px-2 py-1 text-right">{t('orders.amount')}</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {note.items.map((item) => (
            <tr key={item.product.code}>
              <td className="px-2 py-2 font-semibold text-gray-900">{item.product.name_ko}</td>
              <td className="px-2 py-2 text-gray-700">{item.product.name_th}</td>
              <td className="px-2 py-2 text-gray-700">{item.product.name_mm}</td>
              <td className="px-2 py-2 text-center font-bold">
                {item.qty} {item.product.unit}
              </td>
              {showPrice && (
                <>
                  <td className="px-2 py-2 text-right">{formatCurrency(item.sellPrice)}</td>
                  <td className="px-2 py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
        {showPrice && (
          <tfoot className="bg-gray-50 font-bold">
            {note.totalDiscount > 0 && (
              <>
                <tr>
                  <td colSpan={5} className="px-2 py-1 text-right text-gray-600">{t('orders.amount')}</td>
                  <td className="px-2 py-1 text-right text-gray-600">
                    {formatCurrency(note.totalAmount)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="px-2 py-1 text-right text-red-600">{t('orders.discount')}</td>
                  <td className="px-2 py-1 text-right text-red-600">
                    -{formatCurrency(note.totalDiscount)}
                  </td>
                </tr>
              </>
            )}
            <tr>
              <td colSpan={5} className="px-2 py-2 text-right">{t('delivery.subtotal')}</td>
              <td className="px-2 py-2 text-right text-blue-600">
                {formatCurrency(note.finalAmount)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );

  return (
    <ProtectedRoute>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle={t('delivery.title')}
        onLogout={signOut}
      >
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:hidden">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="secondary" size="sm">
                <Home size={18} className="mr-1" />
                {t('common.home')}
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">{t('delivery.title')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={handlePrint} variant="secondary">
              {t('common.print')}
            </Button>
          </div>
        </div>

        {/* 필터 및 뷰 모드 */}
        <div className="flex flex-wrap items-center gap-4 mb-6 print:hidden">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedRegion('')}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedRegion === ''
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('common.all')}
            </button>
            <button
              onClick={() => setSelectedRegion('pattaya')}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedRegion === 'pattaya'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              {t('customers.pattaya')} ({pattayaNotes.length})
            </button>
            <button
              onClick={() => setSelectedRegion('bangkok')}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedRegion === 'bangkok'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
              }`}
            >
              {t('customers.bangkok')} ({bangkokNotes.length})
            </button>
          </div>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setViewMode('delivery')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'delivery'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('delivery.title')} ({t('delivery.qtyOnly')})
            </button>
            <button
              onClick={() => setViewMode('invoice')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'invoice'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('delivery.invoice')} ({t('delivery.withPrice')})
            </button>
          </div>
        </div>

        {/* 요약 */}
        <div className="grid grid-cols-3 gap-4 mb-6 print:hidden">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-700 font-medium mb-1">{t('delivery.totalCustomers')}</div>
            <div className="text-xl font-bold">{filteredNotes.length}{t('delivery.places')}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-700 font-medium mb-1">{t('delivery.totalItems')}</div>
            <div className="text-xl font-bold">
              {filteredNotes.reduce((sum, n) => sum + n.items.length, 0)}{t('common.count')}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-700 font-medium mb-1">{t('dashboard.totalSales')}</div>
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(filteredNotes.reduce((sum, n) => sum + n.finalAmount, 0))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <EmptyState
            title={t('delivery.noDelivery')}
            description={t('delivery.noOrderForDate')}
          />
        ) : (
          <div ref={printRef}>
            {/* 인쇄용 헤더 */}
            <div className="hidden print:block mb-4 text-center">
              <h1 className="text-2xl font-bold">FK365 {viewMode === 'delivery' ? t('delivery.title') : t('delivery.invoice')}</h1>
              <p className="text-gray-500">{date}</p>
            </div>

            {/* 파타야 */}
            {(selectedRegion === '' || selectedRegion === 'pattaya') && pattayaNotes.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  {t('customers.pattaya')} ({pattayaNotes.length}{t('delivery.places')})
                </h2>
                {pattayaNotes.map((note) => renderDeliveryNote(note, viewMode === 'invoice'))}
              </div>
            )}

            {/* 방콕 */}
            {(selectedRegion === '' || selectedRegion === 'bangkok') && bangkokNotes.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                  {t('customers.bangkok')} ({bangkokNotes.length}{t('delivery.places')})
                </h2>
                {bangkokNotes.map((note) => renderDeliveryNote(note, viewMode === 'invoice'))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 인쇄 스타일 */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #__next {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
      </MainLayout>
    </ProtectedRoute>
  );
}
