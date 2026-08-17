import React, {
  useMemo,
  useImperativeHandle,
  useCallback,
  useState,
  useEffect,
  useRef,
} from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiExternalLinkLine } from 'react-icons/ri';
import * as Table from '@/components/ui/table';
import * as CompactButton from '@/components/ui/compact-button';
import { cn } from '@/utils/cn';
import { format } from 'date-fns';
import { useDispatch } from 'react-redux';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import { fetchVendorBillColumnList, updateVendorBillColumnList } from '@/redux/vendorSlice';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { VENDOR_BILL_COLUMN_CONFIG_SEED, VENDOR_BILL_COLUMN_ORDER } from './constants';

const VendorsBillingTable = React.forwardRef(
  (
    {
      rows = [],
      isLoading = false,
      isLoadingMore = false,
      hasMore = false,
      onLoadMore,
      enableScrollPagination = false,
      onRowSelect,
      tableVariant = 'compact',
      onSortingChange,
      sorting = [],
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const [localSorting, setLocalSorting] = useState(sorting);

    // Sync local sorting with prop.
    // Stringify for stable comparison — avoids an infinite loop when the parent
    // passes a new `[]` reference on every render (the default prop value).
    const sortingKey = JSON.stringify(sorting);
    useEffect(() => {
      setLocalSorting((prev) => {
        if (JSON.stringify(prev) === sortingKey) return prev;
        return sorting;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortingKey]);

    const handleSortingChange = useCallback(
      (updaterOrValue) => {
        const newSorting =
          typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
        setLocalSorting(newSorting);
        if (onSortingChange) {
          onSortingChange(newSorting);
        }
      },
      [localSorting, onSortingChange],
    );

    // Setup scroll pagination
    const { sentinelRef } = useScrollPagination({
      onLoadMore: onLoadMore || (() => {}),
      hasMore: hasMore && enableScrollPagination,
      isLoading: isLoadingMore || isLoading,
      threshold: 200,
      enabled: enableScrollPagination && Boolean(onLoadMore),
    });

    // All column definitions
    const allColumnDefs = useMemo(
      () => [
        {
          id: 'subcategory',
          accessorKey: 'subcategory',
          columnLabel: 'Sub Category',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Sub Category' sortable />
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
              {row.original.subcategory || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'center_name',
          accessorKey: 'center_name',
          columnLabel: 'Center Name',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Center Name' sortable />
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
              {row.original.center_name || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'billing_month',
          // The API still returns the field as `period`; rename only in the UI
          accessorKey: 'period',
          columnLabel: 'Billing Month',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Billing Month' sortable />
          ),
          cell: ({ row }) => {
            const date = row.original.period;
            return (
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
                {date ? format(new Date(date), 'MMM yyyy') : '--'}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'triggered_month',
          accessorKey: 'trigger_date',
          columnLabel: 'Triggered Month',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Triggered Month' sortable />
          ),
          cell: ({ row }) => {
            const date = row.original.trigger_date;
            return (
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
                {date ? format(new Date(date), 'MMM yyyy') : '--'}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'total_amount',
          accessorKey: 'total_amount',
          columnLabel: 'Total Amount',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Total Amount' sortable />
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
              {row.original.total_amount == null
                ? '--'
                : `₹${row.original.total_amount.toLocaleString()}`}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'gst_amount',
          accessorKey: 'gst_amount',
          columnLabel: 'GST Amount',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='GST Amount' sortable />
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
              {row.original.gst_amount == null
                ? '--'
                : `₹${row.original.gst_amount.toLocaleString()}`}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'amount_without_gst',
          accessorKey: 'amount_without_gst',
          columnLabel: 'Amount (excl. GST)',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Amount (excl. GST)' sortable />
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
              {row.original.amount_without_gst == null
                ? '--'
                : `₹${row.original.amount_without_gst.toLocaleString()}`}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'bill_uploaded',
          accessorKey: 'bill_uploaded',
          columnLabel: 'Bill Uploaded',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Bill Uploaded' sortable />
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
              {row.original.bill_uploaded || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'bill_url',
          accessorKey: 'bill_url',
          columnLabel: 'Bill URL',
          header: () => <Table.SortableHeader label='Bill URL' className='w-[250px]' />,
          cell: ({ row }) => {
            const value = row.original.bill_url || '';
            const fullUrl = row.original.bill_url ?? '';

            return (
              <div
                className='group/cell flex items-center gap-1.5 w-[250px]'
                onClick={(e) => e.stopPropagation()}
                title={fullUrl || undefined}
              >
                <div className='text-paragraph-sm text-primary-base min-w-0 flex-1 truncate'>
                  {value || '--'}
                </div>
                {value && (
                  <CompactButton.Root
                    type='button'
                    variant='stroke'
                    size='large'
                    className='shrink-0 opacity-0 transition-opacity group-hover/cell:opacity-100'
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(fullUrl, '_blank', 'noopener,noreferrer');
                    }}
                    title='Open URL'
                    aria-label='Open URL'
                  >
                    <CompactButton.Icon as={RiExternalLinkLine} />
                  </CompactButton.Root>
                )}
              </div>
            );
          },
          enableSorting: false,
        },
        {
          id: 'invoice_date',
          accessorKey: 'invoice_date',
          columnLabel: 'Invoice Date',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Invoice Date' sortable />
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
              {row.original.invoice_date || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'hard_copy_sent',
          accessorKey: 'hard_copy_sent',
          columnLabel: 'Hard Copy Sent',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Hard Copy Sent' sortable />
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
              {row.original.hard_copy_sent
                ? 'Yes'
                : row.original.hard_copy_sent === false
                  ? 'No'
                  : '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'zone_head_check',
          accessorKey: 'zone_head_check',
          columnLabel: 'Zone Head Check',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Zone Head Check' sortable />
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
              {row.original.zone_head_check || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'zone_head_checked_date',
          accessorKey: 'zone_head_checked_date',
          columnLabel: 'Zone Head Checked Date',
          visible: false,
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Zone Head Checked Date' sortable />
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
              {row.original.zone_head_checked_date || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'purchase_check',
          accessorKey: 'purchase_check',
          columnLabel: 'Purchase Check',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Purchase Check' sortable />
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
              {row.original.purchase_check || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'purchase_checked_date',
          accessorKey: 'purchase_checked_date',
          columnLabel: 'Purchase Checked Date',
          visible: false,
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Purchase Checked Date' sortable />
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
              {row.original.purchase_checked_date || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'assignee',
          accessorKey: 'assignee',
          columnLabel: 'Assignee',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Assignee' sortable />
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
              {row.original.assignee || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'zoho_uploaded',
          accessorKey: 'zoho_uploaded',
          columnLabel: 'Zoho Uploaded',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Zoho Uploaded' sortable />
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
              {row.original.zoho_uploaded || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'modified',
          accessorKey: 'modified',
          columnLabel: 'Last Modified',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Last Modified' sortable />
          ),
          cell: ({ row }) => {
            const date = row.original.modified;
            return (
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
                {date ? format(new Date(date), 'dd MMM yyyy') : '--'}
              </span>
            );
          },
          enableSorting: true,
        },
      ],
      [],
    );

    // Build the default column config in the correct display order
    const defaultColumnConfig = useMemo(() => {
      const config = prepareColumnsForConfig(VENDOR_BILL_COLUMN_CONFIG_SEED);
      const configMap = new Map(config.map((col) => [col.id, col]));
      const ordered = [];
      const used = new Set();

      VENDOR_BILL_COLUMN_ORDER.forEach((id) => {
        const col = configMap.get(id);
        if (col) {
          ordered.push(col);
          used.add(id);
        }
      });

      // Append any remaining columns not explicitly ordered
      config.forEach((col) => {
        if (!used.has(col.id)) ordered.push(col);
      });

      return ordered.map((col, index) => ({ ...col, order: index }));
    }, []);

    const handlePersistColumnConfig = useCallback(
      async (data) => {
        await dispatch(updateVendorBillColumnList(data)).unwrap();
        await dispatch(fetchVendorBillColumnList());
      },
      [dispatch],
    );

    const handleFetchColumnConfig = useCallback(async () => {
      return dispatch(fetchVendorBillColumnList())
        .unwrap()
        .then((data) => data);
    }, [dispatch]);

    const {
      columns: columnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    } = useColumnConfig(
      'vendors-bills-table',
      defaultColumnConfig,
      handlePersistColumnConfig,
      handleFetchColumnConfig,
      { autoSave: true, debounce: true },
    );

    const visibleColumns = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfig),
      [allColumnDefs, columnConfig],
    );

    useImperativeHandle(ref, () => ({
      columnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    }));

    const table = useReactTable({
      data: rows,
      columns: visibleColumns,
      state: {
        sorting: localSorting,
      },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: true,
      enableSortingRemoval: true,
    });

    // Empty state
    if (!isLoading && rows.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>No bills found</h3>
          <p className='max-w-md text-sm text-text-sub-600'>
            There are no bills available for this vendor.
          </p>
        </div>
      );
    }

    // Loading skeleton
    const renderSkeleton = () => (
      <Table.Body spacing={8}>
        {Array.from({ length: 5 }).map((_, index, array) => (
          <React.Fragment key={`skeleton-${index}`}>
            <Table.Row>
              {visibleColumns.map((column) => (
                <Table.Cell key={column.id}>
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {index < array.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );

    return (
      <div className='w-full'>
        <Table.Root
          variant={tableVariant}
          tableInstance={table}
          className='h-[500px] overflow-auto'
        >
          <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
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

          {isLoading ? (
            renderSkeleton()
          ) : (
            <Table.Body spacing={8}>
              {table.getRowModel().rows.map((row, i, allRows) => (
                <React.Fragment key={row.original.name}>
                  <Table.Row
                    className={cn('cursor-pointer hover:bg-bg-weak-50 transition-colors')}
                    onClick={() => onRowSelect?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell key={cell.id} column={cell.column}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  {i < allRows.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}

              {/* Scroll pagination sentinel */}
              {enableScrollPagination && hasMore && (
                <Table.Row ref={sentinelRef} data-scroll-sentinel>
                  <Table.Cell colSpan={visibleColumns.length} className='h-1 p-0' />
                </Table.Row>
              )}

              {/* Load-more spinner */}
              {enableScrollPagination && isLoadingMore && (
                <Table.Row key='loading-more'>
                  <Table.Cell colSpan={visibleColumns.length} className='py-8 text-center'>
                    <div className='flex items-center justify-center gap-2'>
                      <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                      <span className='text-paragraph-sm text-text-sub-600'>
                        Loading more bills…
                      </span>
                    </div>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          )}
        </Table.Root>
      </div>
    );
  },
);

VendorsBillingTable.displayName = 'VendorsBillingTable';
export default VendorsBillingTable;
