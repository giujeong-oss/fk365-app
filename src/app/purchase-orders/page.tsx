'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { useI18n } from '@/lib/i18n/I18nContext';
import { ProtectedRoute } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { Button, Spinner, Badge, EmptyState } from '@/components/ui';
import {
  getProducts,
  getVendors,
  getCustomers,
  getOrderSummaryByProduct,
  getStockMap,
  getPurchaseOrdersByDate,
  createPurchaseOrder,
  generateBuy1PurchaseOrder,
  generateBuy2PurchaseOrder,
  generateBuy3PurchaseOrder,
  getOrdersByCutoff,
  setPrice,
  updateVendor,
  increaseStock,
  uploadReceiptImage,
} from '@/lib/firebase';
import type { Product, Vendor, PurchaseOrder, Cutoff } from '@/types';
import { Home, Printer, X, Download, FileDown, Save, Users, Search, Share2, Camera, Image, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';
import html2canvas from 'html2canvas';
import { exportToCsv, getDateForFilename, type CsvColumn } from '@/lib/utils';

type POType = 'buy1' | 'buy2' | 'buy3';

// 고객별 주문 정보
interface CustomerOrder {
  customerCode: string;
  customerName: string;
  qty: number;
  cutoff: 1 | 2 | 3;
}

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
  buyPrice?: number; // 실제 매입가 입력용
  actualQty?: number; // 실제 매입량 (영수증 숫자)
  customers: CustomerOrder[]; // 이 제품을 주문한 고객 목록
}

