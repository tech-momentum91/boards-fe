import React, { useMemo } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import * as Badge from '@/components/ui/badge';
import * as Input from '@/components/ui/input';
import ProjectAreaTypeSelect from '@/components/projects/areas/project-area-type-select';
import * as Table from '@/components/ui/table';
import { applyColumnConfig } from '@/lib/column-utils';
import { PROJECT_DETAIL_AREAS_COLUMN_WIDTHS } from '@/components/projects/constants';
import { projectDetailColumnMeta } from '@/components/projects/shared/project-detail-table-layout';
import { cn } from '@/utils/cn';

function StopPropagation({ children, className }) {
  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      className={className}
    >
      {children}
    </div>
  );
}

function ProjectDetailColumnHeader({ label }) {
  return (
    <div className='flex items-center gap-0.5'>
      <span className='whitespace-nowrap text-paragraph-sm text-text-sub-600'>{label}</span>
    </div>
  );
}

function areaStatusColor(status) {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'active') return 'green';
  if (normalized === 'inactive') return 'gray';
  return 'gray';
}

function columnMeta(key) {
  return projectDetailColumnMeta(PROJECT_DETAIL_AREAS_COLUMN_WIDTHS, key, {
    fluidKeys: ['area_label', 'description'],
  });
}

export default function ProjectDetailAreasTable({
  rows,
  groupId,
  onRowClick,
  onFieldUpdate,
  columnConfig = [],
  areaTypeOptions = [],
  onAreaTypeOptionsChange,
  hideFloorColumn = false,
}) {
  const allColumnDefs = useMemo(
    () => [
      {
        id: 'area_label',
        accessorKey: 'area_label',
        columnLabel: 'Area',
        enableHiding: false,
        header: () => <ProjectDetailColumnHeader label='Area' />,
        cell: ({ row }) => (
          <button
            type='button'
            onClick={() => onRowClick?.(groupId, row.original.id)}
            className='truncate text-left text-label-sm text-text-strong-950 hover:underline'
          >
            {row.original.area_label || '—'}
          </button>
        ),
        meta: {
          headClassName: cn(PROJECT_DETAIL_AREAS_COLUMN_WIDTHS.area_label, 'whitespace-nowrap'),
        },
      },
      {
        id: 'area_type',
        accessorKey: 'area_type',
        columnLabel: 'Type',
        header: () => <ProjectDetailColumnHeader label='Type' />,
        cell: ({ row }) => {
          const area = row.original;
          return (
            <StopPropagation>
              <ProjectAreaTypeSelect
                value={area.area_type || ''}
                onValueChange={(value) => onFieldUpdate?.(area.id, 'area_type', value)}
                options={areaTypeOptions}
                onOptionsChange={onAreaTypeOptionsChange}
                placeholder='Select'
                size='xsmall'
                variant='borderless'
                triggerClassName='min-w-[120px]'
                commitOnBlurOnly
              />
            </StopPropagation>
          );
        },
        meta: columnMeta('area_type'),
      },
      {
        id: 'carpet_area',
        accessorKey: 'carpet_area',
        columnLabel: 'Carpet Area',
        header: () => <ProjectDetailColumnHeader label='Carpet Area' />,
        cell: ({ row }) => {
          const area = row.original;
          return (
            <StopPropagation>
              <Input.Root size='xsmall' variant='borderless' className='min-w-[100px]'>
                <Input.Wrapper>
                  <Input.Input
                    key={`${area.id}-carpet_area-${area.carpet_area}`}
                    defaultValue={area.carpet_area ?? ''}
                    placeholder='—'
                    onBlur={(event) =>
                      onFieldUpdate?.(area.id, 'carpet_area', event.currentTarget.value)
                    }
                  />
                </Input.Wrapper>
              </Input.Root>
            </StopPropagation>
          );
        },
        meta: columnMeta('carpet_area'),
      },
      {
        id: 'floor',
        accessorKey: 'floor',
        columnLabel: 'Floor',
        header: () => <ProjectDetailColumnHeader label='Floor' />,
        cell: ({ row }) => (
          <span className='text-paragraph-sm text-text-main-900'>{row.original.floor || '—'}</span>
        ),
        meta: columnMeta('floor'),
      },
      {
        id: 'description',
        accessorKey: 'description',
        columnLabel: 'Description',
        header: () => <ProjectDetailColumnHeader label='Description' />,
        cell: ({ row }) => (
          <span className='line-clamp-2 text-paragraph-sm text-text-sub-600'>
            {row.original.description || '—'}
          </span>
        ),
        meta: columnMeta('description'),
      },
      {
        id: 'status',
        accessorKey: 'status',
        columnLabel: 'Status',
        header: () => <ProjectDetailColumnHeader label='Status' />,
        cell: ({ row }) => {
          const status = row.original.status;
          if (!status) return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          return (
            <Badge.Root variant='light' color={areaStatusColor(status)} className='text-nowrap'>
              {status}
            </Badge.Root>
          );
        },
        meta: columnMeta('status'),
      },
    ],
    [areaTypeOptions, groupId, onAreaTypeOptionsChange, onFieldUpdate, onRowClick],
  );

  const columns = useMemo(() => {
    const defs = hideFloorColumn
      ? allColumnDefs.filter((column) => column.id !== 'floor')
      : allColumnDefs;
    return applyColumnConfig(defs, columnConfig);
  }, [allColumnDefs, columnConfig, hideFloorColumn]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <Table.Root variant='compact' className='w-full overflow-x-auto'>
      <Table.Header>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Table.Head key={header.id} className={header.column.columnDef.meta?.headClassName}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </Table.Head>
            ))}
          </Table.Row>
        ))}
      </Table.Header>
      <Table.Body spacing={4}>
        {table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <Table.Row
              key={row.id}
              className='cursor-pointer'
              onClick={() => onRowClick?.(groupId, row.original.id)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  onRowClick?.(groupId, row.original.id);
                }
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <Table.Cell key={cell.id} className='align-middle'>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Cell>
              ))}
            </Table.Row>
          ))
        ) : (
          <Table.Row>
            <Table.Cell colSpan={columns.length} className='py-8 text-center text-text-sub-500'>
              No areas in this group
            </Table.Cell>
          </Table.Row>
        )}
      </Table.Body>
    </Table.Root>
  );
}
