'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { useI18n } from '@/lib/i18n/I18nContext';
import { ProtectedRoute } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { Button, Select, Spinner, EmptyState, Badge, Modal, useToast } from '@/components/ui';
import { getCustomers, getOrdersByDate, getCutoffSummary, confirmOrder, updateOrder, deleteOrder } from '@/lib/firebase';
import type { Customer, Order, Cutoff } from '@/types';
import { Home, CheckCircle, Lock, Unlock, AlertCircle, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/constants';

const CUTOFF_OPTIONS = [
  { value: '1', label: '1차 (정상 - 11시 전)' },
  { value: '2', label: '2차 (추가 - 장보는 중)' },
  { value: '3', label: '3차 (긴급 - 장본 후)' },
];

// 태국 시간대 (UTC+7) 기준 오늘 날짜 반환
const getThailandToday = (): string => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const thailandTime = new Date(utc + (7 * 60 * 60 * 1000));
  return thailandTime.toISOString().split('T')[0];
};

export default function OrdersPage() {
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useI18n();
  const { showSuccess, showError, showWarning } = useToast();
  const [date, setDate] = useState(() => getThailandToday());
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cutoffSummary, setCutoffSummary] = useState({ cut1: 0, cut2: 0, cut3: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedCutoff, setSelectedCutoff] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; type: 'single' | 'bulk'; orderId?: string; cutoff?: Cutoff }>({ open: false, type: 'single' });
  const [cancelModal, setCancelModal] = useState<{ open: boolean; orderId?: string; customerCode?: string }>({ open: false });
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    setLoading(true);
    try {
      const selectedDate = new Date(date);
      const [customersData, ordersData, summary] = await Promise.all([
        getCustomers(true),
        getOrdersByDate(selectedDate),
        getCutoffSummary(selectedDate),
      ]);
      setCustomers(customersData);
      setOrders(ordersData);
      setCutoffSummary(summary);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerOrders = (customerCode: string): Order[] => {
    return orders.filter((o) => o.customerCode === customerCode);
  };

  // 할인 적용된 최종 금액 합계
  const getOrderTotal = (customerCode: string): number => {
    return getCustomerOrders(customerCode).reduce((sum, o) => sum + (o.finalAmount ?? o.totalAmount), 0);
  };

  // 총 할인 금액
  const getTotalDiscount = (customerCode: string): number => {
    return getCustomerOrders(customerCode).reduce((sum, o) => sum + (o.totalDiscount || 0), 0);
  };

  // 할인 사유 목록
  const getDiscountReasons = (customerCode: string): string[] => {
    const reasons: string[] = [];
    getCustomerOrders(customerCode).forEach(o => {
      if (o.discountReason) {
        const reasonLabels: Record<string, string> = {
          quality: '품질',
          loyal: '단골',
          bulk: '대량',
          promotion: '프로모션',
          negotiation: '협상',
          damage: '파손',
          expiring: '유통기한',
          other: '기타',
        };
        reasons.push(reasonLabels[o.discountReason] || o.discountReason);
      }
    });
    return [...new Set(reasons)];
  };

  // 주문 상태 확인
  const getOrderStatus = (customerCode: string): 'draft' | 'confirmed' | 'mixed' => {
    const customerOrders = getCustomerOrders(customerCode);
    if (customerOrders.length === 0) return 'draft';
    const allConfirmed = customerOrders.every(o => o.status === 'confirmed');
    const allDraft = customerOrders.every(o => o.status === 'draft');
    if (allConfirmed) return 'confirmed';
    if (allDraft) return 'draft';
    return 'mixed';
  };

  // 단일 주문 확정
  const handleConfirmOrder = async (orderId: string) => {
    setProcessing(true);
    try {
      await confirmOrder(orderId);
      showSuccess('주문이 확정되었습니다.');
      await loadData();
    } catch (error) {
      console.error('Failed to confirm order:', error);
      showError('주문 확정에 실패했습니다.');
    } finally {
      setProcessing(false);
      setConfirmModal({ open: false, type: 'single' });
    }
  };

  // 일괄 확정 (cutoff별)
  const handleBulkConfirm = async (cutoff: Cutoff) => {
    setProcessing(true);
    try {
      const targetOrders = orders.filter(o => o.cutoff === cutoff && o.status === 'draft');
      if (targetOrders.length === 0) {
        showWarning('확정할 주문이 없습니다.');
        return;
      }

      for (const order of targetOrders) {
        await confirmOrder(order.id);
      }

      showSuccess(`${targetOrders.length}건의 주문이 확정되었습니다.`);
      await loadData();
    } catch (error) {
      console.error('Failed to bulk confirm:', error);
      showError('일괄 확정에 실패했습니다.');
    } finally {
      setProcessing(false);
      setConfirmModal({ open: false, type: 'bulk' });
    }
  };

  // 주문 확정 취소 (draft로 되돌리기)
  const handleCancelConfirm = async (orderId: string) => {
    setProcessing(true);
    try {
      await updateOrder(orderId, { status: 'draft' });
      showSuccess('주문 확정이 취소되었습니다.');
      await loadData();
    } catch (error) {
      console.error('Failed to cancel confirmation:', error);
      showError('확정 취소에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  // 주문 취소 (삭제)
  const handleDeleteOrder = async (orderId: string) => {
    setProcessing(true);
    try {
      await deleteOrder(orderId);
      showSuccess('주문이 취소되었습니다.');
      await loadData();
    } catch (error) {
      console.error('Failed to delete order:', error);
      showError('주문 취소에 실패했습니다.');
    } finally {
      setProcessing(false);
      setCancelModal({ open: false });
    }
  };

  // cutoff별 미확정 주문 수
  const getDraftCount = (cutoff: Cutoff): number => {
    return orders.filter(o => o.cutoff === cutoff && o.status === 'draft').length;
  };

  const filteredOrders = selectedCutoff
    ? orders.filter((o) => o.cutoff === Number(selectedCutoff))
    : orders;

  // 검색어로 고객 필터링 (고객 코드/이름 + 제품코드)
  const filteredCustomers = customers.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    // 고객 코드/이름 검색
    if (c.code.toLowerCase().includes(term) || c.fullName.toLowerCase().includes(term)) {
      return true;
    }
    // 제품코드로 검색 - 해당 제품을 주문한 고객 찾기
    const customerOrders = getCustomerOrders(c.code);
    const hasProduct = customerOrders.some(order =>
      order.items.some(item => item.productCode.toLowerCase().includes(term))
    );
    return hasProduct;
  });

  const orderedCustomerCodes = [...new Set(filteredOrders.map((o) => o.customerCode))];
  const orderedCustomers = filteredCustomers.filter((c) => orderedCustomerCodes.includes(c.code));
  const unorderedCustomers = filteredCustomers.filter((c) => !orderedCustomerCodes.includes(c.code));

  return (
    <ProtectedRoute>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle={t('orders.title')}
        onLogout={signOut}
      >
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="secondary" size="sm">
                <Home size={18} className="mr-1" />
                {t('nav.dashboard')}
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{t('orders.title')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 font-medium"
            />
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-blue-700">{t('orders.cutoff1')}</span>
              {isAdmin && getDraftCount(1) > 0 && (
                <button
                  onClick={() => setConfirmModal({ open: true, type: 'bulk', cutoff: 1 })}
                  className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                  title="1차 전체 확정"
                >
                  {t('common.confirm')} ({getDraftCount(1)})
                </button>
              )}
            </div>
            <div className="text-xl font-bold text-blue-700">{formatCurrency(cutoffSummary.cut1)}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-yellow-700">{t('orders.cutoff2')}</span>
              {isAdmin && getDraftCount(2) > 0 && (
                <button
                  onClick={() => setConfirmModal({ open: true, type: 'bulk', cutoff: 2 })}
                  className="text-xs px-2 py-0.5 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  title="2차 전체 확정"
                >
                  {t('common.confirm')} ({getDraftCount(2)})
                </button>
              )}
            </div>
            <div className="text-xl font-bold text-yellow-700">{formatCurrency(cutoffSummary.cut2)}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-red-700">{t('orders.cutoff3')}</span>
              {isAdmin && getDraftCount(3) > 0 && (
                <button
                  onClick={() => setConfirmModal({ open: true, type: 'bulk', cutoff: 3 })}
                  className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700"
                  title="3차 전체 확정"
                >
                  {t('common.confirm')} ({getDraftCount(3)})
                </button>
              )}
            </div>
            <div className="text-xl font-bold text-red-700">{formatCurrency(cutoffSummary.cut3)}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-green-700 mb-1">{t('orders.total')}</div>
            <div className="text-xl font-bold text-green-700">{formatCurrency(cutoffSummary.total)}</div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* 고객 코드/이름 검색 */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
            <input
              type="text"
              placeholder={`${t('customers.code')} / ${t('customers.name')} / ${t('products.code')} ${t('common.search')}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
            />
          </div>
          <div className="flex items-center gap-4">
            <Select
              value={selectedCutoff}
              onChange={(e) => setSelectedCutoff(e.target.value)}
              className="w-48"
              options={[
                { value: '', label: `${t('common.all')} ${t('orders.cutoff')}` },
                ...CUTOFF_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))
              ]}
            />
            <span className="text-sm text-gray-900 font-medium">
              {t('orders.ordered')}: {orderedCustomers.length} / {t('orders.notOrdered')}: {unorderedCustomers.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 주문 있는 고객 */}
            {orderedCustomers.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  {t('orders.ordered')}
                </h2>
                <div className="grid gap-3">
                  {orderedCustomers.map((customer) => (
                    <Link
                      key={customer.id}
                      href={`/orders/entry/${customer.code}?date=${date}`}
                      className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-green-500 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="success" size="sm">{customer.grade}</Badge>
                          <span className="font-semibold text-green-700">{customer.code}</span>
                          <span className="text-gray-900 font-medium">{customer.fullName}</span>
                          <Badge variant="info" size="sm">{customer.region === 'pattaya' ? t('customers.pattaya') : t('customers.bangkok')}</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-2 text-sm text-gray-800">
                              <span className="text-green-600 font-medium">{getCustomerOrders(customer.code).length}건</span>
                              {getOrderStatus(customer.code) === 'confirmed' ? (
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle size={14} />
                                  {t('common.confirm')}
                                </span>
                              ) : getOrderStatus(customer.code) === 'draft' ? (
                                <span className="flex items-center gap-1 text-orange-600">
                                  <AlertCircle size={14} />
                                  미확정
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-yellow-600">
                                  일부 확정
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-green-600 text-lg">
                              {formatCurrency(getOrderTotal(customer.code))}
                            </div>
                            {/* 할인 정보 표시 */}
                            {getTotalDiscount(customer.code) > 0 && (
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-red-500">-{formatCurrency(getTotalDiscount(customer.code))}</span>
                                {getDiscountReasons(customer.code).map((reason, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const customerOrders = getCustomerOrders(customer.code);
                                if (customerOrders.length > 0) {
                                  setCancelModal({ open: true, orderId: customerOrders[0].id, customerCode: customer.code });
                                }
                              }}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="주문 취소"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 주문 없는 고객 */}
            {unorderedCustomers.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                  {t('orders.notOrdered')}
                </h2>
                <div className="grid gap-3">
                  {unorderedCustomers.map((customer) => (
                    <Link
                      key={customer.id}
                      href={`/orders/entry/${customer.code}?date=${date}`}
                      className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-green-500 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="default" size="sm">{customer.grade}</Badge>
                          <span className="font-semibold text-green-700">{customer.code}</span>
                          <span className="text-gray-900 font-medium">{customer.fullName}</span>
                          <Badge variant="info" size="sm">{customer.region === 'pattaya' ? t('customers.pattaya') : t('customers.bangkok')}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-800 font-medium">{t('orders.title')}</span>
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {customers.length === 0 && (
              <EmptyState
                title={t('common.noData')}
                description={`${t('customers.new')} 필요`}
                action={
                  <Link href="/customers/new">
                    <Button>{t('customers.new')}</Button>
                  </Link>
                }
              />
            )}
          </div>
        )}
      </div>

      {/* 확정 확인 모달 */}
      <Modal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, type: 'single' })}
        title={confirmModal.type === 'single' ? `${t('common.confirm')}` : `${confirmModal.cutoff}차 일괄 ${t('common.confirm')}`}
      >
        <div className="space-y-4">
          {confirmModal.type === 'single' ? (
            <p className="text-gray-800">
              이 주문을 확정하시겠습니까? 확정된 주문은 수정이 제한됩니다.
            </p>
          ) : (
            <p className="text-gray-800">
              {confirmModal.cutoff}차 마감의 모든 미확정 주문({getDraftCount(confirmModal.cutoff!)}건)을
              일괄 확정하시겠습니까?
            </p>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setConfirmModal({ open: false, type: 'single' })}
              disabled={processing}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (confirmModal.type === 'single' && confirmModal.orderId) {
                  handleConfirmOrder(confirmModal.orderId);
                } else if (confirmModal.type === 'bulk' && confirmModal.cutoff) {
                  handleBulkConfirm(confirmModal.cutoff);
                }
              }}
              disabled={processing}
            >
              {processing ? <Spinner size="sm" /> : t('common.confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 주문 취소 확인 모달 */}
      <Modal
        isOpen={cancelModal.open}
        onClose={() => setCancelModal({ open: false })}
        title="주문 취소"
      >
        <div className="space-y-4">
          <p className="text-gray-800">
            <span className="font-semibold text-red-600">{cancelModal.customerCode}</span> 고객의 주문을 취소하시겠습니까?
          </p>
          <p className="text-sm text-gray-600">
            이 작업은 되돌릴 수 없습니다. 해당 고객의 모든 주문 항목이 삭제됩니다.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setCancelModal({ open: false })}
              disabled={processing}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (cancelModal.orderId) {
                  handleDeleteOrder(cancelModal.orderId);
                }
              }}
              disabled={processing}
            >
              {processing ? <Spinner size="sm" /> : '주문 취소'}
            </Button>
          </div>
        </div>
      </Modal>
      </MainLayout>
    </ProtectedRoute>
  );
}
