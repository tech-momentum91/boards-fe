import React, { useEffect, useMemo, useState } from 'react';
import {
  RiCalendarLine,
  RiCloseLine,
  // RiDeleteBinLine,
  RiFlagLine,
  RiImageLine,
  RiLayout6Line,
  RiStackLine,
  RiStickyNoteLine,
  RiUserLine,
} from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import { ProjectFollowersPopover } from '@/components/document-subscribe';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import * as Textarea from '@/components/ui/textarea';
import * as Select from '@/components/ui/select';
import * as Drawer from '@/components/ui/drawer';
import ProjectDrawerAttachmentsSection from '@/components/projects/shared/project-drawer-attachments-section';
import ProjectDrawerTagsSection from '@/components/projects/shared/project-drawer-tags-section';
import { InlineEditableRichEditor } from '@/components/event-management/inline-editable-fields';
import { Datepicker } from '@/components/ui/datepicker';
import ProjectStatusDropdown from '@/components/projects/shared/project-status-dropdown';
import FieldRow from '@/components/ui/field-row';
import { getProjectLayoutTypeSelectOptions } from '@/components/projects/layouts/project-layout-helpers';
import ProjectBadgeSelect, {
  formatProjectPriorityLabel,
} from '@/components/projects/shared/project-badge-select';
import { getProjectFloorSelectOptions } from '@/components/projects/shared';
import { normalizeProjectTaskAssigneeForSelect } from '@/components/projects/tasks/project-task-helpers';
import {
  PROJECT_DETAIL_PRIORITY_OPTIONS,
  PROJECT_LAYOUT_STATUS_CONFIG,
  colorForLayoutPriority,
} from '@/components/projects/constants';
import { buildStatusMetaMap, useStatusOptions } from '@/hooks/use-status-options';
import { formatToDDMMYYYY, parseToDate } from '@/utils/date-utils';
import ProjectLayoutEditorPanel from '@/components/projects/layouts/project-layout-editor-panel';
import ProjectLayoutComments from '@/components/projects/layouts/project-layout-comments';
import ProjectDrawerCommentLayoutTabs from '@/components/projects/shared/project-drawer-comment-layout-tabs';
import ProjectFloorVersionWarningAction from '@/components/projects/shared/project-floor-version-warning';

function AttachmentCard({ attachment }) {
  return (
    <div className='w-[220px] overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
      <div className='flex h-[176px] items-center justify-center bg-bg-weak-100'>
        <RiImageLine className='size-6 text-text-soft-400' />
      </div>
      <div className='space-y-1 px-4 py-3'>
        <p className='truncate text-label-sm text-text-main-900'>{attachment.name}</p>
        <p className='truncate text-paragraph-xs text-text-sub-500'>
          {attachment.size} • {attachment.uploadedAt}
        </p>
      </div>
    </div>
  );
}

