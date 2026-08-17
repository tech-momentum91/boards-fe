import React, { useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import Pagination from '@/components/ui/pagination';

const TABLE_AREA_CLASS = 'flex-1 min-h-0 w-full';
const SCROLLABLE_TABLE_CLASS = `${TABLE_AREA_CLASS} overflow-y-auto overflow-x-hidden`;
/** Grouped lists share one scrollport so all mini-tables move together horizontally. */
const GROUPED_TABLE_CLASS = `${TABLE_AREA_CLASS} overflow-auto`;
const FROZEN_TABLE_CLASS = `${TABLE_AREA_CLASS} flex flex-col overflow-hidden`;

function scrollTableAreaToTop(container) {
  if (!container) return;
  container.scrollTop = 0;
  container.querySelectorAll('.overflow-auto, .overflow-y-auto').forEach((el) => {
    if (el !== container) {
      el.scrollTop = 0;
    }
  });
}

/**
 * Standard table + bottom pagination shell used across list/detail views.
 * Table content scrolls in the area above pagination; pagination stays fixed in the flex footer.
 * Pass `grouped` when group-by mode renders stacked sections (not a single frozen scroll table).
 * Grouped mode uses one shared overflow container so all mini-tables scroll together horizontally.
 */
export function PaginatedTableLayout({
  children,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  scrollable = true,
  grouped = false,
  className,
  scrollClassName,
  paginationClassName,
}) {
  const scrollRef = useRef(null);
  const useOuterScroll = scrollable || grouped;
  const tableAreaClassName = grouped
    ? GROUPED_TABLE_CLASS
    : useOuterScroll
      ? SCROLLABLE_TABLE_CLASS
      : FROZEN_TABLE_CLASS;
  const showPagination = totalCount > 0;

  useEffect(() => {
    scrollTableAreaToTop(scrollRef.current);
  }, [currentPage, pageSize]);

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
      <div
        ref={scrollRef}
        className={cn(
          tableAreaClassName,
          showPagination && useOuterScroll && 'pb-4',
          scrollClassName,
        )}
      >
        {children}
      </div>
      {showPagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          className={paginationClassName}
        />
      )}
    </div>
  );
}

export default PaginatedTableLayout;
