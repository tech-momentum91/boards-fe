import React, { useEffect, useMemo, useState } from 'react';
import {
  RiAddLine,
  RiBox3Line,
  RiCalendarLine,
  RiCloseLine,
  RiCollageLine,
  // RiDeleteBinLine,
  RiFlagLine,
  RiStackLine,
  RiStickyNoteLine,
  RiUserLine,
} from 'react-icons/ri';
import ProjectThreeDAttachmentsPanel from '@/components/projects/three-d/project-three-d-attachments-panel';
import ProjectStatusDropdown from '@/components/projects/shared/project-status-dropdown';
import ProjectAreaSelectField from '@/components/projects/shared/project-area-select-field';
import ProjectBadgeSelect, {
  formatProjectPriorityLabel,
} from '@/components/projects/shared/project-badge-select';
import { getProjectFloorSelectOptions } from '@/components/projects/shared';
import ProjectFloorVersionWarningAction from '@/components/projects/shared/project-floor-version-warning';
import {
  formatProjectTaskVersionLabel,
  normalizeProjectTaskAssigneeForSelect,
} from '@/components/projects/tasks/project-task-helpers';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import { ProjectFollowersPopover } from '@/components/document-subscribe';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import * as Drawer from '@/components/ui/drawer';
import FieldRow from '@/components/ui/field-row';
import * as Textarea from '@/components/ui/textarea';
import * as Select from '@/components/ui/select';
import ProjectDrawerTagsSection from '@/components/projects/shared/project-drawer-tags-section';
import ProjectTaskViewRightPanel from '@/components/projects/shared/project-task-view-right-panel';
import { PROJECT_CREATE_LAYOUT_MARKER_COLORS } from '@/components/projects/shared/project-create-layout-marker-utils';
import { InlineEditableRichEditor } from '@/components/event-management/inline-editable-fields';
import { Datepicker } from '@/components/ui/datepicker';
import {
  PROJECT_DETAIL_PRIORITY_OPTIONS,
  colorForLayoutPriority,
} from '@/components/projects/constants';
import { formatToDDMMYYYY, parseToDate } from '@/utils/date-utils';
import { useTaskStatusScope } from '@/components/projects/shared/task-status-scope-context';

