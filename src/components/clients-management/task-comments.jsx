import React, { useCallback } from 'react';
import CrmComment from '@/components/crm-tasks/crm-comment';
import {
  addTaskComment,
  clearTaskComments,
  fetchTaskComments,
  selectTaskComments,
} from '@/redux/clientDetailSlice';
import { useEntityComments } from '@/hooks/use-entity-comments';

const buildTaskFetchArg = (taskName) => ({ taskName });
const buildTaskAddArg = ({ id, content, attachments, visibleToClient, parentCommentId }) => ({
  taskName: id,
  content,
  attachments,
  isVisibleToClient: Boolean(visibleToClient),
  parentCommentId,
});

/**
 * Client task comments + activity (onboarding / exit / engagement drawers,
 * and project task/layout drawers). Same UI as booking / OPEX via CrmComment.
 */
const TaskComments = ({ taskName, onRefreshData, loading: controlledLoading }) => {
  const handleAfterAdd = useCallback(() => {
    onRefreshData?.();
  }, [onRefreshData]);

  const { resolvedId, commentsData, loading, addComment, refetchComments } = useEntityComments({
    entityId: taskName,
    selector: selectTaskComments,
    buildFetchArg: buildTaskFetchArg,
    fetchAction: fetchTaskComments,
    buildAddArg: buildTaskAddArg,
    addAction: addTaskComment,
    clearAction: clearTaskComments,
    onAfterAdd: handleAfterAdd,
    controlledLoading,
  });

  return (
    <CrmComment
      taskId={resolvedId}
      commentsData={commentsData}
      onAddComment={resolvedId ? addComment : undefined}
      loading={loading}
      addCommentVariant='ticket'
      showVisibleToClient={false}
      commentDoctype='Task Comment'
      onCommentsMutated={refetchComments}
    />
  );
};

export default TaskComments;
