import { useCallback, useEffect, useRef } from 'react';
import { useOffsetPagination } from '@/hooks/use-offset-pagination';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';
import { PROJECT_MASTER_LIST_PAGE_SIZE } from '@/pages/profile/project-master/project-master.constants';

/**
 * Server-side pagination for Projects Master list tabs (tasks, layouts, documents).
 */
export function useProjectMasterList({
  dispatch,
  fetchListThunk,
  getFilters,
  isActive,
  reloadDeps = [],
}) {
  const { pagination, pageSize, applyPaginationMeta, resetPagination, paginationProps, fetchRef } =
    useOffsetPagination({
      initialPageSize: PROJECT_MASTER_LIST_PAGE_SIZE,
      initialPage: 1,
    });

  const pageRef = useRef(pagination.page);
  pageRef.current = pagination.page;

  const loadPage = useCallback(
    async (page = pageRef.current, pageSizeParam = pageSize) => {
      try {
        const result = await dispatch(
          fetchListThunk({
            ...getFilters(),
            page,
            limit_page_length: pageSizeParam,
          }),
        ).unwrap();
        applyPaginationMeta(result, page);
        return result;
      } catch (error) {
        const statusCode = error?.status_code ?? error?.exc_type;
        if (statusCode === 404) return null;
        showErrorToast(extractErrorMessage(error));
        throw error;
      }
    },
    [applyPaginationMeta, dispatch, fetchListThunk, getFilters, pageSize],
  );

  fetchRef.current = (page, _append, pageSizeParam) => {
    loadPage(page, pageSizeParam ?? pageSize);
  };

  const reloadList = useCallback(() => loadPage(pageRef.current), [loadPage]);

  useEffect(() => {
    if (!isActive) return;
    resetPagination(1);
    loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, ...reloadDeps]);

  return {
    loadList: reloadList,
    loadPage,
    paginationProps,
  };
}
