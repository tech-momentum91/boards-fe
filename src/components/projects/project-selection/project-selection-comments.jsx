import React, { useCallback } from 'react';
import CrmComment from '@/components/crm-tasks/crm-comment';
import { useCommentsInitialLoading } from '@/hooks/use-comments-initial-loading';

/**
 * Project Selection comments + activity — same CrmComment UI as Agreement / Layout / Tasks.
 * onAddComment: (selectionId, content, attachments, isVisibleToClient, parentCommentId)
 */
const ProjectSelectionComments = ({
  selectionId,
  commentsData = {},
  onAddComment,
  onRefreshData,
  loading = false,
  fetchStatus = 'idle',
}) => {
  const stableLoading = useCommentsInitialLoading({
    enabled: Boolean(selectionId),
    entityId: selectionId,
    isLoading: loading,
    hasData: fetchStatus === 'succeeded' || fetchStatus === 'failed',
  });

  const handleCommentsMutated = useCallback(() => {
    if (!selectionId) return undefined;
    return onRefreshData?.(selectionId);
  }, [onRefreshData, selectionId]);

  return (
    <CrmComment
      taskId={selectionId}
      commentsData={commentsData}
      onAddComment={onAddComment}
      loading={stableLoading}
      addCommentVariant='ticket'
      showVisibleToClient={false}
      commentDoctype='Project Comment'
      onCommentsMutated={handleCommentsMutated}
    />
  );
};

export default ProjectSelectionComments;
