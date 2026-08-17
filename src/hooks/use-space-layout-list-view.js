import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { postGetLayoutListView } from '@/api/layoutListView';
import {
  buildLayoutListApiFilters,
  mergeLayoutListCenters,
  normalizeLayoutListViewResponse,
} from '@/utils/space-layout-list-utils';

const DEFAULT_PAGE_SIZE = 10;

/**
 * Fetch + scroll-pagination state for Space Management layout view.
 * Pagination unit is **center** (`page_size` = number of centers per page).
 *
 * @param {{
 *   center?: string | null,
 *   keyword?: string,
 *   filters?: object,
 *   enabled?: boolean,
 *   pageSize?: number,
 * }} options
 */
export function useSpaceLayoutListView({
  center = null,
  keyword = '',
  filters = {},
  enabled = true,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) {
  const [centers, setCenters] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCenters, setTotalCenters] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const requestIdRef = useRef(0);
  const centerRef = useRef(center);
  const filtersRef = useRef(filters);

  const resetState = useCallback(() => {
    setCenters([]);
    setPage(1);
    setHasMore(false);
    setTotalCenters(0);
    setError(null);
  }, []);

  const fetchPage = useCallback(
    async ({ nextPage, append }) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const apiFilters = buildLayoutListApiFilters(filtersRef.current || {});

        const message = await postGetLayoutListView({
          center: centerRef.current || undefined,
          page: nextPage,
          page_size: pageSize,
          keyword,
          filters: apiFilters,
        });

        if (requestId !== requestIdRef.current) return;

        const normalized = normalizeLayoutListViewResponse(message);
        setPage(normalized.page || nextPage);
        setHasMore(normalized.hasMore);
        setTotalCenters(normalized.totalCenters);

        setCenters((previous) =>
          append ? mergeLayoutListCenters(previous, normalized.centers) : normalized.centers,
        );
      } catch (error_) {
        if (requestId !== requestIdRef.current) return;
        const message =
          error_?.response?.data?.message ||
          error_?.message ||
          'Failed to load layout view. Please try again.';
        setError(typeof message === 'string' ? message : 'Failed to load layout view.');
        if (!append) {
          setCenters([]);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [pageSize, keyword],
  );

  useEffect(() => {
    centerRef.current = center;
  }, [center]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    if (!enabled) {
      resetState();
      return undefined;
    }

    resetState();
    fetchPage({ nextPage: 1, append: false });

    return () => {
      requestIdRef.current += 1;
    };
  }, [enabled, center, keyword, filters, pageSize, fetchPage, resetState]);

  const loadMore = useCallback(() => {
    if (!enabled || isLoading || isLoadingMore || !hasMore) return;
    fetchPage({ nextPage: page + 1, append: true });
  }, [enabled, fetchPage, hasMore, isLoading, isLoadingMore, page]);

  const retry = useCallback(() => {
    if (!enabled) return;
    resetState();
    fetchPage({ nextPage: 1, append: false });
  }, [enabled, fetchPage, resetState]);

  const meta = useMemo(
    () => ({
      page,
      pageSize,
      totalCenters,
      hasMore,
      loadedCenterCount: centers.length,
    }),
    [page, pageSize, totalCenters, hasMore, centers.length],
  );

  return {
    centers,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    retry,
    meta,
  };
}
