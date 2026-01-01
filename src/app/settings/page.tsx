'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { ProtectedRoute } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { Button, Spinner, Badge, Modal } from '@/components/ui';
import { getUsers, updateUserRole, updateUserStatus } from '@/lib/firebase';
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
} from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, isAdmin, signOut } = useAuth();
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
      alert('자신의 권한은 변경할 수 없습니다.');
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
      alert('자신의 상태는 변경할 수 없습니다.');
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
      alert('변경에 실패했습니다.');
    } finally {
      setUpdating(null);
      setConfirmModal(null);
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
        pageTitle="설정"
        onLogout={signOut}
      >
        <div className="p-4 lg:p-8 max-w-5xl mx-auto">
          {/* Header with Home Button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">설정</h1>
              <p className="text-sm text-gray-600 mt-1">시스템 설정 및 사용자 권한 관리</p>
            </div>
            <Link href="/">
              <Button variant="secondary" size="sm">
                <Home size={18} className="mr-2" />
                홈으로
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
                  <p className="text-xs text-gray-500">전체 사용자</p>
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
                  <p className="text-xs text-gray-500">관리자</p>
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
                  <p className="text-xs text-gray-500">활성 사용자</p>
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
                  <p className="text-xs text-gray-500">비활성 사용자</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Info */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Server size={20} className="text-blue-600" />
                시스템 정보
              </h2>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">앱 도메인</span>
                  <span className="text-sm font-medium text-gray-900">app.freshkitchen365.com</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">버전</span>
                  <span className="text-sm font-medium text-gray-900">v1.0.0</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Firebase 프로젝트</span>
                  <span className="text-sm font-medium text-gray-900">fk365-e8f90</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">배포</span>
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
                  사용자 권한 관리
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  등록된 사용자의 권한과 상태를 관리합니다.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={loadUsers}>
                <RefreshCw size={16} className="mr-1" />
                새로고침
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                등록된 사용자가 없습니다.
              </div>
            ) : (
              <>
                {/* PC Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">권한</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">상태</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">언어</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">마지막 로그인</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">작업</th>
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
                                <p className="text-sm text-gray-500">{u.name || '이름 없음'}</p>
                              </div>
                              {u.id === user?.id && (
                                <Badge variant="info" size="sm">나</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant={u.role === 'admin' ? 'success' : 'default'} size="sm">
                              {u.role === 'admin' ? '관리자' : '일반'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant={u.isActive !== false ? 'success' : 'danger'} size="sm">
                              {u.isActive !== false ? '활성' : '비활성'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-gray-600">
                              {getLanguageLabel(u.preferredLanguage)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-gray-500">
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
                                  <option value="user">일반</option>
                                  <option value="admin">관리자</option>
                                </select>
                                <button
                                  onClick={() => handleStatusChange(u.id, u.isActive === false)}
                                  disabled={updating === u.id}
                                  className={`p-1.5 rounded ${
                                    u.isActive !== false
                                      ? 'text-red-600 hover:bg-red-50'
                                      : 'text-green-600 hover:bg-green-50'
                                  } disabled:opacity-50`}
                                  title={u.isActive !== false ? '비활성화' : '활성화'}
                                >
                                  {u.isActive !== false ? <UserX size={18} /> : <UserCheck size={18} />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
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
                              {u.id === user?.id && <Badge variant="info" size="sm">나</Badge>}
                            </div>
                            <p className="text-sm text-gray-500">{u.name || '이름 없음'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge variant={u.role === 'admin' ? 'success' : 'default'} size="sm">
                            {u.role === 'admin' ? '관리자' : '일반'}
                          </Badge>
                          <Badge variant={u.isActive !== false ? 'success' : 'danger'} size="sm">
                            {u.isActive !== false ? '활성' : '비활성'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
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
                            <option value="user">일반 사용자</option>
                            <option value="admin">관리자</option>
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
                            {u.isActive !== false ? '비활성화' : '활성화'}
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
                <h3 className="font-medium text-blue-800 mb-2">권한 안내</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li><strong>관리자</strong>: 모든 메뉴 접근 가능 (제품, 고객, 구매처, 마진, 설정 등)</li>
                  <li><strong>일반 사용자</strong>: 대시보드, 주문, 배송장만 접근 가능</li>
                  <li><strong>비활성 사용자</strong>: 로그인 불가</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Warning Section */}
          <section className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800 mb-1">주의사항</h3>
                <p className="text-sm text-amber-700">
                  관리자 권한 변경 및 사용자 비활성화는 즉시 적용됩니다.
                  최소 1명의 관리자가 항상 유지되어야 합니다.
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
          title={confirmModal.action === 'role' ? '권한 변경 확인' : '상태 변경 확인'}
        >
          <div className="p-4">
            <p className="text-gray-700 mb-4">
              {confirmModal.action === 'role' ? (
                <>
                  <strong>{confirmModal.userName}</strong> 사용자의 권한을{' '}
                  <strong>{confirmModal.newValue === 'admin' ? '관리자' : '일반 사용자'}</strong>로
                  변경하시겠습니까?
                </>
              ) : (
                <>
                  <strong>{confirmModal.userName}</strong> 사용자를{' '}
                  <strong>{confirmModal.newValue ? '활성화' : '비활성화'}</strong>
                  하시겠습니까?
                  {!confirmModal.newValue && (
                    <span className="block mt-2 text-sm text-red-600">
                      비활성화된 사용자는 로그인할 수 없습니다.
                    </span>
                  )}
                </>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmModal(null)}>
                취소
              </Button>
              <Button
                onClick={confirmChange}
                variant={confirmModal.action === 'status' && !confirmModal.newValue ? 'danger' : 'primary'}
              >
                확인
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ProtectedRoute>
  );
}
