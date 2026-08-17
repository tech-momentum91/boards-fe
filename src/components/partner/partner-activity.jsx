import React, { useEffect, useState } from 'react';
import CommentItem from '@/components/ui/comment-item';
import HistoryItem from '@/components/ui/history-item';
import CommentInput from '@/components/ui/comment-input';
import CommentsTimeline from '@/components/ui/comments-timeline';
import { useMentionSearch } from '@/hooks/use-mention-search';

/**
 * Partner activity panel (comments + history timeline).
 * Mirrors `EventActivity` flow/styling but is partner-scoped.
 */
const PartnerActivity = ({
  partnerId,
  activityData = {},
  onAddComment,
  onRefreshData,
  loading = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const {
    searchMentions,
    users: mentionUsers,
    hasMore,
    loadingMore,
    loadMore,
  } = useMentionSearch();

  const { history = [] } = activityData || {};
  const [localComments, setLocalComments] = useState(activityData?.comments || []);

  // Keep local comments in sync when activityData changes from parent
  useEffect(() => {
    if (Array.isArray(activityData?.comments)) {
      setLocalComments(activityData.comments);
    }
  }, [activityData?.comments]);

  const handleAddComment = async (
    content,
    attachments = [],
    isVisibleToClient = false,
    parentCommentId = null,
  ) => {
    if (!content.trim() && attachments.length === 0) return;

    setIsSubmitting(true);
    try {
      // Optimistic local update so timeline works even without API wiring
      const newComment = {
        name: `local-${Date.now()}`,
        content,
        creation: new Date().toISOString(),
        attachments,
        commented_by: 'You',
      };
      setLocalComments((prev) => [...prev, newComment]);

      if (onAddComment) {
        await onAddComment(partnerId, content, attachments, isVisibleToClient, parentCommentId);
        onRefreshData?.();
      }

      setReplyTarget(null);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to add partner comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='flex flex-col h-full'>
      <CommentsTimeline
        comments={localComments}
        history={history}
        loading={loading}
        renderComment={(comment) => (
          <CommentItem comment={comment} onReply={(commentItem) => setReplyTarget(commentItem)} />
        )}
        renderHistoryItem={(historyItem, isLast) => (
          <HistoryItem historyItem={historyItem} isLast={isLast} />
        )}
        emptyStateTitle='There are no activities here yet.'
      />

      <div className='pb-6 px-6 relative z-10 bg-white'>
        <div className='absolute -top-10 left-0 right-0 h-10 bg-linear-to-t from-white to-transparent pointer-events-none' />
        <div className='w-full h-1 bg-white' />
        <CommentInput
          onSubmit={handleAddComment}
          isSubmitting={isSubmitting}
          placeholder='Add a comment...'
          replyTo={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
          enableMentions
          onSearchMentions={searchMentions}
          mentionUsers={mentionUsers}
          hasMoreMentions={hasMore}
          loadingMoreMentions={loadingMore}
          onLoadMoreMentions={loadMore}
          showVisibleToClient={false}
        />
      </div>
    </div>
  );
};

export default PartnerActivity;
