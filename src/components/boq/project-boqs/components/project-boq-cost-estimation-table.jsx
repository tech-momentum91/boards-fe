import React, { memo, useMemo, useState } from 'react';
import { RiExpandUpDownFill } from 'react-icons/ri';

import {
  formatProjectBoqOverviewPercent,
  formatProjectBoqOverviewTablePerSqft,
  formatProjectBoqOverviewTableTotal,
} from '@/components/boq/project-boqs/components/project-boq-overview-utils';
import * as Table from '@/components/ui/table';
import { cn } from '@/utils/cn';

const COLUMNS = [
  { id: 'item', label: 'Item', sortable: true, width: 174 },
  { id: 'clientCostPerSqft', label: 'Client Cost/Sq.ft', sortable: true, width: 160 },
  { id: 'clientTotalCost', label: 'Client Total Cost', sortable: true, width: 160 },
  { id: 'internalCostPerSqft', label: 'Internal Cost/Sq.ft', sortable: true, width: 170 },
  { id: 'internalTotalCost', label: 'Internal Total Cost', sortable: true, width: 166 },
  { id: 'marginPercent', label: 'Margin %', sortable: true, width: 111 },
  { id: 'marginCost', label: 'Margin Cost', sortable: true, width: 111 },
];

const TABLE_MIN_WIDTH = COLUMNS.reduce((sum, column) => sum + column.width, 0);

const formatCellValue = (row, columnId) => {
  switch (columnId) {
    case 'item':
      return row.item;
    case 'clientCostPerSqft':
      return formatProjectBoqOverviewTablePerSqft(row.clientCostPerSqft);
    case 'clientTotalCost':
      return formatProjectBoqOverviewTableTotal(row.clientTotalCost);
    case 'internalCostPerSqft':
      return formatProjectBoqOverviewTablePerSqft(row.internalCostPerSqft);
    case 'internalTotalCost':
      return formatProjectBoqOverviewTableTotal(row.internalTotalCost);
    case 'marginPercent':
      return formatProjectBoqOverviewPercent(row.marginPercent);
    case 'marginCost':
      return formatProjectBoqOverviewTableTotal(row.marginCost);
    default:
      return '--';
  }
};

const compareRows = (a, b, columnId, direction) => {
  if (columnId === 'item') {
    const result = String(a.item).localeCompare(String(b.item), undefined, { numeric: true });
    return direction === 'desc' ? -result : result;
  }

  const result = Number(a[columnId]) - Number(b[columnId]);
  return direction === 'desc' ? -result : result;
};

