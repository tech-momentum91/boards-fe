import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CrmComment from '@/components/crm-tasks/crm-comment';
import {
  fetchBookingComments,
  addBookingComment,
  selectBookingComments,
} from '@/redux/bookingSlice';
import { useCommentsInitialLoading } from '@/hooks/use-comments-initial-loading';

/**
 * Booking comments + activity — uses CrmComment (same UI as OPEX / billing / tickets).
 */
const BookingComments = ({ bookingId, onRefreshData, loading: controlledLoading }) => {
  const dispatch = useDispatch();
  const bookingComments = useSelector(selectBookingComments);

  const { data = {}, status } = bookingComments || {};
  const commentsData = useMemo(
    () => ({
      comments: data.comments ?? [],
      history: data.history ?? [],
    }),
    [data.comments, data.history],
  );

  const reduxLoading = status === 'loading';
  const initialOnlyLoading = useCommentsInitialLoading({
    enabled: controlledLoading === undefined,
    entityId: bookingId,
    isLoading: reduxLoading,
    hasData: status === 'succeeded' || status === 'failed',
  });
  const loading = controlledLoading === undefined ? initialOnlyLoading : controlledLoading;

  useEffect(() => {
    if (bookingId) {
      dispatch(fetchBookingComments({ bookingId }));
    }
  }, [bookingId, dispatch]);

  const handleAddComment = useCallback(
    async (id, content, attachments, visibleToClient, parentCommentId) => {
      await dispatch(
        addBookingComment({
          bookingId: id,
          content,
          attachments,
          isVisibleToClient: Boolean(visibleToClient),
          parentCommentId,
        }),
      ).unwrap();
      if (id) {
        await dispatch(fetchBookingComments({ bookingId: id })).unwrap();
      }
      onRefreshData?.();
    },
    [dispatch, onRefreshData],
  );

  const handleCommentsMutated = useCallback(() => {
    if (bookingId) {
      return dispatch(fetchBookingComments({ bookingId }));
    }
  }, [bookingId, dispatch]);

  return (
    <CrmComment
      taskId={bookingId}
      commentsData={commentsData}
      onAddComment={bookingId ? handleAddComment : undefined}
      loading={loading}
      addCommentVariant='ticket'
      showVisibleToClient={false}
      commentDoctype='Booking Comment'
      onCommentsMutated={handleCommentsMutated}
    />
  );
};

export default BookingComments;
