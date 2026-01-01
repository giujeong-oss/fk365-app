'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { ProtectedRoute } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { Button, Input, Spinner, Badge, Modal } from '@/components/ui';
import { Home } from 'lucide-react';
import Link from 'next/link';
import {
  getFreshMargins,
  getIndustrialMargins,
  setFreshMargin,
  setIndustrialMargin,
  getMarginHistory,
  initializeFreshMargins,
  initializeIndustrialMargins,
} from '@/lib/firebase';
import { GRADE_ORDER, GRADE_DESCRIPTIONS } from '@/lib/utils';
import type { FreshMargin, IndustrialMargin, MarginHistory, Grade } from '@/types';

export default function MarginsPage() {
  const { user, isAdmin, signOut } = useAuth();
  const [freshMargins, setFreshMargins] = useState<FreshMargin[]>([]);
  const [industrialMargins, setIndustrialMarginsState] = useState<IndustrialMargin[]>([]);
  const [history, setHistory] = useState<MarginHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'fresh' | 'industrial' | 'history'>('fresh');

  // 수정 상태
  const [editingFresh, setEditingFresh] = useState<Record<Grade, number>>({} as Record<Grade, number>);
  const [editingIndustrial, setEditingIndustrial] = useState<Record<Grade, Partial<IndustrialMargin>>>({} as Record<Grade, Partial<IndustrialMargin>>);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 기본값 초기화 시도
      await initializeFreshMargins();
      await initializeIndustrialMargins();

      const [fresh, industrial, hist] = await Promise.all([
        getFreshMargins(),
        getIndustrialMargins(),
        getMarginHistory(),
      ]);

      setFreshMargins(fresh);
      setIndustrialMarginsState(industrial);
      setHistory(hist);

      // 수정 상태 초기화
      const freshEdit: Record<Grade, number> = {} as Record<Grade, number>;
      fresh.forEach((m) => (freshEdit[m.grade] = m.marginBaht));
      setEditingFresh(freshEdit);

      const indEdit: Record<Grade, Partial<IndustrialMargin>> = {} as Record<Grade, Partial<IndustrialMargin>>;
      industrial.forEach((m) => (indEdit[m.grade] = { ...m }));
      setEditingIndustrial(indEdit);
    } catch (error) {
      console.error('Failed to load margins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFresh = async (grade: Grade) => {
    if (!user || !isAdmin) return;

    setSaving(true);
    try {
      await setFreshMargin(
        grade,
        editingFresh[grade],
        user.uid,
        user.email,
        user.name
      );
      await loadData();
      alert('저장되었습니다.');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIndustrial = async (grade: Grade) => {
    if (!user || !isAdmin) return;

    setSaving(true);
    try {
      const data = editingIndustrial[grade];
      await setIndustrialMargin(
        grade,
        {
          purMultiplier: data.purMultiplier || 0,
          minMultiplier: data.minMultiplier || 0,
          midMultiplier: data.midMultiplier,
          minMarginCheck: data.minMarginCheck,
          formula: data.formula || '',
        },
        user.uid,
        user.email,
        user.name
      );
      await loadData();
      alert('저장되었습니다.');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const getOriginalFresh = (grade: Grade): number => {
    return freshMargins.find((m) => m.grade === grade)?.marginBaht || 0;
  };

  const getOriginalIndustrial = (grade: Grade): IndustrialMargin | undefined => {
    return industrialMargins.find((m) => m.grade === grade);
  };

  const isFreshModified = (grade: Grade): boolean => {
    return editingFresh[grade] !== getOriginalFresh(grade);
  };

  const isIndustrialModified = (grade: Grade): boolean => {
    const original = getOriginalIndustrial(grade);
    const editing = editingIndustrial[grade];
    if (!original || !editing) return false;

    return (
      editing.purMultiplier !== original.purMultiplier ||
      editing.minMultiplier !== original.minMultiplier ||
      editing.midMultiplier !== original.midMultiplier ||
      editing.minMarginCheck !== original.minMarginCheck
    );
  };

  return (
    <ProtectedRoute adminOnly>
      <MainLayout
        isAdmin={isAdmin}
        userName={user?.email || ''}
        pageTitle="마진 설정"
        onLogout={signOut}
      >
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="secondary" size="sm">
                <Home size={18} className="mr-1" />
                홈
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">마진 설정</h1>
              <p className="text-sm text-gray-500 mt-1">
                등급별 마진율을 설정합니다. 변경 시 히스토리가 자동 기록됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex border-b mb-6">
          <button
            onClick={() => setActiveTab('fresh')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'fresh'
                ? 'border-b-2 border-green-500 text-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            신선제품 마진
          </button>
          <button
            onClick={() => setActiveTab('industrial')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'industrial'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            공산품 마진
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'history'
                ? 'border-b-2 border-gray-500 text-gray-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            변경 히스토리
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* 신선제품 마진 */}
            {activeTab === 'fresh' && (
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg mb-6">
                  <h3 className="font-medium text-green-700 mb-2">신선제품 마진 계산식</h3>
                  <p className="text-sm text-green-600">
                    판매가 = 매입가(3일최고가) + 마진(바트) + 고객adj
                  </p>
                </div>

                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">등급</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">설명</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">마진 (바트)</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">상태</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">작업</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {GRADE_ORDER.map((grade) => (
                        <tr key={grade} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Badge variant="success" size="sm">{grade}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                            {GRADE_DESCRIPTIONS[grade]}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={editingFresh[grade] || 0}
                              onChange={(e) =>
                                setEditingFresh((prev) => ({
                                  ...prev,
                                  [grade]: Number(e.target.value),
                                }))
                              }
                              className="w-24 px-2 py-1 text-center border rounded focus:ring-1 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isFreshModified(grade) && (
                              <Badge variant="warning" size="sm">수정됨</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              onClick={() => handleSaveFresh(grade)}
                              disabled={!isFreshModified(grade) || saving}
                            >
                              저장
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 공산품 마진 */}
            {activeTab === 'industrial' && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <h3 className="font-medium text-blue-700 mb-2">공산품 마진 계산식</h3>
                  <p className="text-sm text-blue-600 mb-1">
                    S~C, E등급: 판매가 = Pur × 배율 + 고객adj
                  </p>
                  <p className="text-sm text-blue-600">
                    D등급: 판매가 = max(Min, Mid) + 고객adj (마진 {`<`} 체크값이면 재협상)
                  </p>
                </div>

                <div className="space-y-4">
                  {GRADE_ORDER.map((grade) => {
                    const editing = editingIndustrial[grade] || {};
                    const isD = grade === 'D';

                    return (
                      <div
                        key={grade}
                        className={`bg-white border rounded-lg p-4 ${
                          isIndustrialModified(grade) ? 'border-yellow-300 bg-yellow-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Badge variant="info">{grade}</Badge>
                            <span className="text-sm text-gray-700 font-medium">{GRADE_DESCRIPTIONS[grade]}</span>
                            {isIndustrialModified(grade) && (
                              <Badge variant="warning" size="sm">수정됨</Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSaveIndustrial(grade)}
                            disabled={!isIndustrialModified(grade) || saving}
                          >
                            저장
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {!isD && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Pur 배율</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editing.purMultiplier || 0}
                                onChange={(e) =>
                                  setEditingIndustrial((prev) => ({
                                    ...prev,
                                    [grade]: { ...prev[grade], purMultiplier: Number(e.target.value) },
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          )}

                          {isD && (
                            <>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Min 배율</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editing.minMultiplier || 0}
                                  onChange={(e) =>
                                    setEditingIndustrial((prev) => ({
                                      ...prev,
                                      [grade]: { ...prev[grade], minMultiplier: Number(e.target.value) },
                                    }))
                                  }
                                  className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Mid 배율</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editing.midMultiplier || 0}
                                  onChange={(e) =>
                                    setEditingIndustrial((prev) => ({
                                      ...prev,
                                      [grade]: { ...prev[grade], midMultiplier: Number(e.target.value) },
                                    }))
                                  }
                                  className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">최소마진체크(%)</label>
                                <input
                                  type="number"
                                  value={editing.minMarginCheck || 0}
                                  onChange={(e) =>
                                    setEditingIndustrial((prev) => ({
                                      ...prev,
                                      [grade]: { ...prev[grade], minMarginCheck: Number(e.target.value) },
                                    }))
                                  }
                                  className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </>
                          )}

                          <div className={isD ? '' : 'md:col-span-3'}>
                            <label className="block text-xs text-gray-500 mb-1">계산식</label>
                            <div className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-600">
                              {editing.formula || '-'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 변경 히스토리 */}
            {activeTab === 'history' && (
              <div className="bg-white border rounded-lg overflow-hidden">
                {history.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    변경 히스토리가 없습니다.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">일시</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">유형</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">등급</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">항목</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">변경 전</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">변경 후</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">변경자</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {history.map((h) => (
                        <tr key={h.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {h.changedAt.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={h.type === 'fresh' ? 'success' : 'info'}
                              size="sm"
                            >
                              {h.type === 'fresh' ? '신선' : '공산품'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="default" size="sm">{h.grade}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">{h.field}</td>
                          <td className="px-4 py-3 text-center text-sm text-red-600">
                            {h.oldValue}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-green-600">
                            {h.newValue}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {h.changedByName || h.changedByEmail}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
