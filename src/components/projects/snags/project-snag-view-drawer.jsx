import React, { useEffect, useMemo, useState } from 'react';
import {
  RiCalendarLine,
  RiCloseLine,
  RiCollageLine,
  // RiDeleteBinLine,
  RiFlagLine,
  RiImageLine,
  RiPriceTag3Line,
  RiStackLine,
  RiStickyNoteLine,
  RiUserLine,
} from 'react-icons/ri';
import { PROJECT_SNAG_SOURCE_OPTIONS } from '@/components/projects/snags/project-snag-helpers';
import ProductCategoryLeafSelect from '@/components/products/product-category-leaf-select';
import { normalizeProjectTaskAssigneeForSelect } from '@/components/projects/tasks/project-task-helpers';
import ProjectBadgeSelect, {
  formatProjectPriorityLabel,
} from '@/components/projects/shared/project-badge-select';
import {
  colorForProjectTaskPriority,
  getProjectFloorSelectOptions,
} from '@/components/projects/shared';
import ProjectAreaSelectField from '@/components/projects/shared/project-area-select-field';
import ProjectDrawerAttachmentsSection from '@/components/projects/shared/project-drawer-attachments-section';
import ProjectDrawerTagsSection from '@/components/projects/shared/project-drawer-tags-section';
import ProjectTaskViewRightPanel from '@/components/projects/shared/project-task-view-right-panel';
import ProjectStatusDropdown from '@/components/projects/shared/project-status-dropdown';
import { ProjectFollowersPopover } from '@/components/document-subscribe';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import FieldRow from '@/components/ui/field-row';
import * as Textarea from '@/components/ui/textarea';
import * as Select from '@/components/ui/select';
import { InlineEditableRichEditor } from '@/components/event-management/inline-editable-fields';
import { Datepicker } from '@/components/ui/datepicker';
import { PROJECT_DETAIL_PRIORITY_OPTIONS } from '@/components/projects/constants';
import { formatToDDMMYYYY, parseToDate } from '@/utils/date-utils';
import { useTaskStatusScope } from '@/components/projects/shared/task-status-scope-context';

