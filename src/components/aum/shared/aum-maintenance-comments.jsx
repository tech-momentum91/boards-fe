import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { showErrorToast } from '@/utils/error-utils';

import {
  addMaintenanceLogComment,
  fetchMaintenanceLogActivities,
  selectMaintenanceActivities,
  selectMaintenanceActivitiesMutation,
} from '@/redux/aumMaintenanceSlice';
import CrmComment from '@/components/crm-tasks/crm-comment';

/**
 * Shared comments + activity timeline for preventive AML drawers.
 */
const AumMaintenanceComments = ({ amlId, loading: controlledLoading }) => {
  const dispatch = useDispatch();
  const commentsData = useSelector((state) => selectMaintenanceActivities(state, amlId));
  const { status: mutationStatus } = useSelector(selectMaintenanceActivitiesMutation);

  const loading = controlledLoading ?? commentsData.status === 'loading';

  useEffect(() => {
    if (!amlId) return undefined;
    dispatch(fetchMaintenanceLogActivities(amlId));
    return undefined;
  }, [amlId, dispatch]);

  const commentsPayload = useMemo(
    () => ({
      comments: commentsData.comments ?? [],
      history: commentsData.history ?? [],
    }),
    [commentsData.comments, commentsData.history],
  );

  const handleAddComment = useCallback(
    async (id, content, attachments, _visibleToClient, parentCommentId) => {
      try {
        await dispatch(
          addMaintenanceLogComment({
            amlId: id,
            payload: { content, attachments, parentCommentId },
          }),
        ).unwrap();
        await dispatch(fetchMaintenanceLogActivities(id));
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not add comment.' });
        throw error;
      }
    },
    [dispatch],
  );

  useEffect(() => {
    if (commentsData.status === 'failed') {
      showErrorToast('Could not load activity.');
    }
  }, [commentsData.status]);

  return (
    <CrmComment
      taskId={amlId}
      commentsData={commentsPayload}
      onAddComment={amlId ? handleAddComment : undefined}
      loading={loading || mutationStatus === 'loading'}
      addCommentVariant='ticket'
      showVisibleToClient={false}
    />
  );
};

export default AumMaintenanceComments;
