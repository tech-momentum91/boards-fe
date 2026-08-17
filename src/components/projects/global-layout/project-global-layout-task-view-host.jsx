import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import ProjectGfcViewDrawer from '@/components/projects/gfc/project-gfc-view-drawer';
import {
  buildProjectGfcUpdateFormData,
  getProjectGfcRowFieldValue,
  mapProjectGfcDetailToRow,
  projectGfcFieldValuesEqual,
} from '@/components/projects/gfc/project-gfc-helpers';
import ProjectGraphicsViewDrawer from '@/components/projects/graphics/project-graphics-view-drawer';
import {
  buildProjectGraphicsUpdateFormData,
  getProjectGraphicsRowFieldValue,
  mapProjectGraphicsDetailToRow,
  projectGraphicsFieldValuesEqual,
} from '@/components/projects/graphics/project-graphics-helpers';
import {
  mapGlobalLayoutBundleTaskToListRow,
  resolveGlobalLayoutTaskViewKind,
} from '@/components/projects/global-layout/project-global-layout-helpers';
import ProjectSnagViewDrawer from '@/components/projects/snags/project-snag-view-drawer';
import {
  buildProjectSnagUpdateFormData,
  getProjectSnagRowFieldValue,
  mapProjectSnagDetailToRow,
  projectSnagFieldValuesEqual,
} from '@/components/projects/snags/project-snag-helpers';
import ProjectThreeDViewDrawer from '@/components/projects/three-d/project-three-d-view-drawer';
import {
  buildProjectThreeDUpdateFormData,
  getProjectThreeDRowFieldValue,
  mapProjectThreeDDetailToRow,
  projectThreeDFieldValuesEqual,
} from '@/components/projects/three-d/project-three-d-helpers';
import { createProjectTaskAttachmentUploadHandler } from '@/components/projects/shared/project-attachment-upload-utils';
import ProjectTaskViewDrawer from '@/components/projects/tasks/project-task-view-drawer';
import {
  buildProjectTaskUpdateFormData,
  getProjectTaskRowFieldValue,
  mapProjectTaskDetailToRow,
  mapProjectTaskListItemToRow,
  projectTaskFieldValuesEqual,
} from '@/components/projects/tasks/project-task-helpers';
import { THREE_D_UPLOAD_MODES } from '@/components/projects/three-d/project-three-d-attachment-helpers';
import { useProjectFloorVersionAcknowledge } from '@/hooks/use-project-floor-version-acknowledge';
import {
  clearProjectTaskDetail,
  fetchProjectTaskDetail,
  patchProjectTaskDetailField,
  selectProjectTaskDetail,
  selectProjectTaskDetailLoading,
  updateProjectTask,
} from '@/redux/projectSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

const VIEW_KIND_CONFIG = {
  task: {
    mapDetailToRow: mapProjectTaskDetailToRow,
    getRowFieldValue: getProjectTaskRowFieldValue,
    fieldValuesEqual: projectTaskFieldValuesEqual,
    buildUpdateFormData: buildProjectTaskUpdateFormData,
    successMessage: 'Task updated successfully',
  },
  gfc: {
    mapDetailToRow: mapProjectGfcDetailToRow,
    getRowFieldValue: getProjectGfcRowFieldValue,
    fieldValuesEqual: projectGfcFieldValuesEqual,
    buildUpdateFormData: buildProjectGfcUpdateFormData,
    successMessage: 'GFC updated successfully',
  },
  graphics: {
    mapDetailToRow: mapProjectGraphicsDetailToRow,
    getRowFieldValue: getProjectGraphicsRowFieldValue,
    fieldValuesEqual: projectGraphicsFieldValuesEqual,
    buildUpdateFormData: buildProjectGraphicsUpdateFormData,
    successMessage: 'Graphics updated successfully',
  },
  threeD: {
    mapDetailToRow: mapProjectThreeDDetailToRow,
    getRowFieldValue: getProjectThreeDRowFieldValue,
    fieldValuesEqual: projectThreeDFieldValuesEqual,
    buildUpdateFormData: buildProjectThreeDUpdateFormData,
    successMessage: '3D updated successfully',
  },
  snag: {
    mapDetailToRow: mapProjectSnagDetailToRow,
    getRowFieldValue: getProjectSnagRowFieldValue,
    fieldValuesEqual: projectSnagFieldValuesEqual,
    buildUpdateFormData: buildProjectSnagUpdateFormData,
    successMessage: 'Snag updated successfully',
  },
};

function mapBundleTaskToRow(task) {
  const normalized = mapGlobalLayoutBundleTaskToListRow(task);
  if (!normalized) return null;
  return mapProjectTaskListItemToRow(normalized, { groupId: 'global-layout' });
}

