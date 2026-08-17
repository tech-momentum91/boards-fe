import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarLine,
  RiCloseLine,
  RiFileTextLine,
  RiFlagLine,
  RiPriceTag3Line,
  RiStickyNoteLine,
  RiUserLine,
} from 'react-icons/ri';
import { useDispatch } from 'react-redux';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Drawer from '@/components/ui/drawer';
import FieldRow from '@/components/ui/field-row';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Textarea from '@/components/ui/textarea';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import { InlineEditableRichEditor } from '@/components/event-management/inline-editable-fields';
import ProjectDrawerTagsSection from '@/components/projects/shared/project-drawer-tags-section';
import { sanitizeUnsignedIntegerInput } from '@/components/client-onboarding/task-view-drawer-utils';
import { updateProjectDocumentMasterField } from '@/redux/projectMasterSlice';
import {
  ASSIGNEE_OPTIONS,
  colorForPriority,
  colorForStatus,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
} from '@/pages/profile/project-master/project-master.constants';
import {
  buildProjectDocumentUpdatePayload,
  documentFieldValuesEqual,
  getDocumentRowFieldValue,
} from '@/pages/profile/project-master/project-master-helpers';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';

const ASSIGNEE_SELECT_ITEMS = ASSIGNEE_OPTIONS.map((name) => ({
  value: name,
  label: name,
  name,
  full_name: name,
}));

function getLocalFieldValue(document, localChanges, fieldName) {
  if (localChanges[fieldName] !== undefined && localChanges[fieldName] !== null) {
    return localChanges[fieldName];
  }
  return getDocumentRowFieldValue(document, fieldName);
}

function getTags(document, localChanges) {
  if (localChanges.tags != null) {
    return (Array.isArray(localChanges.tags) ? localChanges.tags : [localChanges.tags])
      .map((tag) => String(tag).trim())
      .filter(Boolean);
  }
  return getDocumentRowFieldValue(document, 'tags');
}

function getAssignees(document, localChanges) {
  if (localChanges.assignee != null) {
    return Array.isArray(localChanges.assignee) ? localChanges.assignee : [localChanges.assignee];
  }
  return getDocumentRowFieldValue(document, 'assignee');
}

export default function ProjectDocumentViewDrawer({
  isOpen,
  onClose,
  document,
  onRefresh,
  documents = [],
  onDocumentChange,
  isLoading = false,
  categoryOptions = [],
}) {
  const dispatch = useDispatch();
  const updateQueueRef = useRef(Promise.resolve());
  const previousDocumentIdRef = useRef(null);

  const [localChanges, setLocalChanges] = useState({});
  const [titleError, setTitleError] = useState('');

  const documentTitle = getLocalFieldValue(document, localChanges, 'task_name');
  const status = getLocalFieldValue(document, localChanges, 'status');
  const priority = getLocalFieldValue(document, localChanges, 'priority');
  const documentCategory = getLocalFieldValue(document, localChanges, 'document_category');
  const duration = getLocalFieldValue(document, localChanges, 'duration');
  const description = getLocalFieldValue(document, localChanges, 'description') || '';
  const assignedTo = useMemo(() => getAssignees(document, localChanges), [document, localChanges]);
  const tags = useMemo(() => getTags(document, localChanges), [document, localChanges]);

  const statusOptions =
    status && !STATUS_OPTIONS.includes(status) ? [status, ...STATUS_OPTIONS] : STATUS_OPTIONS;
  const categorySelectOptions = useMemo(() => {
    const value = String(documentCategory ?? '').trim();
    if (!value || categoryOptions.some((option) => option.value === value)) {
      return categoryOptions;
    }
    return [{ value, label: value }, ...categoryOptions];
  }, [categoryOptions, documentCategory]);

  const handleFieldChange = useCallback(
    (fieldName, value) => {
      const documentId = document?.name || document?.id;
      if (!documentId) return;

      if (
        documentFieldValuesEqual(fieldName, getDocumentRowFieldValue(document, fieldName), value)
      ) {
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
              updateProjectDocumentMasterField(
                buildProjectDocumentUpdatePayload(documentId, fieldName, value),
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
            showErrorToast(extractErrorMessage(error) || 'Failed to update document');
          }
        });
    },
    [dispatch, document, onRefresh],
  );

  useEffect(() => {
    if (!isOpen) {
      setLocalChanges({});
      setTitleError('');
      updateQueueRef.current = Promise.resolve();
      previousDocumentIdRef.current = null;
      return;
    }

    const documentId = document?.name || document?.id;
    if (previousDocumentIdRef.current !== documentId) {
      previousDocumentIdRef.current = documentId;
      setLocalChanges({});
      setTitleError('');
      updateQueueRef.current = Promise.resolve();
    }
  }, [document, isOpen]);

  const currentDocumentIndex = documents.findIndex(
    (row) => (row.name || row.id) === (document?.name || document?.id),
  );
  const hasPrevious = currentDocumentIndex > 0;
  const hasNext = currentDocumentIndex >= 0 && currentDocumentIndex < documents.length - 1;

  if (!isOpen) return null;

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <Drawer.Content className='max-w-[600px]'>
        <Drawer.Header
          className='border-b border-stroke-soft-200 px-6 py-3'
          showCloseButton={false}
        >
          <div className='flex w-full items-center justify-between'>
            {documents.length > 0 ? (
              <ButtonGroup.Root size='xsmall'>
                <ButtonGroup.Item
                  onClick={() =>
                    hasPrevious && onDocumentChange?.(documents[currentDocumentIndex - 1]?.name)
                  }
                  disabled={!hasPrevious || isLoading}
                >
                  <ButtonGroup.Icon as={RiArrowLeftSLine} />
                </ButtonGroup.Item>
                <ButtonGroup.Item
                  onClick={() =>
                    hasNext && onDocumentChange?.(documents[currentDocumentIndex + 1]?.name)
                  }
                  disabled={!hasNext || isLoading}
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
          {isLoading || !document ? (
            <div className='flex min-h-[320px] items-center justify-center px-6 py-10 text-paragraph-sm text-text-sub-500'>
              Loading document…
            </div>
          ) : (
            <div className='flex flex-col gap-6 px-6 pb-6 pt-5'>
              <div className='flex flex-col gap-1'>
                <Textarea.Root
                  variant='borderless'
                  simple
                  value={documentTitle || ''}
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
                  placeholder='Enter document title'
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

                <FieldRow icon={RiFileTextLine} label='Category' editable>
                  <Select.Root
                    variant='borderless'
                    value={documentCategory || ''}
                    onValueChange={(value) => handleFieldChange('document_category', value)}
                    size='xsmall'
                  >
                    <Select.Trigger className='w-full' showArrow={false}>
                      <Select.Value>
                        <span className='text-paragraph-sm text-text-strong-950'>
                          {(categorySelectOptions.find(
                            (option) => option.value === documentCategory,
                          )?.label ??
                            documentCategory) ||
                            'Not Set'}
                        </span>
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content>
                      {categorySelectOptions.map((option) => (
                        <Select.Item key={option.value} value={option.value}>
                          {option.label}
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
                        value={duration != null && duration !== '' ? String(duration) : ''}
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
                resetKey={document?.name ?? document?.id}
              />
            </div>
          )}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
}
