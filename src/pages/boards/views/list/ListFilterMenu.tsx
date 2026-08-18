import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { RiAddLine, RiArrowDownSLine, RiDeleteBinLine, RiInformationFill } from 'react-icons/ri';
import { Calendar } from '@/components/ui/calendar';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';
import { parseToDate } from '@/utils/date-utils';
import useAnchoredMenuPosition from '../../hooks/useAnchoredMenuPosition';
import {
  createEmptyFilterRow,
  getCompleteFilters,
  getDefaultOperatorForColumn,
  getFilterValueOptions,
  getOperatorsForColumn,
  normalizeFiltersForUi,
  operatorNeedsValue,
  resolveColumnFieldType,
  serializeFiltersForApply,
} from './utils/task-list-filter-utils';

const LOGIC_OPERATORS = [
  { value: 'and', label: 'AND' },
  { value: 'or', label: 'OR' },
];

function isFilterMenuOverlayTarget(target) {
  return Boolean(
    target?.closest?.(
      [
        '[data-radix-select-content]',
        '[data-radix-select-viewport]',
        '[data-radix-popover-content]',
        '[data-radix-popper-content-wrapper]',
        '[role="listbox"]',
        '[role="dialog"]',
      ].join(', '),
    ),
  );
}

function FilterSelect({
  value,
  placeholder,
  onValueChange,
  disabled,
  children,
  className,
  contentClassName,
}) {
  return (
    <Select.Root
      value={value || undefined}
      onValueChange={onValueChange}
      disabled={disabled}
      matchTriggerWidth={false}
    >
      <Select.Trigger
        size='small'
        className={cn(
          'h-9 w-auto shrink-0 rounded-lg bg-bg-white-0 px-2.5 text-sm text-text-main-900 shadow-none ring-1 ring-inset ring-stroke-soft-200',
          className,
        )}
      >
        <Select.Value placeholder={placeholder} />
      </Select.Trigger>
      <Select.Content
        className={cn(
          'max-h-60 min-w-[var(--radix-select-trigger-width)] w-max max-w-[320px]',
          contentClassName,
        )}
      >
        {children}
      </Select.Content>
    </Select.Root>
  );
}

function FilterSelectItem({ value, children }) {
  return (
    <Select.Item value={value}>
      <span className='block whitespace-normal'>{children}</span>
    </Select.Item>
  );
}

