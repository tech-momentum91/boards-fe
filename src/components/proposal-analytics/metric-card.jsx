import React from 'react';

import { DashboardCard } from '@/components/proposal-analytics/dashboard-card';
import { formatNumber } from '@/components/proposal-analytics/analytics-format-helpers';
import { cn } from '@/utils/cn';

export function MetricCard({
  label,
  value,
  hint,
  className,
  selected = false,
  selectable = false,
  onClick,
}) {
  const interactive = selectable && typeof onClick === 'function';

  return (
    <DashboardCard
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.(event);
              }
            }
          : undefined
      }
      className={cn(
        'flex min-h-[104px] flex-col justify-between p-4 transition-colors',
        interactive && 'cursor-pointer hover:bg-bg-weak-50/80',
        selected && 'ring-2 ring-inset ring-primary-base bg-primary-lighter/40',
        className,
      )}
    >
      <p className='text-[13px] font-medium text-text-sub-500'>{label}</p>
      <div>
        <p className='text-[28px] font-semibold leading-none tracking-tight text-text-strong-950'>
          {typeof value === 'number' ? formatNumber(value) : value}
        </p>
        {hint ? <p className='mt-2 text-paragraph-xs text-text-soft-400'>{hint}</p> : null}
      </div>
    </DashboardCard>
  );
}

export default MetricCard;
