'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getProducts, getProduct, getProductByCode } from '@/lib/firebase';
import type { Product, PriceType } from '@/types';

export interface UseProductsOptions {
  activeOnly?: boolean;
  priceType?: PriceType | 'all';
  immediate?: boolean;
}

export interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  filterByType: (type: PriceType | 'all') => Product[];
  getByCode: (code: string) => Product | undefined;
}

/**
 * 제품 목록 조회 훅
 */
export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const { activeOnly = true, priceType = 'all', immediate = true } = options;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getProducts(activeOnly);
      if (mountedRef.current) {
        setProducts(data);
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
      fetchProducts();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [fetchProducts, immediate]);

  const filterByType = useCallback(
    (type: PriceType | 'all') => {
      if (type === 'all') return products;
      return products.filter(p => p.priceType === type);
    },
    [products]
  );

  const getByCode = useCallback(
    (code: string) => products.find(p => p.code === code),
    [products]
  );

  // 현재 필터 적용된 결과
  const filteredProducts = priceType === 'all' ? products : filterByType(priceType);

  return {
    products: filteredProducts,
    loading,
    error,
    refetch: fetchProducts,
    filterByType,
    getByCode,
  };
}

/**
 * 단일 제품 조회 훅
 */
export function useProduct(
  id: string | null,
  options: { immediate?: boolean } = {}
): {
  product: Product | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { immediate = true } = options;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(immediate && !!id);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchProduct = useCallback(async () => {
    if (!id) {
      setProduct(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getProduct(id);
      if (mountedRef.current) {
        setProduct(data);
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
  }, [id]);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate && id) {
      fetchProduct();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [fetchProduct, immediate, id]);

  return { product, loading, error, refetch: fetchProduct };
}
