'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/context';
import { useI18n } from '@/lib/i18n';
import { Button, Modal, Input, EmptyState, LoadingState, Badge } from '@/components/ui';
import { getVendors, createVendor, updateVendor, deleteVendor, getProducts, updateProduct } from '@/lib/firebase';
import type { Vendor, Product } from '@/types';
import { Plus, Pencil, Trash2, Store, Search, Package, Link as LinkIcon, X } from 'lucide-react';
import Link from 'next/link';

export default function VendorsPage() {
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useI18n();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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

  // Products modal
  const [selectedVendorProducts, setSelectedVendorProducts] = useState<{vendor: Vendor, products: Product[]} | null>(null);
  const [productModalSearch, setProductModalSearch] = useState('');

  // 구매처 목록 불러오기
  const loadVendors = async () => {
    setLoading(true);
    try {
      const [vendorsData, productsData] = await Promise.all([
        getVendors(!showInactive),
        getProducts(true)
      ]);
      setVendors(vendorsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [showInactive]);

  // 구매처별 제품 수
  const getProductCount = (vendorCode: string): number => {
    return products.filter(p => p.vendorCode === vendorCode).length;
  };

  // 구매처 제품 목록 보기
  const showVendorProducts = (vendor: Vendor) => {
    const vendorProducts = products.filter(p => p.vendorCode === vendor.code);
    setSelectedVendorProducts({ vendor, products: vendorProducts });
    setProductModalSearch('');
  };

  // 모달 내 제품 필터링
  const filteredModalProducts = selectedVendorProducts?.products.filter(p => {
    if (!productModalSearch) return true;
    const term = productModalSearch.toLowerCase();
    return (
      p.code.toLowerCase().includes(term) ||
      p.name_ko.toLowerCase().includes(term) ||
      p.name_th.toLowerCase().includes(term)
    );
  }) || [];

  // 구매처에서 제품 제거
  const removeProductFromVendor = async (productId: string) => {
    try {
      await updateProduct(productId, { vendorCode: '' });
      // 로컬 상태 업데이트
      const updatedProducts = products.map(p =>
        p.id === productId ? { ...p, vendorCode: '' } : p
      );
      setProducts(updatedProducts);
      // 모달 업데이트
      if (selectedVendorProducts) {
        setSelectedVendorProducts({
          ...selectedVendorProducts,
          products: selectedVendorProducts.products.filter(p => p.id !== productId)
        });
      }
    } catch (err) {
      console.error('Failed to remove product:', err);
    }
  };

  // 검색 필터 (구매처 코드/이름 또는 제품코드로 검색)
  const filteredVendors = vendors.filter((v) => {
    const term = searchTerm.toLowerCase();
    // 구매처 코드/이름 매칭
    const matchesVendor =
      v.code.toLowerCase().includes(term) ||
      v.name.toLowerCase().includes(term);

    // 제품코드로 매칭 (해당 구매처에서 판매하는 제품 검색)
    const matchesProduct = products.some(
      (p) =>
        p.vendorCode === v.code &&
        p.code.toLowerCase().includes(term)
    );

    return matchesVendor || matchesProduct;
  });

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
    if (!formData.code.trim()) {
      setFormError(t('vendors.errCode'));
      return;
    }
    if (!formData.name.trim()) {
      setFormError(t('vendors.errName'));
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
      setFormError(error instanceof Error ? error.message : t('common.saveFailed'));
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
        pageTitle={t('vendors.title')}
        onLogout={signOut}
      >
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{t('vendors.title')}</h1>
            <Button onClick={openAddModal}>
              <Plus size={18} className="mr-2" />
              {t('vendors.new')}
            </Button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="text"
                placeholder={t('vendors.searchPlaceholder')}
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
              {t('common.includeInactive')}
            </label>
          </div>

          {/* Content */}
          {loading ? (
            <LoadingState message={t('common.loadingData')} />
          ) : filteredVendors.length === 0 ? (
            <EmptyState
              icon={<Store className="w-8 h-8 text-gray-500" />}
              title={t('vendors.noVendors')}
              description={t('vendors.addFirst')}
              action={
                <Button onClick={openAddModal}>
                  <Plus size={18} className="mr-2" />
                  {t('vendors.new')}
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                        {t('table.code')}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                        {t('vendors.productMapping')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                        {t('table.name')}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                        {t('customers.productCount')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                        {t('table.status')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                        {t('table.action')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredVendors.map((vendor) => (
                      <tr key={vendor.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-800 font-semibold">
                          {vendor.code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <Link href={`/vendors/${vendor.id}/products`}>
                            <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
                              <LinkIcon size={14} />
                              {t('vendors.productMapping')}
                            </button>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          {vendor.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => showVendorProducts(vendor)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors"
                          >
                            <Package size={14} />
                            {getProductCount(vendor.code)}{t('common.count')}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={vendor.isActive ? 'success' : 'default'}>
                            {vendor.isActive ? t('products.active') : t('products.inactive')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(vendor)}
                              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title={t('common.edit')}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(vendor)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('common.delete')}
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
                            {vendor.isActive ? t('products.active') : t('products.inactive')}
                          </Badge>
                        </div>
                        <p className="text-gray-800 font-medium">{vendor.name}</p>
                        <div className="flex gap-2 mt-2">
                          <Link href={`/vendors/${vendor.id}/products`}>
                            <button className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                              <LinkIcon size={12} />
                              {t('vendors.productMapping')}
                            </button>
                          </Link>
                          <button
                            onClick={() => showVendorProducts(vendor)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                          >
                            <Package size={12} />
                            {getProductCount(vendor.code)}{t('common.count')}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(vendor)}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(vendor)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
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
          title={editingVendor ? t('vendors.edit') : t('vendors.new')}
        >
          <div className="space-y-4">
            <Input
              label={t('vendors.code')}
              placeholder="예: ML1"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              disabled={!!editingVendor}
            />
            <Input
              label={t('vendors.name')}
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
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {editingVendor ? t('common.save') : t('common.add')}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title={t('vendors.deleteVendor')}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              <span className="font-medium text-gray-900">{deleteTarget?.name}</span>
              {' '}{t('vendors.deleteConfirm')}
            </p>
            <p className="text-sm text-gray-600">
              {t('common.deleteWarning')}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Products List Modal */}
        <Modal
          isOpen={!!selectedVendorProducts}
          onClose={() => setSelectedVendorProducts(null)}
          title={`${selectedVendorProducts?.vendor.name} ${t('vendors.products')}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* 제품 검색 */}
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="text"
                placeholder={t('products.searchPlaceholder')}
                value={productModalSearch}
                onChange={(e) => setProductModalSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
              />
            </div>
            {selectedVendorProducts?.products.length === 0 ? (
              <p className="text-center text-gray-700 py-8">{t('products.noProducts')}</p>
            ) : filteredModalProducts.length === 0 ? (
              <p className="text-center text-gray-700 py-8">{t('common.noSearchResults')}</p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-800">{t('table.code')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-800">{t('products.name')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-800">{t('table.type')}</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-800">{t('purchaseOrders.buyPrice')}</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-800">{t('common.remove')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredModalProducts.map((product) => (
                      <tr key={product.code} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-gray-900">{product.code}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{product.name_ko}</div>
                          <div className="text-xs text-gray-700">{product.name_th}</div>
                        </td>
                        <td className="px-3 py-2 text-gray-900 font-medium">
                          {product.priceType === 'fresh' ? t('products.fresh') : t('products.industrial')}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 font-medium">
                          {product.pur ? `฿${product.pur}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => removeProductFromVendor(product.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('common.remove')}
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-gray-700">
                {filteredModalProducts.length}{t('common.count')} {t('products.product')}
              </span>
              <Button variant="secondary" onClick={() => setSelectedVendorProducts(null)}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        </Modal>
      </MainLayout>
    </ProtectedRoute>
  );
}
