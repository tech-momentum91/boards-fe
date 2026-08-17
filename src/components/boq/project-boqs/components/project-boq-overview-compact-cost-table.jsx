import React, { memo, useMemo, useState } from 'react';
import { RiExpandUpDownFill } from 'react-icons/ri';

import {
  formatProjectBoqOverviewTablePerSqft,
  formatProjectBoqOverviewTableTotal,
} from '@/components/boq/project-boqs/components/project-boq-overview-utils';
import * as Table from '@/components/ui/table';
import { cn } from '@/utils/cn';

const COLUMNS = [
  { id: 'item', label: 'Item', sortable: true, width: 'auto' },
  { id: 'costPerSqft', label: 'Cost/Sq.ft', sortable: true, width: 140 },
  { id: 'totalCost', label: 'Total Cost', sortable: true, width: 140 },
];

const compareRows = (a, b, columnId, direction) => {
  if (columnId === 'item') {
    const result = String(a.item).localeCompare(String(b.item), undefined, { numeric: true });
    return direction === 'desc' ? -result : result;
  }

  const result = Number(a[columnId]) - Number(b[columnId]);
  return direction === 'desc' ? -result : result;
};

const ProjectBoqOverviewCompactCostTable = memo(
  ({ title, rows = [], costPerSqftKey = 'costPerSqft', totalCostKey = 'totalCost' }) => {
    const [sortState, setSortState] = useState({ columnId: 'item', direction: 'asc' });

    const tableRows = useMemo(
      () =>
        rows.map((row) => ({
          id: row.id,
          item: row.item,
          costPerSqft: Number(row[costPerSqftKey]) || 0,
          totalCost: Number(row[totalCostKey]) || 0,
        })),
      [costPerSqftKey, rows, totalCostKey],
    );

    const sortedRows = useMemo(() => {
      const nextRows = [...tableRows];
      nextRows.sort((a, b) => compareRows(a, b, sortState.columnId, sortState.direction));
      return nextRows;
    }, [sortState.columnId, sortState.direction, tableRows]);

    const totals = useMemo(
      () =>
        tableRows.reduce(
          (acc, row) => ({
            costPerSqft: acc.costPerSqft + row.costPerSqft,
            totalCost: acc.totalCost + row.totalCost,
          }),
          { costPerSqft: 0, totalCost: 0 },
        ),
      [tableRows],
    );

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
      '!h-9 !rounded-none border-r border-stroke-soft-200 bg-bg-weak-100 !px-3 !py-2 last:border-r-0';
    const bodyCellClass =
      '!h-12 !min-h-12 !rounded-none border-r border-stroke-soft-200 !bg-transparent !px-3 !py-3 !pr-5 last:border-r-0 group-hover/row:!bg-transparent';
    const dividerCellClass =
      '!h-px !min-h-0 !border-0 !p-0 !bg-transparent group-hover/row:!bg-transparent';

    const renderDividerRow = (key) => (
      <Table.Row key={key} aria-hidden className='hover:bg-transparent'>
        <Table.Cell colSpan={COLUMNS.length} className={dividerCellClass}>
          <div className='h-px w-full bg-stroke-soft-200' />
        </Table.Cell>
      </Table.Row>
    );

    return (
      <div className='flex min-w-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-stroke-soft-200 bg-bg-white-0'>
        {title ? (
          <div className='shrink-0 px-4 py-2.5'>
            <h3 className='text-[16px] font-semibold leading-6 text-text-main-900'>{title}</h3>
          </div>
        ) : null}

        <div className='max-h-[601px] min-h-0 flex-1 overflow-auto border-t border-stroke-soft-200'>
          <Table.Root variant='compact' className='min-w-[320px]' style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col />
              <col style={{ width: 140 }} />
              <col style={{ width: 140 }} />
            </colgroup>

            <Table.Header>
              <Table.Row className='hover:bg-transparent'>
                {COLUMNS.map((column) => (
                  <Table.Head
                    key={column.id}
                    className={headCellClass}
                    style={
                      column.width === 'auto'
                        ? undefined
                        : { width: column.width, minWidth: column.width }
                    }
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
                  <React.Fragment key={row.id || row.item}>
                    <Table.Row
                      className={cn(
                        'hover:bg-transparent',
                        index % 2 === 1 ? 'bg-[#fbfbfb]' : 'bg-bg-white-0',
                      )}
                    >
                      <Table.Cell className={bodyCellClass}>
                        <span className='block truncate whitespace-nowrap text-[14px] font-medium leading-5 tracking-[-0.084px] text-text-main-900'>
                          {row.item}
                        </span>
                      </Table.Cell>
                      <Table.Cell className={bodyCellClass} style={{ width: 140, minWidth: 140 }}>
                        <span className='block whitespace-nowrap text-[14px] font-normal leading-5 tracking-[-0.084px] text-text-sub-500'>
                          {formatProjectBoqOverviewTablePerSqft(row.costPerSqft)}
                        </span>
                      </Table.Cell>
                      <Table.Cell className={bodyCellClass} style={{ width: 140, minWidth: 140 }}>
                        <span className='block whitespace-nowrap text-[14px] font-normal leading-5 tracking-[-0.084px] text-text-sub-500'>
                          {formatProjectBoqOverviewTableTotal(row.totalCost)}
                        </span>
                      </Table.Cell>
                    </Table.Row>
                    {index < sortedRows.length - 1
                      ? renderDividerRow(`divider-${row.id || row.item}`)
                      : null}
                  </React.Fragment>
                ))
              )}

              {sortedRows.length > 0 ? (
                <>
                  {renderDividerRow('divider-total')}
                  <Table.Row className='bg-[#f5f5f5] hover:bg-[#f5f5f5]'>
                    <Table.Cell className={bodyCellClass}>
                      <span className='block whitespace-nowrap text-[14px] font-bold leading-5 tracking-[-0.084px] text-text-sub-500'>
                        TOTAL
                      </span>
                    </Table.Cell>
                    <Table.Cell className={bodyCellClass} style={{ width: 140, minWidth: 140 }}>
                      <span className='block whitespace-nowrap text-[14px] font-semibold leading-5 text-text-sub-500'>
                        {formatProjectBoqOverviewTablePerSqft(totals.costPerSqft)}
                      </span>
                    </Table.Cell>
                    <Table.Cell className={bodyCellClass} style={{ width: 140, minWidth: 140 }}>
                      <span className='block whitespace-nowrap text-[14px] font-semibold leading-5 text-text-sub-500'>
                        {formatProjectBoqOverviewTableTotal(totals.totalCost)}
                      </span>
                    </Table.Cell>
                  </Table.Row>
                </>
              ) : null}
            </Table.Body>
          </Table.Root>
        </div>
      </div>
    );
  },
);

ProjectBoqOverviewCompactCostTable.displayName = 'ProjectBoqOverviewCompactCostTable';

export default ProjectBoqOverviewCompactCostTable;
