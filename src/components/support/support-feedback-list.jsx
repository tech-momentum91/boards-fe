import React, { useEffect, useRef } from 'react';

import SupportFeedbackCard from '@/components/support/support-feedback-card';

const SupportFeedbackList = ({
  items,
  onOpen,
  onToggleUpvote,
  onStatusChange,
  statusOptions,
  updatingStatusId,
  onLoadMore,
  hasMore,
  isLoadingMore,
  canChangeStatus = false,
}) => {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          onLoadMore?.();
        }
      },
      { rootMargin: '200px 0px 200px 0px' },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {items.map((item) => (
          <SupportFeedbackCard
            key={item.id}
            item={item}
            onOpen={onOpen}
            onToggleUpvote={onToggleUpvote}
            onStatusChange={onStatusChange}
            statusOptions={statusOptions}
            isStatusUpdating={updatingStatusId === item.id}
            canChangeStatus={canChangeStatus}
          />
        ))}
      </div>

      <div ref={sentinelRef} className='h-2 w-full' />

      {isLoadingMore ? (
        <p className='text-center text-paragraph-sm text-text-sub-600'>Loading more reports...</p>
      ) : null}
    </div>
  );
};

export default SupportFeedbackList;
