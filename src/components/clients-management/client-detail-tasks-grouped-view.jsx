import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RiArrowDownSLine, RiArrowUpSLine, RiBuildingLine } from 'react-icons/ri';

import ClientDetailTasksTable from '@/components/clients-management/client-detail-tasks-table';
import {
  resolveCenterGroupKey,
  resolveCenterGroupLabel,
} from '@/components/client-onboarding/task-view-drawer-utils';
import { SCROLL_LOAD_THRESHOLD } from '@/components/team-management/constants';

const ClientDetailTasksGroupedView = ({
  taskGroups = [],
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  tableRef,
  tableVariant = 'compact',
  showRecurring = false,
  context = 'default',
  onRowClick,
  react_table_id,
  sorting = [],
  onSortingChange,
  onColumnConfigChange,
}) => {
  const [expandedCenters, setExpandedCenters] = useState({});
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    setExpandedCenters((previous) => {
      const next = { ...previous };
      taskGroups.forEach((g) => {
        const key = resolveCenterGroupKey(g?.center);
        if (key && next[key] === undefined) next[key] = true;
      });
      return next;
    });
  }, [taskGroups]);

  const toggleCenterExpanded = useCallback((centerKey) => {
    setExpandedCenters((previous) => {
      const isOpen = previous[centerKey] !== false;
      return { ...previous, [centerKey]: !isOpen };
    });
  }, []);

  const handleScroll = useCallback(
    (scrollElement) => {
      if (isLoadingMore || !hasMore || !onLoadMore) return;
      if (!scrollElement) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      if (scrollTop + clientHeight >= scrollHeight - SCROLL_LOAD_THRESHOLD) {
        onLoadMore();
      }
    },
    [hasMore, isLoadingMore, onLoadMore],
  );

  useEffect(() => {
    const scrollEl = scrollContainerRef.current?.parentElement;
    if (!scrollEl) return;
    const onScroll = () => handleScroll(scrollEl);
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [handleScroll]);

  if (isLoading && taskGroups.length === 0) {
    return (
      <div className='py-10 text-center text-paragraph-sm text-text-sub-500'>Loading tasks…</div>
    );
  }

  if (!isLoading && taskGroups.length === 0) {
    return (
      <div className='py-10 text-center text-paragraph-sm text-text-sub-500'>No tasks found.</div>
    );
  }

  return (
    <div ref={scrollContainerRef} className='flex flex-col gap-6'>
      {taskGroups.map((section, sectionIndex) => {
        const centerKey = resolveCenterGroupKey(section.center);
        const centerLabel =
          section.center_name ||
          resolveCenterGroupLabel(section.center) ||
          resolveCenterGroupLabel(section.tasks?.[0]?.center) ||
          centerKey;
        const isExpanded = expandedCenters[centerKey] !== false;
        const sectionTasks = Array.isArray(section.tasks) ? section.tasks : [];

        return (
          <div key={centerKey || `center-group-${sectionIndex}`} className='flex flex-col gap-1'>
            <button
              type='button'
              onClick={() => toggleCenterExpanded(centerKey)}
              className='label-small flex w-full cursor-pointer items-center gap-2 text-left font-medium text-text-sub-500 transition-opacity hover:opacity-80'
            >
              <span className='flex min-w-0 items-center gap-2'>
                <RiBuildingLine className='shrink-0 text-text-sub-500' size={20} aria-hidden />
                <span className='truncate text-text-strong-950'>{centerLabel}</span>
              </span>
              {isExpanded ? (
                <RiArrowUpSLine size={16} className='shrink-0 text-text-soft-400' />
              ) : (
                <RiArrowDownSLine size={16} className='shrink-0 text-text-soft-400' />
              )}
            </button>
            {isExpanded ? (
              <div className='w-full overflow-x-auto rounded-2xl border border-stroke-soft-200 bg-bg-white-0 pt-2'>
                <ClientDetailTasksTable
                  ref={tableRef}
                  tasks={sectionTasks}
                  isLoading={false}
                  variant={tableVariant}
                  showRecurring={showRecurring}
                  context={context}
                  onRowClick={onRowClick}
                  react_table_id={react_table_id}
                  sorting={sorting}
                  onSortingChange={onSortingChange}
                  onColumnConfigChange={onColumnConfigChange}
                  enableScrollPagination={false}
                />
              </div>
            ) : null}
          </div>
        );
      })}
      {isLoadingMore ? (
        <div className='py-3 text-center text-paragraph-sm text-text-sub-500'>Loading more…</div>
      ) : null}
    </div>
  );
};

export default ClientDetailTasksGroupedView;
