import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiAttachment2,
  RiCalendarLine,
  RiCloseLine,
  RiDownloadLine,
  RiFlagLine,
  RiLayout6Line,
  RiPriceTag3Line,
  RiStickyNoteLine,
  RiUserLine,
} from 'react-icons/ri';
import { useDispatch } from 'react-redux';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Drawer from '@/components/ui/drawer';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import FieldRow from '@/components/ui/field-row';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Textarea from '@/components/ui/textarea';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import { InlineEditableRichEditor } from '@/components/event-management/inline-editable-fields';
import ProjectDrawerTagsSection from '@/components/projects/shared/project-drawer-tags-section';
import {
  getFieldValue,
  IMAGE_EXTENSIONS,
  normalizeTaskAttachments,
  sanitizeUnsignedIntegerInput,
} from '@/components/client-onboarding/task-view-drawer-utils';
import { updateProjectLayoutMasterField } from '@/redux/projectMasterSlice';
import {
  ASSIGNEE_OPTIONS,
  colorForPriority,
  colorForStatus,
  LAYOUT_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
} from '@/pages/profile/project-master/project-master.constants';
import {
  buildProjectLayoutFieldFormData,
  getLayoutRowFieldValue,
  layoutFieldValuesEqual,
} from '@/pages/profile/project-master/project-master-helpers';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';
import { formatDisplayDateTime } from '@/utils/date-utils';
import { formatFileSize, getFileExtension } from '@/utils/file-utils';

const ASSIGNEE_SELECT_ITEMS = ASSIGNEE_OPTIONS.map((name) => ({
  value: name,
  label: name,
  name,
  full_name: name,
}));

function getTags(layout, localChanges) {
  if (localChanges.tags != null) {
    return (Array.isArray(localChanges.tags) ? localChanges.tags : [localChanges.tags])
      .map((tag) => String(tag).trim())
      .filter(Boolean);
  }
  return getLayoutRowFieldValue(layout, 'tags');
}

function getAssignees(layout, localChanges) {
  const local = getFieldValue(layout, localChanges, 'assignee');
  if (local !== undefined && local !== null && local !== '') {
    return Array.isArray(local) ? local : [local];
  }
  return getLayoutRowFieldValue(layout, 'assignee');
}

