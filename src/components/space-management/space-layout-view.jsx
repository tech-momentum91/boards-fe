import React, { useMemo, useRef } from 'react';

import emptyState from '@/assets/images/empty-state.png';
import SpaceLayoutCenterCard from '@/components/space-management/space-layout-center-card';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { useSpaceLayoutListView } from '@/hooks/use-space-layout-list-view';
import {
  resolveLayoutListFloorSection,
  spaceMatchesLayoutSearch,
  spaceMatchesLayoutStatusTabs,
} from '@/utils/space-layout-list-utils';

/**
 * Layout view for Space Management — center cards with floor navigation and hover space details.
 *
 * @param {{
 *   center?: string | null,
 *   filterCenterIds?: string[] | null,
 *   search?: string,
 *   statusTab?: string,
 *   inventoryTypeTab?: string,
 *   enabled?: boolean,
 *   context?: 'default' | 'search',
 * }} props
 */
export default function SpaceLayoutView({
  center = null,
  filterCenterIds = null,
  search = '',
  statusTab = 'all',
  inventoryTypeTab = '',
  enabled = true,
  context = 'default',
  filters = {},
}) {
  const { centers, isLoading, isLoadingMore, hasMore, error, loadMore, retry } =
    useSpaceLayoutListView({
      center,
      keyword: search,
      filters,
      enabled,
      pageSize: 10,
    });

  const previousCentersLengthRef = useRef(0);
  const scrollPositionBeforeUpdateRef = useRef(0);
  const isAppendingRef = useRef(false);

  const { sentinelRef } = useScrollPagination({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoadingMore || isLoading,
    threshold: 400,
    scrollContainer: null,
    enabled: enabled && Boolean(loadMore),
  });

  React.useLayoutEffect(() => {
    if (centers.length > previousCentersLengthRef.current) {
      scrollPositionBeforeUpdateRef.current =
        window.pageYOffset || document.documentElement.scrollTop;
      isAppendingRef.current = true;
    }
    previousCentersLengthRef.current = centers.length;
  }, [centers.length]);

  React.useLayoutEffect(() => {
    if (isAppendingRef.current && !isLoadingMore && scrollPositionBeforeUpdateRef.current > 0) {
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      if (Math.abs(scrollPositionBeforeUpdateRef.current - currentScroll) > 5) {
        window.scrollTo(0, scrollPositionBeforeUpdateRef.current);
      }
      isAppendingRef.current = false;
      scrollPositionBeforeUpdateRef.current = 0;
    }
  }, [centers.length, isLoadingMore]);

  const filteredCenters = useMemo(() => {
    const enforceCenterFilter =
      Array.isArray(filterCenterIds) && filterCenterIds.length > 0 && !center;
    const hasActiveFilters = Boolean(
      String(search || '').trim() ||
      (inventoryTypeTab && String(inventoryTypeTab).trim()) ||
      (statusTab && statusTab !== 'all'),
    );

    return centers
      .filter((centerGroup) => {
        if (!enforceCenterFilter) return true;
        return filterCenterIds.some(
          (centerId) => String(centerId) === String(centerGroup.centerId),
        );
      })
      .map((centerGroup) => {
        const floors = (centerGroup.floors || [])
          .map((floorSection) => {
            const spaces = (floorSection.spaces || []).filter((space) => {
              if (!spaceMatchesLayoutSearch(search, space)) return false;
              if (!spaceMatchesLayoutStatusTabs(statusTab, inventoryTypeTab, space)) return false;
              return true;
            });
            return { ...floorSection, spaces, spaceCount: spaces.length };
          })
          .filter((floorSection) => {
            if (!hasActiveFilters) return true;
            if (floorSection.spaces.length > 0) return true;
            const { floor } = resolveLayoutListFloorSection(floorSection);
            return Boolean(
              floor?.has_layout_image ||
              floor?.layout_image ||
              floor?.layout_image_url ||
              floor?.floor_ref ||
              floor?.block_floor_id,
            );
          });

        return {
          ...centerGroup,
          floors,
        };
      })
      .filter((centerGroup) => {
        if (!hasActiveFilters) return true;
        return (centerGroup.floors || []).length > 0;
      });
  }, [centers, filterCenterIds, center, search, statusTab, inventoryTypeTab]);

  if (isLoading && centers.length === 0) {
    return (
      <div className='flex min-h-[420px] items-center justify-center rounded-xl border border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        Loading layout view…
      </div>
    );
  }

  if (error && centers.length === 0) {
    return (
      <div className='flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-error-lighter bg-bg-weak-50 px-6 py-10 text-center'>
        <p className='text-paragraph-sm text-error-base'>{error}</p>
        <button
          type='button'
          onClick={retry}
          className='text-label-sm font-medium text-primary-base hover:underline'
        >
          Try again
        </button>
      </div>
    );
  }

  if (filteredCenters.length === 0) {
    const isSearchContext = context === 'search';
    return (
      <div className='flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-xl border border-stroke-soft-200 bg-bg-weak-50 px-6 py-12 text-center'>
        <img className='h-28 w-28 object-contain' src={emptyState} alt='' />
        <div className='flex flex-col gap-1'>
          <p className='text-label-medium text-text-strong-950'>
            {isSearchContext ? 'No spaces match these filters' : 'No layout data yet'}
          </p>
          <p className='text-paragraph-sm text-text-sub-500'>
            {isSearchContext
              ? 'Try adjusting filters or clearing search.'
              : 'Upload floor layouts and map spaces to see them here.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      {filteredCenters.map((centerGroup) => (
        <SpaceLayoutCenterCard
          key={centerGroup.centerId}
          centerId={centerGroup.centerId}
          centerName={centerGroup.centerName}
          floors={centerGroup.floors}
        />
      ))}

      <div ref={sentinelRef} data-scroll-sentinel className='h-px w-full' aria-hidden />

      {isLoadingMore ? (
        <div className='flex items-center justify-center py-4 text-paragraph-sm text-text-sub-500'>
          Loading more centers…
        </div>
      ) : null}
    </div>
  );
}