export default function ProjectGraphicsViewDrawer({
  open,
  onOpenChange,
  graphics,
  isLoading = false,
  onFieldUpdate,
  onUploadAttachments,
  isUploadingAttachments = false,
  onOpenGallery,
  onAcknowledgeFloorVersion,
  isAcknowledgingFloorVersion = false,
  projectId,
  projectFloors = [],
}) {
  const { statusOptions, statusMetaMap } = useTaskStatusScope();
  const [newVersion, setNewVersion] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  useEffect(() => {
    if (!graphics) return;
    setTitleDraft(graphics.title ?? '');
  }, [graphics?.id, graphics?.title]);

  const assigneeValue = useMemo(() => {
    if (!graphics) return [];
    return (graphics.assignees ?? [])
      .map((entry) => normalizeProjectTaskAssigneeForSelect(entry))
      .filter(Boolean);
  }, [graphics]);

  const attachments = useMemo(() => {
    if (!graphics?.id) return [];
    return graphics.attachments ?? [];
  }, [graphics?.attachments, graphics?.id]);

  const graphicsFloorOptions = useMemo(
    () => getProjectFloorSelectOptions(projectFloors, graphics?.floor),
    [projectFloors, graphics?.floor],
  );

  if (!open) return null;

  const dueDateValue = parseToDate(graphics?.exp_end_date ?? graphics?.due_date) ?? undefined;
  const commitTitle = () => {
    if (!graphics?.id) return;
    onFieldUpdate?.(graphics.id, 'title', titleDraft);
  };

  const handleUpload = (mode, files) => {
    if (!graphics?.id) return;
    onUploadAttachments?.(graphics.id, mode, files, graphics);
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='h-full w-full max-w-[1200px] overflow-hidden p-0'>
        <div className='flex h-full flex-col'>
          <div className='flex items-center justify-end border-b border-stroke-soft-200 px-6 py-3'>
            <div className='flex items-center gap-2'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className='flex flex-row gap-1.5'
              >
                <Button.Icon as={RiAddLine} />
                New Version
              </Button.Root>
              {projectId && graphics?.id ? (
                <ProjectFollowersPopover
                  projectId={projectId}
                  scopeMode='leaf'
                  section='graphics'
                  referenceDoctype='Task'
                  referenceName={graphics.id}
                  activityLabel='graphics'
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
                  aria-label='Close graphics view drawer'
                >
                  <Button.Icon as={RiCloseLine} />
                </Button.Root>
              </Drawer.Close>
            </div>
          </div>

          {isLoading && !graphics ? (
            <div className='flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
              Loading graphics…
            </div>
          ) : !graphics ? (
            <div className='flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
              Graphics item not found
            </div>
          ) : (
            <div className='grid min-h-0 flex-1 grid-cols-[minmax(360px,422px)_minmax(0,1fr)]'>
              <div className='min-w-0 overflow-y-auto border-r border-stroke-soft-200 px-6 py-5'>
                <ProjectStatusDropdown
                  value={graphics.status}
                  onValueChange={(value) => onFieldUpdate?.(graphics.id, 'status', value)}
                  statusOptions={statusOptions}
                  statusMetaMap={statusMetaMap}
                  size='small'
                  className='max-w-[200px]'
                />

                <div className='mt-4 flex items-center gap-2'>
                  <Badge.Root size='medium' variant='light' color='green'>
                    {graphics.display_version || formatProjectTaskVersionLabel(graphics)}
                  </Badge.Root>
                  <Textarea.Root
                    variant='borderless'
                    simple
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onBlur={commitTitle}
                    rows={1}
                    className='field-sizing-content flex-1 p-1 text-title-h5 text-text-main-900 break-words whitespace-normal'
                  />
                </div>

                {graphics.show_warning ? (
                  <div className='mt-4'>
                    <ProjectFloorVersionWarningAction
                      showWarning={graphics.show_warning}
                      canAcknowledge={graphics.can_acknowledge}
                      floorVersionOptions={graphics.floor_version_options}
                      warningReason={graphics.warning_reason}
                      onAcknowledge={(floorLockedVersion) =>
                        onAcknowledgeFloorVersion?.(graphics, floorLockedVersion)
                      }
                      isAcknowledging={isAcknowledgingFloorVersion}
                    />
                  </div>
                ) : null}

                <div className='mt-4 overflow-hidden rounded-xl border border-stroke-soft-200 divide-y divide-stroke-soft-200'>
                  <FieldRow icon={RiUserLine} label='Assignee'>
                    <AssigneeMultiSelect
                      value={assigneeValue}
                      onBlur={(values) =>
                        onFieldUpdate?.(
                          graphics.id,
                          'assignees',
                          Array.isArray(values) ? values : [],
                        )
                      }
                      placeholder='Select assignees'
                      maxVisibleAvatars={3}
                      variant='borderless'
                      projectId={projectId}
                      size='small'
                    />
                  </FieldRow>
                  <FieldRow icon={RiStackLine} label='Floor'>
                    <Select.Root
                      value={graphics.floor || undefined}
                      onValueChange={(value) => onFieldUpdate?.(graphics.id, 'floor', value)}
                      size='xsmall'
                      variant='borderless'
                    >
                      <Select.Trigger className='h-8 min-w-[120px]'>
                        <Select.Value placeholder='Select' />
                      </Select.Trigger>
                      <Select.Content>
                        {graphicsFloorOptions.map((option) => (
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
                      fetchByFloor
                      projectId={projectId}
                      floor={graphics?.floor}
                      value={graphics.area}
                      onValueChange={(value) => onFieldUpdate?.(graphics.id, 'area', value)}
                      contentClassName='min-w-[200px]'
                    />
                  </FieldRow>
                  <FieldRow icon={RiCalendarLine} label='Due Date'>
                    <Datepicker
                      value={dueDateValue}
                      onChange={(value) =>
                        onFieldUpdate?.(graphics.id, 'exp_end_date', value ?? '')
                      }
                      size='xsmall'
                      variant='borderless'
                      placeholder='Select'
                      formatDate={(date) => formatToDDMMYYYY(date)}
                      className='h-8 min-w-[120px]'
                    />
                  </FieldRow>
                  <FieldRow icon={RiFlagLine} label='Priority'>
                    <ProjectBadgeSelect
                      value={graphics.priority}
                      onValueChange={(value) => onFieldUpdate?.(graphics.id, 'priority', value)}
                      options={PROJECT_DETAIL_PRIORITY_OPTIONS}
                      colorFn={colorForLayoutPriority}
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
                    value={graphics.description ?? ''}
                    onSave={(value) => onFieldUpdate?.(graphics.id, 'description', value)}
                  />
                </section>

                <ProjectDrawerTagsSection
                  tags={graphics.tags}
                  resetKey={graphics.id}
                  onTagsChange={(tags) => onFieldUpdate?.(graphics.id, 'tags', tags)}
                />

                <ProjectThreeDAttachmentsPanel
                  attachments={attachments}
                  version={graphics.version}
                  onUpload={handleUpload}
                  onOpenGallery={onOpenGallery}
                  uploadDisabled={isUploadingAttachments}
                />
              </div>

              <ProjectTaskViewRightPanel
                task={graphics}
                markerColor={PROJECT_CREATE_LAYOUT_MARKER_COLORS.graphics}
              />
            </div>
          )}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