export default function ProjectSnagViewDrawer({
  open,
  onOpenChange,
  snag,
  isLoading = false,
  onFieldUpdate,
  onUploadAttachments,
  isUploadingAttachments = false,
  projectId,
  categories = [],
  projectFloors = [],
}) {
  const { statusOptions, statusMetaMap } = useTaskStatusScope();
  const [activeTab, setActiveTab] = useState('comments');
  const [titleDraft, setTitleDraft] = useState('');

  useEffect(() => {
    if (!snag) return;
    setTitleDraft(snag.title ?? '');
  }, [snag?.id, snag?.title]);

  const assigneeValue = useMemo(() => {
    if (!snag) return [];
    return (snag.assignees ?? [])
      .map((entry) => normalizeProjectTaskAssigneeForSelect(entry))
      .filter(Boolean);
  }, [snag]);

  const attachments = useMemo(() => snag?.attachments ?? [], [snag?.attachments]);
  const floorOptions = useMemo(
    () => getProjectFloorSelectOptions(projectFloors, snag?.floor),
    [projectFloors, snag?.floor],
  );

  if (!open) return null;

  const dueDateValue = parseToDate(snag?.exp_end_date ?? snag?.due_date) ?? undefined;
  const commitTitle = () => {
    if (!snag?.id) return;
    onFieldUpdate?.(snag.id, 'title', titleDraft);
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='h-full w-full max-w-[1200px] overflow-hidden p-0'>
        <div className='flex h-full flex-col'>
          <div className='flex items-center justify-end border-b border-stroke-soft-200 px-6 py-3'>
            <div className='flex items-center gap-2'>
              {projectId && snag?.id ? (
                <ProjectFollowersPopover
                  projectId={projectId}
                  scopeMode='leaf'
                  section='snags'
                  referenceDoctype='Task'
                  referenceName={snag.id}
                  activityLabel='snag'
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
                  aria-label='Close snag view drawer'
                >
                  <Button.Icon as={RiCloseLine} />
                </Button.Root>
              </Drawer.Close>
            </div>
          </div>

          {isLoading && !snag ? (
            <div className='flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
              Loading snag…
            </div>
          ) : !snag ? (
            <div className='flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
              Snag not found
            </div>
          ) : (
            <div className='grid min-h-0 flex-1 grid-cols-[minmax(360px,422px)_minmax(0,1fr)]'>
              <div className='min-w-0 overflow-y-auto border-r border-stroke-soft-200 px-6 py-5'>
                <ProjectStatusDropdown
                  value={snag.status}
                  onValueChange={(value) => onFieldUpdate?.(snag.id, 'status', value)}
                  statusOptions={statusOptions}
                  statusMetaMap={statusMetaMap}
                  size='small'
                  className='max-w-[220px]'
                />

                <div className='mt-4'>
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
                        onFieldUpdate?.(snag.id, 'assignees', Array.isArray(values) ? values : [])
                      }
                      placeholder='Select assignees'
                      maxVisibleAvatars={3}
                      variant='borderless'
                      projectId={projectId}
                      size='small'
                    />
                  </FieldRow>
                  <FieldRow icon={RiPriceTag3Line} label='Product Category'>
                    <ProductCategoryLeafSelect
                      value={snag.category || ''}
                      onValueChange={(path) => {
                        onFieldUpdate?.(snag.id, 'category', path);
                        onFieldUpdate?.(snag.id, 'sub_category', '');
                      }}
                      size='xsmall'
                      variant='borderless'
                    />
                  </FieldRow>
                  <FieldRow icon={RiCollageLine} label='Snag Source'>
                    <Select.Root
                      value={snag.snag_source || snag.custom_snag_source || undefined}
                      onValueChange={(value) => onFieldUpdate?.(snag.id, 'snag_source', value)}
                      size='xsmall'
                      variant='borderless'
                    >
                      <Select.Trigger className='h-8 min-w-[160px]'>
                        <Select.Value placeholder='Select' />
                      </Select.Trigger>
                      <Select.Content>
                        {PROJECT_SNAG_SOURCE_OPTIONS.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </FieldRow>
                  <FieldRow icon={RiStackLine} label='Floor'>
                    <Select.Root
                      value={snag.floor || undefined}
                      onValueChange={(value) => onFieldUpdate?.(snag.id, 'floor', value)}
                      size='xsmall'
                      variant='borderless'
                    >
                      <Select.Trigger className='h-8 min-w-[120px]'>
                        <Select.Value placeholder='Select' />
                      </Select.Trigger>
                      <Select.Content>
                        {floorOptions.map((option) => (
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
                      floor={snag?.floor}
                      value={snag.area}
                      onValueChange={(value) => onFieldUpdate?.(snag.id, 'area', value)}
                      contentClassName='min-w-[200px]'
                    />
                  </FieldRow>
                  <FieldRow icon={RiCalendarLine} label='Due Date'>
                    <Datepicker
                      value={dueDateValue}
                      onChange={(value) => onFieldUpdate?.(snag.id, 'exp_end_date', value ?? '')}
                      size='xsmall'
                      variant='borderless'
                      placeholder='Select'
                      formatDate={(date) => formatToDDMMYYYY(date)}
                      className='h-8 min-w-[120px]'
                    />
                  </FieldRow>
                  <FieldRow icon={RiFlagLine} label='Priority'>
                    <ProjectBadgeSelect
                      value={snag.priority}
                      onValueChange={(value) => onFieldUpdate?.(snag.id, 'priority', value)}
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
                    value={snag.description ?? ''}
                    onSave={(value) => onFieldUpdate?.(snag.id, 'description', value)}
                  />
                </section>

                <ProjectDrawerTagsSection
                  tags={snag.tags}
                  resetKey={snag.id}
                  onTagsChange={(tags) => onFieldUpdate?.(snag.id, 'tags', tags)}
                />

                <ProjectDrawerAttachmentsSection
                  attachments={attachments}
                  onUpload={(mode, files) => onUploadAttachments?.(snag.id, mode, files, snag)}
                  uploadDisabled={isUploadingAttachments}
                  emptyLabel='No attachments yet'
                />
              </div>

              <ProjectTaskViewRightPanel task={snag} />
            </div>
          )}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
