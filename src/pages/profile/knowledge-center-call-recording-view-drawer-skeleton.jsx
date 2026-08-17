import React from 'react';

import { cn } from '@/utils/cn';

const Pulse = ({ className }) => (
  <div className={cn('animate-pulse rounded bg-bg-weak-100', className)} />
);

export default function KnowledgeCenterCallRecordingViewDrawerSkeleton() {
  return (
    <div className='flex h-full min-h-[480px]'>
      <div className='w-[420px] shrink-0 border-r border-stroke-soft-200 px-6 py-5'>
        <Pulse className='mb-6 h-8 w-3/4' />
        <div className='space-y-0 divide-y divide-stroke-soft-200 overflow-hidden rounded-xl border border-stroke-soft-200'>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className='flex h-10 items-center gap-3 px-4'>
              <Pulse className='h-4 w-24 shrink-0' />
              <Pulse className='h-4 flex-1' />
            </div>
          ))}
        </div>
        <Pulse className='mt-6 h-5 w-16' />
        <Pulse className='mt-3 h-6 w-32' />
        <Pulse className='mt-6 h-5 w-28' />
        <Pulse className='mt-3 h-16 w-full' />
      </div>
      <div className='flex flex-1 flex-col gap-4 p-6'>
        {Array.from({ length: 4 }).map((_, index) => (
          <Pulse key={index} className='h-28 w-full rounded-xl' />
        ))}
      </div>
    </div>
  );
}
