import React, { useCallback } from 'react';
import CrmComment from '@/components/crm-tasks/crm-comment';
import { useCommentsInitialLoading } from '@/hooks/use-comments-initial-loading';

const FacilityTaskComments = ({
  taskRef,
  commentsData = {},
  onAddComment,
  onRefreshData,
  loading = false,
  fetchStatus = 'idle',
}) => {
  const stableLoading = useCommentsInitialLoading({
    enabled: Boolean(taskRef),
    entityId: taskRef,
    isLoading: loading,
    hasData: fetchStatus === 'succeeded' || fetchStatus === 'failed',
  });

  const handleCommentsMutated = useCallback(() => {
    if (!taskRef) return undefined;
    return onRefreshData?.(taskRef);
  }, [onRefreshData, taskRef]);

  return (
    <CrmComment
      taskId={taskRef}
      commentsData={commentsData}
      onAddComment={onAddComment}
      loading={stableLoading}
      addCommentVariant='ticket'
      showVisibleToClient={false}
      commentDoctype='Facility Task Comment'
      onCommentsMutated={handleCommentsMutated}
    />
  );
};

export default FacilityTaskComments;
