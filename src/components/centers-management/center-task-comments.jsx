import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CrmComment from '@/components/crm-tasks/crm-comment';
import { addCenterTaskComment, fetchCenterTaskComments } from '@/redux/centerSlice';

const CenterTaskComments = ({ taskName, onRefreshData, loading: controlledLoading }) => {
  const dispatch = useDispatch();
  const taskComments = useSelector((state) => state.center.taskComments);

  const { data = {}, isLoading: reduxLoading = false } = taskComments || {};
  const commentsData = useMemo(
    () => ({
      comments: data.comments ?? [],
      history: data.history ?? [],
    }),
    [data.comments, data.history],
  );

  const loading = controlledLoading === undefined ? reduxLoading : controlledLoading;

  useEffect(() => {
    if (taskName) {
      dispatch(fetchCenterTaskComments({ taskName }));
    }
  }, [taskName, dispatch]);

  const handleAddComment = useCallback(
    async (id, content, attachments, _visibleToClient, parentCommentId) => {
      await dispatch(
        addCenterTaskComment({ taskName: id, content, attachments, parentCommentId }),
      ).unwrap();
      if (id) {
        await dispatch(fetchCenterTaskComments({ taskName: id })).unwrap();
      }
      onRefreshData?.();
    },
    [dispatch, onRefreshData],
  );

  const handleCommentsMutated = useCallback(() => {
    if (taskName) {
      return dispatch(fetchCenterTaskComments({ taskName }));
    }
  }, [taskName, dispatch]);

  return (
    <CrmComment
      taskId={taskName}
      commentsData={commentsData}
      onAddComment={taskName ? handleAddComment : undefined}
      loading={loading}
      addCommentVariant='ticket'
      showVisibleToClient={false}
      commentDoctype='Task Comment'
      onCommentsMutated={handleCommentsMutated}
    />
  );
};

export default CenterTaskComments;
