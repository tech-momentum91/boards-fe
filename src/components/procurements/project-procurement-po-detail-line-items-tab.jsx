import React, { useMemo, useState } from 'react';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiExpandDiagonalLine,
  RiInformationFill,
  RiLayoutColumnLine,
  RiSearchLine,
} from 'react-icons/ri';

import * as CompactButton from '@/components/ui/compact-button';
import * as Table from '@/components/ui/table';
import { cn } from '@/utils/cn';
import { PurchaseBoqQuantityPill } from '@/components/procurements/project-procurement-purchase-boq-table-cells';

/** Visible-first columns from Figma 34781:569109 / 34834:121816 (extra cols scroll). */
const VISIBLE_COLUMNS = [
  { id: 'name', label: 'Name', widthClass: 'w-[213px] min-w-[213px]', sortable: false },
  { id: 'brand', label: 'Brand', widthClass: 'w-[106px] min-w-[106px]', sortable: true },
  { id: 'uom', label: 'UOM', widthClass: 'w-[84px] min-w-[84px]', sortable: true },
  { id: 'qty', label: 'Quantity', widthClass: 'w-[250px] min-w-[250px]', sortable: true },
  { id: 'int_rate', label: 'Int. Rate', widthClass: 'w-[131px] min-w-[131px]', sortable: true },
  {
    id: 'vendor_rate',
    label: 'Vendor Rate',
    widthClass: 'w-[131px] min-w-[131px]',
    sortable: true,
  },
  {
    id: 'description',
    label: 'Description',
    widthClass: 'w-[340px] min-w-[340px]',
    sortable: true,
    multiline: true,
  },
];

function SortableHead({ label }) {
  return (
    <div className='flex items-center gap-0.5'>
      <span className='text-paragraph-sm font-medium tracking-[-0.084px] whitespace-nowrap text-text-soft-400'>
        {label}
      </span>
      <span className='flex size-5 items-center justify-center text-text-soft-400' aria-hidden>
        {Table.getSortingIcon(false)}
      </span>
    </div>
  );
}

function NameLeadingControl({ isParent, expanded, onToggle }) {
  if (isParent) {
    return (
      <button
        type='button'
        onClick={onToggle}
        className='flex size-6 shrink-0 items-center justify-center rounded bg-bg-weak-100 text-text-sub-500'
        aria-label={expanded ? 'Collapse row' : 'Expand row'}
      >
        {expanded ? (
          <RiArrowDownSLine className='size-4' />
        ) : (
          <RiArrowRightSLine className='size-4' />
        )}
      </button>
    );
  }

  return (
    <span
      className='flex size-6 shrink-0 items-center justify-center rounded bg-bg-weak-100'
      aria-hidden
    >
      <span className='grid size-3 grid-cols-2 gap-px'>
        <span className='rounded-[1px] bg-text-soft-400/70' />
        <span className='rounded-[1px] bg-text-soft-400/70' />
        <span className='rounded-[1px] bg-text-soft-400/70' />
        <span className='rounded-[1px] bg-text-soft-400/70' />
      </span>
    </span>
  );
}

function CellValue({ column, value }) {
  if (column.id === 'description') {
    return (
      <p className='line-clamp-1 text-paragraph-sm tracking-[-0.084px] text-text-main-900'>
        {value ?? '—'}
      </p>
    );
  }

  if (column.id === 'brand') {
    return (
      <span className='block truncate text-paragraph-sm font-medium tracking-[-0.084px] text-text-main-900'>
        {value ?? '—'}
      </span>
    );
  }

  if (column.id === 'qty') {
    return <PurchaseBoqQuantityPill quantity={value} />;
  }

  return (
    <span className='block truncate text-paragraph-sm tracking-[-0.084px] text-text-sub-500'>
      {value ?? '—'}
    </span>
  );
}

function LineItemRow({ row, isChild = false, expanded, onToggle }) {
  const isParent = Boolean(row.children?.length);

  return (
    <Table.Row
      className={cn(
        'h-10 border-b border-stroke-soft-200',
        isChild ? 'bg-[#fbfbfb]' : 'bg-bg-white-0',
      )}
    >
      {VISIBLE_COLUMNS.map((column) => (
        <Table.Cell
          key={column.id}
          className={cn(
            column.widthClass,
            'border-r border-stroke-soft-200 px-3 py-2 align-middle last:border-r-0',
          )}
        >
          {column.id === 'name' ? (
            <div className='flex items-center gap-2'>
              <NameLeadingControl isParent={isParent} expanded={expanded} onToggle={onToggle} />
              <span className='min-w-0 truncate text-paragraph-sm font-semibold text-text-sub-500'>
                {row.name ?? '—'}
              </span>
            </div>
          ) : (
            <CellValue column={column} value={row[column.id]} />
          )}
        </Table.Cell>
      ))}
    </Table.Row>
  );
}

