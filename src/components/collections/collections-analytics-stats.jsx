import React from 'react';
import { COLLECTIONS_ANALYTICS_STATS } from '@/collections/analytics-constants';
import { cn } from '@/utils/cn';

function AnalyticsStatCard({ label, value, valueClassName, accentClassName }) {
  return (
    <div
      className={cn(
        'flex min-h-[64px] min-w-0 flex-1 flex-col justify-center gap-1 rounded-xl border border-stroke-soft-200 border-t-2 bg-bg-white-0 px-3 py-2.5 shadow-[0px_1px_2px_rgba(82,88,102,0.06)]',
        accentClassName,
      )}
    >
      <span className={cn('truncate text-title-h6', valueClassName)}>{value}</span>
      <span className='truncate text-subheading-xs text-text-soft-400'>{label}</span>
    </div>
  );
}

export default function CollectionsAnalyticsStats({ stats }) {
  const resolved = stats && Object.keys(stats).length > 0 ? stats : COLLECTIONS_ANALYTICS_STATS;
  const statKeys = Object.keys(COLLECTIONS_ANALYTICS_STATS);

  return (
    <div className='flex w-full min-w-0 justify-between gap-3'>
      {statKeys.map((key) => (
        <AnalyticsStatCard key={key} {...(resolved[key] ?? COLLECTIONS_ANALYTICS_STATS[key])} />
      ))}
    </div>
  );
}
