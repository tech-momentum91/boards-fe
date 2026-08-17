import React from 'react';

import CrmTaskHistoryItem from '@/components/crm-tasks/crm-task-history-item';
import CommentsTimeline from '@/components/ui/comments-timeline';
import * as Button from '@/components/ui/button';

export default function AumActivityPanel({
  history = [],
  isLoading = false,
  error = null,
  onRetry,
  emptyStateTitle = 'No activity recorded yet.',
}) {
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
    <CommentsTimeline
      comments={[]}
      history={history}
      loading={isLoading}
      collapsedItemCount={3}
      emptyStateTitle={emptyStateTitle}
      renderHistoryItem={(historyItem, isLast) => (
        <CrmTaskHistoryItem historyItem={historyItem} isLast={isLast} />
      )}
    />
  );
}
