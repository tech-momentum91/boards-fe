import React from 'react';
import { RiUserSharedLine } from 'react-icons/ri';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import PartnerCard from '@/components/partner/partner-card';

const PartnerCardGrid = ({
  rows = [],
  isLoading,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  enableScrollPagination = true,
  totalCount,
  loadedCount,
  onViewDetails,
  // Caller-supplied empty-state copy (matches PartnerTable). Used by the
  // global centre header to render "No centers selected" instead of the
  // generic onboarding prompt.
  emptyTitle,
  emptyDescription,
}) => {
  const { sentinelRef } = useScrollPagination({
    onLoadMore: onLoadMore || (() => {}),
    hasMore: Boolean(hasMore && enableScrollPagination),
    isLoading: Boolean(isLoadingMore || isLoading),
    threshold: 200,
    scrollContainer: null,
    enabled: Boolean(enableScrollPagination && onLoadMore),
  });

  if (isLoading && rows.length === 0) {
    return (
      <div className='flex min-h-[280px] items-center justify-center rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
        <p className='text-paragraph-sm text-text-sub-600'>Loading...</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center rounded-xl border border-stroke-soft-200 bg-bg-white-0 py-16'>
        <RiUserSharedLine size={40} className='text-text-soft-300' />
        <p className='mt-3 text-paragraph-sm font-medium text-text-sub-600'>
          {emptyTitle || 'No partners found'}
        </p>
        <p className='mt-1 text-paragraph-xs text-text-soft-400'>
          {emptyDescription || 'Add your first partner to get started.'}
        </p>
      </div>
    );
  }

  const showListMeta =
    typeof totalCount === 'number' && totalCount > 0 && typeof loadedCount === 'number';

  return (
    <div className='w-full space-y-3'>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {rows.map((row, idx) => {
          return (
            <PartnerCard key={row.id || idx} row={row} onViewDetails={onViewDetails} index={idx} />
          );
        })}
      </div>
      {enableScrollPagination && hasMore && (
        <div ref={sentinelRef} data-scroll-sentinel className='h-1 w-full shrink-0' aria-hidden />
      )}
      {isLoadingMore && (
        <div className='flex items-center justify-center gap-2 py-4'>
          <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
          <span className='text-paragraph-sm text-text-sub-600'>Loading more partners…</span>
        </div>
      )}
      {showListMeta && (
        <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-2.5'>
          <p className='text-paragraph-sm text-text-sub-600'>
            Showing {loadedCount} of {totalCount}
            {hasMore ? '' : ' · End of list'}
          </p>
        </div>
      )}
    </div>
  );
};

PartnerCardGrid.displayName = 'PartnerCardGrid';

export default PartnerCardGrid;
