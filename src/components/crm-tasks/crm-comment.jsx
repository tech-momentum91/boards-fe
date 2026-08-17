import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import CommentItem from '@/components/ui/comment-item';
import CrmTaskHistoryItem from './crm-task-history-item';
import CommentInput from '@/components/ui/comment-input';
import CommentsTimeline from '@/components/ui/comments-timeline';
import { useMentionSearch } from '@/hooks/use-mention-search';
import { editComment, fetchCommentReactions } from '@/api/comment';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import apiClient from '@/api/axios';
import { listDocumentSubscribers } from '@/services/document-subscribe-service';

const getCommentAuthorEmail = (comment) =>
  String(comment?.commented_by ?? comment?.owner ?? comment?.email ?? comment?.user?.email ?? '')
    .trim()
    .toLowerCase();

/**
 * Shared comments + activity timeline (ACL tasks, HD Ticket, etc.)
 *
 * @param {'acl'|'ticket'} [props.addCommentVariant='acl'] — ticket uses (id, content, att, visibleToClient, parentId); acl uses (id, content, att, parentId, visibleToClient)
 * @param {boolean} [props.showVisibleToClient] — CommentInput client visibility toggle; default false for acl, true for ticket
 * @param {boolean} [props.commentInputDisabled] — e.g. SLA breach guard on tickets
 */
