import React, { useMemo, useCallback } from 'react';
import CrmComment from '@/components/crm-tasks/crm-comment';
import { useCommentsInitialLoading } from '@/hooks/use-comments-initial-loading';

function visitorActivityToHistoryRow(item, label) {
  if (!item || typeof item !== 'object') return null;
  if (item.action != null || item.field != null) {
    return item;
  }
  const creation =
    item.creation || item.created_at || item.timestamp || item.modified || item.date || null;
  const user = item.user || item.modified_by || item.sender || item.owner;
  const owner = item.owner || user;
  const detail =
    item.subject ||
    item.title ||
    item.description ||
    item.content ||
    item.message ||
    item.communication_type ||
    '';
  const action =
    item.action || (detail ? `${label}: ${String(detail).slice(0, 240)}` : `${label} activity`);
  return {
    ...item,
    action,
    field: item.field ?? '',
    creation,
    user,
    owner,
  };
}

/**
 * Merge document history with communications / views / calls so the timeline matches
 * ACL task comments (CrmComment + CrmTaskHistoryItem) with a full activity feed.
 */
function mergeVisitorActivityHistory({
  history = [],
  communications = [],
  views = [],
  calls = [],
}) {
  const rows = [];

  const appendDocHistory = (items) => {
    for (const h of items || []) {
      if (h && typeof h === 'object') rows.push(h);
    }
  };

  appendDocHistory(history);

  for (const c of communications || []) {
    const row = visitorActivityToHistoryRow(c, 'Email');
    if (row) rows.push(row);
  }
  for (const v of views || []) {
    const row = visitorActivityToHistoryRow(v, 'View');
    if (row) rows.push(row);
  }
  for (const c of calls || []) {
    const row = visitorActivityToHistoryRow(c, 'Call');
    if (row) rows.push(row);
  }

  return rows;
}

/**
 * Visitor entry comments + activity — same UI as CRM ACL tasks (CrmComment).
 * onAddComment: (visitorEntryId, content, attachments, parentCommentId, visibleToClient)
 */
const VmsComments = ({
  visitorEntryId,
  commentsData = {},
  onAddComment,
  onRefreshData,
  loading = false,
  fetchStatus = 'idle',
}) => {
  const {
    comments = [],
    history = [],
    communications = [],
    views = [],
    calls = [],
  } = commentsData || {};

  const merged = useMemo(
    () => ({
      comments,
      history: mergeVisitorActivityHistory({ history, communications, views, calls }),
    }),
    [comments, history, communications, views, calls],
  );

  const stableLoading = useCommentsInitialLoading({
    enabled: Boolean(visitorEntryId),
    entityId: visitorEntryId,
    isLoading: loading,
    hasData: fetchStatus === 'succeeded' || fetchStatus === 'failed',
  });

  const handleCommentsMutated = useCallback(() => {
    if (!visitorEntryId) return undefined;
    return onRefreshData?.(visitorEntryId);
  }, [onRefreshData, visitorEntryId]);

  return (
    <CrmComment
      taskId={visitorEntryId}
      commentsData={merged}
      onAddComment={onAddComment}
      loading={stableLoading}
      addCommentVariant='acl'
      showVisibleToClient={false}
      collapsedItemCount={1}
      commentDoctype='Visitor Comment'
      onCommentsMutated={handleCommentsMutated}
    />
  );
};

export default VmsComments;
