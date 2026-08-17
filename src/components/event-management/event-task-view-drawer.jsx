import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import TaskViewDrawerCommon from '@/components/client-onboarding/task-view-drawer-common';
import TaskComments from '@/components/clients-management/task-comments';
import { fetchTaskComments } from '@/redux/clientDetailSlice';
import { getParticularTaskDetail, updateClientOnboardingTask } from '@/redux/settingSlice';
import {
  clearSelectedEventTask,
  getEventTaskDetailedViewThunk,
  getEventTaskMasterListThunk,
  setSelectedEventTask,
  uploadEventTaskAttachmentThunk,
  selectEventTasks,
  selectEventTasksListKind,
  selectSelectedEventTask,
  updateEventTaskThunk,
} from '@/redux/eventsSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { normalizeAssignees } from '@/utils/task-utils';
import { collectCenterIdsFromTask } from '@/components/client-onboarding/task-view-drawer-utils';
import { filterUsersByCenters } from '@/components/event-management/event-task-assignee-utils';
import { syncEventTaskAssignees } from '@/components/event-management/event-task-assignee-sync';

const getTaskSubject = (task) =>
  task?.subject || task?.task_name || task?.task || task?.title || task?.name || '';

const EventTaskViewDrawer = ({
  open,
  onOpenChange,
  eventName,
  assigneeSelectItems,
  assigneeSelectLoading = false,
  eventCenterOptions = [],
  eventCenters = [],
}) => {
  const dispatch = useDispatch();
  const selectedTask = useSelector(selectSelectedEventTask);
  const listKind = useSelector(selectEventTasksListKind);
  const eventTasksState = useSelector(selectEventTasks);
  const tasks = useMemo(() => eventTasksState?.results || [], [eventTasksState?.results]);

  const subject = useMemo(() => getTaskSubject(selectedTask), [selectedTask]);

  const taskIdOrSubject = useMemo(
    () => selectedTask?.name || selectedTask?.task_id || selectedTask?.id || subject || '',
    [selectedTask, subject],
  );

  useEffect(() => {
    if (!open) return;
    if (!taskIdOrSubject) return;

    if (listKind === 'task_master') {
      const tm_id =
        selectedTask?.name || selectedTask?.task_id || selectedTask?.id || taskIdOrSubject;
      const subj = getTaskSubject(selectedTask) || String(taskIdOrSubject);
      dispatch(
        getParticularTaskDetail({
          tm_id,
          subject: subj,
          type: 'Event Tasks',
        }),
      )
        .unwrap()
        .then((res) => {
          const taskData = res?.message?.data ?? res?.data ?? res?.message;
          if (taskData && typeof taskData === 'object' && !Array.isArray(taskData)) {
            dispatch(setSelectedEventTask(taskData));
          }
        })
        .catch(() => {});
      return;
    }

    dispatch(
      getEventTaskDetailedViewThunk({ task_id: taskIdOrSubject, task_type: 'Event Tasks' }),
    ).catch(() => {});
  }, [dispatch, open, listKind, taskIdOrSubject, subject]);

  /** Match client onboarding / engagement drawers: close clears selection only; list is not refetched (updates already patch Redux). */
  const handleClose = useCallback(() => {
    onOpenChange?.(false);
    dispatch(clearSelectedEventTask());
  }, [dispatch, onOpenChange]);

  const handleTaskChange = useCallback(
    async (taskIdOrSubjectArg) => {
      const taskFromList = tasks.find(
        (t) => (t?.name || t?.id || t?.subject || t?.task || t?.task_name) === taskIdOrSubjectArg,
      );
      const nextSubject = getTaskSubject(taskFromList) || String(taskIdOrSubjectArg || '').trim();
      if (!nextSubject) return;
      try {
        const task_id =
          taskFromList?.name || taskFromList?.task_id || taskFromList?.id || nextSubject;

        if (listKind === 'task_master') {
          const res = await dispatch(
            getParticularTaskDetail({
              tm_id: task_id,
              subject: nextSubject,
              type: 'Event Tasks',
            }),
          ).unwrap();
          const taskData = res?.message?.data ?? res?.data ?? res?.message;
          if (taskData && typeof taskData === 'object' && !Array.isArray(taskData)) {
            dispatch(setSelectedEventTask(taskData));
          }
        } else {
          await dispatch(
            getEventTaskDetailedViewThunk({ task_id, task_type: 'Event Tasks' }),
          ).unwrap();
        }
      } catch (error) {
        showErrorToast(extractErrorMessage(error) || 'Failed to load task');
      }
    },
    [dispatch, tasks, listKind],
  );

  /** Settings-style task master: `update_task_master` via FormData (same as client onboarding). */
  const handleTaskMasterFieldUpdate = useCallback(
    async (taskId, fieldNameOrChanges, value) => {
      let existingTask = selectedTask;
      if (!existingTask && taskId) {
        existingTask = tasks.find(
          (t) => t.name === taskId || t.task_id === taskId || t.id === taskId,
        );
      }

      if (!existingTask) {
        showErrorToast('Task data not available. Please refresh and try again.');
        return;
      }

      try {
        const taskIdValue = existingTask.name || existingTask.task_id || taskId;
        let taskSubject = existingTask.subject || existingTask.task_name || taskId;

        const isBatchUpdate =
          typeof fieldNameOrChanges === 'object' &&
          fieldNameOrChanges !== null &&
          !Array.isArray(fieldNameOrChanges);

        const updateData = { ...existingTask };
        let newAttachments = null;

        let allChanges = null;
        if (isBatchUpdate) {
          allChanges = fieldNameOrChanges;
          Object.entries(allChanges).forEach(([key, value_]) => {
            if (key === 'newAttachments') {
              newAttachments = value_;
            } else if (key !== 'tags') {
              if (key === 'task_name') {
                updateData.subject = value_;
                taskSubject = value_ || taskSubject;
              } else if (key === 'assigned_to') {
                updateData.assignees = value_;
              } else {
                updateData[key] = value_;
              }
            }
          });
        } else {
          const fieldName = fieldNameOrChanges;
          if (fieldName === 'task_name') {
            updateData.subject = value;
            taskSubject = value || taskSubject;
          } else if (fieldName === 'assigned_to') {
            updateData.assignees = value;
          } else {
            updateData[fieldName] = value;
          }
        }

        const apiFormData = new FormData();

        apiFormData.append('task_id', taskIdValue);
        apiFormData.append('subject', updateData.subject || taskSubject);
        apiFormData.append('description', updateData.description || '');
        apiFormData.append('status', updateData.status || '');
        apiFormData.append('priority', updateData.priority || '');
        apiFormData.append('type', updateData.type || 'Event Tasks');
        apiFormData.append('duration', updateData.duration || '');
        if (updateData.next_update != null && String(updateData.next_update).trim() !== '') {
          apiFormData.append('next_update', String(updateData.next_update).trim());
        }

        if (updateData.due_date !== undefined) {
          apiFormData.append('due_date', updateData.due_date || '');
        }

        const centersChanged = isBatchUpdate
          ? allChanges && Object.prototype.hasOwnProperty.call(allChanges, 'centers')
          : fieldNameOrChanges === 'centers';
        if (centersChanged) {
          const centersValue = isBatchUpdate ? allChanges?.centers : value;
          const centerIds = Array.isArray(centersValue)
            ? centersValue.map((c) => String(c).trim()).filter(Boolean)
            : centersValue
              ? [String(centersValue).trim()].filter(Boolean)
              : [];
          if (centerIds.length > 0) {
            apiFormData.append('centers', JSON.stringify(centerIds));
          }
        }

        if (updateData.assignees || updateData.assigned_to) {
          const assignees = updateData.assignees || updateData.assigned_to;
          const normalizedAssignees = normalizeAssignees(assignees);
          if (normalizedAssignees.length > 0) {
            apiFormData.append('assignees', JSON.stringify(normalizedAssignees));
          }
        }

        const tagsChanged = isBatchUpdate
          ? allChanges && Object.prototype.hasOwnProperty.call(allChanges, 'tags')
          : fieldNameOrChanges === 'tags';
        if (tagsChanged) {
          const toStringTag = (tag) =>
            typeof tag === 'string' ? tag : tag?.name || tag?.label || tag;
          const tagsValue = isBatchUpdate ? allChanges?.tags : value;
          const tagsArray = Array.isArray(tagsValue)
            ? tagsValue.map(toStringTag).filter(Boolean)
            : tagsValue
              ? [toStringTag(tagsValue)].filter(Boolean)
              : [];
          apiFormData.append('tags', JSON.stringify(tagsArray));
        }

        const existingAttachments =
          existingTask.attachments ||
          existingTask._attachments ||
          existingTask.attachments_info ||
          [];

        if (newAttachments && Array.isArray(newAttachments) && newAttachments.length > 0) {
          if (Array.isArray(existingAttachments) && existingAttachments.length > 0) {
            existingAttachments.forEach((attachment) => {
              const fileName =
                attachment?.file_name ||
                attachment?.filename ||
                attachment?.file ||
                attachment?.name ||
                attachment?.file_url ||
                '';
              if (fileName) {
                apiFormData.append('existing_attachment_names', fileName);
              }
            });
          }

          newAttachments.forEach((attachment) => {
            if (attachment.file) {
              apiFormData.append('attachment', attachment.file);
            }
          });
        }

        const result = await dispatch(updateClientOnboardingTask(apiFormData)).unwrap();

        if (eventName) {
          dispatch(getEventTaskMasterListThunk({ event: eventName })).catch(() => {});
        }

        const response = await dispatch(
          getParticularTaskDetail({
            tm_id: taskIdValue,
            subject: taskSubject,
            type: 'Event Tasks',
          }),
        ).unwrap();

        const taskData = response?.message?.data ?? response?.data ?? response?.message;
        if (taskData && typeof taskData === 'object' && !Array.isArray(taskData)) {
          dispatch(setSelectedEventTask(taskData));
        }

        if (result?.message) {
          showSuccessToast(
            result?.message?.message || result?.message || 'Task updated successfully',
          );
        } else {
          showSuccessToast('Task updated successfully');
        }
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage || 'Failed to update task. Please try again.');
      }
    },
    [dispatch, eventName, selectedTask, tasks],
  );

  const handleFieldUpdate = useCallback(
    async (taskId, changesOrField, value) => {
      if (listKind === 'task_master') {
        return handleTaskMasterFieldUpdate(taskId, changesOrField, value);
      }

      const taskIdValue = selectedTask?.name || selectedTask?.task_id || selectedTask?.id || taskId;
      if (!taskIdValue) return;

      const payload = { task_id: taskIdValue };
      const isBatch =
        typeof changesOrField === 'object' &&
        changesOrField !== null &&
        !Array.isArray(changesOrField);

      if (isBatch) {
        const changes = changesOrField;
        Object.entries(changes).forEach(([k, v]) => {
          if (k === 'task_name') {
            payload.subject = v ?? '';
            return;
          }
          if (k === 'assigned_to') {
            payload.assignees = v;
            return;
          }
          if (k === 'due_date') {
            payload.exp_end_date = v ?? '';
            return;
          }
          if (k === 'custom_center' || k === 'event_center' || k === 'centers') {
            const centerId = Array.isArray(v) ? String(v[0] ?? '').trim() : String(v ?? '').trim();
            if (centerId) {
              payload.custom_center = centerId;
              payload.centers = [centerId];
            } else {
              payload.custom_center = '';
              payload.centers = [];
            }
            return;
          }
          if (k === 'newAttachments') return;
          payload[k] = v ?? '';
        });
      } else {
        const field = String(changesOrField);
        if (field === 'task_name') payload.subject = value ?? '';
        else if (field === 'assigned_to') payload.assignees = value;
        else if (field === 'due_date') payload.exp_end_date = value ?? '';
        else if (field === 'exp_end_date') payload.exp_end_date = value ?? '';
        else if (field === 'custom_center' || field === 'event_center' || field === 'centers') {
          const centerId = Array.isArray(value)
            ? String(value[0] ?? '').trim()
            : String(value ?? '').trim();
          if (centerId) {
            payload.custom_center = centerId;
            payload.centers = [centerId];
          } else {
            payload.custom_center = '';
            payload.centers = [];
          }
        } else payload[field] = value ?? '';
      }

      if (Object.prototype.hasOwnProperty.call(payload, 'assignees')) {
        const assigneeResult = await syncEventTaskAssignees({
          dispatch,
          taskId: taskIdValue,
          nextAssignees: payload.assignees,
          currentAssignees: selectedTask?.assignees ?? selectedTask?.assigned_to ?? [],
          users: assigneeSelectItems,
        });
        delete payload.assignees;
        if (!assigneeResult.ok) {
          showErrorToast(extractErrorMessage(assigneeResult.error) || 'Failed to update task');
        }
      }

      try {
        const hasOtherUpdates = Object.keys(payload).some((k) => k !== 'task_id');
        if (hasOtherUpdates) {
          await dispatch(updateEventTaskThunk(payload)).unwrap();
        }

        await dispatch(
          getEventTaskDetailedViewThunk({ task_id: taskIdValue, task_type: 'Event Tasks' }),
        ).unwrap();

        // Refresh Activities/Comments so latest changes show in the right panel.
        // (TaskComments reads from clientDetailSlice via get_task_activities_filtered)
        await dispatch(fetchTaskComments({ taskName: taskIdValue })).unwrap();
      } catch (error) {
        showErrorToast(extractErrorMessage(error) || 'Failed to update task');
      }
    },
    [dispatch, selectedTask, listKind, handleTaskMasterFieldUpdate, assigneeSelectItems],
  );

  const isTaskMaster = listKind === 'task_master';

  const taskCenterIds = useMemo(() => {
    const rawIds = collectCenterIdsFromTask(selectedTask);
    if (rawIds.length === 0) return [];
    const ids = new Set(rawIds.map(String));
    (Array.isArray(eventCenterOptions) ? eventCenterOptions : []).forEach((option) => {
      const id = String(option?.value ?? option?.name ?? option?.id ?? '').trim();
      const label = String(option?.label ?? option?.center_name ?? '').trim();
      if (!id) return;
      for (const key of rawIds) {
        const k = String(key).trim();
        if (id === k || (label && label.toLowerCase() === k.toLowerCase())) {
          ids.add(id);
          break;
        }
      }
    });
    return [...ids];
  }, [selectedTask, eventCenterOptions]);

  const scopedAssigneeSelectItems = useMemo(() => {
    if (taskCenterIds.length === 0) return assigneeSelectItems;
    return filterUsersByCenters(assigneeSelectItems, taskCenterIds);
  }, [assigneeSelectItems, taskCenterIds]);

  if (!open) return null;

  return (
    <TaskViewDrawerCommon
      isOpen={Boolean(open)}
      onClose={handleClose}
      task={selectedTask}
      onFieldUpdate={handleFieldUpdate}
      uploadTaskAttachmentThunk={isTaskMaster ? undefined : uploadEventTaskAttachmentThunk}
      onRefresh={async (info) => {
        const task_id =
          info?.task_id || selectedTask?.name || selectedTask?.task_id || selectedTask?.id;
        if (!task_id) return;
        if (isTaskMaster) {
          const subj = info?.subject || getTaskSubject(selectedTask) || String(task_id);
          dispatch(getParticularTaskDetail({ tm_id: task_id, subject: subj, type: 'Event Tasks' }))
            .unwrap()
            .then((res) => {
              const taskData = res?.message?.data ?? res?.data ?? res?.message;
              if (taskData && typeof taskData === 'object' && !Array.isArray(taskData)) {
                dispatch(setSelectedEventTask(taskData));
              }
            })
            .catch(() => {});
        } else {
          dispatch(getEventTaskDetailedViewThunk({ task_id, task_type: 'Event Tasks' })).catch(
            () => {},
          );
          dispatch(fetchTaskComments({ taskName: task_id })).catch(() => {});
        }
      }}
      taskType='Event Tasks'
      tasks={tasks}
      onTaskChange={handleTaskChange}
      showRecurring={false}
      dueDateMode={!isTaskMaster}
      eventTaskMasterMode={isTaskMaster}
      assigneeSelectItems={scopedAssigneeSelectItems}
      assigneeSelectLoading={assigneeSelectLoading}
      assigneeCenterScopeIds={taskCenterIds}
      eventCenterOptions={eventCenterOptions}
      eventCenters={eventCenters}
      sidePanel={
        !isTaskMaster && selectedTask?.name ? (
          <TaskComments
            taskName={selectedTask.name}
            onRefreshData={() => {
              const task_id = selectedTask?.name || selectedTask?.task_id || selectedTask?.id;
              if (!task_id) return;
              dispatch(getEventTaskDetailedViewThunk({ task_id, task_type: 'Event Tasks' })).catch(
                () => {},
              );
            }}
          />
        ) : null
      }
      sidePanelTitle='Comments'
    />
  );
};

export default EventTaskViewDrawer;