const ProjectBoqCostEstimationTable = memo(({ title = 'Master Cost Estimation', rows = [] }) => {
  const [sortState, setSortState] = useState({ columnId: 'item', direction: 'asc' });

  const sortedRows = useMemo(() => {
    const nextRows = [...rows];
    nextRows.sort((a, b) => compareRows(a, b, sortState.columnId, sortState.direction));
    return nextRows;
  }, [rows, sortState.columnId, sortState.direction]);

  const totals = useMemo(() => {
    const aggregated = rows.reduce(
      (acc, row) => ({
        clientCostPerSqft: acc.clientCostPerSqft + (Number(row.clientCostPerSqft) || 0),
        clientTotalCost: acc.clientTotalCost + (Number(row.clientTotalCost) || 0),
        internalCostPerSqft: acc.internalCostPerSqft + (Number(row.internalCostPerSqft) || 0),
        internalTotalCost: acc.internalTotalCost + (Number(row.internalTotalCost) || 0),
        marginCost: acc.marginCost + (Number(row.marginCost) || 0),
      }),
      {
        clientCostPerSqft: 0,
        clientTotalCost: 0,
        internalCostPerSqft: 0,
        internalTotalCost: 0,
        marginCost: 0,
      },
    );

    const marginPercent =
      aggregated.clientTotalCost > 0
        ? Math.round((aggregated.marginCost / aggregated.clientTotalCost) * 1000) / 10
        : 0;

    return { ...aggregated, marginPercent };
  }, [rows]);

  const handleSort = (columnId) => {
    setSortState((previous) => {
      if (previous.columnId !== columnId) {
        return { columnId, direction: 'asc' };
      }
      return {
        columnId,
        direction: previous.direction === 'asc' ? 'desc' : 'asc',
      };
    });
  };

  const headCellClass =
    'h-9 border-r border-stroke-soft-200 bg-bg-weak-100 px-3 py-2 last:border-r-0';
  const bodyCellClass = 'h-12 border-r border-stroke-soft-200 px-3 py-3 pr-5 last:border-r-0';

  return (
    <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
      <div className='border-b border-stroke-soft-200 px-4 py-2.5'>
        <h3 className='text-[16px] font-semibold leading-6 text-text-main-900'>{title}</h3>
      </div>

      <Table.Root style={{ minWidth: TABLE_MIN_WIDTH, tableLayout: 'fixed' }}>
        <colgroup>
          {COLUMNS.map((column) => (
            <col key={column.id} style={{ width: column.width }} />
          ))}
        </colgroup>

        <Table.Header>
          <Table.Row className='hover:bg-transparent'>
            {COLUMNS.map((column) => (
              <Table.Head
                key={column.id}
                className={headCellClass}
                style={{ width: column.width, minWidth: column.width }}
              >
                <button
                  type='button'
                  onClick={() => column.sortable && handleSort(column.id)}
                  className={cn(
                    'flex w-full items-center gap-0.5 whitespace-nowrap',
                    column.sortable && 'cursor-pointer',
                  )}
                >
                  <span className='shrink-0 text-[14px] font-medium tracking-[-0.084px] text-text-soft-400'>
                    {column.label}
                  </span>
                  {column.sortable ? (
                    <RiExpandUpDownFill className='size-5 shrink-0 text-text-soft-400' />
                  ) : null}
                </button>
              </Table.Head>
            ))}
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {sortedRows.length === 0 ? (
            <Table.Row className='hover:bg-transparent'>
              <Table.Cell colSpan={COLUMNS.length} className='px-4 py-8 text-center'>
                <span className='text-paragraph-sm text-text-soft-400'>
                  No category data available for this selection.
                </span>
              </Table.Cell>
            </Table.Row>
          ) : (
            sortedRows.map((row, index) => (
              <Table.Row
                key={row.id || row.item}
                className={cn(
                  'border-b border-stroke-soft-200 hover:bg-transparent',
                  index % 2 === 1 ? 'bg-[#fbfbfb]' : 'bg-bg-white-0',
                )}
              >
                {COLUMNS.map((column) => (
                  <Table.Cell
                    key={column.id}
                    className={bodyCellClass}
                    style={{ width: column.width, minWidth: column.width }}
                  >
                    <span
                      className={cn(
                        'block truncate text-[14px] tracking-[-0.084px]',
                        column.id === 'item'
                          ? 'font-medium text-text-main-900'
                          : 'font-normal text-text-sub-500',
                      )}
                    >
                      {formatCellValue(row, column.id)}
                    </span>
                  </Table.Cell>
                ))}
              </Table.Row>
            ))
          )}

          {sortedRows.length > 0 ? (
            <Table.Row className='bg-[#f5f5f5] hover:bg-[#f5f5f5]'>
              {COLUMNS.map((column, columnIndex) => (
                <Table.Cell
                  key={column.id}
                  className={bodyCellClass}
                  style={{ width: column.width, minWidth: column.width }}
                >
                  <span
                    className={cn(
                      'block truncate text-[14px] tracking-[-0.084px]',
                      columnIndex === 0
                        ? 'font-bold text-text-sub-500'
                        : 'font-semibold text-text-sub-500',
                    )}
                  >
                    {columnIndex === 0 ? 'TOTAL' : formatCellValue(totals, column.id)}
                  </span>
                </Table.Cell>
              ))}
            </Table.Row>
          ) : null}
        </Table.Body>
      </Table.Root>
    </div>
  );
});

ProjectBoqCostEstimationTable.displayName = 'ProjectBoqCostEstimationTable';

export default ProjectBoqCostEstimationTable;
