import React from 'react';
import CrmComment from '@/components/crm-tasks/crm-comment';
import {
  addProjectLayoutComment,
  fetchProjectLayoutComments,
  selectProjectLayoutComments,
} from '@/redux/projectSlice';
import { useEntityComments } from '@/hooks/use-entity-comments';

const buildLayoutFetchArg = (layoutId) => ({ layoutId });
const buildLayoutAddArg = ({ id, content, attachments, parentCommentId }) => ({
  layoutId: id,
  content,
  attachments,
  parentCommentId,
});

export default function ProjectLayoutComments({ layoutId, activeLayoutId }) {
  const commentTargetId = activeLayoutId || layoutId;
  // Only the active (latest) layout version accepts new comments; older
  // versions are read-only.
  const canAddComments = Boolean(commentTargetId) && layoutId === commentTargetId;

  const { resolvedId, commentsData, loading, addComment, refetchComments } = useEntityComments({
    entityId: layoutId,
    selector: selectProjectLayoutComments,
    buildFetchArg: buildLayoutFetchArg,
    fetchAction: fetchProjectLayoutComments,
    buildAddArg: buildLayoutAddArg,
    addAction: addProjectLayoutComment,
  });

  return (
    <CrmComment
      taskId={resolvedId}
      commentsData={commentsData}
      onAddComment={canAddComments ? addComment : undefined}
      loading={loading}
      addCommentVariant='ticket'
      showVisibleToClient={false}
      commentDoctype='Project Comment'
      onCommentsMutated={refetchComments}
    />
  );
}