const CrmComment = ({
  taskId,
  commentsData = {},
  onAddComment,
  loading = false,
  addCommentVariant = 'acl',
  showVisibleToClient: showVisibleToClientProp,
  commentInputDisabled = false,
  collapsedItemCount = 1,
  /** Comment doctype for the unified edit endpoint, e.g. 'HD Ticket Comment'.
   *  When omitted (and the comment row has no `comment_doctype`), editing is hidden. */
  commentDoctype,
  /** Called after a successful edit so the parent can refetch its activity feed. */
  onCommentsMutated,
  /** Called when user deletes an attachment from their own comment */
  onAttachmentRemove,
  /** Doc for document_subscribe refresh after comment (followers / mentions). */
  referenceDoctype,
  referenceName,
  /** Parent refreshes follower UI after listDocumentSubscribers. */
  onRefreshSubscribers,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [localReactions, setLocalReactions] = useState({});
  const {
    searchMentions,
    users: mentionUsers,
    hasMore,
    loadingMore,
    loadMore,
  } = useMentionSearch();
  const viewerEmail = useSelector((state) =>
    String(state.profile?.profileData?.email ?? '')
      .trim()
      .toLowerCase(),
  );
  const viewerFullName = useSelector((state) =>
    String(state.profile?.profileData?.full_name ?? state.profile?.profileData?.name ?? '').trim(),
  );

  const { comments = [], history = [] } = commentsData || {};

  const resolveCommentDoctype = useCallback(
    (comment) => comment?.comment_doctype ?? comment?.doctype ?? commentDoctype ?? null,
    [commentDoctype],
  );

  const reactionFetchKey = useMemo(() => {
    if (!comments?.length) return '';
    return comments
      .map((c) => {
        const id = c.name ?? c.id;
        const dt = resolveCommentDoctype(c);
        return id && dt ? `${dt}:${id}` : '';
      })
      .filter(Boolean)
      .join(',');
  }, [comments, resolveCommentDoctype]);

  // Fetch reactions when the comment set changes — local state only, no parent refetch.
  useEffect(() => {
    let cancelled = false;

    const fetchAllReactions = async () => {
      if (!reactionFetchKey || !comments?.length) return;

      const doctypeGroups = {};
      comments.forEach((c) => {
        const dt = resolveCommentDoctype(c);
        const id = c.name ?? c.id;
        if (dt && id) {
          if (!doctypeGroups[dt]) doctypeGroups[dt] = [];
          doctypeGroups[dt].push(id);
        }
      });

      for (const [dt, names] of Object.entries(doctypeGroups)) {
        if (names.length === 0) continue;
        try {
          const fetchedData = await fetchCommentReactions(dt, names);
          if (!cancelled && fetchedData && !Array.isArray(fetchedData)) {
            setLocalReactions((prev) => ({
              ...prev,
              ...fetchedData,
            }));
          }
        } catch (error) {
          console.warn(`Failed to fetch bulk reactions for ${dt}:`, error);
        }
      }
    };

    fetchAllReactions();

    return () => {
      cancelled = true;
    };
  }, [reactionFetchKey, comments, resolveCommentDoctype]);

  const canEditComment = useCallback(
    (comment) =>
      Boolean(viewerEmail) &&
      viewerEmail === getCommentAuthorEmail(comment) &&
      Boolean(resolveCommentDoctype(comment)),
    [viewerEmail, resolveCommentDoctype],
  );

  const canRemoveAttachment = useCallback(
    (comment) => Boolean(viewerEmail) && viewerEmail === getCommentAuthorEmail(comment),
    [viewerEmail],
  );

  const handleSaveEdit = useCallback(
    async ({ content, files }) => {
      if (!editTarget) return;
      const doctype = resolveCommentDoctype(editTarget);
      const commentId = editTarget.name ?? editTarget.id;
      if (!doctype || !commentId) return;

      setIsSavingEdit(true);
      try {
        await editComment({ commentDoctype: doctype, commentId, content, files });
        const refreshPromise = Promise.resolve(onCommentsMutated?.());
        showSuccessToast('Comment updated.');
        setEditTarget(null);
        await refreshPromise;
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update comment.' });
      } finally {
        setIsSavingEdit(false);
      }
    },
    [editTarget, resolveCommentDoctype, onCommentsMutated],
  );

  const handleToggleReaction = useCallback(
    async (comment, emoji) => {
      const doctype = resolveCommentDoctype(comment);
      const commentId = comment.name ?? comment.id;
      if (!doctype || !commentId || !viewerEmail) return;

      let previousReactions = [];
      let newReactions = [];

      setLocalReactions((prev) => {
        previousReactions = prev[commentId] ?? comment.reactions ?? [];
        newReactions = [...previousReactions];
        const existingReactionIndex = newReactions.findIndex(
          (r) => r.user === viewerEmail && r.emoji === emoji,
        );

        if (existingReactionIndex >= 0) {
          newReactions.splice(existingReactionIndex, 1);
        } else {
          newReactions.push({
            user: viewerEmail,
            full_name: viewerFullName || viewerEmail,
            emoji,
          });
        }

        return {
          ...prev,
          [commentId]: newReactions,
        };
      });

      try {
        await editComment({
          commentDoctype: doctype,
          commentId,
          content: comment.content,
          reactions: [{ user: viewerEmail, emoji }],
        });

        try {
          const fetchedData = await fetchCommentReactions(doctype, [commentId]);
          const freshReactions = Array.isArray(fetchedData)
            ? fetchedData
            : fetchedData?.[commentId] || newReactions;
          setLocalReactions((prev) => ({
            ...prev,
            [commentId]: freshReactions,
          }));
        } catch (error) {
          console.warn('Failed to fetch updated reactions:', error);
        }
      } catch (error) {
        setLocalReactions((prev) => ({
          ...prev,
          [commentId]: previousReactions,
        }));
        showErrorToast(error, { defaultMessage: 'Failed to update reaction.' });
      }
    },
    [resolveCommentDoctype, viewerEmail, viewerFullName],
  );

  const showVisibleToClient =
    showVisibleToClientProp !== undefined
      ? showVisibleToClientProp
      : addCommentVariant === 'ticket';

  const handleAddComment = async (
    content,
    attachments = [],
    visibleToClient = true,
    parentCommentId = null,
  ) => {
    if (!content?.trim() && (!attachments || attachments.length === 0)) return;
    if (commentInputDisabled) return;

    setIsSubmitting(true);
    try {
      const parentId = parentCommentId ?? replyTarget?.name ?? replyTarget?.id ?? null;
      if (addCommentVariant === 'ticket') {
        await onAddComment?.(taskId, content, attachments, visibleToClient, parentId);
      } else {
        await onAddComment?.(taskId, content, attachments, parentId, visibleToClient);
      }
      setReplyTarget(null);
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
      if (referenceDoctype && referenceName) {
        try {
          await listDocumentSubscribers(referenceDoctype, String(referenceName), { force: true });
        } catch {
          // keep existing followers on failure
        }
      }
      try {
        await Promise.resolve(onRefreshSubscribers?.());
      } catch {
        // ignore refresh errors
      }
    }
  };

  const handleImproveContent = useCallback(
    async (textToImprove, actionType = 'improve_grammar') => {
      if (!textToImprove.trim()) return textToImprove;

      const response = await apiClient.post('/method/devx_ai.summary.api.improve_text', {
        text: textToImprove,
        action_type: actionType,
      });

      const result = response.data?.message ?? response.data;

      if (typeof result === 'string' && result.trim()) {
        return result;
      }
      if (result?.success && result.data != null) {
        return typeof result.data === 'string' ? result.data : String(result.data);
      }
      if (result?.data != null && typeof result.data === 'string') {
        return result.data;
      }

      throw new Error(result?.error || result?.message || 'Failed to improve text');
    },
    [],
  );

  return (
    <div className='flex flex-col h-full'>
      <CommentsTimeline
        comments={comments}
        history={history}
        loading={loading}
        collapsedItemCount={collapsedItemCount}
        renderComment={(comment) => (
          <CommentItem
            comment={{
              ...comment,
              reactions: localReactions[comment.name ?? comment.id] || comment.reactions,
            }}
            onReply={(c) => setReplyTarget(c)}
            onEdit={canEditComment(comment) ? setEditTarget : undefined}
            isEditing={Boolean(
              editTarget &&
              ((editTarget.name && editTarget.name === comment.name) ||
                (editTarget.id && editTarget.id === comment.id)),
            )}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={() => setEditTarget(null)}
            isSavingEdit={isSavingEdit}
            enableMentions={!commentInputDisabled}
            onSearchMentions={searchMentions}
            onToggleReaction={(emoji) => handleToggleReaction(comment, emoji)}
            onAttachmentRemove={
              canRemoveAttachment(comment) && onAttachmentRemove
                ? (attachmentId) => onAttachmentRemove(attachmentId, comment)
                : undefined
            }
          />
        )}
        renderHistoryItem={(historyItem, isLast) => (
          <CrmTaskHistoryItem historyItem={historyItem} isLast={isLast} />
        )}
        emptyStateTitle='There are no comments here yet.'
      />

      <div className='pb-6 px-6 relative z-10 bg-white'>
        <div
          className='absolute -top-10 left-0 right-0 h-10 bg-linear-to-t from-white to-transparent pointer-events-none'
          aria-hidden
        />
        <div className='w-full h-1 bg-white' aria-hidden />
        <CommentInput
          onSubmit={handleAddComment}
          isSubmitting={isSubmitting}
          disabled={commentInputDisabled}
          placeholder='Add a comment...'
          replyTo={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
          enableMentions={!commentInputDisabled}
          onSearchMentions={searchMentions}
          mentionUsers={mentionUsers}
          hasMoreMentions={hasMore}
          loadingMoreMentions={loadingMore}
          onLoadMoreMentions={loadMore}
          showVisibleToClient={showVisibleToClient}
          onImprove={addCommentVariant === 'ticket' ? handleImproveContent : undefined}
        />
      </div>
    </div>
  );
};

export default CrmComment;
