'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getVendors } from '@/lib/firebase';
import type { Vendor } from '@/types';

export interface UseVendorsOptions {
  activeOnly?: boolean;
  immediate?: boolean;
}

export interface UseVendorsReturn {
  vendors: Vendor[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getByCode: (code: string) => Vendor | undefined;
  getNameByCode: (code: string) => string;
}

/**
 * 구매처 목록 조회 훅
 */
export function useVendors(options: UseVendorsOptions = {}): UseVendorsReturn {
  const { activeOnly = true, immediate = true } = options;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getVendors(activeOnly);
      if (mountedRef.current) {
        setVendors(data);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [activeOnly]);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) {
      fetchVendors();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [fetchVendors, immediate]);

  const getByCode = useCallback(
    (code: string) => vendors.find(v => v.code === code),
    [vendors]
  );

  const getNameByCode = useCallback(
    (code: string) => {
      const vendor = vendors.find(v => v.code === code);
      return vendor?.name || code;
    },
    [vendors]
  );

  return {
    vendors,
    loading,
    error,
    refetch: fetchVendors,
    getByCode,
    getNameByCode,
  };
}
