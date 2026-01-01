'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { ProtectedRoute } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { Button, Spinner, Badge } from '@/components/ui';
import { getUsers, updateUserRole } from '@/lib/firebase';
import type { User, UserRole } from '@/types';
import { Shield, User as UserIcon, Home } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, isAdmin, signOut } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

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

    setUpdating(userId);
    try {
      await updateUserRole(userId, newRole);
      await loadUsers();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('권한 변경에 실패했습니다.');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="설정"
        onLogout={signOut}
      >
        <div className="p-4 lg:p-8 max-w-4xl mx-auto">
          {/* Header with Home Button */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">설정</h1>
            <Link href="/">
              <Button variant="secondary" size="sm">
                <Home size={18} className="mr-2" />
                홈으로
              </Button>
            </Link>
          </div>

          {/* User Management Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Shield size={20} className="text-green-600" />
                사용자 권한 관리
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                등록된 사용자의 관리자 권한을 설정합니다.
              </p>
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
              <div className="divide-y divide-gray-200">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
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
                        <p className="text-sm text-gray-500">
                          {u.name || '이름 없음'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant={u.role === 'admin' ? 'success' : 'default'}
                        size="sm"
                      >
                        {u.role === 'admin' ? '관리자' : '일반'}
                      </Badge>

                      {u.id !== user?.id && (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          disabled={updating === u.id}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
                        >
                          <option value="user">일반 사용자</option>
                          <option value="admin">관리자</option>
                        </select>
                      )}

                      {u.id === user?.id && (
                        <span className="text-xs text-gray-400">(나)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Info Section */}
          <section className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-medium text-blue-800 mb-2">권한 안내</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>- <strong>관리자</strong>: 모든 메뉴 접근 가능 (제품, 고객, 구매처, 마진, 설정 등)</li>
              <li>- <strong>일반 사용자</strong>: 주문, 배송장만 접근 가능</li>
            </ul>
          </section>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