export default function ProjectGlobalLayoutTaskViewHost({
  task = null,
  projectId,
  projectFloors = [],
  onOpenChange,
  onUpdated,
}) {
  const dispatch = useDispatch();
  const detailData = useSelector(selectProjectTaskDetail);
  const isDetailLoading = useSelector(selectProjectTaskDetailLoading);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);

  const taskId = String(task?.task_id ?? task?.name ?? '').trim();
  const taskType = String(task?.type ?? task?.task_type ?? '').trim();
  const viewKind = resolveGlobalLayoutTaskViewKind(taskType);
  const viewConfig = VIEW_KIND_CONFIG[viewKind] ?? VIEW_KIND_CONFIG.task;
  const open = Boolean(taskId);

  const listRow = useMemo(() => mapBundleTaskToRow(task), [task]);

  const selectedRow = useMemo(() => {
    if (!taskId) return null;
    if (detailData?.name === taskId) {
      return viewConfig.mapDetailToRow(detailData, listRow);
    }
    return listRow;
  }, [detailData, listRow, taskId, viewConfig]);

  const { acknowledgeTaskFloorVersion, isAcknowledging: isAcknowledgingFloorVersion } =
    useProjectFloorVersionAcknowledge({
      onAfterAcknowledge: async (ackTaskId) => {
        if (ackTaskId === taskId) {
          await dispatch(fetchProjectTaskDetail(ackTaskId)).unwrap();
        }
        await onUpdated?.();
      },
    });

  useEffect(() => {
    if (!open || !taskId) return;

    dispatch(fetchProjectTaskDetail(taskId)).catch((error) => {
      showErrorToast(extractErrorMessage(error));
    });
  }, [dispatch, open, taskId]);

  const handleClose = useCallback(() => {
    onOpenChange?.(false);
    dispatch(clearProjectTaskDetail());
  }, [dispatch, onOpenChange]);

  const handleFieldUpdate = useCallback(
    async (rowId, fieldName, value) => {
      if (!rowId || !selectedRow) return;

      const originalValue = viewConfig.getRowFieldValue(selectedRow, fieldName);
      if (viewConfig.fieldValuesEqual(fieldName, originalValue, value)) return;

      try {
        await dispatch(
          updateProjectTask(viewConfig.buildUpdateFormData(rowId, fieldName, value)),
        ).unwrap();
        showSuccessToast(viewConfig.successMessage);

        if (fieldName === 'description') {
          dispatch(patchProjectTaskDetailField({ fieldName, value }));
        } else {
          await onUpdated?.();
          if (rowId === taskId) {
            await dispatch(fetchProjectTaskDetail(rowId)).unwrap();
          }
        }
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [dispatch, onUpdated, selectedRow, taskId, viewConfig],
  );

  const handleUploadAttachments = useCallback(
    createProjectTaskAttachmentUploadHandler({
      dispatch,
      supportsNewVersion: viewKind === 'gfc' || viewKind === 'graphics' || viewKind === 'threeD',
      setIsUploading: setIsUploadingAttachments,
      onAfterUpload: async ({ taskId: uploadTaskId, mode, result }) => {
        await onUpdated?.();
        const newTaskId = result?.task_id;
        if (newTaskId && mode === THREE_D_UPLOAD_MODES.NEW_VERSION && uploadTaskId === taskId) {
          await dispatch(fetchProjectTaskDetail(newTaskId)).unwrap();
        } else if (uploadTaskId === taskId) {
          await dispatch(fetchProjectTaskDetail(uploadTaskId)).unwrap();
        }
      },
    }),
    [dispatch, onUpdated, taskId, viewKind],
  );

  const drawerProps = {
    open,
    onOpenChange: (nextOpen) => {
      if (!nextOpen) handleClose();
    },
    isLoading: isDetailLoading,
    onFieldUpdate: handleFieldUpdate,
    onUploadAttachments: handleUploadAttachments,
    isUploadingAttachments,
    projectId,
    projectFloors,
  };

  if (viewKind === 'gfc') {
    return (
      <ProjectGfcViewDrawer
        {...drawerProps}
        gfc={selectedRow}
        onAcknowledgeFloorVersion={acknowledgeTaskFloorVersion}
        isAcknowledgingFloorVersion={isAcknowledgingFloorVersion}
      />
    );
  }

  if (viewKind === 'graphics') {
    return (
      <ProjectGraphicsViewDrawer
        {...drawerProps}
        graphics={selectedRow}
        onAcknowledgeFloorVersion={acknowledgeTaskFloorVersion}
        isAcknowledgingFloorVersion={isAcknowledgingFloorVersion}
      />
    );
  }

  if (viewKind === 'threeD') {
    return (
      <ProjectThreeDViewDrawer
        {...drawerProps}
        threeD={selectedRow}
        onAcknowledgeFloorVersion={acknowledgeTaskFloorVersion}
        isAcknowledgingFloorVersion={isAcknowledgingFloorVersion}
      />
    );
  }

  if (viewKind === 'snag') {
    return <ProjectSnagViewDrawer {...drawerProps} snag={selectedRow} categories={[]} />;
  }

  return <ProjectTaskViewDrawer {...drawerProps} task={selectedRow} />;
}
