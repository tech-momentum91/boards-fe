import React from 'react';
import { GLOBAL_COLLECTIONS_STATS } from '@/collections/constants';
import { cn } from '@/utils/cn';

function CollectionStatCard({ label, value, valueClassName }) {
  return (
    <div className='flex min-h-[64px] flex-col justify-center gap-1 rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 shadow-[0px_1px_2px_rgba(82,88,102,0.06)]'>
      <span className={cn('text-title-h6', valueClassName)}>{value}</span>
      <span className='text-subheading-xs text-text-soft-400'>{label}</span>
    </div>
  );
}

export default function CollectionsStats({ stats }) {
  const resolved = stats && Object.keys(stats).length > 0 ? stats : GLOBAL_COLLECTIONS_STATS;
  const statKeys = Object.keys(GLOBAL_COLLECTIONS_STATS);

  return (
    <div className='grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5'>
      {statKeys.map((key) => (
        <CollectionStatCard key={key} {...(resolved[key] ?? GLOBAL_COLLECTIONS_STATS[key])} />
      ))}
    </div>
  );
}
