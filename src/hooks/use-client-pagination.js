import { useState, useMemo, useCallback, useEffect } from 'react';
import { DEFAULT_LIST_PAGE_SIZE } from '@/utils/list-pagination-utils';

/**
 * Client-side pagination for in-memory lists (filter/sort locally, paginate in UI).
 */
export function useClientPagination(
  items,
  { initialPageSize = DEFAULT_LIST_PAGE_SIZE, resetOnChange = [] } = {},
) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const safeItems = Array.isArray(items) ? items : [];
  const totalCount = safeItems.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, resetOnChange);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return safeItems.slice(start, start + pageSize);
  }, [safeItems, currentPage, pageSize]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const paginationProps = useMemo(
    () => ({
      currentPage,
      totalPages,
      totalCount,
      pageSize,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
    }),
    [currentPage, totalPages, totalCount, pageSize, handlePageChange, handlePageSizeChange],
  );

  return {
    currentPage,
    pageSize,
    paginatedItems,
    totalCount,
    totalPages,
    setCurrentPage,
    setPageSize,
    handlePageChange,
    handlePageSizeChange,
    paginationProps,
  };
}

export default useClientPagination;