/*test comment */
export default function ProjectLayoutViewDrawer({
  open,
  onOpenChange,
  layout,
  isLoading = false,
  onFieldUpdate,
  onUploadAttachments,
  isUploadingAttachments = false,
  projectId,
  projectFloors = [],
  onLayoutRefresh,
  onAcknowledgeFloorVersion,
  isAcknowledgingFloorVersion = false,
}) {
  const [activeTab, setActiveTab] = useState('layout');
  const [titleDraft, setTitleDraft] = useState('');
  const [viewedLayoutId, setViewedLayoutId] = useState('');
  const { options: layoutStatusOptions } = useStatusOptions(PROJECT_LAYOUT_STATUS_CONFIG);
  const layoutStatusMetaMap = useMemo(
    () => buildStatusMetaMap(layoutStatusOptions),
    [layoutStatusOptions],
  );
  const [layoutCanvasReady, setLayoutCanvasReady] = useState(false);

  const activeLayoutId = layout?.id || layout?.name || '';

  useEffect(() => {
    setViewedLayoutId(activeLayoutId);
  }, [activeLayoutId]);
  useEffect(() => {
    if (!layout) return;
    setTitleDraft(layout.title ?? '');
  }, [layout?.id, layout?.title]);

  // Prefer Layout tab when a layout is opened; remount canvas after drawer animation
  // so Konva/react-zoom-pan-pinch measure a non-zero viewport.
  useEffect(() => {
    if (!open) return;
    setActiveTab('layout');
  }, [open, activeLayoutId]);

  useEffect(() => {
    if (!open || activeTab !== 'layout') {
      setLayoutCanvasReady(false);
      return undefined;
    }
    setLayoutCanvasReady(false);
    const timerId = window.setTimeout(() => setLayoutCanvasReady(true), 220);
    return () => window.clearTimeout(timerId);
  }, [open, activeTab, activeLayoutId]);

  const assigneeValue = useMemo(() => {
    if (!layout) return [];
    return (layout.assignees ?? [])
      .map((entry) => normalizeProjectTaskAssigneeForSelect(entry))
      .filter(Boolean);
  }, [layout]);

  const attachments = useMemo(() => layout?.attachments ?? [], [layout?.attachments]);
  const layoutTypeOptions = useMemo(
    () => getProjectLayoutTypeSelectOptions(layout?.layout_type),
    [layout?.layout_type],
  );
  const layoutFloorOptions = useMemo(
    () => getProjectFloorSelectOptions(projectFloors, layout?.floor),
    [layout?.floor, projectFloors],
  );

  const dueDateValue = parseToDate(layout?.exp_end_date ?? layout?.due_date) ?? undefined;
  const commitTitle = () => {
    if (!layout?.id) return;
    onFieldUpdate?.(layout.id, 'title', titleDraft);
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content
        className='h-full w-full max-w-[1200px] overflow-hidden p-0'
        title={layout?.title || layout?.subject || 'Layout details'}
      >
        <div className='flex h-full flex-col'>
          <div className='flex items-center justify-end border-b border-stroke-soft-200 px-6 py-3'>
            <div className='flex items-center gap-2'>
              {projectId && (layout?.id || layout?.name) ? (
                <ProjectFollowersPopover
                  projectId={projectId}
                  scopeMode='leaf'
                  section='layouts'
                  referenceDoctype='Project Layout'
                  referenceName={layout.id || layout.name}
                  activityLabel='layout'
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
                  aria-label='Close layout view drawer'
                >
                  <Button.Icon as={RiCloseLine} />
                </Button.Root>
              </Drawer.Close>
            </div>
          </div>

          {isLoading && !layout ? (
            <div className='flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
              Loading layout…
            </div>
          ) : !layout ? (
            <div className='flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
              Layout not found
            </div>
          ) : (
            <div className='grid min-h-0 flex-1 grid-cols-[minmax(360px,422px)_minmax(0,1fr)]'>
              <div className='min-w-0 overflow-y-auto border-r border-stroke-soft-200 px-6 py-5'>
                <ProjectStatusDropdown
                  value={layout.status}
                  onValueChange={(value) => onFieldUpdate?.(layout.id, 'status', value)}
                  statusOptions={layoutStatusOptions}
                  statusMetaMap={layoutStatusMetaMap}
                  size='small'
                  className='max-w-[200px]'
                />

                <div className='mt-4 flex items-center gap-2'>
                  <Badge.Root size='medium' variant='light' color='green'>
                    {layout.display_version || layout.version || 'V0'}
                  </Badge.Root>
                  {layout.show_warning ? (
                    <ProjectFloorVersionWarningAction
                      compact
                      showWarning={layout.show_warning}
                      canAcknowledge={layout.can_acknowledge}
                      floorVersionOptions={layout.floor_version_options}
                      warningReason={layout.warning_reason}
                      onAcknowledge={(floorLockedVersion) =>
                        onAcknowledgeFloorVersion?.(layout, floorLockedVersion)
                      }
                      isAcknowledging={isAcknowledgingFloorVersion}
                    />
                  ) : null}
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

                <div className='mt-4 overflow-hidden rounded-xl border border-stroke-soft-200 divide-y divide-stroke-soft-200'>
                  <FieldRow icon={RiUserLine} label='Assignee'>
                    <AssigneeMultiSelect
                      value={assigneeValue}
                      onBlur={(values) =>
                        onFieldUpdate?.(layout.id, 'assignees', Array.isArray(values) ? values : [])
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
                      value={layout.floor || undefined}
                      onValueChange={(value) => onFieldUpdate?.(layout.id, 'floor', value)}
                      size='xsmall'
                      variant='borderless'
                    >
                      <Select.Trigger className='h-8 min-w-[120px]'>
                        <Select.Value placeholder='Select' />
                      </Select.Trigger>
                      <Select.Content>
                        {layoutFloorOptions.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </FieldRow>
                  <FieldRow icon={RiCalendarLine} label='Due Date'>
                    <Datepicker
                      value={dueDateValue}
                      onChange={(value) => onFieldUpdate?.(layout.id, 'exp_end_date', value ?? '')}
                      size='xsmall'
                      variant='borderless'
                      placeholder='Select'
                      formatDate={(date) => formatToDDMMYYYY(date)}
                      className='h-8 min-w-[120px]'
                    />
                  </FieldRow>
                  <FieldRow icon={RiLayout6Line} label='Layout Type'>
                    <Select.Root
                      value={layout.layout_type || undefined}
                      onValueChange={(value) =>
                        onFieldUpdate?.(layout.id, 'custom_layout_type', value)
                      }
                      size='xsmall'
                      variant='borderless'
                    >
                      <Select.Trigger className='h-8 min-w-[140px]'>
                        <Select.Value placeholder='Select' />
                      </Select.Trigger>
                      <Select.Content>
                        {layoutTypeOptions.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </FieldRow>
                  <FieldRow icon={RiFlagLine} label='Priority'>
                    <ProjectBadgeSelect
                      value={layout.priority}
                      onValueChange={(value) => onFieldUpdate?.(layout.id, 'priority', value)}
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
                    value={layout.description ?? ''}
                    onSave={(value) => onFieldUpdate?.(layout.id, 'description', value)}
                  />
                </section>

                <ProjectDrawerTagsSection
                  tags={layout.tags}
                  resetKey={layout.id}
                  onTagsChange={(tags) => onFieldUpdate?.(layout.id, 'tags', tags)}
                />

                <ProjectDrawerAttachmentsSection
                  attachments={attachments}
                  onUpload={(mode, files) => onUploadAttachments?.(layout.id, mode, files, layout)}
                  uploadDisabled={isUploadingAttachments}
                  emptyLabel='No attachments yet'
                />
              </div>

              <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
                <ProjectDrawerCommentLayoutTabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  layoutContent={
                    layoutCanvasReady ? (
                      <ProjectLayoutEditorPanel
                        layout={layout}
                        projectId={projectId}
                        onLayoutRefresh={onLayoutRefresh}
                        onAcknowledgeFloorVersion={onAcknowledgeFloorVersion}
                        isAcknowledgingFloorVersion={isAcknowledgingFloorVersion}
                        onViewedVersionChange={setViewedLayoutId}
                      />
                    ) : (
                      <div className='flex min-h-0 flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
                        Loading layout…
                      </div>
                    )
                  }
                  commentsContent={
                    <ProjectLayoutComments
                      layoutId={viewedLayoutId || activeLayoutId}
                      activeLayoutId={activeLayoutId}
                    />
                  }
                />
              </div>
            </div>
          )}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
