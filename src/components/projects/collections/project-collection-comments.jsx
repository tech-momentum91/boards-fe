import React, { useCallback } from 'react';
import CrmComment from '@/components/crm-tasks/crm-comment';
import {
  addProjectCollectionComment,
  clearProjectCollectionComments,
  fetchProjectCollectionComments,
  selectProjectCollectionComments,
} from '@/redux/projectSlice';
import { useEntityComments } from '@/hooks/use-entity-comments';

const buildCollectionFetchArg = (collectionBoqId) => ({ collectionBoqId });
const buildCollectionAddArg = ({ id, content, attachments, parentCommentId }) => ({
  collectionBoqId: id,
  content,
  attachments,
  parentCommentId,
});

export default function ProjectCollectionComments({ collectionBoqId }) {
  const { resolvedId, commentsData, loading, addComment, refetchComments } = useEntityComments({
    entityId: collectionBoqId,
    selector: selectProjectCollectionComments,
    buildFetchArg: buildCollectionFetchArg,
    fetchAction: fetchProjectCollectionComments,
    buildAddArg: buildCollectionAddArg,
    addAction: addProjectCollectionComment,
    clearAction: clearProjectCollectionComments,
  });

  const handleCommentsMutated = useCallback(() => {
    refetchComments?.();
  }, [refetchComments]);

  return (
    <CrmComment
      taskId={resolvedId}
      commentsData={commentsData}
      onAddComment={resolvedId ? addComment : undefined}
      loading={loading}
      addCommentVariant='ticket'
      showVisibleToClient={false}
      commentDoctype='Project Comment'
      onCommentsMutated={handleCommentsMutated}
    />
  );
}
