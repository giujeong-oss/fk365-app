'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/context';
import { Button, Modal, Input, EmptyState, LoadingState, Badge } from '@/components/ui';
import { getVendors, createVendor, updateVendor, deleteVendor } from '@/lib/firebase';
import type { Vendor } from '@/types';
import { Plus, Pencil, Trash2, Store, Search } from 'lucide-react';

export default function VendorsPage() {
  const { user, isAdmin, signOut } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);

  // 구매처 목록 불러오기
  const loadVendors = async () => {
    setLoading(true);
    try {
      const data = await getVendors(!showInactive);
      setVendors(data);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [showInactive]);

  // 검색 필터
  const filteredVendors = vendors.filter(
    (v) =>
      v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 모달 열기 (추가)
  const openAddModal = () => {
    setEditingVendor(null);
    setFormData({ code: '', name: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  // 모달 열기 (수정)
  const openEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({ code: vendor.code, name: vendor.name });
    setFormError('');
    setIsModalOpen(true);
  };

  // 저장
  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      setFormError('코드와 이름을 모두 입력해주세요.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      if (editingVendor) {
        await updateVendor(editingVendor.id, {
          code: formData.code.trim(),
          name: formData.name.trim(),
        });
      } else {
        await createVendor({
          code: formData.code.trim(),
          name: formData.name.trim(),
          isActive: true,
        });
      }

      setIsModalOpen(false);
      loadVendors();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteVendor(deleteTarget.id);
      setDeleteTarget(null);
      loadVendors();
    } catch (error) {
      console.error('Failed to delete vendor:', error);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="구매처 관리"
        onLogout={signOut}
      >
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">구매처 관리</h1>
            <Button onClick={openAddModal}>
              <Plus size={18} className="mr-2" />
              구매처 추가
            </Button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="코드 또는 이름으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              비활성 포함
            </label>
          </div>

          {/* Content */}
          {loading ? (
            <LoadingState message="구매처 목록을 불러오는 중..." />
          ) : filteredVendors.length === 0 ? (
            <EmptyState
              icon={<Store className="w-8 h-8 text-gray-400" />}
              title="등록된 구매처가 없습니다"
              description="새 구매처를 추가하여 시작하세요."
              action={
                <Button onClick={openAddModal}>
                  <Plus size={18} className="mr-2" />
                  구매처 추가
                </Button>
              }
            />
          ) : (
            <>
              {/* PC Table */}
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        코드
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        이름
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        상태
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredVendors.map((vendor) => (
                      <tr key={vendor.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900">
                          {vendor.code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vendor.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={vendor.isActive ? 'success' : 'default'}>
                            {vendor.isActive ? '활성' : '비활성'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(vendor)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="수정"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(vendor)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3">
                {filteredVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium text-gray-900">
                            {vendor.code}
                          </span>
                          <Badge
                            variant={vendor.isActive ? 'success' : 'default'}
                            size="sm"
                          >
                            {vendor.isActive ? '활성' : '비활성'}
                          </Badge>
                        </div>
                        <p className="text-gray-600">{vendor.name}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(vendor)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(vendor)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingVendor ? '구매처 수정' : '구매처 추가'}
        >
          <div className="space-y-4">
            <Input
              label="구매처 코드"
              placeholder="예: ML1"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              disabled={!!editingVendor}
            />
            <Input
              label="구매처 이름"
              placeholder="예: 멜론가게"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            {formError && (
              <p className="text-sm text-red-500">{formError}</p>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {editingVendor ? '저장' : '추가'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="구매처 삭제"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              <span className="font-medium text-gray-900">{deleteTarget?.name}</span>
              {' '}구매처를 삭제하시겠습니까?
            </p>
            <p className="text-sm text-gray-500">
              삭제된 구매처는 비활성 상태로 변경됩니다.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                취소
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                삭제
              </Button>
            </div>
          </div>
        </Modal>
      </MainLayout>
    </ProtectedRoute>
  );
}
