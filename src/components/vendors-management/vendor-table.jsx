import React, { useMemo, useCallback, useImperativeHandle, useEffect } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useDispatch } from 'react-redux';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import {
  EMPTY_STATES,
  getVendorStatusBadge,
  VENDOR_TABLE_DEFAULT_HIDDEN_COLUMN_IDS,
  VENDOR_TABLE_DEFAULT_VISIBLE_COLUMN_IDS,
} from '@/components/vendors-management/constants';
import { useColumnConfig, useColumnConfigPopoverRef } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import * as Button from '@/components/ui/button';
import { RiDeleteBinLine } from 'react-icons/ri';
import * as Tooltip from '@/components/ui/tooltip';
import { fetchVendorColumnList, updateVendorColumnList } from '@/redux/vendorSlice';
import emptyState from '@/assets/images/empty-state.png';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';

const VendorTable = React.forwardRef(
  (
    {
      rows = [],
      isLoading = false,
      isLoadingMore = false,
      hasMore = false,
      onLoadMore,
      enableScrollPagination = false,
      onRowSelect,
      columnManagerApi,
      onColumnManagerApiChange,
      tableVariant = 'compact',
      onDelete,
      tableId = 'vendors-table',
      permissions = {},
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const [isSetStatusesOpen, setIsSetStatusesOpen] = React.useState(false);
    const { statusPopoverColumnConfig, syncColumnConfigHookToPopover } =
      useColumnConfigPopoverRef();

    const { sentinelRef } = useScrollPagination({
      onLoadMore: onLoadMore || (() => {}),
      hasMore: hasMore && enableScrollPagination,
      isLoading: isLoadingMore || isLoading,
      threshold: 200,
      scrollContainer: null,
      enabled: enableScrollPagination && Boolean(onLoadMore),
    });

    const allColumnDefs = useMemo(
      () => [
        {
          id: 'vendorName',
          accessorKey: 'vendorName',
          header: () => (
            <div className='flex items-center gap-0.5'>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                Vendor Name
              </span>
            </div>
          ),
          cell: ({ row }) => (
            <Tooltip.Root size='xsmall'>
              <Tooltip.Trigger asChild>
                <span className='block min-w-0 w-full truncate paragraph-small text-[var(--color-text-sub-600)]'>
                  {row.original.vendorName || '--'}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content side='bottom'>{row.original.vendorName || '--'}</Tooltip.Content>
            </Tooltip.Root>
          ),
          meta: {
            columnClassName: 'w-[250px] min-w-[250px] max-w-[250px]',
            cellClassName: 'w-[250px] min-w-[250px] max-w-[250px]',
          },
          enableSorting: false,
        },
        {
          id: 'center',
          accessorKey: 'center',
          header: () => (
            <div className='flex items-center gap-0.5'>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                Center Name
              </span>
            </div>
          ),
          cell: ({ row }) => {
            const centerValue = row.original.center;
            if (!centerValue) {
              return <span className='paragraph-small text-nowrap text-text-sub-600'>--</span>;
            }
            const centerNames = Array.isArray(centerValue)
              ? centerValue
              : typeof centerValue === 'string'
                ? centerValue
                    .split(',')
                    .map((c) => c.trim())
                    .filter(Boolean)
                : [];
            if (centerNames.length === 0) {
              return <span className='paragraph-small text-nowrap text-text-sub-600'>--</span>;
            }
            const firstCenter = centerNames[0];
            const additionalCenters = centerNames.slice(1);
            const additionalCount = additionalCenters.length;

            return (
              <div className='flex items-center gap-2'>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Badge.Root variant='lighter' color='gray' size='medium'>
                      <span className='paragraph-small font-medium text-text-strong-950 block max-w-[150px] overflow-hidden text-ellipsis text-nowrap'>
                        {firstCenter}
                      </span>
                    </Badge.Root>
                  </Tooltip.Trigger>
                  <Tooltip.Content side='top'>{firstCenter}</Tooltip.Content>
                </Tooltip.Root>
                {additionalCount > 0 && (
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <Badge.Root variant='lighter' color='gray' size='medium'>
                        <span className='text-label-xs font-semibold text-text-strong-950'>
                          +{additionalCount}
                        </span>
                      </Badge.Root>
                    </Tooltip.Trigger>
                    <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
                      <div className='flex flex-col gap-1'>
                        <span className='text-paragraph-sm font-medium text-text-strong-950 mb-1'>
                          Additional Centers ({additionalCount})
                        </span>
                        <div className='flex flex-col gap-1'>
                          {additionalCenters.map((center, index) => {
                            return (
                              <div key={index} className='text-paragraph-sm text-text-sub-600'>
                                {center}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                )}
              </div>
            );
          },
          enableSorting: false,
        },
        {
          id: 'category',
          accessorKey: 'category',
          header: () => (
            <div className='flex items-center gap-0.5'>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                Category
              </span>
            </div>
          ),
          cell: ({ row }) => {
            const categoryValue = row.original.category;
            if (!categoryValue) {
              return <span className='paragraph-small text-nowrap text-text-sub-600'>--</span>;
            }
            const categories = Array.isArray(categoryValue)
              ? categoryValue
              : typeof categoryValue === 'string'
                ? categoryValue
                    .split(',')
                    .map((c) => c.trim())
                    .filter(Boolean)
                : [];
            if (categories.length === 0) {
              return <span className='paragraph-small text-nowrap text-text-sub-600'>--</span>;
            }
            const firstCategory = categories[0];
            const additionalCategories = categories.slice(1);
            const additionalCount = additionalCategories.length;
            return (
              <div className='flex items-center gap-2'>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Badge.Root variant='lighter' color='gray' size='medium'>
                      <span className='paragraph-small font-medium text-text-strong-950 block max-w-[150px] overflow-hidden text-ellipsis text-nowrap'>
                        {firstCategory}
                      </span>
                    </Badge.Root>
                  </Tooltip.Trigger>
                  <Tooltip.Content side='top'>{firstCategory}</Tooltip.Content>
                </Tooltip.Root>
                {additionalCount > 0 && (
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <Badge.Root variant='lighter' color='gray' size='medium'>
                        <span className='text-label-xs font-semibold text-text-strong-950'>
                          +{additionalCount}
                        </span>
                      </Badge.Root>
                    </Tooltip.Trigger>
                    <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
                      <div className='flex flex-col gap-1'>
                        <span className='text-paragraph-sm font-medium text-text-strong-950 mb-1'>
                          Additional Categories ({additionalCount})
                        </span>
                        <div className='flex flex-col gap-1'>
                          {additionalCategories.map((cat, index) => (
                            <div key={index} className='text-paragraph-sm text-text-sub-600'>
                              {cat}
                            </div>
                          ))}
                        </div>
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                )}
              </div>
            );
          },
          enableSorting: false,
        },
        {
          id: 'subCategory',
          accessorKey: 'subCategory',
          header: () => (
            <div className='flex items-center gap-0.5'>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                Sub-Categories
              </span>
            </div>
          ),
          cell: ({ row }) => {
            const subCategoryValue = row.original.subCategory;
            if (!subCategoryValue) {
              return <span className='paragraph-small text-nowrap text-text-sub-600'>--</span>;
            }
            const subCategories = Array.isArray(subCategoryValue)
              ? subCategoryValue
              : typeof subCategoryValue === 'string'
                ? subCategoryValue
                    .split(',')
                    .map((c) => c.trim())
                    .filter(Boolean)
                : [];
            if (subCategories.length === 0) {
              return <span className='paragraph-small text-nowrap text-text-sub-600'>--</span>;
            }
            const firstSubCategory = subCategories[0];
            const additionalSubCategories = subCategories.slice(1);
            const additionalCount = additionalSubCategories.length;
            return (
              <div className='flex items-center gap-2'>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Badge.Root variant='lighter' color='gray' size='medium'>
                      <span className='paragraph-small font-medium text-text-strong-950 block max-w-[150px] overflow-hidden text-ellipsis text-nowrap'>
                        {firstSubCategory}
                      </span>
                    </Badge.Root>
                  </Tooltip.Trigger>
                  <Tooltip.Content side='top'>{firstSubCategory}</Tooltip.Content>
                </Tooltip.Root>
                {additionalCount > 0 && (
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <Badge.Root variant='lighter' color='gray' size='medium'>
                        <span className='text-label-xs font-semibold text-text-strong-950'>
                          +{additionalCount}
                        </span>
                      </Badge.Root>
                    </Tooltip.Trigger>
                    <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
                      <div className='flex flex-col gap-1'>
                        <span className='text-paragraph-sm font-medium text-text-strong-950 mb-1'>
                          Additional Sub-Categories ({additionalCount})
                        </span>
                        <div className='flex flex-col gap-1'>
                          {additionalSubCategories.map((sub, index) => (
                            <div key={index} className='text-paragraph-sm text-text-sub-600'>
                              {sub}
                            </div>
                          ))}
                        </div>
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                )}
              </div>
            );
          },
          enableSorting: false,
        },
        {
          id: 'status',
          accessorKey: 'status',
          header: () => (
            <div className='flex items-center gap-0.5'>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>Status</span>
              <StatusColumnPopover
                columnId='status'
                columnConfigHook={statusPopoverColumnConfig}
                onOpenStatuses={() => setIsSetStatusesOpen(true)}
              />
            </div>
          ),
          cell: ({ row }) => {
            const badge = getVendorStatusBadge(row.original.status);
            return (
              <Badge.Root size='small' variant='light' color={badge.color}>
                {badge.label}
              </Badge.Root>
            );
          },
          enableSorting: false,
        },
        {
          id: 'totalPaidAmount',
          accessorKey: 'totalPaidAmount',
          columnLabel: 'Total Amount Paid',
          header: () => (
            <div className='flex items-center gap-0.5'>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                Total Amount Paid
              </span>
            </div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small whitespace-nowrap text-[var(--color-text-sub-600)]'>
              {row.original.totalPaidAmount == null
                ? '--'
                : `₹${Number(row.original.totalPaidAmount).toLocaleString('en-IN')}`}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'city',
          accessorKey: 'city',
          header: () => (
            <div className='flex items-center gap-0.5'>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>City</span>
            </div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-nowrap text-[var(--color-text-sub-600)]'>
              {row.original.city || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'primarySpoc',
          accessorKey: 'primarySpoc',
          header: () => (
            <div className='flex items-center gap-0.5'>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                Primary SPOC
              </span>
            </div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-nowrap text-[var(--color-text-sub-600)]'>
              {row.original.primarySpoc || '--'}
            </span>
          ),
          enableSorting: false,
        },
        // {
        //   id: 'actions',
        //   header: <div className='invisible'>A</div>,
        //   enableHiding: false,
        //   cell: ({ row }) => (
        //     <div className='flex items-center justify-end'>
        //       <Button.Root
        //         variant='neutral'
        //         mode='ghost'
        //         size='medium'
        //         onClick={(e) => {
        //           e.stopPropagation();
        //           onDelete?.(row.original);
        //         }}
        //         aria-label='Delete vendor'
        //       >
        //         <Button.Icon as={RiDeleteBinLine} />
        //       </Button.Root>
        //     </div>
        //   ),
        // },
      ],
      [onDelete, permissions, statusPopoverColumnConfig],
    );

    const defaultColumnConfig = useMemo(() => {
      const config = prepareColumnsForConfig(allColumnDefs);
      const defaultVisibleOrder = VENDOR_TABLE_DEFAULT_VISIBLE_COLUMN_IDS;
      const defaultHiddenOrder = VENDOR_TABLE_DEFAULT_HIDDEN_COLUMN_IDS;

      const configMap = new Map(config.map((col) => [col.id, col]));

      config.forEach((col) => {
        if (col.enableHiding !== false) {
          col.visible = false;
        }
      });

      defaultVisibleOrder.forEach((colId, index) => {
        const col = configMap.get(colId);
        if (col) {
          col.visible = true;
          col.order = index;
        }
      });

      let hiddenOrder = defaultVisibleOrder.length;
      defaultHiddenOrder.forEach((colId) => {
        const col = configMap.get(colId);
        if (col) {
          col.visible = false;
          col.order = hiddenOrder++;
        }
      });

      config.forEach((col) => {
        if (col.order === undefined) {
          col.order = hiddenOrder++;
        }
      });

      return config.sort((a, b) => a.order - b.order);
    }, [allColumnDefs]);

    const handlePersistColumnConfig = useCallback(
      async (data) => {
        await dispatch(updateVendorColumnList(data)).unwrap();
        await dispatch(fetchVendorColumnList());
      },
      [dispatch],
    );

    const handleFetchColumnConfig = useCallback(async () => {
      return dispatch(fetchVendorColumnList())
        .unwrap()
        .then((data) => data);
    }, [dispatch]);

    const internalColumnConfigHook = useColumnConfig(
      columnManagerApi ? null : tableId,
      defaultColumnConfig,
      handlePersistColumnConfig,
      handleFetchColumnConfig,
      { autoSave: !columnManagerApi, debounce: true },
    );

    const {
      columns: columnConfig,
      visibleColumns: visibleColumnConfig,
      isLoading: columnPrefsLoading,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    } = columnManagerApi ?? internalColumnConfigHook;

    syncColumnConfigHookToPopover({ toggleColumnVisibility });

    const isPrefsLoading =
      columnManagerApi == null ? columnPrefsLoading : Boolean(columnManagerApi.isLoading);

    useEffect(() => {
      if (columnManagerApi || isPrefsLoading) return;
      onColumnManagerApiChange?.({
        columns: columnConfig,
        visibleColumns: visibleColumnConfig,
        isLoading: columnPrefsLoading,
        reorderColumns,
        toggleColumnVisibility,
        showAllColumns,
        hideAllColumns,
        resetToDefault,
      });
    }, [
      columnManagerApi,
      isPrefsLoading,
      columnConfig,
      columnPrefsLoading,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
      onColumnManagerApiChange,
    ]);

    const columns = useMemo(() => {
      const applied = applyColumnConfig(allColumnDefs, columnConfig);
      const actionsCol = applied.find((c) => (c.id || c.accessorKey) === 'actions');
      const rest = applied.filter((c) => (c.id || c.accessorKey) !== 'actions');
      return actionsCol ? [...rest, actionsCol] : applied;
    }, [allColumnDefs, columnConfig]);

    const table = useReactTable({
      data: rows,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });

    useImperativeHandle(ref, () => ({
      columnConfig,
      columnConfigHook: {
        columns: columnConfig,
        visibleColumns: visibleColumnConfig,
        reorderColumns,
        toggleColumnVisibility,
        showAllColumns,
        hideAllColumns,
        resetToDefault,
      },
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    }));

    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`skeleton-${index}`}>
            <Table.Row>
              {columns.map((column) => (
                <Table.Cell
                  key={column.id || column.accessorKey}
                  className={column.meta?.cellClassName}
                >
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {index < array.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );

    // Empty state
    if (!isLoading && rows.length === 0) {
      const state = EMPTY_STATES.search;
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <img src={emptyState} alt='Empty state' className='mb-4 h-48 w-48 object-contain' />
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{state.title}</h3>
          <p className='max-w-md text-sm text-text-sub-600'>{state.description}</p>
        </div>
      );
    }

    return (
      <div className='flex-1 min-h-0 flex flex-col w-full overflow-hidden'>
        <SetStatusesModal
          open={isSetStatusesOpen}
          onOpenChange={setIsSetStatusesOpen}
          doctype='Supplier'
          field='custom_vendor_status'
          fieldLabel='Vendor Status'
        />
        <Table.Root
          variant={tableVariant}
          className='min-h-0 flex-1 overflow-auto'
          tableClassName='min-w-max'
        >
          <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Head
                    key={header.id}
                    column={header.column}
                    className={header.column.columnDef.meta?.headClassName}
                  >
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
            <Table.Body>
              {table.getRowModel().rows.map((row, i, allRows) => (
                <React.Fragment key={row.original.id}>
                  <Table.Row
                    data-state={row.getIsSelected() && 'selected'}
                    className='cursor-pointer'
                    onClick={() => onRowSelect?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell
                        key={cell.id}
                        column={cell.column}
                        onClick={(e) => {
                          if (cell.column.id === 'actions') e.stopPropagation();
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  {i < allRows.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}
              {enableScrollPagination && hasMore && (
                <Table.Row ref={sentinelRef}>
                  <Table.Cell colSpan={columns.length} className='h-1 p-0' />
                </Table.Row>
              )}
            </Table.Body>
          )}
        </Table.Root>
      </div>
    );
  },
);

VendorTable.displayName = 'VendorTable';
export default VendorTable;
