import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiDeleteBinLine,
  RiExpandUpDownFill,
} from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Checkbox from '@/components/ui/checkbox';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import { Datepicker } from '@/components/ui/datepicker';
import { SearchableSelect } from '@/components/ui/searchable-select';
import ProjectStatusDropdown from '@/components/projects/shared/project-status-dropdown';
import {
  ASSIGNEE_OPTIONS,
  SELECTION_CUSTOM_COLUMN_TYPES,
} from '@/pages/profile/project-master/project-master.constants';
import ProjectMasterTableDeleteButton from '@/pages/profile/project-master/project-master-table-delete-button';
import {
  buildFieldValuesForItem,
  createEmptyItem,
} from '@/pages/profile/project-master/project-selection-category-helpers';
import { uploadFrappeFile } from '@/api/products';
import { SelectionAttachmentCell } from '@/components/projects/project-selection/project-selection-delivery-cells';
import { cn } from '@/utils/cn';
import { parseToDate, formatDateToYYYYMMDD, formatToDDMMYYYY } from '@/utils/date-utils';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';
import { normalizeTaskAssigneeEntry } from '@/utils/task-utils';

function getItemAssigneeValue(item) {
  if (item?.assignee) {
    const normalized = normalizeTaskAssigneeEntry({
      assignee: item.assignee,
      value: item.assignee,
      label: item.assignee,
    });
    return normalized ? [normalized] : [];
  }
  return (item?.assignees ?? [])
    .map((entry) =>
      normalizeTaskAssigneeEntry(
        typeof entry === 'string'
          ? entry
          : {
              assignee: entry.assignee || entry.id,
              value: entry.assignee || entry.id,
              label: entry.label || entry.initials || entry.assignee || entry.id,
              full_name: entry.full_name || entry.label || entry.initials,
              user_image: entry.user_image || entry.image,
            },
      ),
    )
    .filter(Boolean);
}

function SortableColumnHeader({ label }) {
  return (
    <div className='flex items-center gap-0.5 whitespace-nowrap'>
      <span className='label-small font-medium text-text-soft-400'>{label}</span>
      <RiExpandUpDownFill className='size-5 shrink-0 text-text-sub-600' aria-hidden />
    </div>
  );
}

const SELECTION_NAME_TEXT_MAX_CLASS = 'min-w-0 flex-1';
const PARENT_ACTIONS_COL_CLASS = 'w-[4%] min-w-[56px]';

function SelectionParentColgroup() {
  return (
    <colgroup>
      <col style={{ width: '26%' }} />
      <col style={{ width: '24%' }} />
      <col style={{ width: '24%' }} />
      <col style={{ width: '22%' }} />
      <col style={{ width: '4%' }} />
    </colgroup>
  );
}

function TruncatedTooltip({ label, children, enabled = true }) {
  const text = String(label ?? '').trim();
  if (!enabled || !text) return children;

  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Content side='top' size='small' variant='dark' className='max-w-xs break-words'>
          {text}
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

function ExpandToggleButton({ expanded, onClick }) {
  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type='button'
            className='inline-flex size-5 shrink-0 items-center justify-center rounded text-text-soft-400 transition hover:bg-bg-weak-100 hover:text-text-sub-600'
            onClick={onClick}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <RiArrowDownSLine className='size-4' />
            ) : (
              <RiArrowRightSLine className='size-4' />
            )}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content side='top' size='small' variant='dark'>
          {expanded ? 'Collapse' : 'Expand'}
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

