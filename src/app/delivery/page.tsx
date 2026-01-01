'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/context';
import { ProtectedRoute } from '@/components/auth';
import { Button, Spinner, Badge, EmptyState } from '@/components/ui';
import {
  getOrdersByDate,
  getCustomers,
  getProducts,
} from '@/lib/firebase';
import { formatCurrency } from '@/lib/utils';
import type { Order, Customer, Product, Region } from '@/types';

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
}

export default function DeliveryPage() {
  const { user } = useAuth();
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

        const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

        notes.push({
          customer,
          orders,
          items,
          totalAmount,
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
            {note.customer.region === 'pattaya' ? '파타야' : '방콕'}
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
            <th className="px-2 py-1 text-left">제품</th>
            <th className="px-2 py-1 text-left text-gray-400">태국어</th>
            <th className="px-2 py-1 text-left text-gray-400">미얀마어</th>
            <th className="px-2 py-1 text-center">수량</th>
            {showPrice && (
              <>
                <th className="px-2 py-1 text-right">단가</th>
                <th className="px-2 py-1 text-right">금액</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {note.items.map((item) => (
            <tr key={item.product.code}>
              <td className="px-2 py-2 font-medium">{item.product.name_ko}</td>
              <td className="px-2 py-2 text-gray-500">{item.product.name_th}</td>
              <td className="px-2 py-2 text-gray-500">{item.product.name_mm}</td>
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
            <tr>
              <td colSpan={5} className="px-2 py-2 text-right">합계</td>
              <td className="px-2 py-2 text-right text-blue-600">
                {formatCurrency(note.totalAmount)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:hidden">
          <h1 className="text-2xl font-bold">배송장</h1>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={handlePrint} variant="secondary">
              인쇄
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
              전체
            </button>
            <button
              onClick={() => setSelectedRegion('pattaya')}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedRegion === 'pattaya'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              파타야 ({pattayaNotes.length})
            </button>
            <button
              onClick={() => setSelectedRegion('bangkok')}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedRegion === 'bangkok'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
              }`}
            >
              방콕 ({bangkokNotes.length})
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
              배송장 (수량만)
            </button>
            <button
              onClick={() => setViewMode('invoice')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'invoice'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              인보이스 (가격포함)
            </button>
          </div>
        </div>

        {/* 요약 */}
        <div className="grid grid-cols-3 gap-4 mb-6 print:hidden">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">총 고객</div>
            <div className="text-xl font-bold">{filteredNotes.length}곳</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">총 품목</div>
            <div className="text-xl font-bold">
              {filteredNotes.reduce((sum, n) => sum + n.items.length, 0)}개
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">총 금액</div>
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(filteredNotes.reduce((sum, n) => sum + n.totalAmount, 0))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <EmptyState
            title="배송장이 없습니다"
            description="해당 날짜에 주문이 없습니다."
          />
        ) : (
          <div ref={printRef}>
            {/* 인쇄용 헤더 */}
            <div className="hidden print:block mb-4 text-center">
              <h1 className="text-2xl font-bold">FK365 {viewMode === 'delivery' ? '배송장' : '인보이스'}</h1>
              <p className="text-gray-500">{date}</p>
            </div>

            {/* 파타야 */}
            {(selectedRegion === '' || selectedRegion === 'pattaya') && pattayaNotes.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  파타야 ({pattayaNotes.length}곳)
                </h2>
                {pattayaNotes.map((note) => renderDeliveryNote(note, viewMode === 'invoice'))}
              </div>
            )}

            {/* 방콕 */}
            {(selectedRegion === '' || selectedRegion === 'bangkok') && bangkokNotes.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                  방콕 ({bangkokNotes.length}곳)
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
    </ProtectedRoute>
  );
}
