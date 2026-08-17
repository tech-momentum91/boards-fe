import React, { memo, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { formatAumDetailDateDisplay } from '@/components/aum/asset/asset-detail-helper';
import AumEditableBadgeWithCaret from '@/components/aum/asset/aum-badge-with-caret';
import AumAssetGroupDivider from '@/components/aum/asset/asset-group-divider';
import AumStatusDropdown from '@/components/aum/shared/aum-status-dropdown';
import { applyColumnConfig } from '@/lib/column-utils';
import {
  getMwqConditionBadgeStyle,
  getMwqPreventiveConditionOptionsForRow,
  getMwqPriorityBadgeStyle,
  getMwqTaskConditionOptionsForRow,
  MWQ_PREVENTIVE_COLUMN_CONFIG,
} from '@/components/aum/maintenance-work-queue/maintenance-work-queue-constants';
import { MWQ_PREVENTIVE_CONDITION_OPTIONS } from '@/components/aum/shared/mwq-badge-helpers';
import MwqAssigneePicker from '@/components/aum/maintenance-work-queue/mwq-assignee-picker';
import * as Avatar from '@/components/ui/avatar';
import * as AvatarGroup from '@/components/ui/avatar-group';
import * as Badge from '@/components/ui/badge';
import * as Checkbox from '@/components/ui/checkbox';
import * as Table from '@/components/ui/table';
import { resolveFileUrl } from '@/lib/utils';
import { cn } from '@/utils/cn';

const COL = {
  select: 'w-[44px] min-w-[44px] max-w-[44px] overflow-hidden',
  productCode: 'w-[122px] min-w-[122px] max-w-[122px] overflow-hidden',
  assignee: 'w-[100px] min-w-[100px] max-w-[100px] overflow-hidden',
  startDate: 'w-[120px] min-w-[120px] max-w-[120px] overflow-hidden',
  dueDate: 'w-[120px] min-w-[120px] max-w-[120px] overflow-hidden',
  condition: 'w-[188px] min-w-[188px] max-w-[188px]',
  status: 'w-[148px] min-w-[148px] max-w-[148px]',
  priority: 'w-[108px] min-w-[108px] max-w-[108px]',
  brand: 'w-[142px] min-w-[142px] max-w-[142px] overflow-hidden',
  area: 'w-[130px] min-w-[130px] max-w-[130px] overflow-hidden',
  center: 'w-[130px] min-w-[130px] max-w-[130px] overflow-hidden',
  productType: 'w-[140px] min-w-[140px] max-w-[140px] overflow-hidden',
  productGroup: 'w-[150px] min-w-[150px] max-w-[150px] overflow-hidden',
  productCategory: 'w-[150px] min-w-[150px] max-w-[150px] overflow-hidden',
  categoryGroup: 'w-[170px] min-w-[170px] max-w-[170px] overflow-hidden',
  purchaseDate: 'w-[150px] min-w-[150px] max-w-[150px] overflow-hidden',
  warrantyDueDate: 'w-[170px] min-w-[170px] max-w-[170px] overflow-hidden',
  originalValue: 'w-[140px] min-w-[140px] max-w-[140px] overflow-hidden',
  currentValue: 'w-[140px] min-w-[140px] max-w-[140px] overflow-hidden',
  lastMaintenanceDate: 'w-[170px] min-w-[170px] max-w-[170px] overflow-hidden',
  totalMaintenanceValue: 'w-[200px] min-w-[200px] max-w-[200px] overflow-hidden',
};

const EMPTY_SORTING = [];

const listSortHeader = (label) => {
  const Inner = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable={column?.getCanSort?.()} />
  );
  Inner.displayName = `MwqSortHeader(${label})`;
  return Inner;
};

const textCell = (value = '—') => (
  <span className='paragraph-small block w-full truncate text-text-sub-500' title={String(value)}>
    {value}
  </span>
);

