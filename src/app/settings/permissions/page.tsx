'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { ProtectedRoute } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { Button, Spinner, Badge, Modal } from '@/components/ui';
import { getUsers, updateUserPermissions } from '@/lib/firebase';
import type { User, UserPermissions } from '@/types';
import { DEFAULT_USER_PERMISSIONS, ADMIN_PERMISSIONS } from '@/types';
import {
  Shield,
  User as UserIcon,
  ArrowLeft,
  Save,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';
import Link from 'next/link';

// 권한 항목 정의
const PERMISSION_ITEMS: {
  key: keyof UserPermissions;
  label: string;
  description: string;
  category: 'order' | 'view' | 'admin';
}[] = [
  // 주문 관련
  { key: 'orders', label: '주문 목록', description: '주문 목록 조회', category: 'order' },
  { key: 'orderEntry', label: '주문 입력', description: '새 주문 입력', category: 'order' },
  // 조회 관련
  { key: 'customers', label: '고객 관리', description: '고객 목록 및 정보 조회', category: 'view' },
  { key: 'products', label: '제품 관리', description: '제품 목록 및 정보 조회', category: 'view' },
  { key: 'stock', label: '재고 현황', description: '재고 현황 조회', category: 'view' },
  { key: 'prices', label: '가격 조회', description: '매입가 및 판매가 조회', category: 'view' },
  // 관리자 전용
  { key: 'purchaseOrders', label: '발주서', description: '발주서 생성 및 관리', category: 'admin' },
  { key: 'delivery', label: '배송장', description: '배송장 출력 및 관리', category: 'admin' },
  { key: 'margins', label: '마진 설정', description: '등급별 마진 설정', category: 'admin' },
  { key: 'vendors', label: '구매처 관리', description: '구매처 정보 관리', category: 'admin' },
  { key: 'settings', label: '설정', description: '시스템 설정 접근', category: 'admin' },
];

export default function PermissionsPage() {
  const { user, isAdmin, signOut } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<UserPermissions | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersData = await getUsers();
      // 일반 사용자만 필터링 (관리자는 모든 권한 보유)
      const regularUsers = usersData.filter(u => u.role === 'user');
      setUsers(regularUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (u: User) => {
    setSelectedUser(u);
    // 기존 권한이 있으면 사용, 없으면 기본값
    const currentPermissions = u.permissions || DEFAULT_USER_PERMISSIONS;
    setEditedPermissions({ ...currentPermissions });
    setHasChanges(false);
  };

  const togglePermission = (key: keyof UserPermissions) => {
    if (!editedPermissions) return;

    const newPermissions = {
      ...editedPermissions,
      [key]: !editedPermissions[key],
    };
    setEditedPermissions(newPermissions);
    setHasChanges(true);
  };

  const setAllPermissions = (enabled: boolean) => {
    if (!editedPermissions) return;

    const newPermissions = Object.keys(editedPermissions).reduce((acc, key) => {
      acc[key as keyof UserPermissions] = enabled;
      return acc;
    }, {} as UserPermissions);

    setEditedPermissions(newPermissions);
    setHasChanges(true);
  };

  const savePermissions = async () => {
    if (!selectedUser || !editedPermissions) return;

    setSaving(selectedUser.id);
    try {
      await updateUserPermissions(selectedUser.id, editedPermissions);

      // 로컬 상태 업데이트
      setUsers(prev =>
        prev.map(u =>
          u.id === selectedUser.id ? { ...u, permissions: editedPermissions } : u
        )
      );
      setSelectedUser(prev => prev ? { ...prev, permissions: editedPermissions } : null);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save permissions:', error);
      alert('권한 저장에 실패했습니다.');
    } finally {
      setSaving(null);
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'order': return '주문';
      case 'view': return '조회';
      case 'admin': return '관리';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'order': return 'bg-blue-100 text-blue-700';
      case 'view': return 'bg-green-100 text-green-700';
      case 'admin': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="권한 관리"
        onLogout={signOut}
      >
        <div className="p-4 lg:p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/settings">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <ArrowLeft size={20} />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">세부 권한 관리</h1>
              <p className="text-sm text-gray-600">일반 사용자의 개별 메뉴 접근 권한을 설정합니다</p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p><strong>관리자</strong>는 모든 권한을 자동으로 보유하므로 이 페이지에 표시되지 않습니다.</p>
                <p className="mt-1">일반 사용자만 개별 권한 설정이 가능합니다.</p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* User List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-800">일반 사용자 목록</h2>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    일반 사용자가 없습니다.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => selectUser(u)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                          selectedUser?.id === u.id ? 'bg-green-50 border-l-4 border-green-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <UserIcon size={20} className="text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{u.email}</p>
                            <p className="text-sm text-gray-500">{u.name || '이름 없음'}</p>
                          </div>
                          {u.isActive === false && (
                            <Badge variant="danger" size="sm">비활성</Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Permission Editor */}
            <div className="lg:col-span-2">
              {selectedUser && editedPermissions ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* User Header */}
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <UserIcon size={24} className="text-gray-600" />
                        </div>
                        <div>
                          <h2 className="font-semibold text-gray-900">{selectedUser.email}</h2>
                          <p className="text-sm text-gray-500">{selectedUser.name || '이름 없음'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setAllPermissions(false)}
                        >
                          전체 해제
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setAllPermissions(true)}
                        >
                          전체 허용
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Permission List */}
                  <div className="p-6">
                    {/* 카테고리별 그룹 */}
                    {(['order', 'view', 'admin'] as const).map((category) => {
                      const categoryItems = PERMISSION_ITEMS.filter(item => item.category === category);

                      return (
                        <div key={category} className="mb-6 last:mb-0">
                          <h3 className={`text-sm font-semibold px-3 py-1 rounded-full inline-block mb-3 ${getCategoryColor(category)}`}>
                            {getCategoryLabel(category)}
                          </h3>
                          <div className="space-y-2">
                            {categoryItems.map((item) => (
                              <div
                                key={item.key}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <div>
                                  <p className="font-medium text-gray-900">{item.label}</p>
                                  <p className="text-sm text-gray-500">{item.description}</p>
                                </div>
                                <button
                                  onClick={() => togglePermission(item.key)}
                                  className={`p-1 rounded-lg transition-colors ${
                                    editedPermissions[item.key]
                                      ? 'text-green-600 hover:bg-green-100'
                                      : 'text-gray-400 hover:bg-gray-200'
                                  }`}
                                >
                                  {editedPermissions[item.key] ? (
                                    <ToggleRight size={32} />
                                  ) : (
                                    <ToggleLeft size={32} />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Save Button */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <div>
                      {hasChanges && (
                        <span className="text-sm text-amber-600 font-medium">
                          * 변경사항이 있습니다
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={savePermissions}
                      loading={saving === selectedUser.id}
                      disabled={!hasChanges}
                    >
                      <Save size={18} className="mr-2" />
                      저장
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <Shield size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">
                    왼쪽 목록에서 사용자를 선택하세요
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
