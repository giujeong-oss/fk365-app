'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getCustomers, getCustomer, getCustomerByCode, getCustomerProductAdjs } from '@/lib/firebase';
import type { Customer, CustomerProductAdj, Grade, Region } from '@/types';

export interface UseCustomersOptions {
  activeOnly?: boolean;
  immediate?: boolean;
}

export interface UseCustomersReturn {
  customers: Customer[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  filterByGrade: (grade: Grade) => Customer[];
  filterByRegion: (region: Region) => Customer[];
  getByCode: (code: string) => Customer | undefined;
}

/**
 * 고객 목록 조회 훅
 */
export function useCustomers(options: UseCustomersOptions = {}): UseCustomersReturn {
  const { activeOnly = true, immediate = true } = options;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getCustomers(activeOnly);
      if (mountedRef.current) {
        setCustomers(data);
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
      fetchCustomers();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [fetchCustomers, immediate]);

  const filterByGrade = useCallback(
    (grade: Grade) => customers.filter(c => c.grade === grade),
    [customers]
  );

  const filterByRegion = useCallback(
    (region: Region) => customers.filter(c => c.region === region),
    [customers]
  );

  const getByCode = useCallback(
    (code: string) => customers.find(c => c.code === code),
    [customers]
  );

  return {
    customers,
    loading,
    error,
    refetch: fetchCustomers,
    filterByGrade,
    filterByRegion,
    getByCode,
  };
}

/**
 * 단일 고객 조회 훅 (with 제품 adj)
 */
export function useCustomer(
  idOrCode: string | null,
  options: { immediate?: boolean; byCode?: boolean; includeAdj?: boolean } = {}
): {
  customer: Customer | null;
  productAdjs: CustomerProductAdj[];
  adjMap: Map<string, number>;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { immediate = true, byCode = false, includeAdj = false } = options;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [productAdjs, setProductAdjs] = useState<CustomerProductAdj[]>([]);
  const [loading, setLoading] = useState(immediate && !!idOrCode);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchCustomer = useCallback(async () => {
    if (!idOrCode) {
      setCustomer(null);
      setProductAdjs([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 고객 조회
      const customerData = byCode
        ? await getCustomerByCode(idOrCode)
        : await getCustomer(idOrCode);

      if (mountedRef.current) {
        setCustomer(customerData);
      }

      // 제품 adj 조회 (N+1 문제 해결: 한 번에 조회)
      if (includeAdj && customerData) {
        const adjs = await getCustomerProductAdjs(customerData.code);
        if (mountedRef.current) {
          setProductAdjs(adjs);
        }
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
  }, [idOrCode, byCode, includeAdj]);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate && idOrCode) {
      fetchCustomer();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [fetchCustomer, immediate, idOrCode]);

  // adj를 Map으로 변환 (productCode -> adj)
  const adjMap = new Map(productAdjs.map(a => [a.productCode, a.adj]));

  return {
    customer,
    productAdjs,
    adjMap,
    loading,
    error,
    refetch: fetchCustomer,
  };
}
