import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import CreateTaskDrawerCommon from '@/components/client-onboarding/create-task-drawer-common';
import { TASK_STATUS_OPTIONS as TASK_MASTER_STATUS_OPTIONS } from '@/components/client-onboarding/constants';
import { EVENT_TASK_STATUS_OPTIONS } from '@/components/event-management/constant';
import { normalizeAssigneeIds } from '@/components/event-management/event-task-assignee-utils';
import {
  createEventTaskThunk,
  createEventTaskMasterThunk,
  getEventTaskListThunk,
  getEventTaskMasterListThunk,
  selectEventTaskMasterCreateLoading,
  EVENT_TASK_ASSIGNEE_ROLE_OPTIONS,
} from '@/redux/eventsSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

const normalizeCenterIds = (value) =>
  (Array.isArray(value) ? value : []).map((v) => String(v ?? '').trim()).filter(Boolean);

/** Priority is optional for Event Tasks — omit when blank (backend allows empty). */
const optionalPriority = (value) => {
  const priority = String(value ?? '').trim();
  return priority ? { priority } : {};
};

const EventTaskCreateDrawerCommon = ({
  open,
  onOpenChange,
  eventName,
  onCreated,
  assigneeSelectItems,
  assigneeSelectLoading = false,
  assigneeRoleOptions = EVENT_TASK_ASSIGNEE_ROLE_OPTIONS,
  assigneeRoleGroups = [],
  /** 'task' | 'task_master' */
  createMode = 'task',
  /** Centers linked to the event only: { label, value }[] */
  eventCenterOptions = [],
  /** Full center rows (with zone) for CenterAccessDropdown */
  eventCenters = [],
  /**
   * When the event is "all centers", `eventCenterOptions` lists every center. Task Master
   * still shows the center multi-select; selecting all options sends `all_centers: 1`.
   */
  eventAllCenters = false,
}) => {
  const dispatch = useDispatch();
  const isTaskLoading = useSelector((state) =>
    Boolean(state.events?.eventTasks?.create?.isLoading),
  );
  const isMasterLoading = useSelector(selectEventTaskMasterCreateLoading);
  const isLoading = createMode === 'task_master' ? isMasterLoading : isTaskLoading;

  const handleClose = useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(
    async (formData) => {
      if (!eventName) {
        showErrorToast('Event is not loaded yet.');
        return false;
      }

      if (createMode === 'task_master') {
        const duration = formData?.duration ? String(formData.duration).trim() : '';
        if (!duration || Number(duration) <= 0) {
          showErrorToast('Please enter a valid duration (days).');
          return false;
        }

        const nextUpdateDays = formData?.next_update ? String(formData.next_update).trim() : '';
        if (
          nextUpdateDays &&
          (Number.isNaN(Number(nextUpdateDays)) || Number(nextUpdateDays) <= 0)
        ) {
          showErrorToast('Next update (days) must be a positive number when provided.');
          return false;
        }

        if (!Array.isArray(eventCenterOptions) || eventCenterOptions.length === 0) {
          showErrorToast(
            'This event has no linked centers. Add centers under Basic Details first.',
          );
          return false;
        }

        const centers = normalizeCenterIds(formData.eventCenter);
        if (centers.length === 0) {
          showErrorToast('Select at least one center.');
          return false;
        }

        const allOptionIds = eventCenterOptions
          .map((o) => String(o?.value ?? '').trim())
          .filter(Boolean);
        const selectedSet = new Set(centers);
        const coversEveryListedCenter =
          allOptionIds.length > 0 && allOptionIds.every((id) => selectedSet.has(id));

        const centerPayload =
          eventAllCenters && coversEveryListedCenter ? { all_centers: 1 } : { centers };

        const taskData = {
          subject: formData.taskTitle,
          description: formData.description || '',
          status: formData.status || TASK_MASTER_STATUS_OPTIONS[0]?.value || 'Active',
          ...optionalPriority(formData.priority),
          type: 'Event Tasks',
          duration,
          ...(nextUpdateDays ? { next_update: nextUpdateDays } : {}),
          assignees: normalizeAssigneeIds(formData.assignedTo),
          attachment: formData.attachment || [],
          tagArr: formData.tagArr || [],
          ...centerPayload,
        };

        try {
          const result = await dispatch(
            createEventTaskMasterThunk({ eventName, taskData }),
          ).unwrap();
          showSuccessToast(
            result?.message?.message || result?.message || 'Task master created successfully',
          );
          await dispatch(getEventTaskMasterListThunk({ event: eventName }));
          onCreated?.();
          return true;
        } catch (error) {
          showErrorToast(extractErrorMessage(error) || 'Failed to create task master');
          return false;
        }
      }

      const expEnd = formData?.next_update_date ? String(formData.next_update_date).trim() : '';
      if (!expEnd) {
        showErrorToast('Please set a due date.');
        return false;
      }

      const centers = normalizeCenterIds(formData.eventCenter);
      if (centers.length === 0) {
        showErrorToast('Select at least one center.');
        return false;
      }

      const assignees = normalizeAssigneeIds(formData.assignedTo);
      if (assignees.length === 0) {
        showErrorToast('Select at least one assignee.');
        return false;
      }

      const nextUpdateTrimmed = String(formData.custom_next_update_date || '').trim();
      const taskData = {
        subject: formData.taskTitle,
        description: formData.description || '',
        status: formData.status || 'Pending',
        ...optionalPriority(formData.priority),
        type: 'Event Tasks',
        exp_end_date: expEnd,
        assignees,
        attachment: formData.attachment || [],
        tagArr: formData.tagArr || [],
        centers,
        ...(nextUpdateTrimmed ? { custom_next_update_date: nextUpdateTrimmed } : {}),
      };

      try {
        const result = await dispatch(createEventTaskThunk({ eventName, taskData })).unwrap();
        showSuccessToast(
          result?.message?.message || result?.message || 'Task created successfully',
        );
        await dispatch(getEventTaskListThunk({ event: eventName }));
        onCreated?.();
        return true;
      } catch (error) {
        showErrorToast(extractErrorMessage(error) || 'Failed to create task');
        return false;
      }
    },
    [createMode, dispatch, eventName, eventCenterOptions, eventAllCenters, onCreated],
  );

  const isTaskMaster = createMode === 'task_master';

  return (
    <CreateTaskDrawerCommon
      key={createMode}
      isOpen={Boolean(open)}
      onClose={handleClose}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      taskType='Event Tasks'
      drawerTitle={isTaskMaster ? 'Create New Task Master' : 'Create New Task'}
      drawerDescription={
        isTaskMaster
          ? 'Add below details to create a new event task master.'
          : 'Add below details to create a new event task.'
      }
      showTagsInput
      showRecurring={false}
      statusOptions={isTaskMaster ? TASK_MASTER_STATUS_OPTIONS : EVENT_TASK_STATUS_OPTIONS}
      defaultStatusKeyword={isTaskMaster ? 'Active' : 'Pending'}
      dueDateMode={!isTaskMaster}
      requireEventCenters
      eventCenterOptions={eventCenterOptions}
      eventCenters={eventCenters}
      assigneeSelectItems={assigneeSelectItems}
      assigneeSelectLoading={assigneeSelectLoading}
      assigneeRoleOptions={assigneeRoleOptions}
      assigneeRoleGroups={assigneeRoleGroups}
      requirePriority={false}
    />
  );
};

export default EventTaskCreateDrawerCommon;
