import React, { useCallback } from 'react';
import CrmComment from '@/components/crm-tasks/crm-comment';

/**
 * OPEX comments — same UI as ACL tasks / HD Ticket / Agreement (CrmComment).
 * onAddComment: (opexId, content, attachments, isVisibleToClient, parentCommentId)
 */
const OpexComments = ({
  opexId,
  commentsData = {},
  onAddComment,
  onRefreshData,
  loading = false,
}) => {
  const handleCommentsMutated = useCallback(() => {
    if (!opexId) return undefined;
    return onRefreshData?.(opexId);
  }, [onRefreshData, opexId]);

  return (
    <CrmComment
      taskId={opexId}
      commentsData={commentsData}
      onAddComment={onAddComment}
      loading={loading}
      addCommentVariant='ticket'
      showVisibleToClient={false}
      commentDoctype='OPEX Comment'
      onCommentsMutated={handleCommentsMutated}
    />
  );
};

export default OpexComments;
