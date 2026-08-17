import React from 'react';
import { RiFilter3Line } from 'react-icons/ri';

import EmptyIllustration from '@/components/ui/empty-illustration';
import { cn } from '@/utils/cn';

/**
 * Shown inside dashboard chart/KPI tiles when a tab-level filter yields no rows.
 */
export default function DashboardChartFilterEmptyState({ compact = false, className }) {
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-3 px-4 py-6 text-center',
        compact ? 'min-h-[88px] gap-2 py-4' : 'min-h-[140px]',
        className,
      )}
    >
      <div className='relative'>
        <EmptyIllustration className={compact ? 'size-16' : 'size-[72px]'} />
        <span
          className={cn(
            'absolute -bottom-1 -right-1 flex items-center justify-center rounded-full',
            'border border-stroke-soft-200 bg-bg-white-0 text-text-soft-400 shadow-regular-xs',
            compact ? 'size-6' : 'size-7',
          )}
          aria-hidden
        >
          <RiFilter3Line className={compact ? 'size-3' : 'size-3.5'} />
        </span>
      </div>
      <div className='flex max-w-[240px] flex-col gap-1'>
        <p className={cn('font-medium text-text-sub-600', compact ? 'text-[12px]' : 'text-sm')}>
          No data for this filter
        </p>
        <p
          className={cn(
            'text-text-soft-400',
            compact ? 'text-[11px] leading-4' : 'text-xs leading-5',
          )}
        >
          Change the time range or other filters to see results for this chart.
        </p>
      </div>
    </div>
  );
}
