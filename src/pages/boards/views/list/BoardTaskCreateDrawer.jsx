import { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  RiEditBoxLine,
  RiStickyNoteLine,
  RiUserLine,
  RiCalendarLine,
  RiCalendarEventLine,
  RiFlagLine,
  RiAttachment2,
  RiPriceTag3Line,
  RiCloseLine,
} from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import * as Badge from '@/components/ui/badge';
import * as Select from '@/components/ui/select';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Tag from '@/components/ui/tag';
import ErrorText from '@/components/ui/error-text';
import * as Textarea from '@/components/ui/textarea';
import { Datepicker } from '@/pages/boards/components/datepicker';
import AssigneeMultiSelect from '@/pages/boards/components/assignee-multi-select';
import FieldRow from '@/components/ui/field-row';
import BoardTaskStatusDropdown from './components/BoardTaskStatusDropdown';
import BoardAttachmentUploader from '../../attachments/BoardAttachmentUploader';
import { useBoardListStatusOptions } from '../../hooks/useBoardListStatusOptions';
import { getPriorityColor, TASK_PRIORITY_OPTIONS } from '@/components/clients-management/constants';
import { parseToDate } from '@/utils/date-utils';
import {
  boardTaskDateIncludesTime,
  serializeBoardTaskDate,
} from '../../utils/board-task-date-utils';
import { createBoardTask, uploadBoardTaskAttachment } from '@/services/tasks-service';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const boardTaskCreateSchema = z.object({
  taskTitle: z.string().trim().min(1, 'Task title is required'),
  description: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
  assignees: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.string().optional(),
});

const defaultBoardTaskValues = {
  taskTitle: '',
  description: '',
  status: '',
  assignees: [],
  startDate: '',
  dueDate: '',
  priority: 'Low',
};

