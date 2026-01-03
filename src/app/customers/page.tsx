'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/context';
import { useI18n } from '@/lib/i18n';
import { Button, EmptyState, LoadingState, Badge } from '@/components/ui';
import { getCustomers, deleteCustomer } from '@/lib/firebase';
import type { Customer, Region } from '@/types';
import { Plus, Pencil, Trash2, Users, Search, Package, Download } from 'lucide-react';
import Link from 'next/link';
import { exportToCsv, getDateForFilename, type CsvColumn } from '@/lib/utils';

const GRADE_COLORS: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
  S: 'success',
  A: 'info',
  B: 'default',
  C: 'warning',
  D: 'danger',
  E: 'danger',
};

export default function CustomersPage() {
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Region labels using i18n
  const getRegionLabel = (region: Region) => {
    return region === 'pattaya' ? t('customers.pattaya') : t('customers.bangkok');
  };
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [filterRegion, setFilterRegion] = useState<'all' | Region>('all');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCustomers(!showInactive);
      setCustomers(data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [showInactive]);

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRegion =
      filterRegion === 'all' || c.region === filterRegion;

    return matchesSearch && matchesRegion;
  });

  // Sort by region (pattaya first) then by code
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (a.region !== b.region) {
      return a.region === 'pattaya' ? -1 : 1;
    }
    return a.code.localeCompare(b.code);
  });

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteCustomer(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  // CSV Export handler
  const handleExportCsv = () => {
    const columns: CsvColumn<Customer>[] = [
      { header: t('customers.code'), accessor: 'code' },
      { header: t('customers.name'), accessor: 'fullName' },
      { header: t('customers.grade'), accessor: 'grade' },
      { header: t('customers.region'), accessor: (c) => getRegionLabel(c.region) },
      { header: t('customers.deliveryTime'), accessor: (c) => c.deliveryTime || '' },
      { header: t('customers.contact1'), accessor: (c) => c.contact1 || '' },
      { header: t('customers.contact2'), accessor: (c) => c.contact2 || '' },
      { header: t('customers.gpsLat'), accessor: (c) => c.gpsLat?.toString() || '' },
      { header: t('customers.gpsLng'), accessor: (c) => c.gpsLng?.toString() || '' },
      { header: t('customers.productCount'), accessor: (c) => c.products?.length || 0 },
      { header: t('common.status'), accessor: (c) => c.isActive ? t('products.active') : t('products.inactive') },
    ];

    const filename = `customers_${getDateForFilename()}.csv`;
    exportToCsv(sortedCustomers, columns, filename);
  };

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle={t('customers.title')}
        onLogout={signOut}
      >
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{t('customers.title')}</h1>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleExportCsv}>
                <Download size={18} className="mr-2" />
                CSV
              </Button>
              <Link href="/customers/new">
                <Button>
                  <Plus size={18} className="mr-2" />
                  {t('customers.new')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="text"
                placeholder={t('customers.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setFilterRegion('all')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterRegion === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('common.all')}
                </button>
                <button
                  onClick={() => setFilterRegion('pattaya')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterRegion === 'pattaya'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('customers.pattaya')}
                </button>
                <button
                  onClick={() => setFilterRegion('bangkok')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterRegion === 'bangkok'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('customers.bangkok')}
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
          ) : sortedCustomers.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8 text-gray-500" />}
              title={t('customers.noCustomers')}
              description={t('customers.addFirst')}
              action={
                <Link href="/customers/new">
                  <Button>
                    <Plus size={18} className="mr-2" />
                    {t('customers.new')}
                  </Button>
                </Link>
              }
            />
          ) : (
            <>
              {/* PC Table */}
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('table.code')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('table.name')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('table.grade')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('table.region')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('customers.deliveryTime')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('customers.productCount')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('table.status')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        {t('table.action')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-sm text-gray-800 font-semibold">
                          {customer.code}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          {customer.fullName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={GRADE_COLORS[customer.grade] || 'default'} size="sm">
                            {customer.grade}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">
                          {getRegionLabel(customer.region)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">
                          {customer.deliveryTime && customer.deliveryTime !== 'undefined' ? customer.deliveryTime : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">
                          {customer.products?.length || 0}{t('common.count')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={customer.isActive ? 'success' : 'default'} size="sm">
                            {customer.isActive ? t('products.active') : t('products.inactive')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/customers/${customer.id}/products`}>
                              <button
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title={t('customers.productMapping')}
                              >
                                <Package size={16} />
                              </button>
                            </Link>
                            <Link href={`/customers/${customer.id}/edit`}>
                              <button
                                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title={t('common.edit')}
                              >
                                <Pencil size={16} />
                              </button>
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(customer)}
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
                {sortedCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {customer.code}
                        </span>
                        <Badge variant={GRADE_COLORS[customer.grade] || 'default'} size="sm">
                          {customer.grade}
                        </Badge>
                        <Badge
                          variant={customer.region === 'pattaya' ? 'info' : 'warning'}
                          size="sm"
                        >
                          {getRegionLabel(customer.region)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link href={`/customers/${customer.id}/products`}>
                          <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                            <Package size={18} />
                          </button>
                        </Link>
                        <Link href={`/customers/${customer.id}/edit`}>
                          <button className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg">
                            <Pencil size={18} />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(customer)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">{customer.fullName}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-700 font-medium">
                      <span>{t('products.product')}: {customer.products?.length || 0}{t('common.count')}</span>
                      {customer.deliveryTime && customer.deliveryTime !== 'undefined' && <span>{t('customers.deliveryTime')}: {customer.deliveryTime}</span>}
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
                  {t('customers.deleteCustomer')}
                </h3>
                <p className="text-gray-600 mb-4">
                  <span className="font-medium text-gray-900">
                    {deleteTarget.fullName}
                  </span>
                  {' '}{t('customers.deleteConfirm')}
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
      </MainLayout>
    </ProtectedRoute>
  );
}
