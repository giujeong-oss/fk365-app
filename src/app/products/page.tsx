'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/context';
import { useI18n } from '@/lib/i18n';
import { Button, EmptyState, LoadingState, Badge } from '@/components/ui';
import { getProducts, deleteProduct, getVendors, updateProduct } from '@/lib/firebase';
import type { Product, Vendor, PriceType } from '@/types';
import { Plus, Pencil, Trash2, Apple, Search, CheckSquare, Download } from 'lucide-react';
import Link from 'next/link';
import { exportToCsv, getDateForFilename, type CsvColumn } from '@/lib/utils';

export default function ProductsPage() {
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'fresh' | 'industrial'>('all');

  // Selection for bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, vendorsData] = await Promise.all([
        getProducts(!showInactive),
        getVendors(true),
      ]);
      setProducts(productsData);
      setVendors(vendorsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [showInactive]);

  // Get vendor name by code
  const getVendorName = (vendorCode: string) => {
    const vendor = vendors.find((v) => v.code === vendorCode);
    return vendor?.name || vendorCode;
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name_ko.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name_th.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name_mm.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === 'all' || p.priceType === filterType;

    return matchesSearch && matchesType;
  });

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  // Update product priceType
  const handlePriceTypeChange = async (productId: string, newType: PriceType) => {
    try {
      await updateProduct(productId, { priceType: newType });
      // Update local state
      setProducts(prev =>
        prev.map(p => p.id === productId ? { ...p, priceType: newType } : p)
      );
    } catch (error) {
      console.error('Failed to update price type:', error);
    }
  };

  // Toggle single selection
  const toggleSelection = (productId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // Toggle all selection (only filtered products)
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      // Delete all selected products
      await Promise.all(
        Array.from(selectedIds).map(id => deleteProduct(id))
      );
      setBulkDeleteMode(false);
      setSelectedIds(new Set());
      loadData();
    } catch (error) {
      console.error('Failed to bulk delete products:', error);
    }
  };

  // CSV Export handler
  const handleExportCsv = () => {
    const columns: CsvColumn<Product>[] = [
      { header: t('products.code'), accessor: 'code' },
      { header: t('products.name_ko'), accessor: 'name_ko' },
      { header: t('products.name_th'), accessor: 'name_th' },
      { header: t('products.name_mm'), accessor: 'name_mm' },
      { header: t('products.type'), accessor: (p) => p.priceType === 'fresh' ? t('products.fresh') : t('products.industrial') },
      { header: t('products.unit'), accessor: 'unit' },
      { header: t('products.category'), accessor: (p) => p.category || '' },
      { header: t('products.vendor'), accessor: (p) => getVendorName(p.vendorCode) },
      { header: t('common.status'), accessor: (p) => p.isActive ? t('products.active') : t('products.inactive') },
    ];

    const filename = `products_${getDateForFilename()}.csv`;
    exportToCsv(filteredProducts, columns, filename);
  };

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle={t('products.title')}
        onLogout={signOut}
      >
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">{t('products.title')}</h1>
              {selectedIds.size > 0 && (
                <Badge variant="info">{selectedIds.size}{t('common.selected')}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 ? (
                <>
                  <Button variant="secondary" onClick={clearSelection}>
                    {t('common.deselect')}
                  </Button>
                  <Button variant="danger" onClick={() => setBulkDeleteMode(true)}>
                    <Trash2 size={18} className="mr-2" />
                    {t('common.bulkDelete')}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" onClick={handleExportCsv}>
                    <Download size={18} className="mr-2" />
                    CSV
                  </Button>
                  <Link href="/products/new">
                    <Button>
                      <Plus size={18} className="mr-2" />
                      {t('products.new')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
              />
              <input
                type="text"
                placeholder={t('products.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterType === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('common.all')}
                </button>
                <button
                  onClick={() => setFilterType('fresh')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterType === 'fresh'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('products.fresh')}
                </button>
                <button
                  onClick={() => setFilterType('industrial')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterType === 'industrial'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('products.industrial')}
                </button>
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
          </div>

          {/* Content */}
          {loading ? (
            <LoadingState message={t('common.loadingData')} />
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon={<Apple className="w-8 h-8 text-gray-600" />}
              title={t('products.noProducts')}
              description={t('products.addFirst')}
              action={
                <Link href="/products/new">
                  <Button>
                    <Plus size={18} className="mr-2" />
                    {t('products.new')}
                  </Button>
                </Link>
              }
            />
          ) : (
            <>
              {/* PC Table */}
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-center w-12">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          {t('table.code')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          {t('table.type')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          {t('products.name')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          {t('table.unit')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          {t('table.vendor')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          {t('table.status')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                          {t('table.action')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className={`hover:bg-gray-50 ${selectedIds.has(product.id) ? 'bg-green-50' : ''}`}>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(product.id)}
                              onChange={() => toggleSelection(product.id)}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-sm text-gray-800 font-semibold">
                            {product.code}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={product.priceType}
                              onChange={(e) => handlePriceTypeChange(product.id, e.target.value as PriceType)}
                              className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-green-500 ${
                                product.priceType === 'fresh'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              <option value="fresh">{t('products.fresh')}</option>
                              <option value="industrial">{t('products.industrial')}</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              <p className="text-sm font-semibold text-gray-900">{product.name_ko}</p>
                              <p className="text-xs text-gray-600">{product.name_th}</p>
                              <p className="text-xs text-gray-600">{product.name_mm}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">
                            {product.unit}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {getVendorName(product.vendorCode)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant={product.isActive ? 'success' : 'default'} size="sm">
                              {product.isActive ? t('products.active') : t('products.inactive')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/products/${product.id}/edit`}>
                                <button
                                  className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title={t('common.edit')}
                                >
                                  <Pencil size={16} />
                                </button>
                              </Link>
                              <button
                                onClick={() => setDeleteTarget(product)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`bg-white rounded-xl shadow-sm border p-4 ${
                      selectedIds.has(product.id) ? 'border-green-500 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleSelection(product.id)}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {product.code}
                        </span>
                        <select
                          value={product.priceType}
                          onChange={(e) => handlePriceTypeChange(product.id, e.target.value as PriceType)}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${
                            product.priceType === 'fresh'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          <option value="fresh">{t('products.fresh')}</option>
                          <option value="industrial">{t('products.industrial')}</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link href={`/products/${product.id}/edit`}>
                          <button className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg">
                            <Pencil size={18} />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(product)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    {/* 제품명 통합 셀 */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="font-semibold text-gray-900">{product.name_ko}</p>
                      <p className="text-sm text-gray-700">{product.name_th}</p>
                      <p className="text-sm text-gray-600">{product.name_mm}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-700 font-medium">
                      <span>{t('products.unit')}: {product.unit}</span>
                      <span>{t('products.vendor')}: {getVendorName(product.vendorCode)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setDeleteTarget(null)}
            />
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('products.deleteProduct')}
                </h3>
                <p className="text-gray-600 mb-4">
                  <span className="font-medium text-gray-900">
                    {deleteTarget.name_ko}
                  </span>
                  {' '}{t('products.deleteConfirm')}
                </p>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                    {t('common.cancel')}
                  </Button>
                  <Button variant="danger" onClick={handleDelete}>
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Confirmation Modal */}
        {bulkDeleteMode && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setBulkDeleteMode(false)}
            />
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('common.deleteConfirm')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('products.bulkDeleteConfirm')} <span className="font-bold text-red-600">{selectedIds.size}{t('common.count')}</span>
                  <br />
                  <span className="text-sm text-red-500">{t('common.deleteWarning')}</span>
                </p>
                <div className="max-h-40 overflow-y-auto mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    {Array.from(selectedIds).map((id) => {
                      const product = products.find(p => p.id === id);
                      return product ? (
                        <span
                          key={id}
                          className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 rounded text-xs"
                        >
                          {product.code} - {product.name_ko}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setBulkDeleteMode(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button variant="danger" onClick={handleBulkDelete}>
                    {selectedIds.size}{t('common.count')} {t('common.delete')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </MainLayout>
    </ProtectedRoute>
  );
}
