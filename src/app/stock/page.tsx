'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/context';
import { ProtectedRoute } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { Button, Input, Spinner, Badge, EmptyState } from '@/components/ui';
import { getProducts, getAllStock, setStock, batchUpdateStock } from '@/lib/firebase';
import type { Product, Stock } from '@/types';
import { Home, Download } from 'lucide-react';
import Link from 'next/link';
import { exportToCsv, getDateForFilename, type CsvColumn } from '@/lib/utils';

const LOCATION_OPTIONS = [
  { value: '', label: '선택 안함' },
  { value: 'freezer', label: '냉동창고' },
  { value: 'fridge', label: '냉장창고' },
  { value: 'zone-a', label: 'A zone' },
  { value: 'zone-b', label: 'B zone' },
];

interface ProductStock {
  product: Product;
  qty: number;
  location: string;
  isModified: boolean;
}

export default function StockPage() {
  const { user, isAdmin, signOut } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [productStocks, setProductStocks] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

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

      // 카테고리 추출
      const cats = new Set<string>();
      productsData.forEach((p) => {
        if (p.category) cats.add(p.category);
      });
      setCategories(Array.from(cats).sort());

      // 재고 맵 생성 (qty와 location 포함)
      const stockMap = new Map<string, { qty: number; location: string }>();
      stockData.forEach((s) => {
        stockMap.set(s.code, { qty: s.qty, location: s.location || '' });
      });

      // 제품별 재고 상태 생성
      const stocks: ProductStock[] = productsData.map((product) => {
        const stockInfo = stockMap.get(product.code);
        return {
          product,
          qty: stockInfo?.qty || 0,
          location: stockInfo?.location || '',
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

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const modifiedItems = productStocks
        .filter((ps) => ps.isModified)
        .map((ps) => ({
          productCode: ps.product.code,
          qty: ps.qty,
          location: ps.location,
        }));

      if (modifiedItems.length === 0) {
        alert('변경된 항목이 없습니다.');
        return;
      }

      await batchUpdateStock(modifiedItems);

      // 수정 상태 초기화
      setProductStocks((prev) =>
        prev.map((ps) => ({ ...ps, isModified: false }))
      );

      alert(`${modifiedItems.length}개 항목이 저장되었습니다.`);
    } catch (error) {
      console.error('Failed to save stock:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = () => {
    loadData();
  };

  // CSV Export handler
  const handleExportCsv = () => {
    const getLocationLabel = (loc: string) => {
      const option = LOCATION_OPTIONS.find(o => o.value === loc);
      return option?.label || loc || '';
    };

    const columns: CsvColumn<ProductStock>[] = [
      { header: '코드', accessor: (ps) => ps.product.code },
      { header: '한국어명', accessor: (ps) => ps.product.name_ko },
      { header: '태국어명', accessor: (ps) => ps.product.name_th },
      { header: '미얀마어명', accessor: (ps) => ps.product.name_mm },
      { header: '단위', accessor: (ps) => ps.product.unit },
      { header: '카테고리', accessor: (ps) => ps.product.category || '' },
      { header: '보관장소', accessor: (ps) => getLocationLabel(ps.location) },
      { header: '재고수량', accessor: (ps) => ps.qty },
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

    const matchesCategory = !selectedCategory || ps.product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const modifiedCount = productStocks.filter((ps) => ps.isModified).length;
  const totalStock = productStocks.reduce((sum, ps) => sum + ps.qty, 0);

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="재고 관리"
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
            <div>
              <h1 className="text-2xl font-bold">재고 관리</h1>
              <p className="text-sm text-gray-500 mt-1">
                총 {products.length}개 제품 / 총 재고 {totalStock}개
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {modifiedCount > 0 && (
              <Badge variant="warning">{modifiedCount}개 변경됨</Badge>
            )}
            <Button variant="secondary" onClick={handleExportCsv}>
              <Download size={18} className="mr-1" />
              CSV
            </Button>
            <Button variant="secondary" onClick={handleResetAll} disabled={modifiedCount === 0}>
              초기화
            </Button>
            <Button onClick={handleSaveAll} disabled={saving || modifiedCount === 0}>
              {saving ? '저장 중...' : '모두 저장'}
            </Button>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="제품 코드 또는 이름으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 카테고리</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredStocks.length === 0 ? (
          <EmptyState
            title="제품이 없습니다"
            description={searchTerm || selectedCategory ? '검색 조건을 변경해보세요.' : '먼저 제품을 등록해주세요.'}
          />
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            {/* PC 테이블 뷰 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">코드</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">제품명</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">단위</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">보관장소</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">상태</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">재고 수량</th>
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
                          className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        >
                          {LOCATION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {ps.isModified && (
                          <Badge variant="warning" size="sm">수정됨</Badge>
                        )}
                        {!ps.isModified && ps.qty === 0 && (
                          <Badge variant="danger" size="sm">품절</Badge>
                        )}
                        {!ps.isModified && ps.qty > 0 && ps.qty <= 5 && (
                          <Badge variant="warning" size="sm">부족</Badge>
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
                        {ps.isModified && <Badge variant="warning" size="sm">수정됨</Badge>}
                      </div>
                      <div className="text-sm text-gray-700">{ps.product.name_th}</div>
                      <div className="text-sm text-gray-600">{ps.product.name_mm}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {ps.product.code} | {ps.product.category || '-'} | {ps.product.unit}
                      </div>
                    </div>
                    {!ps.isModified && ps.qty === 0 && (
                      <Badge variant="danger" size="sm">품절</Badge>
                    )}
                    {!ps.isModified && ps.qty > 0 && ps.qty <= 5 && (
                      <Badge variant="warning" size="sm">부족</Badge>
                    )}
                  </div>

                  {/* 보관장소 선택 */}
                  <div className="mb-3">
                    <label className="text-xs text-gray-600 mb-1 block">보관장소</label>
                    <select
                      value={ps.location}
                      onChange={(e) => handleLocationChange(ps.product.code, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {LOCATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
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
              <span className="text-sm text-gray-600">{modifiedCount}개 항목 변경됨</span>
              <Button variant="secondary" size="sm" onClick={handleResetAll}>
                초기화
              </Button>
            </div>
            <Button onClick={handleSaveAll} disabled={saving} className="w-full">
              {saving ? '저장 중...' : '모두 저장'}
            </Button>
          </div>
        )}
      </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
