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

export default function ProjectThreeDViewDrawer({
  open,
  onOpenChange,
  threeD,
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
    if (!threeD) return;
    setTitleDraft(threeD.title ?? '');
  }, [threeD?.id, threeD?.title]);

  const assigneeValue = useMemo(() => {
    if (!threeD) return [];
    return (threeD.assignees ?? [])
      .map((entry) => normalizeProjectTaskAssigneeForSelect(entry))
      .filter(Boolean);
  }, [threeD]);

  const attachments = useMemo(() => {
    if (!threeD?.id) return [];
    return threeD.attachments ?? [];
  }, [threeD?.attachments, threeD?.id]);

  const threeDFloorOptions = useMemo(
    () => getProjectFloorSelectOptions(projectFloors, threeD?.floor),
    [projectFloors, threeD?.floor],
  );

  if (!open) return null;

  const dueDateValue = parseToDate(threeD?.exp_end_date ?? threeD?.due_date) ?? undefined;
  const commitTitle = () => {
    if (!threeD?.id) return;
    onFieldUpdate?.(threeD.id, 'title', titleDraft);
  };

  const handleUpload = (mode, files) => {
    if (!threeD?.id) return;
    onUploadAttachments?.(threeD.id, mode, files, threeD);
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
              {projectId && threeD?.id ? (
                <ProjectFollowersPopover
                  projectId={projectId}
                  scopeMode='leaf'
                  section='three_d'
                  referenceDoctype='Task'
                  referenceName={threeD.id}
                  activityLabel='3D'
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
                  aria-label='Close 3D view drawer'
                >
                  <Button.Icon as={RiCloseLine} />
                </Button.Root>
              </Drawer.Close>
            </div>
          </div>

          {isLoading && !threeD ? (
            <div className='flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
              Loading 3D…
            </div>
          ) : !threeD ? (
            <div className='flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
              3D item not found
            </div>
          ) : (
            <div className='grid min-h-0 flex-1 grid-cols-[minmax(360px,422px)_minmax(0,1fr)]'>
              <div className='min-w-0 overflow-y-auto border-r border-stroke-soft-200 px-6 py-5'>
                <ProjectStatusDropdown
                  value={threeD.status}
                  onValueChange={(value) => onFieldUpdate?.(threeD.id, 'status', value)}
                  statusOptions={statusOptions}
                  statusMetaMap={statusMetaMap}
                  size='small'
                  className='max-w-[200px]'
                />

                <div className='mt-4 flex items-center gap-2'>
                  <Badge.Root size='medium' variant='light' color='green'>
                    {threeD.display_version || formatProjectTaskVersionLabel(threeD)}
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

                {threeD.show_warning ? (
                  <div className='mt-4'>
                    <ProjectFloorVersionWarningAction
                      showWarning={threeD.show_warning}
                      canAcknowledge={threeD.can_acknowledge}
                      floorVersionOptions={threeD.floor_version_options}
                      warningReason={threeD.warning_reason}
                      onAcknowledge={(floorLockedVersion) =>
                        onAcknowledgeFloorVersion?.(threeD, floorLockedVersion)
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
                        onFieldUpdate?.(threeD.id, 'assignees', Array.isArray(values) ? values : [])
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
                      value={threeD.floor || undefined}
                      onValueChange={(value) => onFieldUpdate?.(threeD.id, 'floor', value)}
                      size='xsmall'
                      variant='borderless'
                    >
                      <Select.Trigger className='h-8 min-w-[120px]'>
                        <Select.Value placeholder='Select' />
                      </Select.Trigger>
                      <Select.Content>
                        {threeDFloorOptions.map((option) => (
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
                      floor={threeD?.floor}
                      value={threeD.area}
                      onValueChange={(value) => onFieldUpdate?.(threeD.id, 'area', value)}
                      contentClassName='min-w-[200px]'
                    />
                  </FieldRow>
                  <FieldRow icon={RiCalendarLine} label='Due Date'>
                    <Datepicker
                      value={dueDateValue}
                      onChange={(value) => onFieldUpdate?.(threeD.id, 'exp_end_date', value ?? '')}
                      size='xsmall'
                      variant='borderless'
                      placeholder='Select'
                      formatDate={(date) => formatToDDMMYYYY(date)}
                      className='h-8 min-w-[120px]'
                    />
                  </FieldRow>
                  <FieldRow icon={RiFlagLine} label='Priority'>
                    <ProjectBadgeSelect
                      value={threeD.priority}
                      onValueChange={(value) => onFieldUpdate?.(threeD.id, 'priority', value)}
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
                    value={threeD.description ?? ''}
                    onSave={(value) => onFieldUpdate?.(threeD.id, 'description', value)}
                  />
                </section>

                <ProjectDrawerTagsSection
                  tags={threeD.tags}
                  resetKey={threeD.id}
                  onTagsChange={(tags) => onFieldUpdate?.(threeD.id, 'tags', tags)}
                />

                <ProjectThreeDAttachmentsPanel
                  attachments={attachments}
                  version={threeD.version}
                  onUpload={handleUpload}
                  onOpenGallery={onOpenGallery}
                  uploadDisabled={isUploadingAttachments}
                />
              </div>

              <ProjectTaskViewRightPanel
                task={threeD}
                markerColor={PROJECT_CREATE_LAYOUT_MARKER_COLORS.threeD}
              />
            </div>
          )}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
