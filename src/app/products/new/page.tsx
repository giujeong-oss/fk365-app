'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/context';
import { Button, Input, Select } from '@/components/ui';
import { createProduct, getVendors, createVendor } from '@/lib/firebase';
import type { Vendor, PriceType } from '@/types';
import { ArrowLeft, Plus } from 'lucide-react';
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

export default function NewProductPage() {
  const router = useRouter();
  const { user, isAdmin, signOut } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
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
  });

  // New vendor modal
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [newVendorData, setNewVendorData] = useState({ code: '', name: '' });
  const [vendorSaving, setVendorSaving] = useState(false);

  // Load vendors
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const data = await getVendors(true);
        setVendors(data);
      } catch (err) {
        console.error('Failed to load vendors:', err);
      }
    };
    loadVendors();
  }, []);

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
      // Reset industrial prices when switching to fresh
      ...(type === 'fresh' ? { pur: '', min: '', mid: '' } : {}),
    }));
  };

  // Add new vendor
  const handleAddVendor = async () => {
    if (!newVendorData.code.trim() || !newVendorData.name.trim()) return;

    setVendorSaving(true);
    try {
      await createVendor({
        code: newVendorData.code.trim(),
        name: newVendorData.name.trim(),
        isActive: true,
      });

      // Reload vendors and select the new one
      const updatedVendors = await getVendors(true);
      setVendors(updatedVendors);
      setFormData((prev) => ({ ...prev, vendorCode: newVendorData.code.trim() }));
      setNewVendorData({ code: '', name: '' });
      setShowNewVendor(false);
    } catch (err) {
      console.error('Failed to add vendor:', err);
    } finally {
      setVendorSaving(false);
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.code.trim()) {
      setError('제품 코드를 입력해주세요.');
      return;
    }
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

    setLoading(true);
    try {
      // Build product data without undefined values
      const productData: Parameters<typeof createProduct>[0] = {
        code: formData.code.trim().toUpperCase(),
        name_ko: formData.name_ko.trim(),
        name_th: formData.name_th.trim(),
        name_mm: formData.name_mm.trim() || '',
        unit: formData.unit,
        priceType: formData.priceType,
        vendorCode: formData.vendorCode,
        isActive: true,
      };

      // Add optional fields only if they have values
      if (formData.color) productData.color = formData.color;
      if (formData.category.trim()) productData.category = formData.category.trim();
      if (formData.priceType === 'industrial') {
        productData.pur = Number(formData.pur);
        productData.min = Number(formData.min);
        productData.mid = Number(formData.mid);
      }

      await createProduct(productData);

      router.push('/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const vendorOptions = vendors.map((v) => ({
    value: v.code,
    label: `${v.code} - ${v.name}`,
  }));

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="제품 등록"
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
            <h1 className="text-2xl font-bold text-gray-900">제품 등록</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
              <div className="space-y-4">
                <Input
                  label="제품 코드"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="예: V001, F011"
                  required
                />

                <Input
                  label="제품명 (한국어)"
                  name="name_ko"
                  value={formData.name_ko}
                  onChange={handleChange}
                  placeholder="예: 배추"
                  required
                />

                <Input
                  label="제품명 (태국어)"
                  name="name_th"
                  value={formData.name_th}
                  onChange={handleChange}
                  placeholder="예: ผักกาดขาว"
                  required
                />

                <Input
                  label="제품명 (미얀마어)"
                  name="name_mm"
                  value={formData.name_mm}
                  onChange={handleChange}
                  placeholder="예: ဂေါ်ဖီထုပ်"
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
                  helperText="자유롭게 입력 가능"
                />
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
                  <p className="text-xs text-gray-500 mt-1">바트 고정 마진</p>
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
                  <p className="text-xs text-gray-500 mt-1">% 계산 마진</p>
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
                    placeholder="0"
                    required
                  />
                  <Input
                    label="Min (시장최소가)"
                    name="min"
                    type="number"
                    value={formData.min}
                    onChange={handleChange}
                    placeholder="0"
                    required
                  />
                  <Input
                    label="Mid (시장중간가)"
                    name="mid"
                    type="number"
                    value={formData.mid}
                    onChange={handleChange}
                    placeholder="0"
                    required
                  />
                </div>
              )}
            </div>

            {/* Vendor Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">구매처</h2>

              <div className="space-y-4">
                <Select
                  label="구매처 선택"
                  name="vendorCode"
                  value={formData.vendorCode}
                  onChange={handleChange}
                  options={vendorOptions}
                  placeholder="구매처를 선택하세요"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowNewVendor(!showNewVendor)}
                  className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                >
                  <Plus size={16} />
                  새 구매처 추가
                </button>

                {showNewVendor && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="구매처 코드"
                        value={newVendorData.code}
                        onChange={(e) =>
                          setNewVendorData((prev) => ({ ...prev, code: e.target.value }))
                        }
                        placeholder="예: ML1"
                      />
                      <Input
                        label="구매처 이름"
                        value={newVendorData.name}
                        onChange={(e) =>
                          setNewVendorData((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="예: 멜론가게"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowNewVendor(false)}
                      >
                        취소
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddVendor}
                        loading={vendorSaving}
                      >
                        추가
                      </Button>
                    </div>
                  </div>
                )}
              </div>
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
              <Button type="submit" loading={loading}>
                저장
              </Button>
            </div>
          </form>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