function NameCell({ row, onOpen }) {
  const imageUrl = row.original.image ? resolveFileUrl(row.original.image) : '';
  const isInteractive = typeof onOpen === 'function';

  return (
    <button
      type='button'
      onClick={() => onOpen?.(row.original)}
      disabled={!isInteractive}
      className={cn(
        'flex min-w-0 items-center gap-3 text-left',
        isInteractive && 'cursor-pointer hover:opacity-80',
        !isInteractive && 'cursor-default',
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=''
          className='size-8 shrink-0 rounded-lg border border-stroke-soft-200 object-cover'
        />
      ) : (
        <div className='size-8 shrink-0 rounded-lg border border-stroke-soft-200 bg-bg-weak-100' />
      )}
      <span className='paragraph-small truncate font-medium text-text-main-900'>
        {row.original.name || '—'}
      </span>
    </button>
  );
}

function AssigneeCell({ row, onAssigneeChange }) {
  if (typeof onAssigneeChange === 'function') {
    return (
      <MwqAssigneePicker
        assignees={row.assignees}
        primaryAssigneeEmail={row.primaryAssigneeEmail}
        onChange={(email) => onAssigneeChange(row.id, email)}
        size='xsmall'
        maxVisibleAvatars={1}
      />
    );
  }

  const assignees = row.assignees || [];
  if (assignees.length === 0) return textCell('—');

  const primaryEmail = (row.primaryAssigneeEmail || '').trim();
  const primary = assignees.find((assignee) => assignee.email === primaryEmail) || assignees[0];

  if (assignees.length === 1 || primary) {
    const assignee = primary || assignees[0];
    return (
      <Avatar.Root size={24} color='gray'>
        <span className='text-label-sm'>{assignee.initials}</span>
      </Avatar.Root>
    );
  }

  const visible = assignees.slice(0, 3);

  return (
    <AvatarGroup.Root size={24}>
      {visible.map((assignee) => (
        <Avatar.Root key={assignee.email || assignee.name} size={24} color='gray'>
          <span className='text-label-sm'>{assignee.initials}</span>
        </Avatar.Root>
      ))}
      {assignees.length > 3 ? (
        <AvatarGroup.Overflow size={24}>+{assignees.length - 3}</AvatarGroup.Overflow>
      ) : null}
    </AvatarGroup.Root>
  );
}

function MwqStaticBadgeCell({ value, color = 'gray', variant = 'lighter' }) {
  if (!value) return textCell('—');

  return (
    <Badge.Root size='small' variant={variant} color={color} className='max-w-full normal-case'>
      <span className='truncate uppercase'>{String(value)}</span>
    </Badge.Root>
  );
}

function MwqBadgeCell({
  value,
  options,
  color,
  variant = 'filled',
  onChange,
  disabled = false,
  ariaLabel,
}) {
  if (!value) return textCell('—');

  if (disabled || !options?.length) {
    return <MwqStaticBadgeCell value={value} color={color} variant={variant} />;
  }

  return (
    <AumEditableBadgeWithCaret
      value={value}
      options={options}
      color={color}
      variant={variant}
      onChange={onChange}
      uppercase
      ariaLabel={ariaLabel}
      className='max-w-full'
    />
  );
}

function PriorityCell({ priority }) {
  const priorityStyle = getMwqPriorityBadgeStyle(priority);

  return (
    <MwqStaticBadgeCell
      value={priority}
      color={priorityStyle.color}
      variant={priorityStyle.variant}
    />
  );
}

