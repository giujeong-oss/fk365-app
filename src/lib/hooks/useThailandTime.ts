'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getThailandTime,
  isAfterCutoff,
  formatThaiTime,
  ORDER_CUTOFF_HOUR,
} from '@/lib/constants';

export interface UseThailandTimeReturn {
  currentTime: Date;
  thailandTime: Date;
  formattedTime: string;
  isAfterCutoff: boolean;
  cutoffStatus: {
    closed: boolean;
    hours: number;
    mins: number;
    secs?: number;
    nextDay?: boolean;
  };
}

/**
 * 태국 시간 및 마감 상태를 관리하는 훅
 * - 1초마다 실시간 업데이트
 */
export function useThailandTime(updateInterval = 1000): UseThailandTimeReturn {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, updateInterval);

    return () => clearInterval(timer);
  }, [updateInterval]);

  const thailandTime = getThailandTime(currentTime);
  const cutoffClosed = isAfterCutoff(currentTime);
  const formattedTime = formatThaiTime(thailandTime);

  const getCutoffStatus = useCallback(() => {
    if (cutoffClosed) {
      // 이미 마감됨 - 다음날 마감까지 시간
      const nextCutoff = new Date(thailandTime);
      nextCutoff.setDate(nextCutoff.getDate() + 1);
      nextCutoff.setHours(ORDER_CUTOFF_HOUR, 0, 0, 0);
      const diffMs = nextCutoff.getTime() - thailandTime.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return { closed: true, hours, mins, nextDay: true };
    } else {
      // 오늘 마감까지 남은 시간
      const todayCutoff = new Date(thailandTime);
      todayCutoff.setHours(ORDER_CUTOFF_HOUR, 0, 0, 0);
      const diffMs = todayCutoff.getTime() - thailandTime.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      return { closed: false, hours, mins, secs };
    }
  }, [thailandTime, cutoffClosed]);

  return {
    currentTime,
    thailandTime,
    formattedTime,
    isAfterCutoff: cutoffClosed,
    cutoffStatus: getCutoffStatus(),
  };
}