export default function ProjectLayoutViewDrawer({
  isOpen,
  onClose,
  layout,
  onRefresh,
  layouts = [],
  onLayoutChange,
}) {
  const dispatch = useDispatch();
  const updateQueueRef = useRef(Promise.resolve());
  const previousLayoutIdRef = useRef(null);

  const [localChanges, setLocalChanges] = useState({});
  const [titleError, setTitleError] = useState('');

  const layoutTitle = getFieldValue(layout, localChanges, 'task_name');
  const status = getFieldValue(layout, localChanges, 'status');
  const priority = getFieldValue(layout, localChanges, 'priority');
  const layoutType = getFieldValue(layout, localChanges, 'layout_type');
  const duration = getFieldValue(layout, localChanges, 'duration');
  const description = getFieldValue(layout, localChanges, 'description') || '';
  const assignedTo = useMemo(() => getAssignees(layout, localChanges), [layout, localChanges]);
  const tags = useMemo(() => getTags(layout, localChanges), [layout, localChanges]);
  const attachments = useMemo(() => normalizeTaskAttachments(layout), [layout]);

  const statusOptions =
    status && !STATUS_OPTIONS.includes(status) ? [status, ...STATUS_OPTIONS] : STATUS_OPTIONS;
  const layoutTypeOptions =
    layoutType && !LAYOUT_TYPE_OPTIONS.includes(layoutType)
      ? [layoutType, ...LAYOUT_TYPE_OPTIONS]
      : LAYOUT_TYPE_OPTIONS;

  const handleFieldChange = useCallback(
    (fieldName, value) => {
      const layoutId = layout?.name || layout?.id;
      if (!layoutId) return;

      if (layoutFieldValuesEqual(fieldName, getLayoutRowFieldValue(layout, fieldName), value)) {
        setLocalChanges((previous) => {
          if (!(fieldName in previous)) return previous;
          const next = { ...previous };
          delete next[fieldName];
          return next;
        });
        return;
      }

      setLocalChanges((previous) => ({ ...previous, [fieldName]: value }));

      updateQueueRef.current = updateQueueRef.current
        .catch(() => {})
        .then(async () => {
          try {
            await dispatch(
              updateProjectLayoutMasterField(
                buildProjectLayoutFieldFormData(layoutId, fieldName, value),
              ),
            ).unwrap();
            await onRefresh?.();
            setLocalChanges((previous) => {
              if (!(fieldName in previous)) return previous;
              const next = { ...previous };
              delete next[fieldName];
              return next;
            });
          } catch (error) {
            showErrorToast(extractErrorMessage(error) || 'Failed to update layout');
          }
        });
    },
    [dispatch, layout, onRefresh],
  );

  useEffect(() => {
    if (!isOpen) {
      setLocalChanges({});
      setTitleError('');
      updateQueueRef.current = Promise.resolve();
      previousLayoutIdRef.current = null;
      return;
    }

    const layoutId = layout?.name || layout?.id;
    if (previousLayoutIdRef.current !== layoutId) {
      previousLayoutIdRef.current = layoutId;
      setLocalChanges({});
      setTitleError('');
      updateQueueRef.current = Promise.resolve();
    }
  }, [isOpen, layout?.id, layout?.name]);

  const currentLayoutIndex = layouts.findIndex(
    (row) => (row.name || row.id) === (layout?.name || layout?.id),
  );
  const hasPrevious = currentLayoutIndex > 0;
  const hasNext = currentLayoutIndex >= 0 && currentLayoutIndex < layouts.length - 1;

  if (!isOpen || !layout) return null;

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <Drawer.Content className='max-w-[600px]'>
        <Drawer.Header
          className='border-b border-stroke-soft-200 px-6 py-3'
          showCloseButton={false}
        >
          <div className='flex w-full items-center justify-between'>
            {layouts.length > 0 ? (
              <ButtonGroup.Root size='xsmall'>
                <ButtonGroup.Item
                  onClick={() =>
                    hasPrevious && onLayoutChange?.(layouts[currentLayoutIndex - 1]?.name)
                  }
                  disabled={!hasPrevious}
                >
                  <ButtonGroup.Icon as={RiArrowLeftSLine} />
                </ButtonGroup.Item>
                <ButtonGroup.Item
                  onClick={() => hasNext && onLayoutChange?.(layouts[currentLayoutIndex + 1]?.name)}
                  disabled={!hasNext}
                >
                  <ButtonGroup.Icon as={RiArrowRightSLine} />
                </ButtonGroup.Item>
              </ButtonGroup.Root>
            ) : (
              <span />
            )}
            <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onClose}>
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </Drawer.Header>

        <Drawer.Body className='flex-1 overflow-y-auto p-0'>
          <div className='flex flex-col gap-6 px-6 pb-6 pt-5'>
            <div className='flex flex-col gap-1'>
              <Textarea.Root
                variant='borderless'
                simple
                value={layoutTitle || ''}
                onChange={(event) => {
                  if (titleError) setTitleError('');
                  setLocalChanges((previous) => ({ ...previous, task_name: event.target.value }));
                }}
                onBlur={(event) => {
                  const value = event.target.value.trim();
                  if (!value) {
                    setTitleError('Title is required');
                    return;
                  }
                  setTitleError('');
                  handleFieldChange('task_name', value);
                }}
                rows={1}
                hasError={Boolean(titleError)}
                placeholder='Enter layout title'
                className='field-sizing-content p-1 text-title-h5 text-text-main-900 break-words whitespace-normal'
              />
              {titleError && (
                <span className='text-paragraph-xs text-error-base'>{titleError}</span>
              )}
            </div>

            <section>
              <div className='mb-3 flex items-center gap-2 text-label-md text-text-sub-500'>
                <RiStickyNoteLine className='size-5 text-text-soft-400' />
                Description
              </div>
              <InlineEditableRichEditor
                value={description}
                onSave={(value) => handleFieldChange('description', value)}
              />
            </section>

            <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
              <FieldRow icon={RiPriceTag3Line} label='Status' editable>
                <Select.Root
                  variant='borderless'
                  value={status}
                  onValueChange={(value) => handleFieldChange('status', value)}
                  size='xsmall'
                >
                  <Select.Trigger className='w-full' showArrow={false}>
                    <Select.Value>
                      <Badge.Root variant='light' color={colorForStatus(status)}>
                        {status || 'Not Set'}
                      </Badge.Root>
                    </Select.Value>
                  </Select.Trigger>
                  <Select.Content>
                    {statusOptions.map((option) => (
                      <Select.Item key={option} value={option}>
                        <Badge.Root variant='light' color={colorForStatus(option)}>
                          {option}
                        </Badge.Root>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </FieldRow>

              <FieldRow icon={RiFlagLine} label='Priority' editable>
                <Select.Root
                  variant='borderless'
                  value={priority}
                  onValueChange={(value) => handleFieldChange('priority', value)}
                  size='xsmall'
                >
                  <Select.Trigger className='w-full' showArrow={false}>
                    <Select.Value>
                      <Badge.Root variant='light' color={colorForPriority(priority)}>
                        {priority || 'Not Set'}
                      </Badge.Root>
                    </Select.Value>
                  </Select.Trigger>
                  <Select.Content>
                    {PRIORITY_OPTIONS.map((option) => (
                      <Select.Item key={option} value={option}>
                        <Badge.Root variant='light' color={colorForPriority(option)}>
                          {option}
                        </Badge.Root>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </FieldRow>

              <FieldRow icon={RiLayout6Line} label='Layout Type' editable>
                <Select.Root
                  variant='borderless'
                  value={layoutType || ''}
                  onValueChange={(value) => handleFieldChange('layout_type', value)}
                  size='xsmall'
                >
                  <Select.Trigger className='w-full' showArrow={false}>
                    <Select.Value>
                      <span className='text-paragraph-sm text-text-strong-950'>
                        {layoutType || 'Not Set'}
                      </span>
                    </Select.Value>
                  </Select.Trigger>
                  <Select.Content>
                    {layoutTypeOptions.map((option) => (
                      <Select.Item key={option} value={option}>
                        {option}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </FieldRow>

              <FieldRow icon={RiUserLine} label='Assignee' editable>
                <AssigneeMultiSelect
                  value={assignedTo}
                  options={ASSIGNEE_SELECT_ITEMS}
                  onBlur={(values) =>
                    handleFieldChange('assignee', Array.isArray(values) ? values : [])
                  }
                  placeholder='Select assignees'
                  maxVisibleAvatars={3}
                  variant='borderless'
                  size='small'
                />
              </FieldRow>

              <FieldRow icon={RiCalendarLine} label='Duration' editable>
                <Input.Root variant='borderless' size='small'>
                  <Input.Wrapper>
                    <Input.Input
                      type='text'
                      inputMode='numeric'
                      value={duration || ''}
                      onChange={(event) =>
                        setLocalChanges((previous) => ({
                          ...previous,
                          duration: sanitizeUnsignedIntegerInput(event.target.value),
                        }))
                      }
                      onBlur={(event) =>
                        handleFieldChange(
                          'duration',
                          sanitizeUnsignedIntegerInput(event.target.value.trim()),
                        )
                      }
                      placeholder='Enter duration'
                    />
                    <Input.Affix>Days</Input.Affix>
                  </Input.Wrapper>
                </Input.Root>
              </FieldRow>
            </div>

            <ProjectDrawerTagsSection
              tags={tags}
              onTagsChange={(nextTags) => handleFieldChange('tags', nextTags)}
              resetKey={layout?.name ?? layout?.id}
            />

            {attachments.length > 0 && (
              <div className='flex flex-col gap-3'>
                <div className='flex items-center gap-2'>
                  <RiAttachment2 className='size-5 text-text-sub-500' />
                  <span className='label-small text-text-sub-500'>Attachments</span>
                </div>
                {attachments.map((attachment, index) => {
                  const downloadUrl = attachment.fileUrl || attachment.url;
                  const extension = attachment.extension || getFileExtension(attachment.fileName);
                  return (
                    <div
                      key={attachment.id || `${attachment.fileName}-${index}`}
                      className='flex items-center gap-3 rounded-xl border border-stroke-soft-200 bg-white px-4 py-3'
                    >
                      <FileFormatIcon.Root
                        format={extension || 'FILE'}
                        size='small'
                        color={IMAGE_EXTENSIONS.has(extension) ? 'blue' : 'purple'}
                      />
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-label-sm text-text-main-900'>
                          {attachment.fileName || 'Attachment'}
                        </p>
                        <p className='text-paragraph-xs text-text-sub-500'>
                          {attachment.size != null && attachment.size !== ''
                            ? formatFileSize(attachment.size)
                            : ''}
                          {attachment.createdAt
                            ? ` · ${formatDisplayDateTime(attachment.createdAt)}`
                            : ''}
                        </p>
                      </div>
                      {downloadUrl && (
                        <Button.Root variant='neutral' mode='ghost' size='xsmall' asChild>
                          <a href={downloadUrl} target='_blank' rel='noopener noreferrer' download>
                            <Button.Icon as={RiDownloadLine} />
                          </a>
                        </Button.Root>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
}
