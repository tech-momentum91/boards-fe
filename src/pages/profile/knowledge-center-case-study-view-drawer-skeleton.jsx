import React from 'react';

import { cn } from '@/utils/cn';

const Pulse = ({ className }) => (
  <div className={cn('rounded bg-bg-weak-100 animate-pulse', className)} />
);

/** Full drawer body skeleton — shown only on initial record fetch, not during inline edits. */
export default function KnowledgeCenterCaseStudyViewDrawerSkeleton() {
  return (
    <div className='flex h-full min-h-[480px]'>
      <div className='w-[420px] shrink-0 border-r border-stroke-soft-200 px-6 py-5'>
        <Pulse className='mb-4 h-8 w-3/4' />
        <Pulse className='mb-6 h-10 w-full' />
        <div className='space-y-0 divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='flex h-10 items-center gap-3 px-4'>
              <Pulse className='h-4 w-24 shrink-0' />
              <Pulse className='h-4 flex-1' />
            </div>
          ))}
        </div>
        <Pulse className='mt-6 h-5 w-28' />
        <Pulse className='mt-3 h-24 w-full' />
      </div>
      <div className='flex flex-1 flex-col gap-5 p-6'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-[rgba(246,248,250,0.4)]'
          >
            <Pulse className='h-9 w-full rounded-none border-b border-stroke-soft-200' />
            <Pulse className='m-4 h-16 w-[calc(100%-2rem)]' />
          </div>
        ))}
      </div>
    </div>
  );
}
