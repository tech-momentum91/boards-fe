import React from 'react';
import { RiAlertFill } from 'react-icons/ri';
import * as Hint from '@/components/ui/hint';
import { formatConflictMessage } from '@/utils/date-utils';
import { cn } from '@/lib/utils';

/**
 * Shared conflict hint for time edit and recurrence edit.
 * Shows formatted conflict message + "View All" link (same style in both popovers).
 */
const BookingConflictsHint = ({ conflicts = [], onViewAll, className }) => {
  if (!conflicts?.length) return null;

  const message = formatConflictMessage(conflicts);
  if (!message) return null;

  return (
    <Hint.Root hasError className={cn('mt-1', className)}>
      <Hint.Icon as={RiAlertFill} />
      <span className='text-paragraph-xs'>
        {message}{' '}
        <button
          type='button'
          className='underline font-medium text-text-sub-500 hover:text-text-main-900'
          onClick={onViewAll}
        >
          View All
        </button>
      </span>
    </Hint.Root>
  );
};

export default BookingConflictsHint;
