import React, { useEffect, useMemo, useState } from 'react';
import {
  RiArrowUpLine,
  RiCalendarLine,
  RiCloseLine,
  RiCollageLine,
  // RiDeleteBinLine,
  RiFlagLine,
  RiImageLine,
  RiStackLine,
  RiStickyNoteLine,
  RiUserLine,
} from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import { ProjectFollowersPopover } from '@/components/document-subscribe';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import * as Textarea from '@/components/ui/textarea';
import * as Select from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Drawer from '@/components/ui/drawer';
import ProjectDrawerAttachmentsSection from '@/components/projects/shared/project-drawer-attachments-section';
import ProjectDrawerTagsSection from '@/components/projects/shared/project-drawer-tags-section';
import ProjectTaskViewRightPanel from '@/components/projects/shared/project-task-view-right-panel';
import { InlineEditableRichEditor } from '@/components/event-management/inline-editable-fields';
import { Datepicker } from '@/components/ui/datepicker';
import ProjectStatusDropdown from '@/components/projects/shared/project-status-dropdown';
import FieldRow from '@/components/ui/field-row';
import { PROJECT_DETAIL_PRIORITY_OPTIONS } from '@/components/projects/constants';
import { fetchProjectStageOptions } from '@/components/projects/project-stage-status-helpers';
import ProjectBadgeSelect, {
  formatProjectPriorityLabel,
} from '@/components/projects/shared/project-badge-select';
import {
  colorForProjectStage,
  colorForProjectTaskPriority,
  getProjectFloorSelectOptions,
} from '@/components/projects/shared';
import ProjectAreaSelectField from '@/components/projects/shared/project-area-select-field';
import { parseToDate, formatToDDMMYYYY } from '@/utils/date-utils';
import { normalizeProjectTaskAssigneeForSelect } from '@/components/projects/tasks/project-task-helpers';
import { useTaskStatusScope } from '@/components/projects/shared/task-status-scope-context';

