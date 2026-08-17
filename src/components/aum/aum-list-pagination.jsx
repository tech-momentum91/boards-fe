import React, { useCallback } from 'react';

import { AUM_LIST_PAGE_SIZE } from '@/components/aum/constants';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';

export function createAumListState(extra = {}) {
  return {
    status: 'idle',
    error: null,
    items: [],
    rows: [],
    totalCount: 0,
    page: 1,
    pageSize: AUM_LIST_PAGE_SIZE,
    hasMore: false,
    isLoadingMore: false,
    ...extra,
  };
}

export function setAumListPending(state, action) {
  if (action.meta.arg?.append) {
    state.isLoadingMore = true;
  } else {
    state.status = 'loading';
    state.page = 1;
    state.isLoadingMore = false;
  }
  state.error = null;
}

export function applyAumListFulfilled(state, action, { dataKey = 'items' }) {
  const append = Boolean(action.meta.arg?.append);
  const page = action.payload?.page ?? action.meta.arg?.page ?? 1;
  const pageSize = action.meta.arg?.page_size ?? state.pageSize ?? AUM_LIST_PAGE_SIZE;
  const rows = action.payload?.rows ?? action.payload?.items ?? [];
  const totalCount = action.payload?.totalCount ?? 0;

  state.status = 'succeeded';
  state.isLoadingMore = false;
  state.page = page;
  state.pageSize = pageSize;
  state.totalCount = totalCount;
  state.hasMore = page * pageSize < totalCount;
  state[dataKey] = append ? [...(state[dataKey] ?? []), ...rows] : rows;
}

export function shouldIgnoreAumListRejection(action) {
  if (action.meta?.aborted) {
    return true;
  }

  const message = action.payload || action.error?.message;
  return message === 'Aborted' || message === 'CanceledError';
}

export function applyAumListRejected(state, action, { dataKey = 'items' } = {}) {
  if (shouldIgnoreAumListRejection(action)) {
    return;
  }

  state.status = 'failed';
  state.isLoadingMore = false;
  state.error = action.payload ?? action.error?.message ?? 'Unknown error';
  if (!action.meta.arg?.append) {
    state[dataKey] = [];
  }
}

export function useAumListLoadMore({ dispatch, fetchThunk, listState, fetchParams }) {
  const handleLoadMore = useCallback(() => {
    if (listState.status === 'loading' || listState.isLoadingMore || !listState.hasMore) {
      return;
    }

    dispatch(
      fetchThunk({
        ...fetchParams,
        page: (listState.page ?? 1) + 1,
        append: true,
      }),
    );
  }, [dispatch, fetchParams, fetchThunk, listState]);

  const { renderSentinel } = useScrollPagination({
    onLoadMore: handleLoadMore,
    hasMore: listState.hasMore,
    isLoading: listState.isLoadingMore || listState.status === 'loading',
    enabled: listState.status === 'succeeded' || listState.isLoadingMore,
  });

  return {
    renderSentinel,
    isLoadingMore: listState.isLoadingMore,
    renderLoadMoreFooter: () => {
      if (!listState.hasMore && !listState.isLoadingMore) {
        return null;
      }

      return (
        <div className='py-4'>
          {listState.isLoadingMore ? (
            <p className='text-center text-label-sm text-text-sub-500'>Loading more...</p>
          ) : null}
          {renderSentinel()}
        </div>
      );
    },
  };
}