function FooterStatBadge({ label, value, showInfo = false }) {
  return (
    <div className='rounded border border-stroke-soft-200 bg-bg-weak-100 px-[5px] py-[3px]'>
      <div className='flex items-center gap-1.5 whitespace-nowrap'>
        <span className='text-[9px] font-bold uppercase tracking-[0.72px] text-text-soft-400'>
          {label}
        </span>
        <span className='flex items-center gap-0.5 text-[12px] font-bold text-text-soft-400'>
          {value}
          {showInfo ? <RiInformationFill className='size-4 text-text-soft-400' /> : null}
        </span>
      </div>
    </div>
  );
}

export default function ProjectProcurementPoDetailLineItemsTab({ lineItems = {} }) {
  const [searchValue, setSearchValue] = useState('');
  const [expandedRows, setExpandedRows] = useState(() =>
    Object.fromEntries(
      (lineItems.rows ?? []).filter((row) => row.defaultExpanded).map((row) => [row.id, true]),
    ),
  );

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return lineItems.rows ?? [];

    return (lineItems.rows ?? []).filter((row) => {
      const haystack = [
        row.name,
        row.brand,
        row.description,
        ...(row.children ?? []).flatMap((child) => [child.name, child.brand, child.description]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [lineItems.rows, searchValue]);

  const toggleRow = (rowId) => {
    setExpandedRows((current) => ({ ...current, [rowId]: !current[rowId] }));
  };

  return (
    <div className='flex flex-col gap-5 px-6 py-5'>
      <div className='flex items-start justify-between gap-4'>
        <div className='flex h-8 w-full max-w-[370px] items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
          <RiSearchLine className='size-5 shrink-0 text-text-soft-400' />
          <input
            type='text'
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder='Search products..'
            className='min-w-0 flex-1 bg-transparent text-paragraph-sm tracking-[-0.084px] text-text-main-900 outline-none placeholder:text-text-soft-400'
          />
        </div>

        <div className='flex items-center gap-2'>
          <CompactButton.Root
            type='button'
            variant='stroke'
            size='large'
            className='size-8 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
            aria-label='Expand table'
          >
            <CompactButton.Icon as={RiExpandDiagonalLine} />
          </CompactButton.Root>
          <CompactButton.Root
            type='button'
            variant='stroke'
            size='large'
            className='size-8 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
            aria-label='Manage columns'
          >
            <CompactButton.Icon as={RiLayoutColumnLine} />
          </CompactButton.Root>
        </div>
      </div>

      <div className='overflow-hidden rounded-xl border border-stroke-soft-200'>
        <div className='overflow-x-auto'>
          <Table.Root variant='compact' className='min-w-[max-content]'>
            <Table.Header>
              <Table.Row className='h-9 border-b border-stroke-soft-200 bg-bg-weak-100'>
                {VISIBLE_COLUMNS.map((column) => (
                  <Table.Head
                    key={column.id}
                    className={cn(
                      column.widthClass,
                      'border-r border-stroke-soft-200 px-3 py-2 whitespace-nowrap last:border-r-0',
                    )}
                  >
                    {column.sortable ? (
                      <SortableHead label={column.label} />
                    ) : (
                      <span className='text-paragraph-sm font-medium tracking-[-0.084px] text-text-soft-400'>
                        {column.label}
                      </span>
                    )}
                  </Table.Head>
                ))}
              </Table.Row>
            </Table.Header>

            <Table.Body spacing={0}>
              {filteredRows.map((row) => {
                const isExpanded = Boolean(expandedRows[row.id]);
                return (
                  <React.Fragment key={row.id}>
                    <LineItemRow
                      row={row}
                      expanded={isExpanded}
                      onToggle={() => toggleRow(row.id)}
                    />
                    {isExpanded
                      ? row.children?.map((child) => (
                          <LineItemRow key={child.id} row={child} isChild />
                        ))
                      : null}
                  </React.Fragment>
                );
              })}

              <Table.Row className='h-10 bg-[#fbfbfb]'>
                <Table.Cell className='min-w-[213px] px-3 py-3'>
                  <span className='text-paragraph-sm font-bold uppercase tracking-[0.84px] text-text-sub-500'>
                    TOTAL
                  </span>
                </Table.Cell>
                <Table.Cell colSpan={VISIBLE_COLUMNS.length - 1} className='px-3 py-3'>
                  <div className='flex w-full max-w-[265px] items-center justify-end gap-1.5'>
                    <FooterStatBadge
                      label='Value'
                      value={lineItems.totals?.value ?? '—'}
                      showInfo
                    />
                    <FooterStatBadge
                      label='Disc. Value'
                      value={lineItems.totals?.disc_value ?? '—'}
                    />
                  </div>
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </div>
      </div>
    </div>
  );
}
