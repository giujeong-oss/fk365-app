'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/context';
import { Button, Input, Select } from '@/components/ui';
import { createCustomer } from '@/lib/firebase';
import type { Grade, Region } from '@/types';
import { ArrowLeft } from 'lucide-react';
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

export default function NewCustomerPage() {
  const router = useRouter();
  const { user, isAdmin, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    fullName: '',
    grade: 'C' as Grade,
    region: '' as Region | '',
    deliveryTime: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.code.trim()) {
      setError('고객 코드를 입력해주세요.');
      return;
    }
    if (!formData.fullName.trim()) {
      setError('고객 이름을 입력해주세요.');
      return;
    }
    if (!formData.region) {
      setError('지역을 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      await createCustomer({
        code: formData.code.trim().toUpperCase(),
        fullName: formData.fullName.trim(),
        grade: formData.grade,
        region: formData.region as Region,
        deliveryTime: formData.deliveryTime.trim() || undefined,
        products: [],
        isActive: true,
      });

      router.push('/customers');
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="고객 등록"
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
            <h1 className="text-2xl font-bold text-gray-900">고객 등록</h1>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <Input
                label="고객 코드"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="예: DJG1, BJ2"
                required
              />

              <Input
                label="고객 이름"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="예: 대장금1, 반점2"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="등급"
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  options={GRADE_OPTIONS}
                  required
                />

                <Select
                  label="지역"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  options={REGION_OPTIONS}
                  placeholder="지역 선택"
                  required
                />
              </div>

              <Input
                label="배송 시간"
                name="deliveryTime"
                value={formData.deliveryTime}
                onChange={handleChange}
                placeholder="예: 오전 10시, 오후 2시"
                helperText="선택 사항"
              />

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
                <Button type="submit" loading={loading}>
                  저장
                </Button>
              </div>
            </div>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">등급 안내</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li><strong>S등급:</strong> 신선제품 마진 5฿, 공산품 Pur×1.05</li>
              <li><strong>A등급:</strong> 신선제품 마진 8฿, 공산품 Pur×1.10</li>
              <li><strong>B등급:</strong> 신선제품 마진 10฿, 공산품 Pur×1.15</li>
              <li><strong>C등급:</strong> 신선제품 마진 12฿, 공산품 Pur×1.20</li>
              <li><strong>D등급:</strong> 신선제품 마진 15฿, 공산품 Mid×0.95</li>
            </ul>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
