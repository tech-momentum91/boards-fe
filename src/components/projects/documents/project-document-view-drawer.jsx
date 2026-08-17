import React, { useEffect, useMemo, useState } from 'react';
import {
  RiArrowUpLine,
  RiAttachment2,
  RiAtLine,
  RiCalendarLine,
  RiChat2Line,
  RiCloseLine,
  // RiDeleteBinLine,
  RiFlagLine,
  RiNotification3Line,
  RiPriceTag3Line,
  RiSendPlaneLine,
  RiStickyNoteLine,
  RiUserLine,
} from 'react-icons/ri';
import ProjectDrawerPanelHeader from '@/components/projects/shared/project-drawer-panel-header';
import ProjectBadgeSelect, {
  formatProjectPriorityLabel,
} from '@/components/projects/shared/project-badge-select';
import ProjectStatusDropdown from '@/components/projects/shared/project-status-dropdown';
import * as Avatar from '@/components/ui/avatar';
import * as AvatarGroup from '@/components/ui/avatar-group';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Drawer from '@/components/ui/drawer';
import FieldRow from '@/components/ui/field-row';
import * as Textarea from '@/components/ui/textarea';
import * as Select from '@/components/ui/select';
import ProjectDrawerAttachmentsSection from '@/components/projects/shared/project-drawer-attachments-section';
import ProjectDrawerTagsSection from '@/components/projects/shared/project-drawer-tags-section';
import { InlineEditableRichEditor } from '@/components/event-management/inline-editable-fields';
import { ProjectFollowersPopover } from '@/components/document-subscribe';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import { Datepicker } from '@/components/ui/datepicker';
import {
  PROJECT_DETAIL_PRIORITY_OPTIONS,
  colorForLayoutPriority,
} from '@/components/projects/constants';
import { parseToDate, formatToDDMMYYYY } from '@/utils/date-utils';
import { normalizeProjectTaskAssigneeForSelect } from '@/components/projects/tasks/project-task-helpers';
import { useTaskStatusScope } from '@/components/projects/shared/task-status-scope-context';

export default function ProjectDocumentViewDrawer({
  open,
  onOpenChange,
  document: documentRow,
  onUpdateDocument,
  onFieldUpdate,
  onUploadAttachments,
  isUploadingAttachments = false,
  categoryOptions = [],
  projectId,
}) {
  const { statusOptions, statusMetaMap } = useTaskStatusScope();
  const [titleDraft, setTitleDraft] = useState('');

  const attachments = useMemo(() => documentRow?.attachments ?? [], [documentRow?.attachments]);

  useEffect(() => {
    if (!documentRow) return;
    setTitleDraft(documentRow.title ?? '');
  }, [documentRow?.id, documentRow?.title]);

  const handleFieldUpdate = useMemo(() => {
    if (onFieldUpdate) return onFieldUpdate;
    return (taskId, fieldName, value) => {
      onUpdateDocument?.({ [fieldName]: value });
    };
  }, [onFieldUpdate, onUpdateDocument]);

  const assigneeValue = useMemo(() => {
    if (!documentRow) return [];
    return (documentRow.assignees ?? [])
      .map((entry) => normalizeProjectTaskAssigneeForSelect(entry))
      .filter(Boolean);
  }, [documentRow]);

  if (!documentRow) return null;

  const dueDateValue = parseToDate(documentRow.exp_end_date ?? documentRow.due_date) ?? undefined;

  const commitTitle = () => {
    if (!documentRow.id || titleDraft.trim() === (documentRow.title ?? '')) return;
    handleFieldUpdate(documentRow.id, 'title', titleDraft.trim());
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='h-full w-full max-w-[1200px] overflow-hidden p-0'>
        <div className='flex h-full flex-col'>
          <div className='flex items-center justify-end border-b border-stroke-soft-200 px-6 py-3'>
            <div className='flex items-center gap-2'>
              {projectId && documentRow?.id ? (
                <ProjectFollowersPopover
                  projectId={projectId}
                  scopeMode='leaf'
                  section='documents'
                  referenceDoctype='Task'
                  referenceName={documentRow.id}
                  activityLabel='document'
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
                  aria-label='Close document view drawer'
                >
                  <Button.Icon as={RiCloseLine} />
                </Button.Root>
              </Drawer.Close>
            </div>
          </div>

          <div className='grid min-h-0 flex-1 grid-cols-[minmax(360px,422px)_minmax(0,1fr)]'>
            <div className='min-w-0 overflow-y-auto border-r border-stroke-soft-200 px-6 py-5'>
              <ProjectStatusDropdown
                value={documentRow.status}
                onValueChange={(value) => handleFieldUpdate(documentRow.id, 'status', value)}
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
                      handleFieldUpdate(
                        documentRow.id,
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
                <FieldRow icon={RiPriceTag3Line} label='Category'>
                  <Select.Root
                    value={documentRow.category || undefined}
                    onValueChange={(value) => handleFieldUpdate(documentRow.id, 'category', value)}
                    size='xsmall'
                    variant='borderless'
                  >
                    <Select.Trigger className='h-8 min-w-[160px]'>
                      <span className='text-paragraph-sm text-text-sub-500'>
                        {categoryOptions.find((opt) => opt.value === documentRow.category)?.label ??
                          documentRow.category ??
                          '—'}
                      </span>
                    </Select.Trigger>
                    <Select.Content>
                      {categoryOptions.map((option) => (
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
                    onChange={(value) =>
                      handleFieldUpdate(documentRow.id, 'exp_end_date', value ?? '')
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
                    value={documentRow.priority}
                    onValueChange={(value) => handleFieldUpdate(documentRow.id, 'priority', value)}
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
                  value={documentRow.description ?? ''}
                  onSave={(value) => handleFieldUpdate(documentRow.id, 'description', value)}
                />
              </section>

              <ProjectDrawerTagsSection
                tags={documentRow.tags}
                resetKey={documentRow.id}
                onTagsChange={(tags) => handleFieldUpdate(documentRow.id, 'tags', tags)}
              />

              <ProjectDrawerAttachmentsSection
                attachments={attachments}
                onUpload={(mode, files) =>
                  onUploadAttachments?.(documentRow.id, mode, files, documentRow)
                }
                uploadDisabled={isUploadingAttachments}
                emptyLabel='No attachments yet'
              />
            </div>

            <div className='flex min-h-0 min-w-0 flex-col'>
              <ProjectDrawerPanelHeader icon={RiChat2Line} label='Comments' />

              <div className='flex flex-1 items-center justify-center px-6 text-center'>
                <div className='flex flex-col items-center gap-4 text-text-soft-400'>
                  <RiNotification3Line className='size-14 text-text-soft-300' />
                  <p className='text-paragraph-md'>There are no comments here yet.</p>
                </div>
              </div>

              <div className='p-6 pt-2'>
                <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-3 shadow-regular-xs'>
                  <textarea
                    className='h-[56px] w-full resize-none border-0 bg-transparent text-paragraph-sm text-text-main-900 outline-none placeholder:text-text-soft-400'
                    placeholder='Type your comment here'
                  />
                  <div className='mt-2 flex items-center justify-end gap-1 text-text-soft-400'>
                    <CompactButton.Root variant='ghost' size='medium'>
                      <CompactButton.Icon as={RiAttachment2} />
                    </CompactButton.Root>
                    <CompactButton.Root variant='ghost' size='medium'>
                      <CompactButton.Icon as={RiAtLine} />
                    </CompactButton.Root>
                    <CompactButton.Root variant='ghost' size='medium'>
                      <CompactButton.Icon as={RiSendPlaneLine} />
                    </CompactButton.Root>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
