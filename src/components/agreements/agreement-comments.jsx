import React, { useCallback } from 'react';
import CrmComment from '@/components/crm-tasks/crm-comment';
import { useCommentsInitialLoading } from '@/hooks/use-comments-initial-loading';

/**
 * Agreement comments — reuses the same UI as ACL tasks / HD Ticket (CrmComment).
 * onAddComment: (agreementId, content, attachments, isVisibleToClient, parentCommentId)
 */
const AgreementComments = ({
  agreementId,
  commentsData = {},
  onAddComment,
  onRefreshData,
  loading = false,
  fetchStatus = 'idle',
}) => {
  const stableLoading = useCommentsInitialLoading({
    enabled: Boolean(agreementId),
    entityId: agreementId,
    isLoading: loading,
    hasData: fetchStatus === 'succeeded' || fetchStatus === 'failed',
  });

  const handleCommentsMutated = useCallback(() => {
    if (!agreementId) return undefined;
    return onRefreshData?.(agreementId);
  }, [onRefreshData, agreementId]);

  return (
    <CrmComment
      taskId={agreementId}
      commentsData={commentsData}
      onAddComment={onAddComment}
      loading={stableLoading}
      addCommentVariant='ticket'
      showVisibleToClient={false}
      commentDoctype='Agreement Comment'
      onCommentsMutated={handleCommentsMutated}
    />
  );
};

export default AgreementComments;
