import React from 'react';
import { cn } from '@/utils/cn';

export default function CollectionsProgressCell({ value = 0, className }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className={cn('flex min-w-[128px] items-center gap-2', className)}>
      <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-bg-soft-200'>
        <div
          className='h-full rounded-full bg-success-base transition-all'
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className='w-8 shrink-0 text-right text-paragraph-xs text-text-sub-500 tabular-nums'>
        {percent}%
      </span>
    </div>
  );
}
