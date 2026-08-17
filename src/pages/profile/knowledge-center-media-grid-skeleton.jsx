import React from 'react';

import { cn } from '@/utils/cn';

function SkeletonBlock({ className }) {
  return <div className={cn('animate-pulse rounded-md bg-bg-weak-100', className)} aria-hidden />;
}

function KnowledgeCenterMediaCardSkeleton() {
  return (
    <article
      className='flex w-full flex-col items-start gap-3 rounded-[10px] border border-stroke-soft-200 bg-[rgba(246,248,250,0.4)] px-2 pb-4 pt-2 shadow-regular-xs'
      aria-hidden
    >
      <SkeletonBlock className='h-[140px] w-full rounded-[6px]' />

      <div className='flex w-full flex-col gap-2 px-1.5'>
        <SkeletonBlock className='h-4 w-[78%]' />
        <SkeletonBlock className='h-3 w-[52%]' />
      </div>

      <div className='flex flex-wrap items-center gap-1.5 px-1.5'>
        <SkeletonBlock className='h-[22px] w-16 rounded-full' />
        <SkeletonBlock className='h-[22px] w-14 rounded-full' />
      </div>
    </article>
  );
}

const DEFAULT_SKELETON_COUNT = 6;

export default function KnowledgeCenterMediaGridSkeleton({ count = DEFAULT_SKELETON_COUNT }) {
  return (
    <div
      className='grid grid-cols-3 gap-4'
      role='status'
      aria-busy='true'
      aria-label='Loading media'
    >
      {Array.from({ length: count }, (_, index) => (
        <KnowledgeCenterMediaCardSkeleton key={`kc-media-skeleton-${index}`} />
      ))}
    </div>
  );
}
