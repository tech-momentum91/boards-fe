import React from 'react';

import { formatNumber } from '@/components/proposal-analytics/analytics-format-helpers';
import { cn } from '@/utils/cn';

/**
 * Live visitors indicator — count comes from the analytics API for this proposal.
 */
export function LiveVisitorsBadge({ count = 0, className }) {
  const value = Math.max(0, Number(count) || 0);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px] font-medium text-primary-base',
        className,
      )}
      title='Active visitors on this proposal in the last 5 minutes (from API)'
    >
      <span className='relative flex size-2 shrink-0'>
        <span className='absolute inline-flex size-full animate-ping rounded-full bg-primary-base opacity-60' />
        <span className='relative inline-flex size-2 rounded-full bg-primary-base' />
      </span>
      <span>
        {formatNumber(value)}
        <span className='text-text-sub-500'> · Live visitors</span>
      </span>
    </div>
  );
}

export default LiveVisitorsBadge;
