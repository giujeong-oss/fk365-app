'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { useI18n } from '@/lib/i18n';
import { ProtectedRoute } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { Button, Spinner, Badge, Modal } from '@/components/ui';
import { getUsers, updateUserRole, updateUserStatus, createUserByEmail } from '@/lib/firebase';
import type { User, UserRole } from '@/types';
import {
  Shield,
  User as UserIcon,
  Home,
  UserCheck,
  UserX,
  Globe,
  Clock,
  AlertTriangle,
  Info,
  Server,
  RefreshCw,
  Settings,
  ChevronRight,
  Plus,
  Mail,
} from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    userId: string;
    action: 'role' | 'status';
    newValue: string | boolean;
    userName: string;
  } | null>(null);

  // 사용자 추가 모달
  const [addUserModal, setAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersData = await getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (userId === user?.id) {
      alert(t('settings.cannotChangeOwnRole'));
      return;
    }

    const targetUser = users.find(u => u.id === userId);
    setConfirmModal({
      open: true,
      userId,
      action: 'role',
      newValue: newRole,
      userName: targetUser?.email || '',
    });
  };

  const handleStatusChange = async (userId: string, newStatus: boolean) => {
    if (userId === user?.id) {
      alert(t('settings.cannotChangeOwnStatus'));
      return;
    }

    const targetUser = users.find(u => u.id === userId);
    setConfirmModal({
      open: true,
      userId,
      action: 'status',
      newValue: newStatus,
      userName: targetUser?.email || '',
    });
  };

  const confirmChange = async () => {
    if (!confirmModal) return;

    setUpdating(confirmModal.userId);
    try {
      if (confirmModal.action === 'role') {
        await updateUserRole(confirmModal.userId, confirmModal.newValue as UserRole);
      } else {
        await updateUserStatus(confirmModal.userId, confirmModal.newValue as boolean);
      }
      await loadUsers();
    } catch (error) {
      console.error('Failed to update:', error);
      alert(t('settings.changeFailed'));
    } finally {
      setUpdating(null);
      setConfirmModal(null);
    }
  };

  // 사용자 추가
  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      setAddUserError(t('settings.enterEmail'));
      return;
    }

    setAddingUser(true);
    setAddUserError('');

    try {
      await createUserByEmail(newUserEmail, newUserRole, newUserName);
      await loadUsers();
      setAddUserModal(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('user');
    } catch (error) {
      setAddUserError(error instanceof Error ? error.message : t('settings.addUserFailed'));
    } finally {
      setAddingUser(false);
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getLanguageLabel = (lang: string) => {
    const labels: Record<string, string> = {
      ko: '한국어',
      th: 'ไทย',
      en: 'English',
    };
    return labels[lang] || lang;
  };

  const adminCount = users.filter(u => u.role === 'admin').length;
  const activeCount = users.filter(u => u.isActive !== false).length;

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle={t('settings.title')}
        onLogout={signOut}
      >
        <div className="p-4 lg:p-8 max-w-5xl mx-auto">
          {/* Header with Home Button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
              <p className="text-sm text-gray-600 mt-1">{t('settings.userManagement')}</p>
            </div>
            <Link href="/">
              <Button variant="secondary" size="sm">
                <Home size={18} className="mr-2" />
                {t('common.home')}
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UserIcon size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                  <p className="text-xs text-gray-600">{t('settings.totalUsers')}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Shield size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{adminCount}</p>
                  <p className="text-xs text-gray-600">{t('settings.adminUsers')}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <UserCheck size={20} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
                  <p className="text-xs text-gray-600">{t('settings.activeUsers')}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <UserX size={20} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{users.length - activeCount}</p>
                  <p className="text-xs text-gray-600">{t('products.inactive')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <section className="mb-6">
            <Link
              href="/settings/permissions"
              className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-green-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Settings size={24} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('permissions.title')}</h3>
                  <p className="text-sm text-gray-600">{t('permissions.settingsDesc')}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-600" />
            </Link>
          </section>

          {/* System Info */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Server size={20} className="text-blue-600" />
                {t('settings.systemInfo')}
              </h2>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{t('settings.appDomain')}</span>
                  <span className="text-sm font-medium text-gray-900">app.freshkitchen365.com</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{t('settings.version')}</span>
                  <span className="text-sm font-medium text-gray-900">v1.0.0</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{t('settings.firebaseProject')}</span>
                  <span className="text-sm font-medium text-gray-900">fk365-e8f90</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{t('settings.deployment')}</span>
                  <span className="text-sm font-medium text-green-600">Vercel</span>
                </div>
              </div>
            </div>
          </section>

          {/* User Management Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Shield size={20} className="text-green-600" />
                  {t('settings.userManagement')}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {t('settings.userStats')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={() => setAddUserModal(true)}>
                  <Plus size={16} className="mr-1" />
                  {t('settings.addUser')}
                </Button>
                <Button variant="secondary" size="sm" onClick={loadUsers}>
                  <RefreshCw size={16} className="mr-1" />
                  {t('dashboard.refresh')}
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                {t('settings.noUsers')}
              </div>
            ) : (
              <>
                {/* PC Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('settings.email')}</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">{t('settings.role')}</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">{t('table.status')}</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Language</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">{t('settings.lastLogin')}</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">{t('table.action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.map((u) => (
                        <tr key={u.id} className={`hover:bg-gray-50 ${u.isActive === false ? 'opacity-50' : ''}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                u.role === 'admin' ? 'bg-green-100' : 'bg-gray-100'
                              }`}>
                                {u.role === 'admin' ? (
                                  <Shield size={20} className="text-green-600" />
                                ) : (
                                  <UserIcon size={20} className="text-gray-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{u.email}</p>
                                <p className="text-sm text-gray-600">{u.name || '-'}</p>
                              </div>
                              {u.id === user?.id && (
                                <Badge variant="info" size="sm">{t('settings.me')}</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant={u.role === 'admin' ? 'success' : 'default'} size="sm">
                              {u.role === 'admin' ? t('settings.roleAdmin') : t('settings.roleUser')}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant={u.isActive !== false ? 'success' : 'danger'} size="sm">
                              {u.isActive !== false ? t('products.active') : t('products.inactive')}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-gray-600">
                              {getLanguageLabel(u.preferredLanguage)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-gray-600">
                              {formatDate(u.lastLoginAt)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {u.id !== user?.id ? (
                              <div className="flex items-center justify-center gap-2">
                                <select
                                  value={u.role}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                  disabled={updating === u.id}
                                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                                >
                                  <option value="user">{t('settings.roleUser')}</option>
                                  <option value="admin">{t('settings.roleAdmin')}</option>
                                </select>
                                <button
                                  onClick={() => handleStatusChange(u.id, u.isActive === false)}
                                  disabled={updating === u.id}
                                  className={`p-1.5 rounded ${
                                    u.isActive !== false
                                      ? 'text-red-600 hover:bg-red-50'
                                      : 'text-green-600 hover:bg-green-50'
                                  } disabled:opacity-50`}
                                  title={u.isActive !== false ? t('settings.deactivate') : t('settings.activate')}
                                >
                                  {u.isActive !== false ? <UserX size={18} /> : <UserCheck size={18} />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-600">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-200">
                  {users.map((u) => (
                    <div key={u.id} className={`p-4 ${u.isActive === false ? 'opacity-50' : ''}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            u.role === 'admin' ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {u.role === 'admin' ? (
                              <Shield size={20} className="text-green-600" />
                            ) : (
                              <UserIcon size={20} className="text-gray-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{u.email}</p>
                              {u.id === user?.id && <Badge variant="info" size="sm">{t('settings.me')}</Badge>}
                            </div>
                            <p className="text-sm text-gray-600">{u.name || '-'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge variant={u.role === 'admin' ? 'success' : 'default'} size="sm">
                            {u.role === 'admin' ? t('settings.roleAdmin') : t('settings.roleUser')}
                          </Badge>
                          <Badge variant={u.isActive !== false ? 'success' : 'danger'} size="sm">
                            {u.isActive !== false ? t('products.active') : t('products.inactive')}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                        <span className="flex items-center gap-1">
                          <Globe size={12} />
                          {getLanguageLabel(u.preferredLanguage)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(u.lastLoginAt)}
                        </span>
                      </div>

                      {u.id !== user?.id && (
                        <div className="flex items-center gap-2">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            disabled={updating === u.id}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
                          >
                            <option value="user">{t('settings.roleUser')}</option>
                            <option value="admin">{t('settings.roleAdmin')}</option>
                          </select>
                          <button
                            onClick={() => handleStatusChange(u.id, u.isActive === false)}
                            disabled={updating === u.id}
                            className={`px-3 py-2 rounded-lg text-sm font-medium ${
                              u.isActive !== false
                                ? 'bg-red-50 text-red-600'
                                : 'bg-green-50 text-green-600'
                            } disabled:opacity-50`}
                          >
                            {u.isActive !== false ? t('settings.deactivate') : t('settings.activate')}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Info Section */}
          <section className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-800 mb-2">{t('settings.permissionGuide')}</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>{t('settings.adminDesc')}</li>
                  <li>{t('settings.userDesc')}</li>
                  <li>{t('settings.inactiveDesc')}</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Warning Section */}
          <section className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800 mb-1">{t('settings.warning')}</h3>
                <p className="text-sm text-amber-700">
                  {t('settings.warningText')}
                </p>
              </div>
            </div>
          </section>
        </div>
      </MainLayout>

      {/* Confirmation Modal */}
      {confirmModal && (
        <Modal
          isOpen={confirmModal.open}
          onClose={() => setConfirmModal(null)}
          title={confirmModal.action === 'role' ? t('settings.role') : t('settings.accountStatus')}
        >
          <div className="p-4">
            <p className="text-gray-700 mb-4">
              {confirmModal.action === 'role' ? (
                <>
                  <strong>{confirmModal.userName}</strong> → {' '}
                  <strong>{confirmModal.newValue === 'admin' ? t('settings.roleAdmin') : t('settings.roleUser')}</strong>?
                </>
              ) : (
                <>
                  <strong>{confirmModal.userName}</strong> → {' '}
                  <strong>{confirmModal.newValue ? t('settings.activate') : t('settings.deactivate')}</strong>?
                </>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmModal(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={confirmChange}
                variant={confirmModal.action === 'status' && !confirmModal.newValue ? 'danger' : 'primary'}
              >
                {t('common.confirm')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={addUserModal}
        onClose={() => {
          setAddUserModal(false);
          setNewUserEmail('');
          setNewUserName('');
          setNewUserRole('user');
          setAddUserError('');
        }}
        title={t('settings.addUser')}
      >
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            {t('settings.addUserDesc')}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.email')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.name')}
              </label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.role')}
              </label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="user">{t('settings.roleUser')}</option>
                <option value="admin">{t('settings.roleAdmin')}</option>
              </select>
            </div>

            {addUserError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {addUserError}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="secondary" onClick={() => {
              setAddUserModal(false);
              setNewUserEmail('');
              setNewUserName('');
              setNewUserRole('user');
              setAddUserError('');
            }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddUser} loading={addingUser}>
              <Plus size={16} className="mr-1" />
              {t('common.add')}
            </Button>
          </div>
        </div>
      </Modal>
    </ProtectedRoute>
  );
}
