'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/context';
import { Button, Input, Select, LoadingState } from '@/components/ui';
import { getProduct, updateProduct, getVendors } from '@/lib/firebase';
import type { Vendor, PriceType } from '@/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'ea', label: 'ea (개)' },
  { value: 'pack', label: 'pack (팩)' },
  { value: 'box', label: 'box (박스)' },
  { value: 'bottle', label: 'bottle (병)' },
  { value: 'can', label: 'can (캔)' },
  { value: 'bag', label: 'bag (봉지)' },
];

const COLOR_OPTIONS = [
  { value: '', label: '선택 안함' },
  { value: 'GREEN', label: '초록' },
  { value: 'RED', label: '빨강' },
  { value: 'YELLOW', label: '노랑' },
  { value: 'ORANGE', label: '주황' },
  { value: 'WHITE', label: '흰색' },
  { value: 'BROWN', label: '갈색' },
  { value: 'PURPLE', label: '보라' },
];

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const { user, isAdmin, signOut } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    code: '',
    name_ko: '',
    name_th: '',
    name_mm: '',
    unit: 'kg',
    color: '',
    category: '',
    priceType: 'fresh' as PriceType,
    pur: '',
    min: '',
    mid: '',
    vendorCode: '',
    isActive: true,
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [product, vendorsData] = await Promise.all([
          getProduct(productId),
          getVendors(true),
        ]);

        if (!product) {
          router.push('/products');
          return;
        }

        setVendors(vendorsData);
        setFormData({
          code: product.code,
          name_ko: product.name_ko,
          name_th: product.name_th,
          name_mm: product.name_mm,
          unit: product.unit,
          color: product.color || '',
          category: product.category || '',
          priceType: product.priceType,
          pur: product.pur?.toString() || '',
          min: product.min?.toString() || '',
          mid: product.mid?.toString() || '',
          vendorCode: product.vendorCode,
          isActive: product.isActive,
        });
      } catch (err) {
        console.error('Failed to load product:', err);
        router.push('/products');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [productId, router]);

  // Handle form change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle price type change
  const handlePriceTypeChange = (type: PriceType) => {
    setFormData((prev) => ({
      ...prev,
      priceType: type,
    }));
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name_ko.trim()) {
      setError('한국어 제품명을 입력해주세요.');
      return;
    }
    if (!formData.name_th.trim()) {
      setError('태국어 제품명을 입력해주세요.');
      return;
    }
    if (!formData.vendorCode) {
      setError('구매처를 선택해주세요.');
      return;
    }

    // Industrial product validation
    if (formData.priceType === 'industrial') {
      if (!formData.pur || !formData.min || !formData.mid) {
        setError('공산품은 Pur, Min, Mid 가격을 모두 입력해야 합니다.');
        return;
      }
    }

    setSaving(true);
    try {
      await updateProduct(productId, {
        name_ko: formData.name_ko.trim(),
        name_th: formData.name_th.trim(),
        name_mm: formData.name_mm.trim(),
        unit: formData.unit,
        color: formData.color || undefined,
        category: formData.category.trim() || undefined,
        priceType: formData.priceType,
        pur: formData.pur ? Number(formData.pur) : undefined,
        min: formData.min ? Number(formData.min) : undefined,
        mid: formData.mid ? Number(formData.mid) : undefined,
        vendorCode: formData.vendorCode,
        isActive: formData.isActive,
      });

      router.push('/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const vendorOptions = vendors.map((v) => ({
    value: v.code,
    label: `${v.code} - ${v.name}`,
  }));

  if (loading) {
    return (
      <ProtectedRoute adminOnly>
        <MainLayout
          isAdmin={isAdmin}
          userName={user?.email || ''}
          pageTitle="제품 수정"
          onLogout={signOut}
        >
          <LoadingState message="제품 정보를 불러오는 중..." />
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="제품 수정"
        onLogout={signOut}
      >
        <div className="p-4 lg:p-8 max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/products">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <ArrowLeft size={20} />
              </button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">제품 수정</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
              <div className="space-y-4">
                <Input
                  label="제품 코드"
                  value={formData.code}
                  disabled
                  helperText="제품 코드는 변경할 수 없습니다"
                />

                <Input
                  label="제품명 (한국어)"
                  name="name_ko"
                  value={formData.name_ko}
                  onChange={handleChange}
                  required
                />

                <Input
                  label="제품명 (태국어)"
                  name="name_th"
                  value={formData.name_th}
                  onChange={handleChange}
                  required
                />

                <Input
                  label="제품명 (미얀마어)"
                  name="name_mm"
                  value={formData.name_mm}
                  onChange={handleChange}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="단위"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    options={UNIT_OPTIONS}
                    required
                  />

                  <Select
                    label="색상"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    options={COLOR_OPTIONS}
                  />
                </div>

                <Input
                  label="카테고리"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="예: 채소, 과일, 소모품"
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
              </div>
            </div>

            {/* Price Type Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">제품 유형</h2>

              <div className="flex gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => handlePriceTypeChange('fresh')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                    formData.priceType === 'fresh'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">신선제품</p>
                  <p className="text-sm text-gray-500">채소/과일/장보기</p>
                </button>

                <button
                  type="button"
                  onClick={() => handlePriceTypeChange('industrial')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                    formData.priceType === 'industrial'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">공산품</p>
                  <p className="text-sm text-gray-500">소모품/세제/봉투</p>
                </button>
              </div>

              {/* Industrial price fields */}
              {formData.priceType === 'industrial' && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                  <Input
                    label="Pur (매입가)"
                    name="pur"
                    type="number"
                    value={formData.pur}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label="Min (시장최소가)"
                    name="min"
                    type="number"
                    value={formData.min}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label="Mid (시장중간가)"
                    name="mid"
                    type="number"
                    value={formData.mid}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}
            </div>

            {/* Vendor Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">구매처</h2>
              <Select
                label="구매처 선택"
                name="vendorCode"
                value={formData.vendorCode}
                onChange={handleChange}
                options={vendorOptions}
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Link href="/products">
                <Button type="button" variant="secondary">
                  취소
                </Button>
              </Link>
              <Button type="submit" loading={saving}>
                저장
              </Button>
            </div>
          </form>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
