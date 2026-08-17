import React, { useCallback, useEffect, useState } from 'react';
import CrmComment from '@/components/crm-tasks/crm-comment';
import {
  addIssueCommentWithFiles,
  getIssueCommentsMapped,
  deleteIssueCommentAttachment,
} from '@/api/support';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const SupportIssueComments = ({
  issueId,
  viewerEmail = '',
  disabled = false,
  onCommentsMutated,
}) => {
  const [commentsData, setCommentsData] = useState({ comments: [], history: [] });
  const [loading, setLoading] = useState(false);

  const refreshComments = useCallback(
    async ({ silent = false } = {}) => {
      if (!issueId) return;
      if (!silent) setLoading(true);
      try {
        const comments = await getIssueCommentsMapped(issueId);
        setCommentsData({ comments, history: [] });
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to load comments.' });
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [issueId],
  );

  useEffect(() => {
    refreshComments();
  }, [refreshComments]);

  const handleAddComment = useCallback(
    async (id, content, attachments = [], _visibleToClient, parentCommentId = null) => {
      if (!issueId) return;
      if (!content?.trim() && (!attachments || attachments.length === 0)) return;
      if (disabled) return;

      try {
        await addIssueCommentWithFiles({
          support_id: issueId,
          content,
          parent_comment: parentCommentId || null,
          files: attachments,
        });
        showSuccessToast('Comment added.');
        await refreshComments();
        onCommentsMutated?.();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to add comment.' });
        throw error;
      }
    },
    [issueId, disabled, refreshComments, onCommentsMutated],
  );

  const handleAttachmentRemove = useCallback(
    async (attachmentId) => {
      if (!attachmentId) return;
      try {
        await deleteIssueCommentAttachment(attachmentId);
        showSuccessToast('Attachment removed.');
        await refreshComments();
        onCommentsMutated?.();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to remove attachment.' });
      }
    },
    [onCommentsMutated, refreshComments],
  );

  return (
    <CrmComment
      taskId={issueId}
      commentsData={commentsData}
      onAddComment={handleAddComment}
      onAttachmentRemove={handleAttachmentRemove}
      loading={loading}
      commentInputDisabled={disabled}
      addCommentVariant='ticket'
      showVisibleToClient={false}
      commentDoctype='Support Comment'
      onCommentsMutated={() => {
        refreshComments({ silent: true });
        onCommentsMutated?.();
      }}
    />
  );
};

export default SupportIssueComments;
