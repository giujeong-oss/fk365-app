'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/context';
import { Button, Input, Select, LoadingState, Badge } from '@/components/ui';
import { getCustomer, updateCustomer, getProducts } from '@/lib/firebase';
import type { Product } from '@/types';
import type { Grade, Region } from '@/types';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const GRADE_OPTIONS = [
  { value: 'S', label: 'S (최우수)' },
  { value: 'A', label: 'A (우수)' },
  { value: 'B', label: 'B (일반)' },
  { value: 'C', label: 'C (신규)' },
  { value: 'D', label: 'D (주의)' },
  { value: 'E', label: 'E (특별관리)' },
];

const REGION_OPTIONS = [
  { value: 'pattaya', label: '파타야' },
  { value: 'bangkok', label: '방콕' },
];

const DELIVERY_TIME_OPTIONS = [
  { value: '', label: '선택 안함' },
  { value: '06:00', label: '~06:00 전까지' },
  { value: '07:00', label: '~07:00 전까지' },
  { value: '08:00', label: '~08:00 전까지' },
  { value: '09:00', label: '~09:00 전까지' },
  { value: '10:00', label: '~10:00 전까지' },
  { value: '11:00', label: '~11:00 전까지' },
  { value: '12:00', label: '~12:00 전까지' },
  { value: '13:00', label: '~13:00 전까지' },
  { value: '14:00', label: '~14:00 전까지' },
  { value: '15:00', label: '~15:00 전까지' },
  { value: '16:00', label: '~16:00 전까지' },
  { value: '17:00', label: '~17:00 전까지' },
];

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const { user, isAdmin, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customerProductCodes, setCustomerProductCodes] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const [originalGrade, setOriginalGrade] = useState<Grade>('C');
  const [formData, setFormData] = useState({
    code: '',
    fullName: '',
    grade: 'C' as Grade,
    region: '' as Region | '',
    deliveryTime: '',
    gpsLat: '',
    gpsLng: '',
    contact1: '',
    contact2: '',
    isActive: true,
  });

  // Load customer data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [customer, products] = await Promise.all([
          getCustomer(customerId),
          getProducts(true),
        ]);

        if (!customer) {
          router.push('/customers');
          return;
        }

        setOriginalGrade(customer.grade);
        setCustomerProductCodes(customer.products || []);
        setAllProducts(products);
        setFormData({
          code: customer.code,
          fullName: customer.fullName,
          grade: customer.grade,
          region: customer.region,
          deliveryTime: customer.deliveryTime || '',
          gpsLat: customer.gpsLat?.toString() || '',
          gpsLng: customer.gpsLng?.toString() || '',
          contact1: customer.contact1 || '',
          contact2: customer.contact2 || '',
          isActive: customer.isActive,
        });
      } catch (err) {
        console.error('Failed to load customer:', err);
        router.push('/customers');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [customerId, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError('고객 이름을 입력해주세요.');
      return;
    }
    if (!formData.region) {
      setError('지역을 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      await updateCustomer(customerId, {
        fullName: formData.fullName.trim(),
        grade: formData.grade,
        region: formData.region as Region,
        deliveryTime: formData.deliveryTime || undefined,
        gpsLat: formData.gpsLat ? parseFloat(formData.gpsLat) : undefined,
        gpsLng: formData.gpsLng ? parseFloat(formData.gpsLng) : undefined,
        contact1: formData.contact1.trim() || undefined,
        contact2: formData.contact2.trim() || undefined,
        isActive: formData.isActive,
      });

      router.push('/customers');
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const gradeChanged = formData.grade !== originalGrade;

  if (loading) {
    return (
      <ProtectedRoute adminOnly>
        <MainLayout
          isAdmin={isAdmin}
          userName={user?.email || ''}
          pageTitle="고객 수정"
          onLogout={signOut}
        >
          <LoadingState message="고객 정보를 불러오는 중..." />
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="고객 수정"
        onLogout={signOut}
      >
        <div className="p-4 lg:p-8 max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/customers">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <ArrowLeft size={20} />
              </button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">고객 수정</h1>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <Input
                label="고객 코드"
                value={formData.code}
                disabled
                helperText="고객 코드는 변경할 수 없습니다"
              />

              <Input
                label="고객 이름"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Select
                    label="등급"
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    options={GRADE_OPTIONS}
                    required
                  />
                  {gradeChanged && (
                    <div className="mt-2 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800">등급 변경 주의</p>
                        <p className="text-amber-700">
                          등급이 변경되면 이 고객의 모든 제품 adj가 0으로 초기화됩니다.
                        </p>
                        <p className="text-amber-600 mt-1">
                          {originalGrade} → {formData.grade}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Select
                  label="지역"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  options={REGION_OPTIONS}
                  required
                />
              </div>

              <Select
                label="배송 시간"
                name="deliveryTime"
                value={formData.deliveryTime}
                onChange={handleChange}
                options={DELIVERY_TIME_OPTIONS}
              />

              {/* 연락처 */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="연락처 1"
                  name="contact1"
                  value={formData.contact1}
                  onChange={handleChange}
                  placeholder="예: 081-234-5678"
                />
                <Input
                  label="연락처 2"
                  name="contact2"
                  value={formData.contact2}
                  onChange={handleChange}
                  placeholder="예: 081-234-5678"
                />
              </div>

              {/* GPS 좌표 */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="GPS 위도"
                  name="gpsLat"
                  type="number"
                  step="any"
                  value={formData.gpsLat}
                  onChange={handleChange}
                  placeholder="예: 12.9236"
                />
                <Input
                  label="GPS 경도"
                  name="gpsLng"
                  type="number"
                  step="any"
                  value={formData.gpsLng}
                  onChange={handleChange}
                  placeholder="예: 100.8825"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  활성 상태
                </label>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Link href="/customers">
                  <Button type="button" variant="secondary">
                    취소
                  </Button>
                </Link>
                <Button type="submit" loading={saving}>
                  저장
                </Button>
              </div>
            </div>
          </form>

          {/* Products Link */}
          <div className="mt-6 bg-gray-50 rounded-lg overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-gray-200">
              <div>
                <h3 className="font-medium text-gray-900">제품 매핑</h3>
                <p className="text-sm text-gray-600">
                  {customerProductCodes.length > 0
                    ? `${customerProductCodes.length}개 제품이 매핑되어 있습니다`
                    : '매핑된 제품이 없습니다'}
                </p>
              </div>
              <Link href={`/customers/${customerId}/products`}>
                <Button variant="secondary" size="sm">
                  제품 관리
                </Button>
              </Link>
            </div>
            {/* 현재 매핑된 제품 목록 */}
            {customerProductCodes.length > 0 && (
              <div className="p-4 max-h-48 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {customerProductCodes.map((code) => {
                    const product = allProducts.find(p => p.code === code);
                    return (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                        title={product ? `${product.name_ko} / ${product.name_th}` : code}
                      >
                        <span className="font-mono text-gray-700">{code}</span>
                        {product && (
                          <span className="text-gray-500">- {product.name_ko}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
