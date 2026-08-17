import React, { useEffect, useMemo, useState } from 'react';
import {
  RiAddLine,
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
import ProjectStatusDropdown from '@/components/projects/shared/project-status-dropdown';
import ProjectAreaSelectField from '@/components/projects/shared/project-area-select-field';
import ProjectBadgeSelect, {
  formatProjectPriorityLabel,
} from '@/components/projects/shared/project-badge-select';
import { getProjectFloorSelectOptions } from '@/components/projects/shared';
import {
  normalizeProjectTaskAssigneeForSelect,
  formatProjectTaskVersionLabel,
} from '@/components/projects/tasks/project-task-helpers';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import { ProjectFollowersPopover } from '@/components/document-subscribe';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import * as Drawer from '@/components/ui/drawer';
import * as Dropdown from '@/components/ui/dropdown';
import FieldRow from '@/components/ui/field-row';
import * as Textarea from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Select from '@/components/ui/select';
import ProjectDrawerAttachmentsSection from '@/components/projects/shared/project-drawer-attachments-section';
import { PROJECT_CREATE_LAYOUT_MARKER_COLORS } from '@/components/projects/shared/project-create-layout-marker-utils';
import ProjectDrawerTagsSection from '@/components/projects/shared/project-drawer-tags-section';
import ProjectTaskViewRightPanel from '@/components/projects/shared/project-task-view-right-panel';
import { InlineEditableRichEditor } from '@/components/event-management/inline-editable-fields';
import { Datepicker } from '@/components/ui/datepicker';
import {
  PROJECT_DETAIL_PRIORITY_OPTIONS,
  colorForLayoutPriority,
} from '@/components/projects/constants';
import ProjectFloorVersionWarningAction from '@/components/projects/shared/project-floor-version-warning';
import { formatToDDMMYYYY, parseToDate } from '@/utils/date-utils';
import { useTaskStatusScope } from '@/components/projects/shared/task-status-scope-context';

export default function ProjectGfcViewDrawer({
  open,
  onOpenChange,
  gfc,
  isLoading = false,
  onFieldUpdate,
  onUploadAttachments,
  isUploadingAttachments = false,
  onAcknowledgeFloorVersion,
  isAcknowledgingFloorVersion = false,
  projectId,
  projectFloors = [],
}) {
  const { statusOptions, statusMetaMap } = useTaskStatusScope();
  const [activeTab, setActiveTab] = useState('comments');
  const [newVersion, setNewVersion] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  useEffect(() => {
    if (!gfc) return;
    setTitleDraft(gfc.title ?? '');
  }, [gfc?.id, gfc?.title]);

  const assigneeValue = useMemo(() => {
    if (!gfc) return [];
    return (gfc.assignees ?? [])
      .map((entry) => normalizeProjectTaskAssigneeForSelect(entry))
      .filter(Boolean);
  }, [gfc]);

  const attachments = useMemo(() => gfc?.attachments ?? [], [gfc?.attachments]);
  const gfcFloorOptions = useMemo(
    () => getProjectFloorSelectOptions(projectFloors, gfc?.floor),
    [gfc?.floor, projectFloors],
  );

  if (!open) return null;

  const dueDateValue = parseToDate(gfc?.exp_end_date ?? gfc?.due_date) ?? undefined;
  const commitTitle = () => {
    if (!gfc?.id) return;
    onFieldUpdate?.(gfc.id, 'title', titleDraft);
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
              {projectId && gfc?.id ? (
                <ProjectFollowersPopover
                  projectId={projectId}
                  scopeMode='leaf'
                  section='gfc'
                  referenceDoctype='Task'
                  referenceName={gfc.id}
                  activityLabel='GFC'
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
                  aria-label='Close GFC view drawer'
                >
                  <Button.Icon as={RiCloseLine} />
                </Button.Root>
              </Drawer.Close>
            </div>
          </div>

          {isLoading && !gfc ? (
            <div className='flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
              Loading GFC…
            </div>
          ) : !gfc ? (
            <div className='flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
              GFC not found
            </div>
          ) : (
            <div className='grid min-h-0 flex-1 grid-cols-[minmax(360px,422px)_minmax(0,1fr)]'>
              <div className='min-w-0 overflow-y-auto border-r border-stroke-soft-200 px-6 py-5'>
                <ProjectStatusDropdown
                  value={gfc.status}
                  onValueChange={(value) => onFieldUpdate?.(gfc.id, 'status', value)}
                  statusOptions={statusOptions}
                  statusMetaMap={statusMetaMap}
                  size='small'
                  className='max-w-[200px]'
                />

                <div className='mt-4 flex items-center gap-2'>
                  <Badge.Root size='medium' variant='light' color='green'>
                    {gfc.display_version || formatProjectTaskVersionLabel(gfc)}
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

                {gfc.show_warning ? (
                  <div className='mt-4'>
                    <ProjectFloorVersionWarningAction
                      showWarning={gfc.show_warning}
                      canAcknowledge={gfc.can_acknowledge}
                      floorVersionOptions={gfc.floor_version_options}
                      warningReason={gfc.warning_reason}
                      onAcknowledge={(floorLockedVersion) =>
                        onAcknowledgeFloorVersion?.(gfc, floorLockedVersion)
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
                        onFieldUpdate?.(gfc.id, 'assignees', Array.isArray(values) ? values : [])
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
                      value={gfc.floor || undefined}
                      onValueChange={(value) => onFieldUpdate?.(gfc.id, 'floor', value)}
                      size='xsmall'
                      variant='borderless'
                    >
                      <Select.Trigger className='h-8 min-w-[120px]'>
                        <Select.Value placeholder='Select' />
                      </Select.Trigger>
                      <Select.Content>
                        {gfcFloorOptions.map((option) => (
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
                      floor={gfc?.floor}
                      value={gfc.area}
                      onValueChange={(value) => onFieldUpdate?.(gfc.id, 'area', value)}
                      contentClassName='min-w-[200px]'
                    />
                  </FieldRow>
                  <FieldRow icon={RiCalendarLine} label='Due Date'>
                    <Datepicker
                      value={dueDateValue}
                      onChange={(value) => onFieldUpdate?.(gfc.id, 'exp_end_date', value ?? '')}
                      size='xsmall'
                      variant='borderless'
                      placeholder='Select'
                      formatDate={(date) => formatToDDMMYYYY(date)}
                      className='h-8 min-w-[120px]'
                    />
                  </FieldRow>
                  <FieldRow icon={RiFlagLine} label='Priority'>
                    <ProjectBadgeSelect
                      value={gfc.priority}
                      onValueChange={(value) => onFieldUpdate?.(gfc.id, 'priority', value)}
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
                    value={gfc.description ?? ''}
                    onSave={(value) => onFieldUpdate?.(gfc.id, 'description', value)}
                  />
                </section>

                <ProjectDrawerTagsSection
                  tags={gfc.tags}
                  resetKey={gfc.id}
                  onTagsChange={(tags) => onFieldUpdate?.(gfc.id, 'tags', tags)}
                />

                <ProjectDrawerAttachmentsSection
                  attachments={attachments}
                  versionedUpload
                  onUpload={(mode, files) => onUploadAttachments?.(gfc.id, mode, files, gfc)}
                  uploadDisabled={isUploadingAttachments}
                  emptyLabel='No attachments yet'
                />
              </div>

              <ProjectTaskViewRightPanel
                task={gfc}
                markerColor={PROJECT_CREATE_LAYOUT_MARKER_COLORS.gfc}
              />
            </div>
          )}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
