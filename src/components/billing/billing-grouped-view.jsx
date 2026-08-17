import React from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';
import * as Table from '@/components/ui/table';

const BillingGroupTable = React.memo(
  ({ groupRows, columns, variant, onRowSelect, sorting, onSortingChange }) => {
    const table = useReactTable({
      data: groupRows,
      columns,
      state: { sorting },
      onSortingChange,
      manualSorting: true,
      getCoreRowModel: getCoreRowModel(),
      enableSortingRemoval: true,
    });

    return (
      <Table.Root variant={variant} className='w-full' tableInstance={table}>
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.Head key={header.id} column={header.column}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </Table.Head>
              ))}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {table.getRowModel().rows.map((row, i, bodyRows) => (
            <React.Fragment key={row.id}>
              <Table.Row className='cursor-pointer' onClick={() => onRowSelect?.(row.original)}>
                {row.getVisibleCells().map((cell) => (
                  <Table.Cell key={cell.id} column={cell.column}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>
              {i < bodyRows.length - 1 && <Table.RowDivider />}
            </React.Fragment>
          ))}
        </Table.Body>
      </Table.Root>
    );
  },
);

BillingGroupTable.displayName = 'BillingGroupTable';

const BillingGroupedView = ({
  sortedKeys,
  groupsMap,
  columns,
  variant,
  onRowSelect,
  sorting,
  onSortingChange,
}) => {
  const [expandedKeys, setExpandedKeys] = React.useState(() =>
    Object.fromEntries(sortedKeys.map((k) => [k, true])),
  );

  React.useEffect(() => {
    setExpandedKeys((prev) => {
      const next = { ...prev };
      sortedKeys.forEach((k) => {
        if (next[k] === undefined) next[k] = true;
      });
      return next;
    });
  }, [sortedKeys]);

  return (
    <div className='flex w-full flex-col gap-10'>
      {sortedKeys.map((key) => {
        const groupRows = groupsMap[key] || [];
        const label = key === '' ? '(None)' : key;
        const isExpanded = expandedKeys[key] !== false;
        return (
          <div key={key === '' ? '__none__' : key} className='flex w-full flex-col gap-1'>
            <button
              type='button'
              onClick={() => setExpandedKeys((p) => ({ ...p, [key]: !isExpanded }))}
              className='label-small flex w-full cursor-pointer items-center gap-1 text-left font-medium text-text-sub-500'
            >
              {label}
              <span className='font-normal text-text-soft-400'>({groupRows.length})</span>
              {isExpanded ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />}
            </button>
            {isExpanded ? (
              <div className='w-full overflow-x-auto pt-2'>
                <BillingGroupTable
                  groupRows={groupRows}
                  columns={columns}
                  variant={variant}
                  onRowSelect={onRowSelect}
                  sorting={sorting}
                  onSortingChange={onSortingChange}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default BillingGroupedView;