function TruncatedTableSelect({
  value,
  placeholder,
  options,
  onValueChange,
  maxWidthClass = 'w-full',
  disabled = false,
}) {
  const normalizedOptions = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );
  const selectedLabel = normalizedOptions.find((option) => option.value === value)?.label ?? '';

  return (
    <Select.Root
      value={value || undefined}
      onValueChange={onValueChange}
      size='xsmall'
      variant='borderless'
      disabled={disabled}
    >
      <Select.Trigger className={cn('h-8 min-w-0', maxWidthClass)}>
        <Select.Value placeholder={placeholder}>
          {selectedLabel ? (
            <span className='block min-w-0 max-w-full truncate'>{selectedLabel}</span>
          ) : null}
        </Select.Value>
      </Select.Trigger>
      <Select.Content>
        {normalizedOptions.map((option) => (
          <Select.Item key={option.value} value={option.value}>
            {option.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

function TruncatedItemSelect({
  value,
  placeholder,
  options,
  onValueChange,
  disabled = false,
  displayLabel,
  onSearchQueryChange,
  disabledValues,
}) {
  const disabledSet = useMemo(
    () =>
      new Set((disabledValues ?? []).map((entry) => String(entry ?? '').trim()).filter(Boolean)),
    [disabledValues],
  );
  const normalizedOptions = (options ?? []).map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );
  const selectedLabel =
    normalizedOptions.find((option) => option.value === value)?.label ?? displayLabel ?? '';

  const optionsWithSelected = useMemo(() => {
    if (!value) return normalizedOptions;
    if (normalizedOptions.some((option) => option.value === value)) return normalizedOptions;
    return [
      {
        value,
        label: selectedLabel || value,
        item_name: selectedLabel || value,
        product_type: '',
      },
      ...normalizedOptions,
    ];
  }, [normalizedOptions, selectedLabel, value]);

  const searchTimerRef = useRef(null);
  const lastEmittedQueryRef = useRef('');
  const handleSearchQueryChange = useCallback(
    (query) => {
      if (!onSearchQueryChange) return;
      // SearchableSelect emits on mount/open with the same query; skip those so
      // parent state doesn't churn (it would reset unsaved draft rows).
      if (query === lastEmittedQueryRef.current) return;
      lastEmittedQueryRef.current = query;
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = window.setTimeout(() => {
        onSearchQueryChange(query);
      }, 250);
    },
    [onSearchQueryChange],
  );

  useEffect(
    () => () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    },
    [],
  );

  const handlePickValue = useCallback(
    (nextValue) => {
      if (disabledSet.has(String(nextValue ?? '').trim())) return;
      onValueChange?.(nextValue);
    },
    [disabledSet, onValueChange],
  );

  const renderProductOptionLabel = useCallback(
    (opt) => {
      const optValue = String(opt?.value ?? '').trim();
      const isDisabled = disabledSet.has(optValue);
      const label = opt?.label ?? opt?.value ?? '';
      return (
        <span
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2',
            isDisabled && 'text-text-soft-400',
          )}
        >
          <span className='min-w-0 flex-1 truncate'>{label}</span>
          {isDisabled ? (
            <span className='shrink-0 text-paragraph-xs text-text-soft-400'>Already added</span>
          ) : null}
        </span>
      );
    },
    [disabledSet],
  );

  return (
    <SearchableSelect
      value={value || ''}
      onValueChange={handlePickValue}
      options={optionsWithSelected}
      placeholder={placeholder}
      searchPlaceholder='Search products...'
      emptyMessage='No products available'
      noResultsMessage='No products found'
      size='xsmall'
      variant='borderless'
      disabled={disabled}
      matchTriggerWidth
      showArrow
      isolateSearchKeyboard
      onSearchQueryChange={handleSearchQueryChange}
      renderOptionLabel={renderProductOptionLabel}
      renderTrigger={() => (
        <span
          className={cn(
            'block min-w-0 max-w-full truncate',
            selectedLabel ? 'text-label-sm text-text-strong-950' : 'text-text-soft-400',
          )}
        >
          {selectedLabel || placeholder || 'Select item'}
        </span>
      )}
      triggerClassName='h-8 min-w-0 w-full border-0 bg-transparent px-0 shadow-none ring-0 hover:bg-transparent'
      contentClassName='z-[600]'
    />
  );
}

function CategoryInlineInput({ defaultValue, placeholder, onCommit, isName = false, className }) {
  return (
    <Input.Root variant='borderless' size='xsmall' className={cn('min-w-0 w-full', className)}>
      <Input.Wrapper>
        <Input.Input
          key={defaultValue}
          type='text'
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={cn(
            'truncate',
            isName && 'label-small font-medium text-text-strong-950 placeholder:font-normal',
          )}
          onBlur={(event) => {
            const next = event.target.value.trim();
            if (next === String(defaultValue ?? '').trim()) return;
            onCommit?.(next);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
      </Input.Wrapper>
    </Input.Root>
  );
}

function isCustomFieldAttachmentValue(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === 'uploaded-image') return false;
  return raw.startsWith('/') || raw.startsWith('http') || value instanceof File;
}

function CustomFieldCell({
  column,
  value,
  onChange,
  onUploadFile,
  uploadContext,
  disabled = false,
}) {
  const [isUploading, setIsUploading] = useState(false);

  if (column.column_type === 'Checkbox') {
    return (
      <Checkbox.Root
        checked={Boolean(value)}
        onCheckedChange={(checked) => onChange(checked ? '1' : '')}
        disabled={disabled}
      />
    );
  }

  if (column.column_type === 'Image') {
    const attachmentValue = isCustomFieldAttachmentValue(value) ? value : '';

    const handleAttachmentChange = async (next) => {
      if (!next) {
        onChange('');
        return;
      }

      if (!(next instanceof File)) {
        onChange(typeof next === 'string' ? next : '');
        return;
      }

      setIsUploading(true);
      try {
        if (onUploadFile) {
          await onUploadFile(next);
          return;
        }
        if (!uploadContext?.doctype || !uploadContext?.docname) {
          showErrorToast('Save the record before uploading a file.');
          return;
        }
        const fileUrl = await uploadFrappeFile(next, uploadContext);
        onChange(fileUrl);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      } finally {
        setIsUploading(false);
      }
    };

    return (
      <SelectionAttachmentCell
        value={attachmentValue}
        disabled={disabled}
        isUploading={isUploading}
        onChange={handleAttachmentChange}
      />
    );
  }

  if (column.column_type === 'Long Text') {
    return (
      <Input.Root variant='borderless' size='xsmall'>
        <Input.Wrapper>
          <Input.Input
            defaultValue={value}
            placeholder={`Enter ${column.column_label}`}
            onBlur={(event) => {
              const next = event.target.value;
              if (String(next ?? '') === String(value ?? '')) return;
              onChange(next);
            }}
          />
        </Input.Wrapper>
      </Input.Root>
    );
  }

  if (column.column_type === 'Date') {
    return (
      <Datepicker
        value={parseToDate(value) ?? undefined}
        onChange={(next) => {
          const formatted = next ? formatDateToYYYYMMDD(next) : '';
          if (String(formatted ?? '') === String(value ?? '')) return;
          onChange(formatted);
        }}
        size='xsmall'
        variant='borderless'
        placeholder='dd/mm/yyyy'
        formatDate={formatToDDMMYYYY}
        className='h-8 min-w-[120px]'
        disabled={disabled}
      />
    );
  }

  const inputType = column.column_type === 'Number' ? 'number' : 'text';

  return (
    <Input.Root variant='borderless' size='xsmall'>
      <Input.Wrapper>
        <Input.Input
          type={inputType}
          defaultValue={value}
          placeholder={`Enter ${column.column_label}`}
          disabled={disabled}
          onBlur={(event) => {
            const next = event.target.value;
            if (String(next ?? '') === String(value ?? '')) return;
            onChange(next);
          }}
        />
      </Input.Wrapper>
    </Input.Root>
  );
}

function AddCustomColumnPopover({ disabled, onAdd }) {
  const [open, setOpen] = useState(false);
  const [columnMode, setColumnMode] = useState('custom');
  const [newColumnLabel, setNewColumnLabel] = useState('');
  const [newColumnType, setNewColumnType] = useState('Text');

  const reset = useCallback(() => {
    setNewColumnLabel('');
    setNewColumnType('Text');
    setColumnMode('custom');
  }, []);

  const handleAdd = useCallback(() => {
    const label = newColumnLabel.trim();
    if (!label || columnMode !== 'custom') return;
    onAdd?.({ label, columnType: newColumnType });
    setOpen(false);
    reset();
  }, [columnMode, newColumnLabel, newColumnType, onAdd, reset]);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Popover.Trigger asChild>
              <button
                type='button'
                disabled={disabled}
                className='inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 text-text-soft-400 shadow-regular-xs transition hover:text-text-main-900 disabled:cursor-not-allowed disabled:opacity-50'
                aria-label='Add column'
              >
                <RiAddLine className='size-4' />
              </button>
            </Popover.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Content side='top' size='small' variant='dark'>
            Add Column
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>

      <Popover.Content
        align='end'
        side='bottom'
        showArrow={false}
        className='w-[min(100vw-2rem,320px)] rounded-2xl p-5 shadow-regular-md'
      >
        <p className='text-paragraph-xs font-medium uppercase tracking-wider text-text-soft-400'>
          Add Column
        </p>

        <ButtonGroup.Root size='small' className='mt-4 w-full'>
          <ButtonGroup.Item
            type='button'
            data-state={columnMode === 'custom' ? 'on' : 'off'}
            onClick={() => setColumnMode('custom')}
            className='w-full font-medium data-[state=on]:z-[1] data-[state=on]:bg-primary-lighter data-[state=on]:text-text-strong-950 data-[state=on]:ring-1 data-[state=on]:ring-primary-base'
          >
            Custom
          </ButtonGroup.Item>
          <ButtonGroup.Item
            type='button'
            data-state={columnMode === 'system' ? 'on' : 'off'}
            onClick={() => setColumnMode('system')}
            className='w-full data-[state=on]:z-[1] data-[state=on]:bg-primary-lighter data-[state=on]:text-text-strong-950 data-[state=on]:ring-1 data-[state=on]:ring-primary-base'
          >
            System
          </ButtonGroup.Item>
        </ButtonGroup.Root>

        {columnMode === 'custom' ? (
          <div className='mt-4 flex flex-col gap-3'>
            <Input.Root size='small' className='w-full'>
              <Input.Wrapper>
                <Input.Input
                  value={newColumnLabel}
                  placeholder='Enter column name'
                  onChange={(event) => setNewColumnLabel(event.target.value)}
                />
              </Input.Wrapper>
            </Input.Root>

            <Select.Root
              value={newColumnType}
              onValueChange={setNewColumnType}
              size='small'
              className='w-full'
            >
              <Select.Trigger className='w-full'>
                <Select.Value placeholder='Select column type' />
              </Select.Trigger>
              <Select.Content>
                {SELECTION_CUSTOM_COLUMN_TYPES.map((type) => (
                  <Select.Item key={type} value={type}>
                    {type}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <div className='grid grid-cols-2 gap-2 pt-1'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                type='button'
                className='w-full'
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button.Root>
              <Button.Root
                variant='primary'
                mode='filled'
                size='small'
                type='button'
                className='w-full'
                onClick={handleAdd}
                disabled={!newColumnLabel.trim()}
              >
                Add
              </Button.Root>
            </div>
          </div>
        ) : (
          <p className='mt-4 text-paragraph-sm text-text-sub-500'>
            System columns are not available yet.
          </p>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}

function CustomColumnHeader({ label, onRemove }) {
  return (
    <div className='group/custom-col flex min-w-0 items-center gap-0.5 overflow-hidden'>
      <span className='label-small min-w-0 truncate font-medium text-text-soft-400'>{label}</span>
      {onRemove ? (
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type='button'
                className='inline-flex size-6 shrink-0 items-center justify-center rounded-md text-text-soft-400 opacity-0 transition hover:bg-bg-weak-50 hover:text-red-base group-hover/custom-col:opacity-100 focus-visible:opacity-100'
                onClick={onRemove}
                aria-label={`Delete ${label} column`}
              >
                <RiDeleteBinLine className='size-4' />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content side='top' size='small' variant='dark'>
              Delete Column
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      ) : null}
      <RiExpandUpDownFill className='ml-auto size-5 shrink-0 text-text-sub-600' aria-hidden />
    </div>
  );
}

const NESTED_COL_ITEM = 'min-w-[240px] max-w-[240px]';
const NESTED_COL_PRODUCT = 'min-w-[180px]';
const NESTED_COL_ASSIGNEE = 'min-w-[140px]';
const NESTED_COL_EXP_DATE = 'min-w-[140px] whitespace-nowrap';
const NESTED_COL_STATUS = 'min-w-[160px]';
const NESTED_COL_LONG_LEAD = 'min-w-[108px] whitespace-nowrap';
const NESTED_COL_QTY = 'min-w-[72px]';
const NESTED_COL_CUSTOM = 'min-w-[160px]';
const NESTED_COL_ADD = 'w-12 min-w-12 max-w-12';
const NESTED_COL_ADD_STICKY_HEAD =
  'sticky right-0 z-30 border-l border-stroke-soft-200 bg-bg-weak-100 shadow-[-4px_0_8px_-4px_rgba(16,24,40,0.08)]';
const NESTED_COL_ADD_STICKY_CELL =
  'sticky right-0 z-20 border-l border-stroke-soft-200 bg-bg-white-0 shadow-[-4px_0_8px_-4px_rgba(16,24,40,0.08)] group-hover/row:bg-bg-weak-50';

const NESTED_SECTION_CLASS = 'px-4 py-3';
const NESTED_TABLE_WRAPPER_CLASS =
  'flex min-w-0 max-h-[min(50vh,420px)] flex-col overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs';
const NESTED_TABLE_SCROLL_CLASS =
  'min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-x-contain';
const NESTED_HEAD_CLASS =
  'h-9 border-0 border-b border-stroke-soft-200 bg-bg-weak-100 !rounded-none px-3 py-2';
const NESTED_CELL_CLASS =
  'h-10 min-w-0 border-0 bg-bg-white-0 !rounded-none !p-0 overflow-hidden transition-colors';

function ExpandedItemsSkeleton() {
  return (
    <div className={NESTED_SECTION_CLASS}>
      <div className={cn(NESTED_TABLE_WRAPPER_CLASS, 'overflow-hidden')}>
        <div className='flex h-9 items-center gap-3 border-b border-stroke-soft-200 bg-bg-weak-100 px-3'>
          <div className='h-3 w-24 animate-pulse rounded bg-bg-soft-200' />
          <div className='h-3 w-32 animate-pulse rounded bg-bg-soft-200' />
          <div className='h-3 w-20 animate-pulse rounded bg-bg-soft-200' />
          <div className='h-3 w-16 animate-pulse rounded bg-bg-soft-200' />
        </div>
        <div className='space-y-0'>
          {[0, 1].map((row) => (
            <div
              key={row}
              className='flex h-10 items-center gap-3 border-b border-stroke-soft-200 px-3 last:border-0'
            >
              <div className='h-3 w-28 animate-pulse rounded bg-bg-soft-200' />
              <div className='h-3 w-24 animate-pulse rounded bg-bg-soft-200' />
              <div className='h-3 w-20 animate-pulse rounded bg-bg-soft-200' />
              <div className='size-4 animate-pulse rounded bg-bg-soft-200' />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExpandedItemsSection({
  categoryDetail,
  itemOptions,
  onSave,
  onAddColumn,
  onRemoveColumn,
  onOpenItem,
  onItemFieldChange,
  onItemSelect,
  onItemRemove,
  onSearchItems,
  showProjectItemFields = false,
  itemStatusOptions = [],
  itemStatusMetaMap = {},
  imageUploadContext = null,
  onUploadCustomImage = null,
}) {
  const [localDetail, setLocalDetail] = useState(categoryDetail);
  const [isSaving, setIsSaving] = useState(false);
  const localDetailRef = useRef(localDetail);

  useEffect(() => {
    localDetailRef.current = localDetail;
  }, [localDetail]);

  useEffect(() => {
    if (categoryDetail?.name !== localDetailRef.current?.name) {
      setLocalDetail(categoryDetail);
      return;
    }

    if (categoryDetail === localDetailRef.current) return;

    // Same category re-synced from the parent (e.g. after item options load or a
    // save round-trip). Keep unsaved local draft rows (Add New Item) so they are
    // not wiped by parent re-renders before the user picks a product.
    setLocalDetail((prev) => {
      const draftItems = (prev?.items ?? []).filter(
        (item) => !item?.name && !String(item?.item ?? '').trim(),
      );
      if (draftItems.length === 0) return categoryDetail;
      return {
        ...categoryDetail,
        items: [...(categoryDetail?.items ?? []), ...draftItems],
      };
    });
  }, [categoryDetail]);

  const updateLocal = useCallback((updater) => {
    setLocalDetail((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const persist = useCallback(
    async (nextDetail) => {
      setIsSaving(true);
      try {
        await onSave(nextDetail);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      } finally {
        setIsSaving(false);
      }
    },
    [onSave],
  );

  const handleItemSelect = useCallback(
    (itemIndex, itemCode) => {
      const trimmedCode = String(itemCode ?? '').trim();
      if (!trimmedCode) return;
      const currentItems = localDetailRef.current?.items ?? [];
      const duplicate = currentItems.some(
        (other, otherIndex) =>
          otherIndex !== itemIndex && String(other?.item ?? '').trim() === trimmedCode,
      );
      if (duplicate) {
        showErrorToast('This item is already added to this category.');
        return;
      }

      const selected = itemOptions.find((opt) => opt.value === itemCode);
      if (onItemSelect) {
        updateLocal((prev) => {
          const items = [...(prev.items ?? [])];
          const current = items[itemIndex] ?? {};
          items[itemIndex] = {
            ...current,
            item: itemCode,
            item_name: selected?.item_name || selected?.label || '',
            product_type: selected?.product_type || '',
            field_values: buildFieldValuesForItem(current, prev.custom_columns),
          };
          return { ...prev, items };
        });
        onItemSelect(itemIndex, itemCode, selected);
        return;
      }
      updateLocal((prev) => {
        const items = [...(prev.items ?? [])];
        const current = items[itemIndex] ?? {};
        items[itemIndex] = {
          ...current,
          item: itemCode,
          item_name: selected?.item_name || selected?.label || '',
          product_type: selected?.product_type || '',
          field_values: buildFieldValuesForItem(current, prev.custom_columns),
        };
        const next = { ...prev, items };
        persist(next);
        return next;
      });
    },
    [itemOptions, onItemSelect, persist, updateLocal],
  );

  const handleItemField = useCallback(
    (itemIndex, field, value) => {
      if (onItemFieldChange) {
        let updatedItem = null;
        updateLocal((prev) => {
          const items = [...(prev.items ?? [])];
          items[itemIndex] = { ...items[itemIndex], [field]: value };
          updatedItem = items[itemIndex];
          return { ...prev, items };
        });
        if (updatedItem?.name) {
          onItemFieldChange(updatedItem, field, value);
        }
        return;
      }

      updateLocal((prev) => {
        const items = [...(prev.items ?? [])];
        items[itemIndex] = { ...items[itemIndex], [field]: value };
        const next = { ...prev, items };
        if (String(items[itemIndex]?.item ?? '').trim()) {
          persist(next);
        }
        return next;
      });
    },
    [onItemFieldChange, persist, updateLocal],
  );

  const handleCustomField = useCallback(
    (itemIndex, columnLabel, value) => {
      updateLocal((prev) => {
        const items = [...(prev.items ?? [])];
        const item = { ...items[itemIndex] };
        const fieldValues = [...(item.field_values ?? [])];
        const idx = fieldValues.findIndex((fv) => fv.column_label === columnLabel);
        const column = (prev.custom_columns ?? []).find((col) => col.column_label === columnLabel);
        const entry = {
          column_label: columnLabel,
          column_type: column?.column_type,
          field_value: column?.column_type === 'Image' ? '' : value,
          attachment: column?.column_type === 'Image' ? value : '',
        };
        if (idx >= 0) fieldValues[idx] = { ...fieldValues[idx], ...entry };
        else fieldValues.push(entry);
        item.field_values = fieldValues;
        items[itemIndex] = item;

        if (onItemFieldChange && item.name) {
          onItemFieldChange(item, 'field_values', fieldValues);
          return { ...prev, items };
        }

        const next = { ...prev, items };
        if (String(item.item ?? '').trim()) {
          persist(next);
        }
        return next;
      });
    },
    [onItemFieldChange, persist, updateLocal],
  );

  const handleAddItem = useCallback(() => {
    updateLocal((prev) => ({
      ...prev,
      items: [
        ...(prev.items ?? []),
        showProjectItemFields
          ? {
              ...createEmptyItem(prev),
              qty: 1,
              selection_status: 'Pending',
            }
          : createEmptyItem(prev),
      ],
    }));
  }, [showProjectItemFields, updateLocal]);

  const handleRemoveItem = useCallback(
    (itemIndex) => {
      const item = localDetailRef.current?.items?.[itemIndex];
      if (!item?.name) {
        updateLocal((prev) => {
          const items = [...(prev.items ?? [])];
          items.splice(itemIndex, 1);
          return { ...prev, items };
        });
        return;
      }

      if (onItemRemove) {
        updateLocal((prev) => {
          const items = [...(prev.items ?? [])];
          items.splice(itemIndex, 1);
          return { ...prev, items };
        });
        onItemRemove(item);
        return;
      }

      updateLocal((prev) => {
        const items = [...(prev.items ?? [])];
        items.splice(itemIndex, 1);
        const next = { ...prev, items };
        persist(next);
        return next;
      });
    },
    [onItemRemove, persist, updateLocal],
  );

  const customColumns = localDetail.custom_columns ?? [];
  const items = localDetail.items ?? [];

  return (
    <div className={NESTED_SECTION_CLASS}>
      <div className={NESTED_TABLE_WRAPPER_CLASS}>
        <div className={NESTED_TABLE_SCROLL_CLASS}>
          <Table.Root
            variant='compact'
            className='!overflow-x-visible !overflow-y-visible min-w-0 w-full'
            style={{ width: 'max-content', minWidth: '100%' }}
          >
            <Table.Header>
              <Table.Row className='border-0 hover:bg-transparent'>
                <Table.Head className={cn(NESTED_HEAD_CLASS, NESTED_COL_ITEM)}>
                  <SortableColumnHeader label='Item Name' />
                </Table.Head>
                <Table.Head className={cn(NESTED_HEAD_CLASS, NESTED_COL_PRODUCT)}>
                  <SortableColumnHeader label='Product Sub-category' />
                </Table.Head>
                <Table.Head className={cn(NESTED_HEAD_CLASS, NESTED_COL_ASSIGNEE)}>
                  <SortableColumnHeader label='Assignee' />
                </Table.Head>
                {showProjectItemFields ? (
                  <>
                    <Table.Head className={cn(NESTED_HEAD_CLASS, NESTED_COL_EXP_DATE)}>
                      <SortableColumnHeader label='Exp. Selection Date' />
                    </Table.Head>
                    <Table.Head className={cn(NESTED_HEAD_CLASS, NESTED_COL_STATUS)}>
                      <SortableColumnHeader label='Selection status' />
                    </Table.Head>
                  </>
                ) : null}
                <Table.Head className={cn(NESTED_HEAD_CLASS, NESTED_COL_LONG_LEAD)}>
                  <SortableColumnHeader label='Long Lead' />
                </Table.Head>
                {showProjectItemFields ? (
                  <Table.Head className={cn(NESTED_HEAD_CLASS, NESTED_COL_QTY)}>
                    <SortableColumnHeader label='QTY' />
                  </Table.Head>
                ) : null}
                {customColumns.map((col) => (
                  <Table.Head
                    key={col.column_id || col.column_label}
                    className={cn(NESTED_HEAD_CLASS, NESTED_COL_CUSTOM, 'group/custom-col')}
                  >
                    <CustomColumnHeader
                      label={col.column_label}
                      onRemove={
                        col.from_master ? undefined : () => onRemoveColumn?.(col.column_label)
                      }
                    />
                  </Table.Head>
                ))}
                <Table.Head
                  className={cn(
                    NESTED_HEAD_CLASS,
                    NESTED_COL_ADD,
                    NESTED_COL_ADD_STICKY_HEAD,
                    'p-0',
                  )}
                >
                  <div className='flex h-9 items-center justify-center'>
                    <AddCustomColumnPopover
                      disabled={isSaving}
                      onAdd={({ label, columnType }) => onAddColumn?.({ label, columnType })}
                    />
                  </div>
                </Table.Head>
              </Table.Row>
            </Table.Header>

            <Table.Body spacing={0}>
              {items.map((item, itemIndex) => (
                <React.Fragment key={item.name || `item-${itemIndex}`}>
                  <Table.Row className='h-10 border-0'>
                    <Table.Cell className={cn(NESTED_CELL_CLASS, NESTED_COL_ITEM)}>
                      <div className='flex h-10 min-w-0 max-w-[240px] items-center px-3'>
                        {item.item && onOpenItem ? (
                          <Tooltip.Root size='xsmall'>
                            <Tooltip.Trigger asChild>
                              <button
                                type='button'
                                className='block min-w-0 w-full truncate text-left text-label-sm text-text-strong-950 hover:underline'
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onOpenItem(item);
                                }}
                              >
                                {item.item_name || item.item}
                              </button>
                            </Tooltip.Trigger>
                            <Tooltip.Content side='bottom' className='max-w-sm break-words'>
                              {item.item_name || item.item}
                            </Tooltip.Content>
                          </Tooltip.Root>
                        ) : (
                          <TruncatedItemSelect
                            value={item.item}
                            displayLabel={item.item_name}
                            placeholder='Search product...'
                            options={itemOptions}
                            onValueChange={(nextValue) => handleItemSelect(itemIndex, nextValue)}
                            onSearchQueryChange={onSearchItems}
                            disabled={isSaving}
                            disabledValues={items
                              .map((other, otherIndex) =>
                                otherIndex === itemIndex ? '' : String(other?.item ?? '').trim(),
                              )
                              .filter(Boolean)}
                          />
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell className={cn(NESTED_CELL_CLASS, NESTED_COL_PRODUCT)}>
                      <div className='flex h-10 min-w-0 items-center px-3'>
                        <span className='paragraph-small block min-w-0 truncate text-text-sub-500'>
                          {item.product_type || '—'}
                        </span>
                      </div>
                    </Table.Cell>
                    <Table.Cell className={cn(NESTED_CELL_CLASS, NESTED_COL_ASSIGNEE)}>
                      <div className='flex h-10 min-w-0 items-center px-3'>
                        {onOpenItem ? (
                          <AssigneeMultiSelect
                            value={getItemAssigneeValue(item)}
                            onBlur={(nextValue) =>
                              handleItemField(
                                itemIndex,
                                'assignees',
                                Array.isArray(nextValue) ? nextValue : [],
                              )
                            }
                            placeholder='Select'
                            maxVisibleAvatars={2}
                            variant='borderless'
                            size='xsmall'
                            singleSelect
                          />
                        ) : (
                          <TruncatedTableSelect
                            value={item.assignee}
                            placeholder='Select'
                            options={ASSIGNEE_OPTIONS}
                            onValueChange={(nextValue) =>
                              handleItemField(itemIndex, 'assignee', nextValue)
                            }
                            maxWidthClass='w-full'
                          />
                        )}
                      </div>
                    </Table.Cell>
                    {showProjectItemFields ? (
                      <>
                        <Table.Cell className={cn(NESTED_CELL_CLASS, NESTED_COL_EXP_DATE)}>
                          <div className='flex h-10 min-w-0 items-center px-3'>
                            <Datepicker
                              value={
                                parseToDate(
                                  item.exp_selection_date || localDetail.exp_selection_date,
                                ) ?? undefined
                              }
                              onChange={(next) =>
                                handleItemField(
                                  itemIndex,
                                  'exp_selection_date',
                                  next ? format(next, 'do MMM yyyy') : '',
                                )
                              }
                              size='xsmall'
                              variant='borderless'
                              placeholder='DD/MM/YY'
                              className='h-8 min-w-[120px]'
                            />
                          </div>
                        </Table.Cell>
                        <Table.Cell className={cn(NESTED_CELL_CLASS, NESTED_COL_STATUS)}>
                          <div className='flex h-10 min-w-0 items-center px-3'>
                            <ProjectStatusDropdown
                              value={
                                item.selection_status || localDetail.selection_status || 'Pending'
                              }
                              onValueChange={(nextValue) =>
                                handleItemField(itemIndex, 'selection_status', nextValue)
                              }
                              statusOptions={itemStatusOptions}
                              statusMetaMap={itemStatusMetaMap}
                              size='xsmall'
                            />
                          </div>
                        </Table.Cell>
                      </>
                    ) : null}
                    <Table.Cell className={cn(NESTED_CELL_CLASS, NESTED_COL_LONG_LEAD)}>
                      <div className='flex h-10 items-center px-3'>
                        <Checkbox.Root
                          checked={Boolean(item.long_lead)}
                          onCheckedChange={(checked) =>
                            handleItemField(itemIndex, 'long_lead', Boolean(checked))
                          }
                        />
                      </div>
                    </Table.Cell>
                    {showProjectItemFields ? (
                      <Table.Cell className={cn(NESTED_CELL_CLASS, NESTED_COL_QTY)}>
                        <div className='flex h-10 min-w-0 items-center px-3'>
                          <Input.Root variant='borderless' size='xsmall' className='w-16'>
                            <Input.Wrapper>
                              <Input.Input
                                key={item.qty ?? 1}
                                type='number'
                                min={1}
                                defaultValue={item.qty ?? 1}
                                className='text-center'
                                onBlur={(event) =>
                                  handleItemField(itemIndex, 'qty', event.target.value || 1)
                                }
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    event.currentTarget.blur();
                                  }
                                }}
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        </div>
                      </Table.Cell>
                    ) : null}
                    {customColumns.map((col) => {
                      const fv = (item.field_values ?? []).find(
                        (row) => row.column_label === col.column_label,
                      );
                      const value = col.column_type === 'Image' ? fv?.attachment : fv?.field_value;
                      return (
                        <Table.Cell
                          key={col.column_id || col.column_label}
                          className={cn(NESTED_CELL_CLASS, NESTED_COL_CUSTOM)}
                        >
                          <div className='flex h-10 min-w-0 items-center px-3'>
                            <CustomFieldCell
                              column={col}
                              value={value || ''}
                              uploadContext={imageUploadContext}
                              disabled={isSaving}
                              onUploadFile={
                                onUploadCustomImage && item?.name
                                  ? (file) => onUploadCustomImage(item, col.column_label, file)
                                  : undefined
                              }
                              onChange={(next) =>
                                handleCustomField(itemIndex, col.column_label, next)
                              }
                            />
                          </div>
                        </Table.Cell>
                      );
                    })}
                    <Table.Cell
                      className={cn(
                        'border-0 !rounded-none p-0',
                        NESTED_COL_ADD,
                        NESTED_COL_ADD_STICKY_CELL,
                      )}
                    >
                      <div className='flex h-10 items-center justify-center'>
                        <ProjectMasterTableDeleteButton
                          ariaLabel={`Delete ${item.item_name || item.item || 'item'}`}
                          onClick={() => handleRemoveItem(itemIndex)}
                        />
                      </div>
                    </Table.Cell>
                  </Table.Row>
                  {itemIndex < items.length - 1 ? <Table.RowDivider /> : null}
                </React.Fragment>
              ))}
            </Table.Body>
          </Table.Root>
        </div>

        <div className='shrink-0 border-t border-stroke-soft-200 bg-bg-weak-50 px-3 py-2'>
          <button
            type='button'
            onClick={handleAddItem}
            disabled={!localDetail.product_category || isSaving}
            className='flex w-full items-center gap-3 text-left label-small font-medium text-text-soft-400 transition-colors hover:text-text-sub-500 disabled:cursor-not-allowed disabled:opacity-50'
          >
            <span
              className='flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'
              aria-hidden
            >
              <RiAddLine className='size-5 text-text-soft-400' />
            </span>
            <span>Add New Item</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function SelectionCategoryAddFooter({
  disabled,
  onClick,
  label = 'Add Selection Category',
}) {
  return (
    <div className='shrink-0 border-t border-stroke-soft-200 bg-bg-weak-100 px-3 py-2'>
      <button
        type='button'
        disabled={disabled}
        onClick={onClick}
        className='flex w-full items-center gap-3 text-left label-small font-medium text-text-soft-400 transition-colors hover:text-text-sub-500 disabled:cursor-not-allowed disabled:opacity-50'
      >
        <span
          className='flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'
          aria-hidden
        >
          <RiAddLine className='size-5 text-text-soft-400' />
        </span>
        <span>{label}</span>
      </button>
    </div>
  );
}

export {
  SortableColumnHeader,
  TruncatedTableSelect,
  TruncatedItemSelect,
  CategoryInlineInput,
  ExpandToggleButton,
  TruncatedTooltip,
  ExpandedItemsSection,
  ExpandedItemsSkeleton,
  SelectionParentColgroup,
  PARENT_ACTIONS_COL_CLASS,
  SELECTION_NAME_TEXT_MAX_CLASS,
  CustomFieldCell,
  AddCustomColumnPopover,
};
