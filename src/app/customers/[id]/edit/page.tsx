'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/context';
import { Button, Input, Select, LoadingState, Badge } from '@/components/ui';
import { getCustomer, updateCustomer } from '@/lib/firebase';
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

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const { user, isAdmin, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [originalGrade, setOriginalGrade] = useState<Grade>('C');
  const [formData, setFormData] = useState({
    code: '',
    fullName: '',
    grade: 'C' as Grade,
    region: '' as Region | '',
    deliveryTime: '',
    isActive: true,
  });

  // Load customer data
  useEffect(() => {
    const loadData = async () => {
      try {
        const customer = await getCustomer(customerId);

        if (!customer) {
          router.push('/customers');
          return;
        }

        setOriginalGrade(customer.grade);
        setFormData({
          code: customer.code,
          fullName: customer.fullName,
          grade: customer.grade,
          region: customer.region,
          deliveryTime: customer.deliveryTime || '',
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
        deliveryTime: formData.deliveryTime.trim() || undefined,
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

              <Input
                label="배송 시간"
                name="deliveryTime"
                value={formData.deliveryTime}
                onChange={handleChange}
                placeholder="예: 오전 10시, 오후 2시"
              />

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
          <div className="mt-6 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">제품 매핑</h3>
              <p className="text-sm text-gray-500">이 고객이 주문할 수 있는 제품을 설정합니다.</p>
            </div>
            <Link href={`/customers/${customerId}/products`}>
              <Button variant="secondary" size="sm">
                제품 관리
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
