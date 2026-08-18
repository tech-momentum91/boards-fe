import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  RiAttachment2,
  RiCalendarLine,
  RiCheckboxBlankLine,
  RiCheckboxLine,
  RiCloseLine,
  RiExternalLinkLine,
  RiImageAddLine,
  RiLoader4Line,
  RiMailLine,
  RiPhoneLine,
  RiUploadLine,
} from 'react-icons/ri';
import AssigneeMultiSelect from '@/pages/boards/components/assignee-multi-select';
import { Calendar } from '@/components/ui/calendar';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';
import { resolveFileUrl } from '@/lib/utils';
import { parseToDate } from '@/utils/date-utils';
import { formatListDateLabel, isListDateOverdue } from '@/pages/boards/utils/board-task-date-utils';
import { uploadTaskCustomFieldFile } from '@/services/tasks-service';
import {
  isCheckboxChecked,
  normalizeCustomFieldValue,
  normalizeUrlValue,
  resolveCustomFieldDisplayValue,
  validateCustomFieldValue,
} from '../utils/custom-field-utils';

function normalizeStoredValue(value) {
  if (value == null || value === '') {
    return '';
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'object') {
    return value;
  }

  return String(value);
}

function TextFieldCell({
  value,
  placeholder,
  type = 'text',
  multiline = false,
  disabled,
  column,
  fieldType = 'text',
  onCommit,
}) {
  const [draft, setDraft] = useState(String(value ?? ''));
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(String(value ?? ''));
    setError('');
  }, [value]);

  const commit = () => {
    const next = multiline ? draft : draft.trim();
    const validationError = validateCustomFieldValue(fieldType, next, column);

    if (validationError) {
      setError(validationError);
      return;
    }

    const normalized = normalizeCustomFieldValue(fieldType, next);
    const previous = normalizeCustomFieldValue(fieldType, value ?? '');

    if (normalized === previous) {
      setDraft(String(value ?? ''));
      setError('');
      setIsEditing(false);
      return;
    }

    onCommit?.(normalized);
    setError('');
    setIsEditing(false);
  };

  if (isEditing) {
    const InputComponent = multiline ? 'textarea' : 'input';

    return (
      <div className='flex h-full min-h-11 w-full flex-col justify-center gap-1 px-2 py-1'>
        <InputComponent
          ref={inputRef}
          type={multiline ? undefined : type}
          inputMode={type === 'tel' ? 'tel' : undefined}
          value={draft}
          rows={multiline ? 3 : undefined}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) {
              setError('');
            }
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (!multiline && event.key === 'Enter') {
              event.preventDefault();
              inputRef.current?.blur();
            }

            if (event.key === 'Escape') {
              event.preventDefault();
              setDraft(String(value ?? ''));
              setError('');
              setIsEditing(false);
            }
          }}
          disabled={disabled}
          autoFocus
          className='w-full min-w-0 rounded-md border border-stroke-soft-200 bg-bg-white-0 px-2 py-1 text-sm text-text-main-900 outline-none focus:border-primary-base focus:ring-1 focus:ring-primary-base disabled:opacity-60'
        />
        {error ? <span className='px-1 text-xs text-error-base'>{error}</span> : null}
      </div>
    );
  }

  return (
    <button
      type='button'
      disabled={disabled}
      onClick={() => {
        if (disabled) {
          return;
        }

        setIsEditing(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }}
      className={cn(
        'flex h-full min-h-11 w-full items-center px-3 text-left transition-colors',
        'hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-inset',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span className={cn('truncate text-sm', value ? 'text-text-sub-500' : 'text-text-soft-400')}>
        {value ? String(value) : placeholder}
      </span>
    </button>
  );
}

function EmailFieldCell({ value, placeholder, disabled, column, onCommit }) {
  const [isEditing, setIsEditing] = useState(false);
  const displayValue = String(value ?? '');

  if (!displayValue || isEditing) {
    return (
      <TextFieldCell
        value={displayValue}
        placeholder={placeholder}
        type='email'
        column={column}
        fieldType='email'
        disabled={disabled}
        onCommit={(nextValue) => {
          onCommit?.(nextValue);
          setIsEditing(false);
        }}
      />
    );
  }

  return (
    <div className='flex h-full min-h-11 w-full items-center gap-2 px-3'>
      <RiMailLine size={16} className='shrink-0 text-icon-sub-500' />
      <a
        href={`mailto:${displayValue}`}
        className='min-w-0 truncate text-sm text-primary-base hover:underline'
        onClick={(event) => event.stopPropagation()}
      >
        {displayValue}
      </a>
      {!disabled ? (
        <div className='ml-auto flex shrink-0 items-center gap-1'>
          <button
            type='button'
            onClick={() => setIsEditing(true)}
            className='text-xs text-icon-sub-500 hover:text-text-main-900'
          >
            Edit
          </button>
          <button
            type='button'
            onClick={() => onCommit?.('')}
            className='text-icon-sub-500 hover:text-text-main-900'
            aria-label='Clear email'
          >
            <RiCloseLine size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PhoneFieldCell({ value, placeholder, disabled, column, onCommit }) {
  const [isEditing, setIsEditing] = useState(false);
  const displayValue = String(value ?? '');

  if (!displayValue || isEditing) {
    return (
      <TextFieldCell
        value={displayValue}
        placeholder={placeholder}
        type='tel'
        column={column}
        fieldType='phone'
        disabled={disabled}
        onCommit={(nextValue) => {
          onCommit?.(nextValue);
          setIsEditing(false);
        }}
      />
    );
  }

  return (
    <div className='flex h-full min-h-11 w-full items-center gap-2 px-3'>
      <RiPhoneLine size={16} className='shrink-0 text-icon-sub-500' />
      <a
        href={`tel:${displayValue.replaceAll(/\s+/g, '')}`}
        className='min-w-0 truncate text-sm text-primary-base hover:underline'
        onClick={(event) => event.stopPropagation()}
      >
        {displayValue}
      </a>
      {!disabled ? (
        <div className='ml-auto flex shrink-0 items-center gap-1'>
          <button
            type='button'
            onClick={() => setIsEditing(true)}
            className='text-xs text-icon-sub-500 hover:text-text-main-900'
          >
            Edit
          </button>
          <button
            type='button'
            onClick={() => onCommit?.('')}
            className='text-icon-sub-500 hover:text-text-main-900'
            aria-label='Clear phone number'
          >
            <RiCloseLine size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function UrlFieldCell({ value, placeholder, disabled, column, onCommit }) {
  const [isEditing, setIsEditing] = useState(false);
  const displayValue = String(value ?? '');

  if (!displayValue || isEditing) {
    return (
      <TextFieldCell
        value={displayValue}
        placeholder={placeholder}
        type='url'
        column={column}
        fieldType='url'
        disabled={disabled}
        onCommit={(nextValue) => {
          onCommit?.(nextValue);
          setIsEditing(false);
        }}
      />
    );
  }

  const normalizedUrl = normalizeUrlValue(displayValue) ?? displayValue;

  return (
    <div className='flex h-full min-h-11 w-full items-center gap-2 px-3'>
      <a
        href={normalizedUrl}
        target='_blank'
        rel='noreferrer'
        className='min-w-0 truncate text-sm text-primary-base hover:underline'
        onClick={(event) => event.stopPropagation()}
      >
        {displayValue}
      </a>
      {!disabled ? (
        <div className='ml-auto flex shrink-0 items-center gap-1'>
          <a
            href={normalizedUrl}
            target='_blank'
            rel='noreferrer'
            className='text-icon-sub-500 hover:text-text-main-900'
            aria-label='Open URL'
            onClick={(event) => event.stopPropagation()}
          >
            <RiExternalLinkLine size={16} />
          </a>
          <button
            type='button'
            onClick={() => setIsEditing(true)}
            className='text-icon-sub-500 hover:text-text-main-900'
            aria-label='Edit URL'
          >
            Edit
          </button>
          <button
            type='button'
            onClick={() => onCommit?.('')}
            className='text-icon-sub-500 hover:text-text-main-900'
            aria-label='Clear URL'
          >
            <RiCloseLine size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DateFieldCell({ value, disabled, column, onCommit, hideEmptyPlaceholder = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const selectedDate = useMemo(() => (value ? parseToDate(String(value)) : undefined), [value]);
  const hasValue = Boolean(String(value ?? '').trim());

  const handleSelect = (date) => {
    const nextValue = date ? format(date, 'yyyy-MM-dd') : '';
    const validationError = validateCustomFieldValue('date', nextValue, column);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (nextValue === String(value ?? '')) {
      setIsOpen(false);
      return;
    }

    setError('');
    onCommit?.(nextValue);
    setIsOpen(false);
  };

  const handleClear = (event) => {
    event.stopPropagation();
    const validationError = validateCustomFieldValue('date', '', column);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    onCommit?.('');
  };

  const isOverdue = hasValue && isListDateOverdue(value);
  const label = hasValue ? formatListDateLabel(value) : hideEmptyPlaceholder ? '' : '—';

  return (
    <div className='flex h-full min-h-11 w-full flex-col justify-center'>
      <div className='flex h-full min-h-11 w-full items-center'>
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
          <Popover.Trigger asChild>
            <button
              type='button'
              disabled={disabled}
              className={cn(
                'flex h-full min-h-11 min-w-0 flex-1 items-center gap-1.5 px-3 text-left transition-colors',
                'hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-inset',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              {hasValue || !hideEmptyPlaceholder ? (
                <RiCalendarLine
                  size={16}
                  className={cn('shrink-0', isOverdue ? 'text-error-base' : 'text-icon-sub-500')}
                />
              ) : null}
              {label ? (
                <span
                  className={cn(
                    'truncate text-sm',
                    hasValue
                      ? isOverdue
                        ? 'text-error-base'
                        : 'text-text-sub-500'
                      : 'text-text-soft-400',
                  )}
                >
                  {label}
                </span>
              ) : null}
            </button>
          </Popover.Trigger>
          <Popover.Content align='start' showArrow={false} className='w-auto p-2'>
            <Calendar mode='single' selected={selectedDate} onSelect={handleSelect} initialFocus />
          </Popover.Content>
        </Popover.Root>
        {hasValue && !disabled && !column?.config?.required ? (
          <button
            type='button'
            onClick={handleClear}
            className='mr-2 shrink-0 text-icon-sub-500 hover:text-text-main-900'
            aria-label='Clear date'
          >
            <RiCloseLine size={16} />
          </button>
        ) : null}
      </div>
      {error ? <span className='px-3 text-xs text-error-base'>{error}</span> : null}
    </div>
  );
}

function CheckboxFieldCell({ value, disabled, onCommit }) {
  const checked = isCheckboxChecked(value);

  return (
    <button
      type='button'
      disabled={disabled}
      onClick={() => onCommit?.(!checked)}
      className={cn(
        'flex h-full min-h-11 w-full items-center px-3 transition-colors',
        'hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-inset',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      {checked ? (
        <RiCheckboxLine size={18} className='text-primary-base' />
      ) : (
        <RiCheckboxBlankLine size={18} className='text-icon-soft-400' />
      )}
    </button>
  );
}

function PeopleFieldCell({ value, disabled, column, onCommit, hideEmptyPlaceholder = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const assigneeIds = Array.isArray(value) ? value : value ? [String(value)] : [];
  const openedWithRef = useRef([]);
  const [draftAssignees, setDraftAssignees] = useState(assigneeIds);

  useEffect(() => {
    setDraftAssignees(Array.isArray(value) ? value : value ? [String(value)] : []);
  }, [value]);

  const handleOpenChange = (open) => {
    if (open) {
      openedWithRef.current = [...assigneeIds];
      setDraftAssignees([...assigneeIds]);
      setError('');
    } else {
      const validationError = validateCustomFieldValue('people', draftAssignees, column);

      if (validationError) {
        setError(validationError);
        return;
      }

      const previous = [...openedWithRef.current].sort().join(',');
      const next = [...draftAssignees].sort().join(',');

      if (previous !== next) {
        onCommit?.(draftAssignees);
      }
    }

    setIsOpen(open);
  };

  return (
    <div className='flex h-full min-h-11 w-full flex-col justify-center'>
      <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
        <Popover.Trigger asChild>
          <button
            type='button'
            disabled={disabled}
            className={cn(
              'flex h-full min-h-11 w-full items-center px-3 text-left transition-colors',
              'hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-inset',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            {assigneeIds.length > 0 ? (
              <span className='truncate text-sm text-text-sub-500'>
                {`${assigneeIds.length} selected`}
              </span>
            ) : hideEmptyPlaceholder ? null : (
              <span className='truncate text-sm text-text-soft-400'>—</span>
            )}
          </button>
        </Popover.Trigger>
        <Popover.Content
          align='start'
          showArrow={false}
          className='w-auto p-0'
          data-prevent-row-click
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {isOpen ? (
            <AssigneeMultiSelect
              listOnly
              value={draftAssignees}
              onChange={setDraftAssignees}
              disabled={disabled}
            />
          ) : null}
        </Popover.Content>
      </Popover.Root>
      {error ? <span className='px-3 text-xs text-error-base'>{error}</span> : null}
    </div>
  );
}

function normalizeFileValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return { url: value, name: (value.split('/').at(-1) || '').split('?')[0] || value };
  }

  if (typeof value === 'object' && value.url) {
    return {
      url: value.url,
      name: value.name || (value.url.split('/').at(-1) || '').split('?')[0] || value.url,
    };
  }

  return null;
}

function useFileUpload(onCommit, taskId) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const openPicker = () => {
    if (!taskId) {
      setUploadError('Save the task before uploading files.');
      return;
    }

    setUploadError('');
    inputRef.current?.click();
  };

  const handleFiles = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!taskId) {
      setUploadError('Save the task before uploading files.');
      return;
    }

    setUploading(true);
    setUploadError('');

    const result = await uploadTaskCustomFieldFile({ taskId, file });

    setUploading(false);

    if (result.error) {
      setUploadError(result.error);
      return;
    }

    const uploaded = result.data ?? {};
    onCommit?.({
      url: uploaded.fileUrl ?? uploaded.download_url ?? '',
      name: uploaded.fileName ?? uploaded.original_name ?? file.name,
      object_key: uploaded.objectKey ?? uploaded.object_key ?? '',
      file_id: uploaded.fileId ?? uploaded.file_id ?? '',
    });
  };

  return { inputRef, uploading, uploadError, openPicker, handleFiles };
}

function ImageFieldCell({ value, disabled, onCommit, taskId }) {
  const file = normalizeFileValue(value);
  const { inputRef, uploading, uploadError, openPicker, handleFiles } = useFileUpload(
    onCommit,
    taskId,
  );

  return (
    <div className='flex h-full min-h-11 w-full items-center gap-2 px-3'>
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        className='hidden'
        onChange={handleFiles}
      />

      {file ? (
        <div className='group/image flex items-center gap-2'>
          <a
            href={resolveFileUrl(file.url)}
            target='_blank'
            rel='noreferrer'
            className='block size-7 shrink-0 overflow-hidden rounded-md border border-stroke-soft-200'
          >
            <img
              src={resolveFileUrl(file.url)}
              alt={file.name}
              className='size-full object-cover'
            />
          </a>
          {!disabled ? (
            <button
              type='button'
              onClick={() => onCommit?.('')}
              className='text-icon-sub-500 opacity-0 transition hover:text-error-base group-hover/image:opacity-100'
              aria-label='Remove image'
            >
              <RiCloseLine size={16} />
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type='button'
          disabled={disabled || uploading}
          onClick={openPicker}
          className={cn(
            'flex items-center gap-1.5 text-sm transition-colors',
            uploadError ? 'text-error-base' : 'text-text-soft-400 hover:text-text-sub-500',
            (disabled || uploading) && 'cursor-not-allowed opacity-60',
          )}
        >
          {uploading ? (
            <RiLoader4Line size={16} className='animate-spin' />
          ) : (
            <RiImageAddLine size={16} />
          )}
          {uploading ? 'Uploading…' : uploadError ? 'Retry upload' : 'Add image'}
        </button>
      )}
    </div>
  );
}

function FileUploadFieldCell({ value, disabled, onCommit, taskId }) {
  const file = normalizeFileValue(value);
  const { inputRef, uploading, uploadError, openPicker, handleFiles } = useFileUpload(
    onCommit,
    taskId,
  );

  return (
    <div className='flex h-full min-h-11 w-full items-center gap-2 px-3'>
      <input ref={inputRef} type='file' className='hidden' onChange={handleFiles} />

      {file ? (
        <div className='flex min-w-0 items-center gap-2'>
          <a
            href={resolveFileUrl(file.url)}
            target='_blank'
            rel='noreferrer'
            className='flex min-w-0 items-center gap-1.5 text-sm text-primary-base hover:underline'
          >
            <RiAttachment2 size={16} className='shrink-0' />
            <span className='truncate'>{file.name}</span>
          </a>
          {!disabled ? (
            <button
              type='button'
              onClick={() => onCommit?.('')}
              className='shrink-0 text-icon-sub-500 transition hover:text-error-base'
              aria-label='Remove file'
            >
              <RiCloseLine size={16} />
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type='button'
          disabled={disabled || uploading}
          onClick={openPicker}
          className={cn(
            'flex items-center gap-1.5 text-sm transition-colors',
            uploadError ? 'text-error-base' : 'text-text-soft-400 hover:text-text-sub-500',
            (disabled || uploading) && 'cursor-not-allowed opacity-60',
          )}
        >
          {uploading ? (
            <RiLoader4Line size={16} className='animate-spin' />
          ) : (
            <RiUploadLine size={16} />
          )}
          {uploading ? 'Uploading…' : uploadError ? 'Retry upload' : 'Upload file'}
        </button>
      )}
    </div>
  );
}

function OptionBadge({ label, color }) {
  return (
    <span
      className='inline-flex h-6 max-w-full items-center rounded-md px-2 text-xs font-medium text-text-white-0'
      style={{ backgroundColor: color ?? '#64748B' }}
    >
      <span className='truncate'>{label}</span>
    </span>
  );
}

function EmptyDash() {
  return <span className='text-sm text-text-soft-400'>—</span>;
}

function DropdownFieldCell({
  value,
  options = [],
  disabled,
  onCommit,
  hideEmptyPlaceholder = false,
}) {
  const selectedOption = options.find((option) => option.id === value || option.label === value);

  return (
    <Select.Root
      value={selectedOption?.id ? String(selectedOption.id) : undefined}
      onValueChange={(nextValue) => onCommit?.(nextValue)}
      disabled={disabled}
      size='small'
    >
      <Select.Trigger
        showArrow={false}
        className='h-full min-h-11 w-full rounded-none border-0 bg-transparent px-3 shadow-none ring-0 hover:bg-bg-weak-50'
      >
        {selectedOption ? (
          <OptionBadge label={selectedOption.label} color={selectedOption.color} />
        ) : hideEmptyPlaceholder ? null : (
          <EmptyDash />
        )}
      </Select.Trigger>
      <Select.Content className='max-h-60 min-w-[180px]'>
        {options.map((option) => (
          <Select.Item key={option.id} value={String(option.id)}>
            <OptionBadge label={option.label} color={option.color} />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

function MultiOptionFieldCell({
  value,
  options = [],
  disabled,
  onCommit,
  single = false,
  hideEmptyPlaceholder = false,
}) {
  const selectedIds = Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];

  const toggleOption = (optionId) => {
    const id = String(optionId);

    if (single) {
      onCommit?.(selectedIds.includes(id) ? '' : id);
      return;
    }

    if (selectedIds.includes(id)) {
      onCommit?.(selectedIds.filter((item) => item !== id));
      return;
    }

    onCommit?.([...selectedIds, id]);
  };

  const selectedOptions = options.filter((option) => selectedIds.includes(String(option.id)));

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type='button'
          disabled={disabled}
          className={cn(
            'flex h-full min-h-11 w-full items-center gap-1 overflow-hidden px-3 text-left transition-colors',
            'hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-inset',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          {selectedOptions.length > 0 ? (
            <span className='flex min-w-0 flex-1 flex-wrap gap-1'>
              {selectedOptions.map((option) => (
                <OptionBadge key={option.id} label={option.label} color={option.color} />
              ))}
            </span>
          ) : hideEmptyPlaceholder ? null : (
            <EmptyDash />
          )}
        </button>
      </Popover.Trigger>
      <Popover.Content align='start' showArrow={false} className='w-56 p-1'>
        {options.map((option) => {
          const isSelected = selectedIds.includes(String(option.id));

          return (
            <button
              key={option.id}
              type='button'
              onClick={() => toggleOption(option.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-bg-weak-50',
                isSelected && 'bg-bg-weak-50',
              )}
            >
              <OptionBadge label={option.label} color={option.color} />
            </button>
          );
        })}
      </Popover.Content>
    </Popover.Root>
  );
}

export default function TaskCustomFieldCell({
  column,
  value,
  disabled = false,
  onUpdate,
  taskId = null,
  hideEmptyPlaceholder = false,
}) {
  const fieldType = column?.fieldType ?? 'text';
  const options = column?.config?.options ?? [];
  const displayValue = resolveCustomFieldDisplayValue(normalizeStoredValue(value), column);
  const placeholder = hideEmptyPlaceholder ? '' : '—';

  const handleCommit = (nextValue) => {
    const validationError = validateCustomFieldValue(fieldType, nextValue, column);

    if (validationError) {
      return;
    }

    onUpdate?.(normalizeCustomFieldValue(fieldType, nextValue));
  };

  if (fieldType === 'dropdown') {
    return (
      <DropdownFieldCell
        value={displayValue}
        options={options}
        disabled={disabled}
        hideEmptyPlaceholder={hideEmptyPlaceholder}
        onCommit={handleCommit}
      />
    );
  }

  if (fieldType === 'labels') {
    return (
      <MultiOptionFieldCell
        value={displayValue}
        options={options}
        disabled={disabled}
        hideEmptyPlaceholder={hideEmptyPlaceholder}
        onCommit={handleCommit}
        single
      />
    );
  }

  if (fieldType === 'tags') {
    return (
      <MultiOptionFieldCell
        value={displayValue}
        options={options}
        disabled={disabled}
        hideEmptyPlaceholder={hideEmptyPlaceholder}
        onCommit={handleCommit}
      />
    );
  }

  if (fieldType === 'date') {
    return (
      <DateFieldCell
        value={displayValue}
        column={column}
        disabled={disabled}
        hideEmptyPlaceholder={hideEmptyPlaceholder}
        onCommit={handleCommit}
      />
    );
  }

  if (fieldType === 'checkbox') {
    return <CheckboxFieldCell value={displayValue} disabled={disabled} onCommit={handleCommit} />;
  }

  if (fieldType === 'people') {
    return (
      <PeopleFieldCell
        value={displayValue}
        column={column}
        disabled={disabled}
        hideEmptyPlaceholder={hideEmptyPlaceholder}
        onCommit={handleCommit}
      />
    );
  }

  if (fieldType === 'image') {
    return (
      <ImageFieldCell
        value={displayValue}
        disabled={disabled}
        onCommit={handleCommit}
        taskId={taskId}
      />
    );
  }

  if (fieldType === 'file-upload') {
    return (
      <FileUploadFieldCell
        value={displayValue}
        disabled={disabled}
        onCommit={handleCommit}
        taskId={taskId}
      />
    );
  }

  if (fieldType === 'long-text') {
    return (
      <TextFieldCell
        value={displayValue}
        placeholder={placeholder}
        multiline
        column={column}
        fieldType='long-text'
        disabled={disabled}
        onCommit={handleCommit}
      />
    );
  }

  if (fieldType === 'url') {
    return (
      <UrlFieldCell
        value={displayValue}
        placeholder={placeholder}
        column={column}
        disabled={disabled}
        onCommit={handleCommit}
      />
    );
  }

  if (fieldType === 'number') {
    return (
      <TextFieldCell
        value={displayValue}
        placeholder={placeholder}
        type='number'
        column={column}
        fieldType='number'
        disabled={disabled}
        onCommit={handleCommit}
      />
    );
  }

  if (fieldType === 'email') {
    return (
      <EmailFieldCell
        value={displayValue}
        placeholder={placeholder}
        column={column}
        disabled={disabled}
        onCommit={handleCommit}
      />
    );
  }

  if (fieldType === 'phone') {
    return (
      <PhoneFieldCell
        value={displayValue}
        placeholder={placeholder}
        column={column}
        disabled={disabled}
        onCommit={handleCommit}
      />
    );
  }

  if (fieldType === 'text') {
    return (
      <TextFieldCell
        value={displayValue}
        placeholder={placeholder}
        column={column}
        fieldType='text'
        disabled={disabled}
        onCommit={handleCommit}
      />
    );
  }

  return (
    <TextFieldCell
      value={displayValue}
      placeholder={placeholder}
      column={column}
      fieldType={fieldType}
      disabled={disabled}
      onCommit={handleCommit}
    />
  );
}