function FilterValueField({ column, value, onChange, tasks, statusOptions, disabled }) {
  const fieldType = resolveColumnFieldType(column);
  const options = useMemo(
    () => getFilterValueOptions(column, tasks, { statusOptions }),
    [column, statusOptions, tasks],
  );
  const [isDateOpen, setIsDateOpen] = useState(false);

  if (fieldType === 'date') {
    const selectedDate = value ? parseToDate(String(value)) : undefined;
    const label = value
      ? new Date(value).toLocaleDateString(undefined, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : 'Select an option';

    return (
      <Popover.Root open={isDateOpen} onOpenChange={setIsDateOpen}>
        <Popover.Trigger asChild>
          <button
            type='button'
            disabled={disabled}
            className='flex h-9 min-w-0 flex-1 items-center justify-between rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 text-sm text-text-soft-400 transition hover:bg-bg-weak-50 disabled:opacity-60'
          >
            <span className={cn(value && 'text-text-main-900')}>{label}</span>
            <RiArrowDownSLine size={16} className='shrink-0 text-icon-sub-500' />
          </button>
        </Popover.Trigger>
        <Popover.Content align='start' showArrow={false} className='w-auto p-2'>
          <Calendar
            mode='single'
            selected={selectedDate}
            onSelect={(date) => {
              onChange(date ? format(date, 'yyyy-MM-dd') : '');
              setIsDateOpen(false);
            }}
            initialFocus
          />
        </Popover.Content>
      </Popover.Root>
    );
  }

  if (options.length > 0) {
    return (
      <FilterSelect
        value={value ? String(value) : ''}
        placeholder='Select an option'
        onValueChange={onChange}
        disabled={disabled}
        className='min-w-[180px] flex-1'
      >
        {options.map((option) => (
          <FilterSelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </FilterSelectItem>
        ))}
      </FilterSelect>
    );
  }

  const inputType = fieldType === 'number' ? 'number' : fieldType === 'email' ? 'email' : 'text';

  return (
    <input
      type={inputType}
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder='Select an option'
      className='h-9 min-w-0 flex-1 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 text-sm text-text-main-900 outline-none placeholder:text-text-soft-400 focus:border-primary-base focus:ring-1 focus:ring-primary-base disabled:opacity-60'
    />
  );
}

function FilterConditionRow({
  row,
  columns,
  showWhereLabel,
  tasks,
  statusOptions,
  onChange,
  onRemove,
}) {
  const column = useMemo(
    () => columns.find((item) => item.key === row.columnKey) ?? null,
    [columns, row.columnKey],
  );
  const operators = useMemo(() => (column ? getOperatorsForColumn(column) : []), [column]);
  const showOperator = Boolean(column);
  const showValue = Boolean(column && row.operator && operatorNeedsValue(row.operator));

  return (
    <div className='flex items-start gap-2'>
      {showWhereLabel ? (
        <span className='flex h-9 w-14 shrink-0 items-center text-sm text-text-sub-500'>Where</span>
      ) : (
        <span className='w-14 shrink-0' aria-hidden='true' />
      )}

      <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
        <FilterSelect
          value={row.columnKey}
          placeholder='Select filter'
          onValueChange={(columnKey) => {
            const nextColumn = columns.find((item) => item.key === columnKey) ?? null;
            onChange({
              columnKey,
              fieldType: nextColumn ? resolveColumnFieldType(nextColumn) : '',
              operator: nextColumn ? getDefaultOperatorForColumn(nextColumn) : '',
              value: '',
            });
          }}
          className='min-w-[148px]'
        >
          {columns.map((item) => (
            <FilterSelectItem key={item.key} value={item.key}>
              {item.label}
            </FilterSelectItem>
          ))}
        </FilterSelect>

        {showOperator ? (
          <>
            <FilterSelect
              value={row.operator}
              placeholder='Is'
              onValueChange={(operator) =>
                onChange({
                  operator,
                  value: operatorNeedsValue(operator) ? row.value : '',
                })
              }
              className='min-w-[172px]'
              contentClassName='min-w-[220px]'
            >
              {operators.map((operator) => (
                <FilterSelectItem key={operator.value} value={operator.value}>
                  {operator.label}
                </FilterSelectItem>
              ))}
            </FilterSelect>

            {showValue ? (
              <FilterValueField
                column={column}
                value={row.value}
                onChange={(value) => onChange({ value })}
                tasks={tasks}
                statusOptions={statusOptions}
              />
            ) : null}
          </>
        ) : null}
      </div>

      <button
        type='button'
        aria-label='Remove filter'
        onClick={onRemove}
        className='flex size-8 shrink-0 items-center justify-center rounded-lg text-icon-sub-500 transition hover:bg-bg-white-0'
      >
        <RiDeleteBinLine size={16} />
      </button>
    </div>
  );
}

function LogicOperatorToggle({ value, onChange }) {
  return (
    <div className='flex items-start gap-2'>
      <FilterSelect
        value={value}
        onValueChange={onChange}
        className='w-14 shrink-0 text-primary-base ring-primary-base'
      >
        {LOGIC_OPERATORS.map((operator) => (
          <FilterSelectItem key={operator.value} value={operator.value}>
            {operator.label}
          </FilterSelectItem>
        ))}
      </FilterSelect>
    </div>
  );
}

export default function ListFilterMenu({
  anchorRef,
  columns = [],
  tasks = [],
  statusOptions = [],
  filters = [],
  onFiltersChange,
  onClose,
}) {
  const menuRef = useRef(null);
  const { top, left, maxHeight } = useAnchoredMenuPosition(anchorRef, menuRef);

  const [rows, setRows] = useState(() => normalizeFiltersForUi(filters, columns));
  const onFiltersChangeRef = useRef(onFiltersChange);
  onFiltersChangeRef.current = onFiltersChange;

  // Keep local rows in sync and push remapped operators back to applied filters.
  useEffect(() => {
    const normalized = normalizeFiltersForUi(filters, columns);
    setRows(normalized);

    if (filters.length === 0) {
      return;
    }

    const hasOperatorDrift = filters.some((filter) => {
      if (!filter?.operator || !filter?.columnKey) {
        return false;
      }

      const normalizedRow =
        normalized.find((row) => row.id && row.id === filter.id) ??
        normalized.find((row) => row.columnKey === filter.columnKey);

      return Boolean(normalizedRow && normalizedRow.operator !== filter.operator);
    });

    if (hasOperatorDrift) {
      onFiltersChangeRef.current?.(serializeFiltersForApply(normalized));
    }
  }, [columns, filters]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current?.contains(event.target) ||
        anchorRef?.current?.contains(event.target) ||
        isFilterMenuOverlayTarget(event.target)
      ) {
        return;
      }

      onClose?.();
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorRef, onClose]);

  const syncFilters = (nextRows) => {
    setRows(nextRows);
    onFiltersChange?.(serializeFiltersForApply(nextRows));
  };

  const updateRow = (rowId, patch) => {
    syncFilters(rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  };

  const removeRow = (rowId) => {
    const nextRows = rows.filter((row) => row.id !== rowId);
    syncFilters(nextRows.length > 0 ? nextRows : [createEmptyFilterRow()]);
  };

  const addFilter = () => {
    syncFilters([...rows, createEmptyFilterRow('and')]);
  };

  const updateRowLogicOperator = (rowId, logicOperator) => {
    syncFilters(rows.map((row) => (row.id === rowId ? { ...row, logicOperator } : row)));
  };

  const clearFilters = () => {
    const nextRows = [createEmptyFilterRow()];
    setRows(nextRows);
    onFiltersChange?.([]);
  };

  const hasAppliedFilters = getCompleteFilters(rows).length > 0;

  return (
    <div
      ref={menuRef}
      className='fixed z-50 flex w-[640px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-stroke-soft-200 bg-bg-white-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      style={{
        top,
        left,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      }}
    >
      <div className='flex shrink-0 items-center gap-1.5 border-b border-stroke-soft-200 px-4 py-3'>
        <span className='text-base font-medium text-text-main-900'>Filters</span>
        <RiInformationFill size={16} className='text-text-soft-400' />
      </div>

      <div className='overflow-x-hidden overflow-y-auto p-4'>
        {rows.map((row, index) => (
          <div key={row.id} className={cn('flex flex-col gap-3', index > 0 && 'mt-3')}>
            {index > 0 ? (
              <LogicOperatorToggle
                value={row.logicOperator ?? 'and'}
                onChange={(logicOperator) => updateRowLogicOperator(row.id, logicOperator)}
              />
            ) : null}

            <FilterConditionRow
              row={row}
              columns={columns}
              showWhereLabel={index === 0}
              tasks={tasks}
              statusOptions={statusOptions}
              onChange={(patch) => updateRow(row.id, patch)}
              onRemove={() => removeRow(row.id)}
            />
          </div>
        ))}
      </div>

      <div className='flex shrink-0 items-center justify-between border-t border-stroke-soft-200 px-4 py-3'>
        <button
          type='button'
          onClick={addFilter}
          className='flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-text-sub-500 transition hover:bg-bg-weak-50 hover:text-text-main-900'
        >
          <RiAddLine size={16} />
          Add filter
        </button>

        <button
          type='button'
          disabled={!hasAppliedFilters}
          onClick={clearFilters}
          className='rounded-lg border border-error-base px-3 py-1.5 text-sm font-medium text-error-base transition hover:bg-error-lighter disabled:cursor-not-allowed disabled:opacity-40'
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
