import React, { useCallback } from 'react';
import CrmComment from '@/components/crm-tasks/crm-comment';

/**
 * HD Ticket comments tab — reuses the same UI as ACL task comments (account/contact/lead).
 * Props kept for backward compatibility with TicketViewDrawer.
 */
const TicketComments = ({
  ticketId,
  commentsData = {},
  onAddComment,
  onRefreshData,
  loading = false,
  slaBreachBlocked = false,
  slaBreachMessage: _unusedMessage,
}) => {
  const handleCommentsMutated = useCallback(() => {
    if (!ticketId) return undefined;
    return onRefreshData?.(ticketId);
  }, [onRefreshData, ticketId]);

  return (
    <CrmComment
      taskId={ticketId}
      commentsData={commentsData}
      onAddComment={onAddComment}
      loading={loading}
      addCommentVariant='ticket'
      commentInputDisabled={slaBreachBlocked}
      commentDoctype='HD Ticket Comment'
      onCommentsMutated={handleCommentsMutated}
    />
  );
};

export default TicketComments;