export default function PurchaseOrdersPage() {
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useI18n();
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
  const [vendorSearch, setVendorSearch] = useState('');
  const [activeTab, setActiveTab] = useState<POType>('buy1');
  const [printPO, setPrintPO] = useState<PurchaseOrder | null>(null);
  const [savingPrices, setSavingPrices] = useState(false);
  const [selectedProductForCustomers, setSelectedProductForCustomers] = useState<ProductSummary | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null); // PO ID being uploaded
  const [receiptPreview, setReceiptPreview] = useState<{ poId: string; url: string } | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    setLoading(true);
    try {
      const selectedDate = new Date(date);
      const [productsData, vendorsData, customersData, stockMap, existingPOs] = await Promise.all([
        getProducts(true),
        getVendors(true),
        getCustomers(true),
        getStockMap(),
        getPurchaseOrdersByDate(selectedDate),
      ]);

      setProducts(productsData);
      setVendors(vendorsData);
      setPurchaseOrders(existingPOs);

      // 고객 코드 → 이름 매핑
      const customerNameMap = new Map<string, string>();
      customersData.forEach((c) => customerNameMap.set(c.code, c.fullName));

      // cutoff별 주문 합계 계산
      const [cut1Orders, cut2Orders, cut3Orders] = await Promise.all([
        getOrdersByCutoff(selectedDate, 1),
        getOrdersByCutoff(selectedDate, 2),
        getOrdersByCutoff(selectedDate, 3),
      ]);

      // 제품별 수량 합산 및 고객 정보 추적
      const cut1Map = new Map<string, number>();
      const cut2Map = new Map<string, number>();
      const cut3Map = new Map<string, number>();
      const productCustomersMap = new Map<string, CustomerOrder[]>();

      cut1Orders.forEach((order) => {
        order.items.forEach((item) => {
          cut1Map.set(item.productCode, (cut1Map.get(item.productCode) || 0) + item.qty);
          // 고객 정보 추가
          if (!productCustomersMap.has(item.productCode)) {
            productCustomersMap.set(item.productCode, []);
          }
          productCustomersMap.get(item.productCode)!.push({
            customerCode: order.customerCode,
            customerName: customerNameMap.get(order.customerCode) || order.customerCode,
            qty: item.qty,
            cutoff: 1,
          });
        });
      });

      cut2Orders.forEach((order) => {
        order.items.forEach((item) => {
          cut2Map.set(item.productCode, (cut2Map.get(item.productCode) || 0) + item.qty);
          // 고객 정보 추가
          if (!productCustomersMap.has(item.productCode)) {
            productCustomersMap.set(item.productCode, []);
          }
          productCustomersMap.get(item.productCode)!.push({
            customerCode: order.customerCode,
            customerName: customerNameMap.get(order.customerCode) || order.customerCode,
            qty: item.qty,
            cutoff: 2,
          });
        });
      });

      cut3Orders.forEach((order) => {
        order.items.forEach((item) => {
          cut3Map.set(item.productCode, (cut3Map.get(item.productCode) || 0) + item.qty);
          // 고객 정보 추가
          if (!productCustomersMap.has(item.productCode)) {
            productCustomersMap.set(item.productCode, []);
          }
          productCustomersMap.get(item.productCode)!.push({
            customerCode: order.customerCode,
            customerName: customerNameMap.get(order.customerCode) || order.customerCode,
            qty: item.qty,
            cutoff: 3,
          });
        });
      });

      // 제품별 요약 생성
      const summaries: ProductSummary[] = productsData.map((product) => {
        const cut1 = cut1Map.get(product.code) || 0;
        const cut2 = cut2Map.get(product.code) || 0;
        const cut3 = cut3Map.get(product.code) || 0;
        const stock = stockMap.get(product.code) || 0;
        const customers = productCustomersMap.get(product.code) || [];

        return {
          product,
          cut1,
          cut2,
          cut3,
          stock,
          buy1: Math.max(0, cut1 - stock),
          buy2: cut2,
          buy3: cut3,
          customers,
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

  // 매입가 입력 처리
  const handleBuyPriceChange = (productCode: string, price: number) => {
    setProductSummaries((prev) =>
      prev.map((s) =>
        s.product.code === productCode
          ? { ...s, buyPrice: price }
          : s
      )
    );
  };

  // 실제 매입량 입력 처리
  const handleActualQtyChange = (productCode: string, qty: number) => {
    setProductSummaries((prev) =>
      prev.map((s) =>
        s.product.code === productCode
          ? { ...s, actualQty: qty }
          : s
      )
    );
  };

  // 추가 구매량 계산
  const getExtraQty = (summary: ProductSummary): number => {
    const orderQty = activeTab === 'buy1' ? summary.buy1 : activeTab === 'buy2' ? summary.buy2 : summary.buy3;
    if (summary.actualQty === undefined || summary.actualQty === 0) return 0;
    return summary.actualQty - orderQty;
  };

  // 매입가 및 실제 매입량 저장 (가격 히스토리 + 재고 반영)
  const handleSaveBuyPrices = async () => {
    const summariesWithPrice = productSummaries.filter((s) => s.buyPrice !== undefined && s.buyPrice > 0);
    const summariesWithActualQty = productSummaries.filter((s) => s.actualQty !== undefined && s.actualQty > 0);

    if (summariesWithPrice.length === 0 && summariesWithActualQty.length === 0) {
      alert('입력된 매입가 또는 실제 매입량이 없습니다.');
      return;
    }

    setSavingPrices(true);
    try {
      const selectedDate = new Date(date);

      // 병렬로 모든 가격 저장
      if (summariesWithPrice.length > 0) {
        await Promise.all(
          summariesWithPrice.map((s) =>
            setPrice(s.product.code, selectedDate, s.buyPrice!)
          )
        );
      }

      // 실제 매입량을 재고에 반영
      if (summariesWithActualQty.length > 0) {
        await Promise.all(
          summariesWithActualQty.map((s) =>
            increaseStock(s.product.code, s.actualQty!)
          )
        );
      }

      const messages = [];
      if (summariesWithPrice.length > 0) {
        messages.push(`${summariesWithPrice.length}개 제품 매입가`);
      }
      if (summariesWithActualQty.length > 0) {
        messages.push(`${summariesWithActualQty.length}개 제품 재고`);
      }
      alert(`${messages.join(', ')}가 저장되었습니다.`);

      // 데이터 새로고침
      await loadData();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setSavingPrices(false);
    }
  };

  // 구매처 변경 시 제품 매핑 자동 저장
  const handleVendorOverrideWithSave = async (productCode: string, newVendorCode: string) => {
    // 먼저 UI 업데이트
    handleVendorOverride(productCode, newVendorCode);

    // 새 구매처에 제품 매핑 추가
    if (newVendorCode) {
      try {
        const vendor = vendors.find(v => v.code === newVendorCode);
        if (vendor) {
          const currentProducts = vendor.products || [];
          if (!currentProducts.includes(productCode)) {
            await updateVendor(vendor.id, {
              products: [...currentProducts, productCode]
            });
          }
        }
      } catch (error) {
        console.error('Failed to save vendor product mapping:', error);
      }
    }
  };

  const getProductName = (productCode: string) => {
    return products.find((p) => p.code === productCode)?.name_ko || productCode;
  };

  const getProductDetails = (productCode: string) => {
    return products.find((p) => p.code === productCode);
  };

  const handlePrint = () => {
    if (captureRef.current) {
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
            ${captureRef.current.innerHTML}
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

  // 발주서 캡쳐 및 전송
  const handleCaptureAndShare = async () => {
    if (!captureRef.current) return;

    setCapturing(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });

      const vendorName = printPO?.vendorCode ? getVendorName(printPO.vendorCode) : (printPO?.note || '');
      const fileName = `발주서_${vendorName}_${date}.png`;

      // Web Share API 지원 여부 확인
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/png' });
        const shareData = {
          files: [file],
          title: `발주서 - ${vendorName}`,
          text: `${date} 발주서입니다.`,
        };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      }

      // Web Share API 미지원 시 다운로드
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('이미지가 다운로드되었습니다.');
    } catch (error) {
      console.error('Failed to capture:', error);
      alert('캡쳐에 실패했습니다.');
    } finally {
      setCapturing(false);
    }
  };

  // 영수증 업로드 핸들러
  const handleReceiptUpload = async (poId: string, file: File) => {
    setUploadingReceipt(poId);
    try {
      await uploadReceiptImage(poId, file);
      await loadData(); // 데이터 새로고침
      alert('영수증이 업로드되었습니다.');
    } catch (error) {
      console.error('Failed to upload receipt:', error);
      alert('영수증 업로드에 실패했습니다.');
    } finally {
      setUploadingReceipt(null);
    }
  };

  // 영수증 파일 선택 핸들러
  const handleReceiptFileChange = (poId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 이미지 파일 검증
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
      }
      // 파일 크기 제한 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.');
        return;
      }
      handleReceiptUpload(poId, file);
    }
    // 입력 초기화
    e.target.value = '';
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
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveBuyPrices}
              disabled={savingPrices}
            >
              <Save size={16} className="mr-1" />
              {savingPrices ? '저장 중...' : '매입가 저장'}
            </Button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex border-b mb-6">
          <button
            onClick={() => setActiveTab('buy1')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'buy1'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            1차 발주 (buy1)
          </button>
          <button
            onClick={() => setActiveTab('buy2')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'buy2'
                ? 'border-b-2 border-yellow-500 text-yellow-600'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            2차 발주 (buy2)
          </button>
          <button
            onClick={() => setActiveTab('buy3')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'buy3'
                ? 'border-b-2 border-red-500 text-red-600'
                : 'text-gray-700 hover:text-gray-900'
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="구매처 검색..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <select
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 min-w-48"
                >
                  <option value="">전체 구매처</option>
                  {vendors
                    .filter(v =>
                      !vendorSearch ||
                      v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                      v.code.toLowerCase().includes(vendorSearch.toLowerCase())
                    )
                    .map((vendor) => (
                    <option key={vendor.id} value={vendor.code}>
                      {vendor.code} | {vendor.name}
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
                    <div key={po.id} className="bg-white p-3 rounded border">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">
                            {po.vendorCode ? getVendorName(po.vendorCode) : po.note}
                          </span>
                          <span className="text-sm text-gray-800 ml-2">
                            {po.items.length}개 품목
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* 영수증 업로드 버튼 */}
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleReceiptFileChange(po.id)}
                              disabled={uploadingReceipt === po.id}
                            />
                            <span className={`inline-flex items-center px-2 py-1 text-sm rounded border ${
                              po.receiptImageUrl
                                ? 'bg-green-50 border-green-300 text-green-700'
                                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}>
                              {uploadingReceipt === po.id ? (
                                <>
                                  <Spinner size="sm" className="mr-1" />
                                  업로드 중...
                                </>
                              ) : po.receiptImageUrl ? (
                                <>
                                  <Image size={14} className="mr-1" />
                                  영수증
                                </>
                              ) : (
                                <>
                                  <Upload size={14} className="mr-1" />
                                  영수증
                                </>
                              )}
                            </span>
                          </label>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setPrintPO(po)}
                          >
                            <Printer size={16} className="mr-1" />
                            인쇄
                          </Button>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">
                              {po.totalAmount ? formatCurrency(po.totalAmount) : '-'}
                            </div>
                            <div className="text-xs text-gray-700">
                              {po.createdAt.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* 영수증 이미지 미리보기 */}
                      {po.receiptImageUrl && (
                        <div className="mt-2 pt-2 border-t">
                          <button
                            onClick={() => setReceiptPreview({ poId: po.id, url: po.receiptImageUrl! })}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                          >
                            <Image size={14} />
                            영수증 보기
                          </button>
                        </div>
                      )}
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
                    <th className="px-3 py-3 text-left text-sm font-medium text-gray-900">{t('products.code')}</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-gray-900">{t('products.product')}</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-gray-900">{t('products.type')}</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-gray-900">주문 상세</th>
                    {activeTab === 'buy1' && (
                      <th className="px-3 py-3 text-right text-sm font-medium text-gray-900">{t('nav.stock')}</th>
                    )}
                    <th className="px-3 py-3 text-right text-sm font-medium text-gray-900">{t('purchaseOrders.orderQty')}</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-gray-900">실제 매입량</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-gray-900">추가</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-gray-900">{t('purchaseOrders.buyPrice')}</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-gray-900">{t('vendors.vendor')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {getFilteredSummaries().map((summary) => {
                    const effectiveVendorCode = getEffectiveVendorCode(summary);
                    const isOverridden = summary.overrideVendorCode !== undefined;
                    const extraQty = getExtraQty(summary);

                    return (
                      <tr key={summary.product.code} className={`hover:bg-gray-50 ${isOverridden ? 'bg-yellow-50' : ''}`}>
                        <td className="px-3 py-3">
                          <span className="font-mono text-sm text-gray-900 font-semibold">{summary.product.code}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-gray-900">{summary.product.name_ko}</div>
                          <div className="text-sm text-gray-700">{summary.product.name_th}</div>
                          <div className="text-sm text-gray-600">{summary.product.name_mm}</div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge
                            variant={summary.product.priceType === 'fresh' ? 'success' : 'info'}
                            size="sm"
                          >
                            {summary.product.priceType === 'fresh' ? '신선' : '공산품'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {/* 주문 상세: 합계(cut1+cut2+cut3) 형식 */}
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-medium text-gray-900">
                              {summary.cut1 + summary.cut2 + summary.cut3}
                              <span className="text-xs text-gray-600 ml-1">
                                ({summary.cut1}+{summary.cut2}+{summary.cut3})
                              </span>
                            </span>
                            {summary.customers.length > 0 && (
                              <button
                                onClick={() => setSelectedProductForCustomers(summary)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="주문자 보기"
                              >
                                <Users size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        {activeTab === 'buy1' && (
                          <td className="px-3 py-3 text-right text-green-600 font-semibold">{summary.stock}</td>
                        )}
                        <td className="px-3 py-3 text-right font-bold text-blue-600">
                          {activeTab === 'buy1' ? summary.buy1 : activeTab === 'buy2' ? summary.buy2 : summary.buy3}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            placeholder="매입량"
                            value={summary.actualQty || ''}
                            onChange={(e) => handleActualQtyChange(summary.product.code, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          {extraQty !== 0 && (
                            <span className={`font-medium ${extraQty > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {extraQty > 0 ? '+' : ''}{extraQty}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            placeholder="฿"
                            value={summary.buyPrice || ''}
                            onChange={(e) => handleBuyPriceChange(summary.product.code, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          />
                        </td>
                        <td className="px-3 py-3">
                          {/* 신선 제품은 구매처 변경 가능 */}
                          {summary.product.priceType === 'fresh' ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={effectiveVendorCode}
                                onChange={(e) => handleVendorOverrideWithSave(summary.product.code, e.target.value)}
                                className={`px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                                  isOverridden ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
                                }`}
                              >
                                <option value="">선택 안함</option>
                                {vendors.map((v) => (
                                  <option key={v.code} value={v.code}>
                                    {v.code} | {v.name}
                                  </option>
                                ))}
                              </select>
                              {isOverridden && (
                                <button
                                  onClick={() => handleVendorOverride(summary.product.code, summary.product.vendorCode)}
                                  className="text-xs text-gray-600 hover:text-gray-800"
                                  title="원래 구매처로 복원"
                                >
                                  원복
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-900 font-semibold">
                              {effectiveVendorCode} | {getVendorName(effectiveVendorCode)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {getFilteredSummaries().length === 0 && (
                <div className="p-8 text-center text-gray-700">
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
                <Button onClick={handleCaptureAndShare} disabled={capturing} variant="secondary">
                  <Share2 size={18} className="mr-1" />
                  {capturing ? '캡쳐 중...' : '캡쳐/전송'}
                </Button>
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
              <div ref={captureRef}>
                <div className="header">
                  <h1>Purchase Order</h1>
                  <div className="date">{date}</div>
                </div>

                <div className="info-row">
                  <div>
                    <strong>Order Type:</strong> {printPO.type === 'buy1' ? '1st Order (Normal)' : printPO.type === 'buy2' ? '2nd Order (Additional)' : '3rd Order (Urgent)'}
                  </div>
                  <div>
                    <strong>Vendor:</strong> {printPO.vendorCode ? `${printPO.vendorCode} | ${getVendorName(printPO.vendorCode)}` : (printPO.note || 'All')}
                  </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Code</th>
                      <th>Product</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Type</th>
                      <th style={{ width: '80px', textAlign: 'right' }}>Qty</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Unit Price</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Amount</th>
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
                              <div style={{ fontSize: '11px', color: '#666' }}>{product.name_th}</div>
                            )}
                            {product?.name_mm && (
                              <div style={{ fontSize: '11px', color: '#666' }}>{product.name_mm}</div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {product?.priceType === 'fresh' ? 'Fresh' : 'Industrial'}
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
                  Total Amount: {formatCurrency(printPO.totalAmount || 0)}
                </div>

                <div className="footer">
                  Fresh Kitchen 365 - Generated on {new Date().toLocaleDateString('en-US')} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 주문자 목록 모달 */}
      {selectedProductForCustomers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">주문자 목록</h3>
                <p className="text-sm text-gray-600">
                  {selectedProductForCustomers.product.code} - {selectedProductForCustomers.product.name_ko}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedProductForCustomers(null);
                  setCustomerSearch('');
                }}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {/* 검색 */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="고객 코드 또는 이름으로 검색..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>

            {/* 주문 요약 */}
            <div className="p-4 bg-gray-50 border-b">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-600">총 주문</div>
                  <div className="text-lg font-bold text-gray-900">
                    {selectedProductForCustomers.cut1 + selectedProductForCustomers.cut2 + selectedProductForCustomers.cut3}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">1차 (정상)</div>
                  <div className="text-lg font-bold text-blue-600">{selectedProductForCustomers.cut1}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">2차 (추가)</div>
                  <div className="text-lg font-bold text-yellow-600">{selectedProductForCustomers.cut2}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">3차 (긴급)</div>
                  <div className="text-lg font-bold text-red-600">{selectedProductForCustomers.cut3}</div>
                </div>
              </div>
            </div>

            {/* 고객 목록 */}
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-900">고객</th>
                    <th className="px-3 py-2 text-center text-sm font-medium text-gray-900">주문 유형</th>
                    <th className="px-3 py-2 text-right text-sm font-medium text-gray-900">수량</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedProductForCustomers.customers
                    .filter((c) =>
                      !customerSearch ||
                      c.customerCode.toLowerCase().includes(customerSearch.toLowerCase()) ||
                      c.customerName.toLowerCase().includes(customerSearch.toLowerCase())
                    )
                    .sort((a, b) => a.cutoff - b.cutoff)
                    .map((customer, idx) => (
                      <tr key={`${customer.customerCode}-${customer.cutoff}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{customer.customerName}</div>
                          <div className="text-xs text-gray-600">{customer.customerCode}</div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge
                            variant={customer.cutoff === 1 ? 'info' : customer.cutoff === 2 ? 'warning' : 'danger'}
                            size="sm"
                          >
                            {customer.cutoff === 1 ? '1차 정상' : customer.cutoff === 2 ? '2차 추가' : '3차 긴급'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">{customer.qty}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {selectedProductForCustomers.customers.filter((c) =>
                !customerSearch ||
                c.customerCode.toLowerCase().includes(customerSearch.toLowerCase()) ||
                c.customerName.toLowerCase().includes(customerSearch.toLowerCase())
              ).length === 0 && (
                <div className="p-8 text-center text-gray-600">
                  {customerSearch ? '검색 결과가 없습니다.' : '주문자가 없습니다.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 영수증 미리보기 모달 */}
      {receiptPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">영수증 이미지</h3>
              <button
                onClick={() => setReceiptPreview(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100">
              <img
                src={receiptPreview.url}
                alt="영수증"
                className="max-w-full max-h-[70vh] object-contain rounded shadow-lg"
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <a
                href={receiptPreview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                새 탭에서 열기
              </a>
              <label className="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleReceiptFileChange(receiptPreview.poId)}
                  disabled={uploadingReceipt === receiptPreview.poId}
                />
                {uploadingReceipt === receiptPreview.poId ? '업로드 중...' : '다른 이미지로 교체'}
              </label>
            </div>
          </div>
        </div>
      )}
      </MainLayout>
    </ProtectedRoute>
  );
}
