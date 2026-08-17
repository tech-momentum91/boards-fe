import React from 'react';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import ProjectThreeDGalleryCard from '@/components/projects/three-d/project-three-d-gallery-card';

export default function ProjectThreeDGalleryView({
  tasks = [],
  onOpenTaskPreview,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  enableScrollPagination = true,
  loadingMessage = 'Loading gallery…',
  emptyTitle = 'No files yet',
  emptyDescription = 'Adjust filters or upload files from the list view to see them here.',
}) {
  const { sentinelRef } = useScrollPagination({
    onLoadMore: onLoadMore || (() => {}),
    hasMore: hasMore && enableScrollPagination,
    isLoading: isLoadingMore || isLoading,
    threshold: 200,
    enabled: enableScrollPagination && Boolean(onLoadMore),
  });

  if (isLoading && tasks.length === 0) {
    return (
      <div className='flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
        {loadingMessage}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className='flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
        <p className='text-label-md text-text-strong-950'>{emptyTitle}</p>
        <p className='mt-1 text-paragraph-sm text-text-sub-500'>{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-5'>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {tasks.map((task) => (
          <ProjectThreeDGalleryCard
            key={task.taskId}
            task={task}
            onClick={() => onOpenTaskPreview?.(task)}
          />
        ))}
        {isLoadingMore
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`gallery-loading-more-${index}`}
                className='min-h-[220px] animate-pulse rounded-xl bg-bg-weak-50'
              />
            ))
          : null}
      </div>
      {enableScrollPagination && hasMore ? (
        <div ref={sentinelRef} data-scroll-sentinel className='h-1 w-full' aria-hidden />
      ) : null}
    </div>
  );
}
