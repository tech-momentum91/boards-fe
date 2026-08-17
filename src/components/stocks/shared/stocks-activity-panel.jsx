import React from 'react';

import CrmTaskHistoryItem from '@/components/crm-tasks/crm-task-history-item';
import CommentsTimeline from '@/components/ui/comments-timeline';
import * as Button from '@/components/ui/button';

/**
 * Stocks activity timeline — same CRM/AUM history design.
 * Comments are intentionally not shown (activities only).
 */
const StocksActivityPanel = ({
  activity = [],
  isLoading = false,
  error = null,
  onRetry,
  emptyMessage = 'No activity recorded yet.',
}) => {
  if (error) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center'>
        <p className='text-paragraph-sm text-text-sub-500'>{error}</p>
        {onRetry ? (
          <Button.Root type='button' variant='neutral' mode='stroke' size='small' onClick={onRetry}>
            Retry
          </Button.Root>
        ) : null}
      </div>
    );
  }

  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6 py-4'>
      <CommentsTimeline
        comments={[]}
        history={activity}
        loading={isLoading}
        collapsedItemCount={5}
        sortDirection='desc'
        emptyStateTitle={emptyMessage}
        renderHistoryItem={(historyItem, isLast) => (
          <CrmTaskHistoryItem historyItem={historyItem} isLast={isLast} />
        )}
      />
    </div>
  );
};

export default StocksActivityPanel;
