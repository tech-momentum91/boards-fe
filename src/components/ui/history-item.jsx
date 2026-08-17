import React from 'react';
import { safeDisplayDateTime } from '@/utils/date-utils';

const HistoryItem = ({ historyItem, isLast = false }) => {
  const { name, action, owner, creation, user } = historyItem;

  return (
    <div className='relative flex items-center gap-2.5 py-0 z-10'>
      {/* Dot Container - 6px width, 16px height as per Figma */}
      <div className='shrink-0 w-1.5 h-4 flex items-center justify-center'>
        <div className='w-1.5 h-1.5 rounded-full bg-stroke-soft-200' />
      </div>

      {/* History Content */}
      <div className='flex-1 min-w-0 flex items-center justify-between gap-[42px] paragraph-xsmall'>
        {/* Text - 12px regular, text-sub-500 */}
        <div className='flex-1'>
          {user?.name || owner ? (
            <>
              <span className='text-text-strong-950'>{user?.name || owner}</span>{' '}
            </>
          ) : null}
          <span className='text-text-sub-500'>{action}</span>
        </div>
        {/* Timestamp - 11px uppercase, tracking-[0.22px], text-sub-500 */}
        <span className='text-text-sub-500 whitespace-nowrap shrink-0'>
          {safeDisplayDateTime(creation)}
        </span>
      </div>
    </div>
  );
};

export default HistoryItem;
