import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const queryCache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

export function invalidateQueryCache(prefix?: string) {
  if (!prefix) {
    queryCache.clear();
    return;
  }
  for (const key of queryCache.keys()) {
    if (key.startsWith(prefix)) queryCache.delete(key);
  }
}

export function useQueryCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 30000
) {
  const cached = queryCache.get(key) as CacheEntry<T> | undefined;
  const isFresh = Boolean(cached && Date.now() < cached.expiresAt);

  const [data, setData] = useState<T | null>(isFresh ? cached!.data : null);
  const [loading, setLoading] = useState<boolean>(!isFresh);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (force = false) => {
    const existing = queryCache.get(key) as CacheEntry<T> | undefined;
    if (!force && existing && Date.now() < existing.expiresAt) {
      setData(existing.data);
      setLoading(false);
      return existing.data;
    }

    setLoading(true);
    setError(null);
    try {
      let promise = inflightRequests.get(key) as Promise<T> | undefined;
      if (!promise || force) {
        promise = fetcher();
        inflightRequests.set(key, promise);
      }
      const result = await promise;
      queryCache.set(key, { data: result, expiresAt: Date.now() + ttlMs });
      setData(result);
      return result;
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
      return null;
    } finally {
      inflightRequests.delete(key);
      setLoading(false);
    }
  }, [key, fetcher, ttlMs]);

  useEffect(() => {
    void refetch(false);
  }, [refetch]);

  return { data, loading, error, refetch: () => refetch(true) };
}
