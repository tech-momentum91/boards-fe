import { useCallback, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_LIST_PAGE_SIZE,
  emptyListPagination,
  parseListPaginationMeta,
} from '@/utils/list-pagination-utils';

/**
 * Server-side offset pagination state + handlers for list/detail tables.
 * Wire `fetchRef.current = fetchFn` so page handlers always call the latest fetch.
 *
 * @param {object} [options]
 * @param {number} [options.initialPageSize=15]
 * @param {number} [options.initialPage=1]
 */
export function useOffsetPagination({
  initialPageSize = DEFAULT_LIST_PAGE_SIZE,
  initialPage = 1,
} = {}) {
  const [pagination, setPagination] = useState(() => emptyListPagination(initialPage));
  const [pageSize, setPageSize] = useState(initialPageSize);
  const fetchRef = useRef(null);

  const applyPaginationMeta = useCallback((result, fallbackPage = 1) => {
    setPagination(parseListPaginationMeta(result, fallbackPage));
  }, []);

  const resetPagination = useCallback(
    (page = initialPage) => {
      setPagination(emptyListPagination(page));
    },
    [initialPage],
  );

  const handlePageChange = useCallback((page) => {
    fetchRef.current?.(page, false);
  }, []);

  const handlePageSizeChange = useCallback((newSize) => {
    setPageSize(newSize);
    fetchRef.current?.(1, false, newSize);
  }, []);

  const paginationProps = useMemo(
    () => ({
      currentPage: pagination.page,
      totalPages: pagination.totalPages,
      totalCount: pagination.totalCount,
      pageSize,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
    }),
    [
      pagination.page,
      pagination.totalPages,
      pagination.totalCount,
      pageSize,
      handlePageChange,
      handlePageSizeChange,
    ],
  );

  return {
    pagination,
    pageSize,
    setPageSize,
    setPagination,
    applyPaginationMeta,
    resetPagination,
    handlePageChange,
    handlePageSizeChange,
    paginationProps,
    fetchRef,
  };
}

export default useOffsetPagination;