export default function BoardTaskCreateDrawer({
  open = false,
  onOpenChange,
  listId,
  onSuccess,
  statusTemplateVersion = 0,
}) {
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState('create');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const {
    groups: statusGroups,
    defaultStatusId,
    isLoading: isStatusLoading,
  } = useBoardListStatusOptions(listId, statusTemplateVersion);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(boardTaskCreateSchema),
    defaultValues: defaultBoardTaskValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (open) {
      reset({
        ...defaultBoardTaskValues,
        status: defaultStatusId || '',
      });
      setPendingFiles([]);
      setIsDescriptionOpen(false);
      setSubmitMode('create');
      setTags([]);
      setTagInput('');
    }
  }, [open, reset, defaultStatusId]);

  const handleClose = useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  // Called by BoardAttachmentUploader with pre-validated File objects.
  const handleFilesSelected = useCallback((validFiles) => {
    setPendingFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const removePendingFile = useCallback((index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeTag = useCallback((tagToRemove) => {
    setTags((previous) => previous.filter((tag) => tag !== tagToRemove));
  }, []);

  const handleTagInput = useCallback(
    (event) => {
      if (event.key !== 'Enter' || !tagInput.trim()) {
        return;
      }

      event.preventDefault();
      const newTag = tagInput.trim();
      const exists = tags.some((tag) => tag.toLowerCase() === newTag.toLowerCase());

      if (!exists) {
        setTags((previous) => [...previous, newTag]);
      }

      setTagInput('');
    },
    [tagInput, tags],
  );

  const onSubmitForm = async (data, mode = 'create') => {
    if (!listId) {
      showErrorToast('List is required to create a task.');
      return;
    }

    const assignees = Array.isArray(data.assignees) ? data.assignees : [];
    const isDraft = mode === 'draft';

    setIsSubmitting(true);
    setSubmitMode(mode);

    const result = await createBoardTask({
      listId,
      title: data.taskTitle,
      description: data.description ?? '',
      status: data.status,
      priority: data.priority ?? 'Low',
      startDate: data.startDate ?? '',
      dueDate: data.dueDate ?? '',
      assignees,
      tags,
      isDraft,
    });

    if (result.error) {
      setIsSubmitting(false);
      showErrorToast(result.error);
      return;
    }

    const createdTask = result.data ?? {};
    const taskId = createdTask.name ?? createdTask.id;

    if (taskId && pendingFiles.length > 0) {
      const uploadErrors = [];

      for (const file of pendingFiles) {
        const uploadResult = await uploadBoardTaskAttachment(taskId, file);
        if (uploadResult.error) uploadErrors.push(uploadResult.error);
      }

      if (uploadErrors.length > 0 && uploadErrors.length === pendingFiles.length) {
        setIsSubmitting(false);
        showErrorToast('Attachments failed to upload. Task was created.');
        return;
      }

      if (uploadErrors.length > 0) {
        showErrorToast('Some attachments failed to upload.');
      }
    }

    setIsSubmitting(false);

    showSuccessToast(isDraft ? 'Task saved as draft.' : 'Task created.');
    handleClose();
    onSuccess?.(result.data);
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <Drawer.Content className='relative flex h-full max-w-[560px] flex-col overflow-hidden'>
        <Drawer.Header className='sticky top-0 z-10 shrink-0 bg-white px-8 py-5'>
          <div className='flex items-start gap-4 pr-10'>
            <div className='rounded-full border border-stroke-soft-200 p-2.5'>
              <RiEditBoxLine size={24} className='text-icon-sub-500' />
            </div>
            <div className='flex min-w-0 flex-1 flex-col gap-1'>
              <Drawer.Title className='label-medium text-text-main-900'>
                Create New Task
              </Drawer.Title>
              <p className='paragraph-small text-text-sub-500'>Enter task details</p>
            </div>
          </div>
        </Drawer.Header>

        <form
          onSubmit={(event) => event.preventDefault()}
          className='flex min-h-0 flex-1 flex-col overflow-hidden'
        >
          <Drawer.Body className='flex-1 overflow-y-auto px-8 pb-6 pt-6'>
            <div className='flex flex-col gap-5'>
              <Controller
                name='status'
                control={control}
                render={({ field }) => (
                  <BoardTaskStatusDropdown
                    value={field.value}
                    onValueChange={field.onChange}
                    groups={statusGroups}
                    disabled={isSubmitting}
                    isLoading={isStatusLoading}
                    hasError={isSubmitted && Boolean(errors.status)}
                  />
                )}
              />
              {isSubmitted && errors.status ? <ErrorText>{errors.status.message}</ErrorText> : null}

              <div className='flex flex-col gap-4'>
                <div>
                  <Controller
                    name='taskTitle'
                    control={control}
                    render={({ field }) => (
                      <Textarea.Root
                        {...field}
                        id='board-task-title'
                        hasError={isSubmitted && Boolean(errors.taskTitle)}
                        placeholder='Enter task title'
                        disabled={isSubmitting}
                        className='field-sizing-content text-2xl font-medium leading-8'
                        simple
                      />
                    )}
                  />
                  {isSubmitted && errors.taskTitle ? (
                    <ErrorText>{errors.taskTitle.message}</ErrorText>
                  ) : null}
                </div>

                <div>
                  {isDescriptionOpen ? (
                    <Controller
                      name='description'
                      control={control}
                      render={({ field }) => (
                        <Textarea.Root
                          {...field}
                          rows={4}
                          placeholder='Add description'
                          disabled={isSubmitting}
                          maxLength={200}
                          className='min-h-[116px]'
                        >
                          <Textarea.CharCounter
                            current={field.value?.length || 0}
                            max={200}
                            className='text-text-sub-500'
                          />
                        </Textarea.Root>
                      )}
                    />
                  ) : (
                    <button
                      type='button'
                      onClick={() => setIsDescriptionOpen(true)}
                      className='flex w-full cursor-pointer items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 hover:border-stroke-sub-300'
                    >
                      <RiStickyNoteLine className='size-5 text-text-soft-400' />
                      <span className='text-paragraph-md text-text-soft-400'>Add description</span>
                    </button>
                  )}
                </div>
              </div>

              <div className='divide-y divide-stroke-soft-200 overflow-hidden rounded-xl border border-stroke-soft-200 bg-white'>
                <FieldRow icon={RiUserLine} label='Assignee'>
                  <Controller
                    name='assignees'
                    control={control}
                    render={({ field }) => (
                      <AssigneeMultiSelect
                        value={Array.isArray(field.value) ? field.value : []}
                        onChange={(values) => field.onChange(values)}
                        disabled={isSubmitting}
                        placeholder='Select'
                        size='xsmall'
                        variant='borderless'
                      />
                    )}
                  />
                </FieldRow>

                <FieldRow icon={RiCalendarEventLine} label='Start Date'>
                  <Controller
                    name='startDate'
                    control={control}
                    render={({ field }) => (
                      <Datepicker
                        optionalTime
                        valueIncludesTime={boardTaskDateIncludesTime(field.value)}
                        value={field.value ? parseToDate(field.value) : null}
                        onChange={(date, meta) => {
                          field.onChange(
                            date ? serializeBoardTaskDate(date, meta?.includeTime) : '',
                          );
                        }}
                        disabled={isSubmitting}
                        placeholder='DD / MM / YYYY'
                        size='xsmall'
                        variant='borderless'
                      />
                    )}
                  />
                </FieldRow>

                <FieldRow icon={RiCalendarLine} label='Due Date'>
                  <Controller
                    name='dueDate'
                    control={control}
                    render={({ field }) => (
                      <Datepicker
                        optionalTime
                        valueIncludesTime={boardTaskDateIncludesTime(field.value)}
                        value={field.value ? parseToDate(field.value) : null}
                        onChange={(date, meta) => {
                          field.onChange(
                            date ? serializeBoardTaskDate(date, meta?.includeTime) : '',
                          );
                        }}
                        disabled={isSubmitting}
                        placeholder='DD / MM / YYYY'
                        size='xsmall'
                        variant='borderless'
                      />
                    )}
                  />
                </FieldRow>

                <FieldRow icon={RiFlagLine} label='Priority'>
                  <Controller
                    name='priority'
                    control={control}
                    render={({ field }) => (
                      <Select.Root
                        variant='borderless'
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isSubmitting}
                        size='xsmall'
                      >
                        <Select.Trigger id='board-task-priority'>
                          <Select.Value placeholder='Select'>
                            {field.value ? (
                              <Badge.Root
                                variant='light'
                                color={getPriorityColor(field.value)}
                                className='text-nowrap uppercase'
                              >
                                {field.value}
                              </Badge.Root>
                            ) : (
                              'Select'
                            )}
                          </Select.Value>
                        </Select.Trigger>
                        <Select.Content>
                          {TASK_PRIORITY_OPTIONS.map((option) => (
                            <Select.Item key={option.value} value={option.value}>
                              <Badge.Root
                                variant='light'
                                color={getPriorityColor(option.value)}
                                className='text-nowrap uppercase'
                              >
                                {option.label}
                              </Badge.Root>
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    )}
                  />
                </FieldRow>
              </div>

              <div className='flex flex-col gap-4'>
                <div className='flex items-center gap-2'>
                  <RiPriceTag3Line className='size-5 text-text-sub-500' />
                  <Label.Root className='text-label-md text-text-sub-500'>Tags</Label.Root>
                </div>
                <div className='flex flex-col gap-2'>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        placeholder='Type here and press Enter'
                        onKeyDown={handleTagInput}
                        disabled={isSubmitting}
                        value={tagInput}
                        onChange={(event) => setTagInput(event.target.value)}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {tags.length > 0 ? (
                    <div className='flex flex-wrap gap-2'>
                      {tags.map((tag) => (
                        <Tag.Root key={tag} variant='stroke'>
                          <span className='text-label-xs text-text-sub-600'>{tag}</span>
                          <Tag.DismissButton
                            onClick={() => removeTag(tag)}
                            aria-label={`Remove ${tag}`}
                          />
                        </Tag.Root>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className='flex flex-col gap-2 pb-2'>
                <div className='flex items-center gap-2'>
                  <RiAttachment2 className='size-5 text-text-sub-500' />
                  <span className='label-md text-text-sub-500'>Attachments</span>
                </div>

                <BoardAttachmentUploader
                  onFilesSelected={handleFilesSelected}
                  disabled={isSubmitting}
                />

                {pendingFiles.length > 0 ? (
                  <ul className='flex flex-col gap-1'>
                    {pendingFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className='flex items-center justify-between gap-2 rounded-lg border border-stroke-soft-200 px-3 py-2'
                      >
                        <span className='min-w-0 truncate text-paragraph-sm text-text-main-900'>
                          {file.name}
                        </span>
                        <button
                          type='button'
                          aria-label={`Remove ${file.name}`}
                          onClick={() => removePendingFile(index)}
                          disabled={isSubmitting}
                          className='shrink-0 text-icon-sub-500 hover:text-error-base disabled:opacity-50'
                        >
                          <RiCloseLine className='size-4' />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </Drawer.Body>

          <Drawer.Footer className='sticky bottom-0 z-10 shrink-0 border-t border-stroke-soft-200 bg-white px-8 py-6'>
            <div className='flex items-center justify-between gap-3'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button.Root>

              <div className='flex items-center gap-3'>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  disabled={isSubmitting}
                  onClick={handleSubmit((data) => onSubmitForm(data, 'draft'))}
                >
                  {isSubmitting && submitMode === 'draft' ? 'Saving...' : 'Save as Draft'}
                </Button.Root>
                <Button.Root
                  type='button'
                  variant='primary'
                  mode='filled'
                  disabled={isSubmitting}
                  onClick={handleSubmit((data) => onSubmitForm(data, 'create'))}
                >
                  {isSubmitting && submitMode === 'create' ? 'Creating...' : 'Create'}
                </Button.Root>
              </div>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
}