function MaintenanceWorkQueueTableBody({
  rows,
  columnConfig,
  mode,
  embedded = false,
  showCheckboxes = false,
  selectedRowIds,
  onSelectedRowIdsChange,
  onConditionChange,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onRowClick,
  pinnedColumnId = 'name',
}) {
  const isPreventiveMode = mode === 'preventive';

  const rowIdSet = useMemo(
    () => (selectedRowIds instanceof Set ? selectedRowIds : new Set(selectedRowIds ?? [])),
    [selectedRowIds],
  );

  const toggleRowSelection = (rowId, checked) => {
    if (!onSelectedRowIdsChange) return;
    const next = new Set(rowIdSet);
    if (checked) {
      next.add(rowId);
    } else {
      next.delete(rowId);
    }
    onSelectedRowIdsChange(next);
  };

  const toggleAllRows = (checked) => {
    if (!onSelectedRowIdsChange) return;
    if (checked) {
      onSelectedRowIdsChange(new Set(rows.map((row) => row.id)));
    } else {
      onSelectedRowIdsChange(new Set());
    }
  };

  const allSelected = rows.length > 0 && rows.every((row) => rowIdSet.has(row.id));
  const someSelected = rows.some((row) => rowIdSet.has(row.id));

  const allColumns = useMemo(
    () => [
      ...(showCheckboxes
        ? [
            {
              id: 'select',
              enableSorting: false,
              header: () => (
                <Checkbox.Root
                  size='small'
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={(checked) => toggleAllRows(Boolean(checked))}
                  aria-label='Select all rows'
                />
              ),
              meta: { className: COL.select },
              cell: ({ row }) => (
                <Checkbox.Root
                  size='small'
                  checked={rowIdSet.has(row.original.id)}
                  onCheckedChange={(checked) =>
                    toggleRowSelection(row.original.id, Boolean(checked))
                  }
                  aria-label={`Select ${row.original.name}`}
                />
              ),
            },
          ]
        : []),
      {
        id: 'name',
        accessorKey: 'name',
        header: listSortHeader('Name'),
        meta: {
          className: 'w-[256px] min-w-[256px] max-w-[256px] overflow-hidden',
        },
        cell: ({ row }) => <NameCell row={row} onOpen={onRowClick} />,
      },
      {
        id: 'productCode',
        accessorKey: 'productCode',
        header: listSortHeader('Product Code'),
        meta: { className: COL.productCode },
        cell: ({ row }) => textCell(row.original.productCode),
      },
      {
        id: 'assignee',
        accessorKey: 'assignee',
        header: listSortHeader('Assignee'),
        meta: { className: COL.assignee },
        cell: ({ row }) => <AssigneeCell row={row.original} onAssigneeChange={onAssigneeChange} />,
      },
      {
        id: 'startDate',
        accessorKey: 'startDate',
        header: listSortHeader('Start Date'),
        meta: { className: COL.startDate },
        cell: ({ row }) => textCell(formatAumDetailDateDisplay(row.original.startDate)),
      },
      {
        id: 'dueDate',
        accessorKey: 'dueDate',
        header: listSortHeader('Due Date'),
        meta: { className: COL.dueDate },
        cell: ({ row }) => textCell(formatAumDetailDateDisplay(row.original.dueDate)),
      },
      {
        id: 'condition',
        accessorKey: 'condition',
        header: listSortHeader('Condition'),
        meta: { className: COL.condition },
        cell: ({ row }) => {
          const conditionStyle = getMwqConditionBadgeStyle(row.original.condition);
          const conditionOptions = isPreventiveMode
            ? getMwqPreventiveConditionOptionsForRow(row.original)
            : getMwqTaskConditionOptionsForRow(row.original);

          return (
            <MwqBadgeCell
              value={row.original.condition}
              options={conditionOptions}
              color={conditionStyle.color}
              variant={conditionStyle.variant}
              onChange={(next) => onConditionChange?.(row.original.id, next)}
              ariaLabel='Change condition'
            />
          );
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: listSortHeader('Status'),
        meta: { className: COL.status },
        cell: ({ row }) => {
          if (!row.original.status) return textCell('—');

          return (
            <div onClick={(event) => event.stopPropagation()}>
              <AumStatusDropdown
                mode={isPreventiveMode ? 'preventive' : 'task'}
                value={row.original.status}
                onValueChange={(next) => onStatusChange?.(row.original.id, next)}
                row={row.original}
                disabled={!onStatusChange}
                size='small'
                className='w-full'
              />
            </div>
          );
        },
      },
      {
        id: 'priority',
        accessorKey: 'priority',
        header: listSortHeader('Priority'),
        meta: { className: COL.priority },
        cell: ({ row }) => <PriorityCell priority={row.original.priority} />,
      },
      {
        id: 'brand',
        accessorKey: 'brand',
        header: listSortHeader('Brand'),
        meta: { className: COL.brand },
        cell: ({ row }) => textCell(row.original.brand),
      },
      {
        id: 'area',
        accessorKey: 'area',
        header: listSortHeader('Area'),
        meta: { className: COL.area },
        cell: ({ row }) => textCell(row.original.area),
      },
      {
        id: 'center',
        accessorKey: 'center',
        header: listSortHeader('Center'),
        meta: { className: COL.center },
        cell: ({ row }) => textCell(row.original.center),
      },
      {
        id: 'productType',
        accessorKey: 'productType',
        header: listSortHeader('Product Type'),
        meta: { className: COL.productType },
        cell: ({ row }) => textCell(row.original.productType),
      },
      {
        id: 'productGroup',
        accessorKey: 'productGroup',
        header: listSortHeader('Product Group'),
        meta: { className: COL.productGroup },
        cell: ({ row }) => textCell(row.original.productGroup),
      },
      {
        id: 'productCategory',
        accessorKey: 'productCategory',
        header: listSortHeader('Category Type'),
        meta: { className: COL.productCategory },
        cell: ({ row }) => textCell(row.original.productCategory),
      },
      {
        id: 'categoryGroup',
        accessorKey: 'categoryGroup',
        header: listSortHeader('Category Group'),
        meta: { className: COL.categoryGroup },
        cell: ({ row }) => textCell(row.original.categoryGroup),
      },
      {
        id: 'purchaseDate',
        accessorKey: 'purchaseDate',
        header: listSortHeader('Purchase Date'),
        meta: { className: COL.purchaseDate },
        cell: ({ row }) => textCell(formatAumDetailDateDisplay(row.original.purchaseDate)),
      },
      {
        id: 'warrantyDueDate',
        accessorKey: 'warrantyDueDate',
        header: listSortHeader('Warranty Due Date'),
        meta: { className: COL.warrantyDueDate },
        cell: ({ row }) => textCell(formatAumDetailDateDisplay(row.original.warrantyDueDate)),
      },
      {
        id: 'originalValue',
        accessorKey: 'originalValue',
        header: listSortHeader('Original Value'),
        meta: { className: COL.originalValue },
        cell: ({ row }) => textCell(row.original.originalValue),
      },
      {
        id: 'currentValue',
        accessorKey: 'currentValue',
        header: listSortHeader('Current Value'),
        meta: { className: COL.currentValue },
        cell: ({ row }) => textCell(row.original.currentValue),
      },
      {
        id: 'lastMaintenanceDate',
        accessorKey: 'lastMaintenanceDate',
        header: listSortHeader('Last Maintenance'),
        meta: { className: COL.lastMaintenanceDate },
        cell: ({ row }) => textCell(formatAumDetailDateDisplay(row.original.lastMaintenanceDate)),
      },
      {
        id: 'totalMaintenanceValue',
        accessorKey: 'totalMaintenanceValue',
        header: listSortHeader('Total Maintenance Value'),
        meta: { className: COL.totalMaintenanceValue },
        cell: ({ row }) => textCell(row.original.totalMaintenanceValue),
      },
    ],
    [
      allSelected,
      isPreventiveMode,
      onConditionChange,
      onPriorityChange,
      onAssigneeChange,
      onRowClick,
      onStatusChange,
      onSelectedRowIdsChange,
      rowIdSet,
      rows,
      showCheckboxes,
      someSelected,
    ],
  );

  const [sorting, setSorting] = useState(EMPTY_SORTING);

  const columns = useMemo(() => {
    const selectColumn = showCheckboxes
      ? allColumns.find((column) => column.id === 'select')
      : null;
    const dataColumns = allColumns.filter((column) => column.id !== 'select');
    const configured = applyColumnConfig(
      dataColumns,
      columnConfig,
      MWQ_PREVENTIVE_COLUMN_CONFIG,
      pinnedColumnId,
    );

    return selectColumn ? [selectColumn, ...configured] : configured;
  }, [allColumns, columnConfig, pinnedColumnId, showCheckboxes]);

  const tableMinWidth = useMemo(() => {
    const widths = columns.map((column) => {
      const className = column.meta?.className ?? '';
      const match = className.match(/min-w-\[(\d+)px]/);
      return match ? Number.parseInt(match[1], 10) : 120;
    });
    const total = widths.reduce((sum, width) => sum + width, 0);
    return Math.max(total, 1120);
  }, [columns]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: true,
  });

  if (rows.length === 0) return null;

  return (
    <div className={cn('overflow-x-auto bg-bg-white-0', !embedded && 'rounded-xl')}>
      <Table.Root
        className='w-full table-fixed'
        style={{ minWidth: `${tableMinWidth}px` }}
        variant='compact'
      >
        <Table.Header className='bg-bg-weak-100'>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.Head
                  key={header.id}
                  className={cn(
                    'h-9 overflow-hidden rounded-none bg-bg-weak-100 first:rounded-none last:rounded-none',
                    header.column.columnDef.meta?.className,
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </Table.Head>
              ))}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body spacing={8}>
          {table.getRowModel().rows.map((row, index, allRows) => (
            <React.Fragment key={row.id}>
              <Table.Row>
                {row.getVisibleCells().map((cell) => (
                  <Table.Cell
                    key={cell.id}
                    className={cn(
                      ['condition', 'status', 'priority', 'assignee'].includes(cell.column.id)
                        ? 'overflow-visible'
                        : 'overflow-hidden',
                      cell.column.columnDef.meta?.className,
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>
              {index < allRows.length - 1 ? <Table.RowDivider /> : null}
            </React.Fragment>
          ))}
        </Table.Body>
      </Table.Root>
    </div>
  );
}

function MaintenanceWorkQueueGroup({
  group,
  columnConfig,
  mode,
  showCheckboxes = false,
  selectedRowIds,
  onSelectedRowIdsChange,
  onConditionChange,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onRowClick,
  defaultExpanded = true,
  pinnedColumnId = 'name',
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className='flex w-full flex-col'>
      <AumAssetGroupDivider
        name={group.name}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />
      {expanded ? (
        <MaintenanceWorkQueueTableBody
          rows={group.rows}
          columnConfig={columnConfig}
          mode={mode}
          embedded
          showCheckboxes={showCheckboxes}
          selectedRowIds={selectedRowIds}
          onSelectedRowIdsChange={onSelectedRowIdsChange}
          onConditionChange={onConditionChange}
          onStatusChange={onStatusChange}
          onPriorityChange={onPriorityChange}
          onAssigneeChange={onAssigneeChange}
          onRowClick={onRowClick}
          pinnedColumnId={pinnedColumnId}
        />
      ) : null}
    </div>
  );
}

const MaintenanceWorkQueueTable = memo(
  ({
    groups = [],
    flatRows = [],
    columnConfig = [],
    mode = 'preventive',
    embedded = false,
    showCheckboxes = false,
    selectedRowIds,
    onSelectedRowIdsChange,
    onConditionChange,
    onStatusChange,
    onPriorityChange,
    onAssigneeChange,
    onRowClick,
    pinnedColumnId = 'name',
  }) => {
    if (Array.isArray(columnConfig) && columnConfig.length > 0) {
      const hasVisibleColumns = columnConfig.some((column) => column.visible !== false);
      if (!hasVisibleColumns) {
        return (
          <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
            No columns selected. Use the column settings to show fields.
          </div>
        );
      }
    }

    const hasGroups = groups.some((group) => group.rows?.length > 0);
    const hasFlatRows = flatRows.length > 0;

    if (!hasGroups && !hasFlatRows) {
      if (embedded) return null;

      return (
        <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
          No records match this filter.
        </div>
      );
    }

    if (hasGroups) {
      return (
        <div className='flex w-full flex-col bg-bg-white-0'>
          {groups.map((group) => (
            <MaintenanceWorkQueueGroup
              key={group.id}
              group={group}
              columnConfig={columnConfig}
              mode={mode}
              showCheckboxes={showCheckboxes}
              selectedRowIds={selectedRowIds}
              onSelectedRowIdsChange={onSelectedRowIdsChange}
              onConditionChange={onConditionChange}
              onStatusChange={onStatusChange}
              onPriorityChange={onPriorityChange}
              onAssigneeChange={onAssigneeChange}
              onRowClick={onRowClick}
              pinnedColumnId={pinnedColumnId}
            />
          ))}
        </div>
      );
    }

    return (
      <MaintenanceWorkQueueTableBody
        rows={flatRows}
        columnConfig={columnConfig}
        mode={mode}
        embedded={embedded}
        showCheckboxes={showCheckboxes}
        selectedRowIds={selectedRowIds}
        onSelectedRowIdsChange={onSelectedRowIdsChange}
        onConditionChange={onConditionChange}
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
        onAssigneeChange={onAssigneeChange}
        onRowClick={onRowClick}
        pinnedColumnId={pinnedColumnId}
      />
    );
  },
);

MaintenanceWorkQueueTable.displayName = 'MaintenanceWorkQueueTable';

export default MaintenanceWorkQueueTable;
