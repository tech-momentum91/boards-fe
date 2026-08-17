import React from 'react';
import { Inbox } from 'lucide-react';

import { cn } from '@/utils/cn';

export function AnalyticsEmptyState({
  title = 'No data yet',
  description = 'Analytics will appear once visitors open this proposal.',
  className,
}) {
  return (
    <div
      className={cn(
        'flex min-h-[180px] flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 px-4 py-8 text-center',
        className,
      )}
    >
      <span className='flex size-10 items-center justify-center rounded-full bg-bg-white-0 text-text-soft-400 ring-1 ring-inset ring-stroke-soft-200'>
        <Inbox className='size-5' aria-hidden />
      </span>
      <p className='text-label-sm font-medium text-text-strong-950'>{title}</p>
      <p className='max-w-sm text-paragraph-xs text-text-sub-500'>{description}</p>
    </div>
  );
}

export default AnalyticsEmptyState;
