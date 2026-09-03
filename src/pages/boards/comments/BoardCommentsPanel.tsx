import { useCallback, useEffect, useRef, useState } from 'react';
import CommentsTimeline from '@/components/ui/comments-timeline';
import { useMentionSearch } from '@/hooks/use-mention-search';
import { useTaskCommentsRealtime } from '@/hooks/use-task-comments-realtime';
import {
  addBoardTaskComment,
  getBoardTaskComments,
  toggleBoardTaskCommentReaction,
  uploadBoardCommentAttachment,
} from '@/services/tasks-service';
import { showErrorToast } from '@/utils/error-utils';
import BoardCommentComposer from './BoardCommentComposer';
import BoardCommentItem from './BoardCommentItem';

// Task comments are shared across everyone with access to the task, so a mounted
// thread has to pick up what other users write. Realtime handles that when the
// socket is up; this poll is the fallback for when it is not.
const COMMENTS_POLL_INTERVAL_MS = 15000;

export default function BoardCommentsPanel({
  taskId,
  onCommentAdded,
  sidebarTree = [],
  currentListId = null,
  readOnly = false,
  comments: externalComments = null,
  loading: externalLoading = null,
}) {
  const [commentsData, setCommentsData] = useState({ comments: [], history: [] });
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const { searchMentions } = useMentionSearch({
    listId: currentListId,
  });

  const isControlled = Array.isArray(externalComments);
  const comments = isControlled ? externalComments : commentsData.comments;
  const history = isControlled ? [] : commentsData.history;
  const isLoading = externalLoading ?? loading;

  const requestIdRef = useRef(0);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  const fetchComments = useCallback(
    async ({ background = false } = {}) => {
      if (isControlled || !taskId) {
        if (!isControlled) {
          setCommentsData({ comments: [], history: [] });
        }
        return null;
      }

      const requestId = ++requestIdRef.current;

      if (!background) {
        setLoading(true);
        setLoadError('');
      }

      const result = await getBoardTaskComments(taskId);

      // A newer fetch (or a switch to a different task) started while this was in
      // flight, so its result is no longer the truth for what is on screen.
      if (requestIdRef.current !== requestId) {
        return null;
      }

      if (!background) {
        setLoading(false);
      }

      if (result.error) {
        // A failed poll must not blank out comments that are already rendered;
        // only a foreground load owns the error state.
        if (!background) {
          setCommentsData({ comments: [], history: [] });
          setLoadError(result.error);
        }
        return null;
      }

      const nextData = result.data ?? { comments: [], history: [] };
      setLoadError('');
      setCommentsData(nextData);
      return nextData;
    },
    [isControlled, taskId],
  );

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleRealtimeChange = useCallback(() => {
    // A submit in flight already refetches the whole thread when it resolves,
    // so skipping here loses nothing and avoids racing that response.
    if (isSubmittingRef.current) {
      return;
    }

    fetchComments({ background: true });
  }, [fetchComments]);

  const { isRealtimeConnected } = useTaskCommentsRealtime(taskId, handleRealtimeChange, {
    enabled: !isControlled,
  });

  useEffect(() => {
    if (isControlled || !taskId || isRealtimeConnected) {
      return undefined;
    }

    const refreshInBackground = () => {
      // Skip while a submit is mid-flight so the poll cannot race the response.
      if (document.visibilityState !== 'visible' || isSubmittingRef.current) {
        return;
      }

      fetchComments({ background: true });
    };

    const intervalId = setInterval(refreshInBackground, COMMENTS_POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', refreshInBackground);
    window.addEventListener('focus', refreshInBackground);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshInBackground);
      window.removeEventListener('focus', refreshInBackground);
    };
  }, [fetchComments, isControlled, isRealtimeConnected, taskId]);

  const handleAddComment = useCallback(
    async (content, pendingFiles = []) => {
      if (!taskId || readOnly) {
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await addBoardTaskComment({ taskId, message: content });
        if (result.error) {
          throw new Error(result.error);
        }

        const commentId = result.data?.name ?? result.data?.id;

        if (commentId && pendingFiles.length > 0) {
          await Promise.all(
            pendingFiles.map((file) =>
              uploadBoardCommentAttachment(commentId, file).then((r) => {
                if (r.error) {
                  showErrorToast(`Failed to attach '${file.name}': ${r.error}`);
                }
              }),
            ),
          );
        }

        // Refresh only this thread — never reload the whole task drawer.
        const nextData = await fetchComments({ background: true });
        onCommentAdded?.({
          commentCount: Array.isArray(nextData?.comments) ? nextData.comments.length : undefined,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchComments, onCommentAdded, readOnly, taskId],
  );

  const handleToggleReaction = useCallback(
    async (comment, emoji) => {
      if (!comment?.name || !emoji || readOnly) {
        return;
      }

      const result = await toggleBoardTaskCommentReaction({
        commentId: comment.name,
        emoji,
      });

      if (result.error) {
        showErrorToast(result.error);
        return;
      }

      setCommentsData((previous) => ({
        ...previous,
        comments: (previous.comments ?? []).map((item) =>
          item.name === comment.name
            ? { ...item, reactions: result.data?.reactions ?? item.reactions }
            : item,
        ),
      }));
    },
    [readOnly],
  );

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden'>
      {loadError && !isControlled ? (
        <div className='shrink-0 px-6 py-3 text-paragraph-sm text-error-base'>{loadError}</div>
      ) : null}

      <CommentsTimeline
        comments={comments}
        history={history}
        loading={isLoading}
        collapsedItemCount={1}
        renderComment={(comment) => (
          <BoardCommentItem
            comment={comment}
            sidebarTree={sidebarTree}
            onToggleReaction={readOnly || isControlled ? undefined : handleToggleReaction}
            reactionsReadOnly={readOnly || isControlled || !taskId}
            currentUser={null}
          />
        )}
        emptyStateTitle='There are no comments here yet.'
      />

      {readOnly ? null : (
        <div className='relative z-10 shrink-0 bg-white px-6 pb-6'>
          <div
            className='pointer-events-none absolute -top-10 left-0 right-0 h-10 bg-linear-to-t from-white to-transparent'
            aria-hidden
          />
          <div className='h-1 w-full bg-white' aria-hidden />
          <BoardCommentComposer
            onSubmit={handleAddComment}
            isSubmitting={isSubmitting}
            disabled={!taskId || isSubmitting}
            placeholder='Add a comment...'
            onSearchMentions={searchMentions}
            sidebarTree={sidebarTree}
            currentListId={currentListId}
          />
        </div>
      )}
    </div>
  );
}