export default function ProjectTaskViewDrawer({
  open,
  onOpenChange,
  task,
  isLoading = false,
  onFieldUpdate,
  onUploadAttachments,
  isUploadingAttachments = false,
  projectId,
  projectFloors = [],
}) {
  const { statusOptions, statusMetaMap } = useTaskStatusScope();
  const [activeTab, setActiveTab] = useState('comments');
  const [visibleToClient, setVisibleToClient] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [stageOptions, setStageOptions] = useState([]);

  useEffect(() => {
    if (!task) return;
    setTitleDraft(task.title ?? '');
  }, [task?.id, task?.title]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    fetchProjectStageOptions()
      .then((options) => {
        if (!cancelled) setStageOptions(options);
      })
      .catch(() => {
        if (!cancelled) setStageOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const assigneeValue = useMemo(() => {
    if (!task) return [];
    return (task.assignees ?? [])
      .map((entry) => normalizeProjectTaskAssigneeForSelect(entry))
      .filter(Boolean);
  }, [task]);

  const attachments = useMemo(() => task?.attachments ?? [], [task?.attachments]);
  const taskFloorOptions = useMemo(
    () => getProjectFloorSelectOptions(projectFloors, task?.floor),
    [projectFloors, task?.floor],
  );

  const stageValue = task?.custom_stage ?? task?.groupId ?? '';
  const stageSelectOptions = useMemo(() => {
    const options = [...stageOptions];
    const current = String(stageValue ?? '').trim();
    if (current && !options.some((option) => option.value === current)) {
      return [{ value: current, label: current }, ...options];
    }
    return options;
  }, [stageOptions, stageValue]);

  if (!open) return null;

  const dueDateValue = parseToDate(task?.exp_end_date ?? task?.due_date) ?? undefined;

  const commitTitle = () => {
    if (!task?.id) return;
    onFieldUpdate?.(task.id, 'title', titleDraft);
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='h-full w-full max-w-[1200px] overflow-hidden p-0'>
        <div className='flex h-full flex-col'>
          <div className='flex items-center justify-end border-b border-stroke-soft-200 px-6 py-3'>
            <div className='flex items-center gap-2'>
              {projectId && task?.id ? (
                <ProjectFollowersPopover
                  projectId={projectId}
                  scopeMode='leaf'
                  section='tasks'
                  referenceDoctype='Task'
                  referenceName={task.id}
                  activityLabel='task'
                />
              ) : null}
              {/*
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className='flex flex-row gap-3'
              >
                <Button.Icon as={RiDeleteBinLine} />
                Remove
              </Button.Root>
              */}
              <Drawer.Close asChild>
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  aria-label='Close task view drawer'
                >
                  <Button.Icon as={RiCloseLine} />
                </Button.Root>
              </Drawer.Close>
            </div>
          </div>

          {isLoading && !task ? (
            <div className='flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
              Loading task…
            </div>
          ) : !task ? (
            <div className='flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
              Task not found
            </div>
          ) : (
            <div className='grid min-h-0 flex-1 grid-cols-[minmax(360px,422px)_minmax(0,1fr)]'>
              <div className='min-w-0 overflow-y-auto border-r border-stroke-soft-200 px-6 py-5'>
                <ProjectStatusDropdown
                  value={task.status}
                  onValueChange={(value) => onFieldUpdate?.(task.id, 'status', value)}
                  statusOptions={statusOptions}
                  statusMetaMap={statusMetaMap}
                  size='small'
                  className='max-w-[200px]'
                />

                <div className='mt-4'>
                  <Textarea.Root
                    variant='borderless'
                    simple
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onBlur={commitTitle}
                    rows={1}
                    className='field-sizing-content p-1 text-title-h5 text-text-main-900 break-words whitespace-normal'
                  />
                </div>

                <div className='mt-4 overflow-hidden rounded-xl border border-stroke-soft-200 divide-y divide-stroke-soft-200'>
                  <FieldRow icon={RiUserLine} label='Assignee'>
                    <AssigneeMultiSelect
                      value={assigneeValue}
                      onBlur={(values) =>
                        onFieldUpdate?.(task.id, 'assignees', Array.isArray(values) ? values : [])
                      }
                      placeholder='Select assignees'
                      maxVisibleAvatars={3}
                      variant='borderless'
                      size='small'
                      projectId={projectId}
                    />
                  </FieldRow>
                  <FieldRow icon={RiStackLine} label='Floor'>
                    <Select.Root
                      value={task.floor || undefined}
                      onValueChange={(value) => onFieldUpdate?.(task.id, 'floor', value)}
                      size='xsmall'
                      variant='borderless'
                    >
                      <Select.Trigger className='h-8 min-w-[120px]'>
                        <Select.Value placeholder='Select' />
                      </Select.Trigger>
                      <Select.Content>
                        {taskFloorOptions.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </FieldRow>
                  <FieldRow icon={RiCollageLine} label='Area'>
                    <ProjectAreaSelectField
                      size='xsmall'
                      variant='borderless'
                      showArrow
                      fetchByFloor
                      projectId={projectId}
                      floor={task?.floor}
                      value={task.area}
                      onValueChange={(value) => onFieldUpdate?.(task.id, 'area', value)}
                      contentClassName='min-w-[220px]'
                    />
                  </FieldRow>
                  <FieldRow icon={RiCalendarLine} label='Due Date'>
                    <Datepicker
                      value={dueDateValue}
                      onChange={(value) => onFieldUpdate?.(task.id, 'exp_end_date', value ?? '')}
                      size='xsmall'
                      variant='borderless'
                      placeholder='Select'
                      formatDate={(date) => formatToDDMMYYYY(date)}
                      className='h-8 min-w-[120px]'
                    />
                  </FieldRow>
                  <FieldRow icon={RiFlagLine} label='Stage'>
                    <ProjectBadgeSelect
                      value={stageValue}
                      onValueChange={(value) => onFieldUpdate?.(task.id, 'custom_stage', value)}
                      options={stageSelectOptions}
                      colorFn={colorForProjectStage}
                    />
                  </FieldRow>
                  <FieldRow icon={RiFlagLine} label='Priority'>
                    <ProjectBadgeSelect
                      value={task.priority}
                      onValueChange={(value) => onFieldUpdate?.(task.id, 'priority', value)}
                      options={PROJECT_DETAIL_PRIORITY_OPTIONS}
                      colorFn={colorForProjectTaskPriority}
                      formatLabel={formatProjectPriorityLabel}
                    />
                  </FieldRow>
                </div>

                <section className='mt-6'>
                  <div className='mb-3 flex items-center gap-2 text-label-md text-text-sub-500'>
                    <RiStickyNoteLine className='size-5 text-text-soft-400' />
                    Description
                  </div>
                  <InlineEditableRichEditor
                    value={task.description ?? ''}
                    onSave={(value) => onFieldUpdate?.(task.id, 'description', value)}
                  />
                </section>

                <ProjectDrawerTagsSection
                  tags={task.tags}
                  resetKey={task.id}
                  onTagsChange={(tags) => onFieldUpdate?.(task.id, 'tags', tags)}
                />

                <ProjectDrawerAttachmentsSection
                  attachments={attachments}
                  onUpload={(mode, files) => onUploadAttachments?.(task.id, mode, files, task)}
                  uploadDisabled={isUploadingAttachments}
                  emptyLabel='No attachments yet'
                />
              </div>

              <ProjectTaskViewRightPanel task={task} />
            </div>
          )}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
