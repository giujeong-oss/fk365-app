'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/context';
import { Button } from '@/components/ui';
import {
  getProducts,
  getCustomers,
  getVendors,
  getMargins,
} from '@/lib/firebase';
import type { Product, Customer, Vendor } from '@/types';
import Link from 'next/link';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface DiagnosticsData {
  products: {
    total: number;
    active: number;
    sampleCodes: string[];
  };
  customers: {
    total: number;
    active: number;
    sampleCodes: string[];
  };
  vendors: {
    total: number;
    active: number;
    sampleCodes: string[];
  };
  margins: {
    total: number;
  };
  matchTest: {
    customerCode: string;
    customerProducts: string[];
    matchedProducts: number;
    unmatchedCodes: string[];
  } | null;
}

export default function DiagnosticsPage() {
  const { user, isAdmin, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testCustomerCode, setTestCustomerCode] = useState('B2');

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [allProducts, activeProducts, allCustomers, activeCustomers, vendors, margins] =
        await Promise.all([
          getProducts(false),
          getProducts(true),
          getCustomers(false),
          getCustomers(true),
          getVendors(),
          getMargins(),
        ]);

      const diagnosticsData: DiagnosticsData = {
        products: {
          total: allProducts.length,
          active: activeProducts.length,
          sampleCodes: activeProducts.slice(0, 10).map((p) => p.code),
        },
        customers: {
          total: allCustomers.length,
          active: activeCustomers.length,
          sampleCodes: activeCustomers.slice(0, 10).map((c) => c.code),
        },
        vendors: {
          total: vendors.length,
          active: vendors.filter((v) => v.isActive).length,
          sampleCodes: vendors.slice(0, 10).map((v) => v.code),
        },
        margins: {
          total: margins.length,
        },
        matchTest: null,
      };

      // 특정 고객의 제품 매칭 테스트
      const testCustomer = activeCustomers.find((c) => c.code === testCustomerCode);
      if (testCustomer) {
        const customerProductCodes = testCustomer.products || [];
        const productCodeSet = new Set(activeProducts.map((p) => p.code));

        const matchedProducts = customerProductCodes.filter((code) =>
          productCodeSet.has(code)
        );
        const unmatchedCodes = customerProductCodes.filter(
          (code) => !productCodeSet.has(code)
        );

        diagnosticsData.matchTest = {
          customerCode: testCustomerCode,
          customerProducts: customerProductCodes,
          matchedProducts: matchedProducts.length,
          unmatchedCodes,
        };
      }

      setData(diagnosticsData);
    } catch (err) {
      console.error('Diagnostics error:', err);
      setError(err instanceof Error ? err.message : '진단 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  const runMatchTest = async () => {
    if (!data) return;

    setLoading(true);
    try {
      const [activeProducts, activeCustomers] = await Promise.all([
        getProducts(true),
        getCustomers(true),
      ]);

      const testCustomer = activeCustomers.find((c) => c.code === testCustomerCode);
      if (testCustomer) {
        const customerProductCodes = testCustomer.products || [];
        const productCodeSet = new Set(activeProducts.map((p) => p.code));

        const matchedProducts = customerProductCodes.filter((code) =>
          productCodeSet.has(code)
        );
        const unmatchedCodes = customerProductCodes.filter(
          (code) => !productCodeSet.has(code)
        );

        setData({
          ...data,
          matchTest: {
            customerCode: testCustomerCode,
            customerProducts: customerProductCodes,
            matchedProducts: matchedProducts.length,
            unmatchedCodes,
          },
        });
      } else {
        setData({
          ...data,
          matchTest: null,
        });
        setError(`고객 코드 '${testCustomerCode}'를 찾을 수 없습니다.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '테스트 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = ({ ok }: { ok: boolean }) =>
    ok ? (
      <CheckCircle className="text-green-500" size={20} />
    ) : (
      <XCircle className="text-red-500" size={20} />
    );

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="시스템 진단"
        onLogout={signOut}
      >
        <div className="p-4 lg:p-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Firebase 데이터 진단</h1>
            <Button
              onClick={loadDiagnostics}
              variant="secondary"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              새로고침
            </Button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            </div>
          )}

          {loading && !data ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">데이터 로딩 중...</p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* 컬렉션 상태 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b">
                  <h2 className="font-semibold text-gray-900">Firestore 컬렉션 상태</h2>
                </div>
                <div className="divide-y">
                  {/* Products */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusIcon ok={data.products.active > 0} />
                      <div>
                        <p className="font-medium">fk365_products</p>
                        <p className="text-sm text-gray-600">
                          전체: {data.products.total}개 / 활성: {data.products.active}개
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/products"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      관리하기 →
                    </Link>
                  </div>

                  {/* Customers */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusIcon ok={data.customers.active > 0} />
                      <div>
                        <p className="font-medium">fk365_customers</p>
                        <p className="text-sm text-gray-600">
                          전체: {data.customers.total}개 / 활성: {data.customers.active}개
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/customers"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      관리하기 →
                    </Link>
                  </div>

                  {/* Vendors */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusIcon ok={data.vendors.active > 0} />
                      <div>
                        <p className="font-medium">fk365_vendors</p>
                        <p className="text-sm text-gray-600">
                          전체: {data.vendors.total}개 / 활성: {data.vendors.active}개
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/vendors"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      관리하기 →
                    </Link>
                  </div>

                  {/* Margins */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusIcon ok={data.margins.total > 0} />
                      <div>
                        <p className="font-medium">fk365_margins</p>
                        <p className="text-sm text-gray-600">
                          설정: {data.margins.total}개
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/margins"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      관리하기 →
                    </Link>
                  </div>
                </div>
              </div>

              {/* 샘플 데이터 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b">
                  <h2 className="font-semibold text-gray-900">샘플 데이터</h2>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      제품 코드 (처음 10개):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {data.products.sampleCodes.length > 0 ? (
                        data.products.sampleCodes.map((code) => (
                          <span
                            key={code}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-mono"
                          >
                            {code}
                          </span>
                        ))
                      ) : (
                        <span className="text-red-500">제품 데이터 없음</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      고객 코드 (처음 10개):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {data.customers.sampleCodes.length > 0 ? (
                        data.customers.sampleCodes.map((code) => (
                          <span
                            key={code}
                            className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-mono"
                          >
                            {code}
                          </span>
                        ))
                      ) : (
                        <span className="text-red-500">고객 데이터 없음</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 제품 매칭 테스트 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b">
                  <h2 className="font-semibold text-gray-900">제품 매칭 테스트</h2>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <input
                      type="text"
                      value={testCustomerCode}
                      onChange={(e) => setTestCustomerCode(e.target.value)}
                      placeholder="고객 코드"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <Button onClick={runMatchTest} disabled={loading}>
                      테스트 실행
                    </Button>
                  </div>

                  {data.matchTest ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">고객:</span>
                        <span className="font-mono">{data.matchTest.customerCode}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">고객에 매핑된 제품 수:</span>
                        <span className="font-mono">
                          {data.matchTest.customerProducts.length}개
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusIcon
                          ok={data.matchTest.matchedProducts > 0}
                        />
                        <span className="font-medium">
                          실제 매칭된 제품 수:
                        </span>
                        <span
                          className={`font-mono ${
                            data.matchTest.matchedProducts > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {data.matchTest.matchedProducts}개
                        </span>
                      </div>

                      {data.matchTest.unmatchedCodes.length > 0 && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm font-medium text-yellow-800 mb-2">
                            ⚠️ Firebase에 없는 제품 코드 ({data.matchTest.unmatchedCodes.length}개):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {data.matchTest.unmatchedCodes.slice(0, 20).map((code) => (
                              <span
                                key={code}
                                className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-mono"
                              >
                                {code}
                              </span>
                            ))}
                            {data.matchTest.unmatchedCodes.length > 20 && (
                              <span className="text-yellow-600 text-sm">
                                +{data.matchTest.unmatchedCodes.length - 20}개 더...
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {data.matchTest.matchedProducts === 0 &&
                        data.matchTest.customerProducts.length > 0 && (
                          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="font-medium text-red-800 mb-2">
                              ❌ 문제 발견: 제품이 매핑되어 있지만 매칭되지 않음
                            </p>
                            <p className="text-sm text-red-700 mb-3">
                              고객에게 {data.matchTest.customerProducts.length}개의 제품
                              코드가 매핑되어 있지만, Firebase의 fk365_products
                              컬렉션에서 일치하는 제품이 0개입니다.
                            </p>
                            <p className="text-sm text-red-700 mb-3">
                              <strong>원인:</strong> fk365_products 컬렉션에 제품 데이터가
                              없거나, 제품 코드가 일치하지 않습니다.
                            </p>
                            <p className="text-sm text-red-700 font-medium">
                              <strong>해결 방법:</strong> 시드 스크립트를 실행하여 제품
                              데이터를 Firebase에 등록하세요:
                            </p>
                            <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded text-sm overflow-x-auto">
                              node scripts/seed-data.mjs
                            </pre>
                          </div>
                        )}
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      고객 코드를 입력하고 테스트를 실행하세요.
                    </p>
                  )}
                </div>
              </div>

              {/* 시드 스크립트 안내 */}
              {(data.products.active === 0 || data.customers.active === 0) && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                  <h3 className="font-semibold text-orange-800 mb-3">
                    ⚠️ 시드 데이터 등록 필요
                  </h3>
                  <p className="text-orange-700 mb-4">
                    Firebase에 필요한 데이터가 없습니다. 아래 명령어로 시드 데이터를
                    등록하세요:
                  </p>
                  <pre className="p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto text-sm">
{`# 프로젝트 디렉토리에서 실행
node scripts/seed-data.mjs`}
                  </pre>
                  <p className="text-orange-600 text-sm mt-3">
                    필요한 CSV 파일: output/products.csv, output/customers_v2.csv,
                    output/vendors_utf8.csv 등
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
