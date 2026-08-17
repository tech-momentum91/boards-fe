import React, { useState } from 'react';
import CommentItem from '@/components/ui/comment-item';
import CrmTaskHistoryItem from '@/components/crm-tasks/crm-task-history-item';
import CommentInput from '@/components/ui/comment-input';
import CommentsTimeline from '@/components/ui/comments-timeline';
import { useMentionSearch } from '@/hooks/use-mention-search';

const CrmComment = ({ taskId, commentsData = {}, onAddComment, loading = false }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const {
    searchMentions,
    users: mentionUsers,
    hasMore,
    loadingMore,
    loadMore,
  } = useMentionSearch();

  const { comments = [], history = [] } = commentsData || {};

  const handleAddComment = async (content, attachments = []) => {
    if (!content.trim() && attachments.length === 0) return;

    setIsSubmitting(true);
    try {
      // Do not include isVisibleToClient here based on instructions
      await onAddComment?.(taskId, content, attachments, replyTarget?.id || null);
      setReplyTarget(null);
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='flex flex-col h-full min-h-0'>
      <CommentsTimeline
        comments={comments}
        history={history}
        loading={loading}
        collapsedItemCount={1}
        renderComment={(comment) => (
          <CommentItem comment={comment} onReply={(comment) => setReplyTarget(comment)} />
        )}
        renderHistoryItem={(historyItem, isLast) => (
          <CrmTaskHistoryItem historyItem={historyItem} isLast={isLast} />
        )}
        emptyStateTitle='There are no comments here yet.'
      />

      {/* Comment input — match ticket-comments.jsx: same padding and fade overlay */}
      <div className='pb-6 px-6 relative z-10 bg-white shrink-0'>
        <div
          className='absolute -top-10 left-0 right-0 h-10 bg-linear-to-t from-white to-transparent pointer-events-none'
          aria-hidden
        />
        <div className='w-full h-1 bg-white' aria-hidden />
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

export default CrmComment;
