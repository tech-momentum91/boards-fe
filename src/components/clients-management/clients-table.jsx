import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiArrowDownSFill, RiArrowDownSLine, RiErrorWarningLine } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import { upperFirst } from 'lodash';

import * as Table from '@/components/ui/table';
import * as Avatar from '@/components/ui/avatar';
import * as Tooltip from '@/components/ui/tooltip';
import * as Badge from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EMPTY_STATES, getClientStatusBadgeVariant, CLIENT_STATUS_OPTIONS } from './constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { safeDisplayDateTime } from '@/utils/date-utils';
import { getBadgeColor } from '@/utils/csi-utils';
import { extractErrorMessage, showSuccessToast, showErrorToast } from '@/utils/error-utils';
import {
  clientRowHasCenterList,
  fetchClientColumnList,
  updateClientColumnList,
} from '@/redux/clientSlice';
import { updateClientField } from '@/redux/clientDetailSlice';
import { getCenterListThunk } from '@/redux/centerSlice';
import InlineEditableText from '@/components/ui/inline-editable-text';
import { SearchableSelect } from '@/components/ui/searchable-select';

const renderCsiBadge = (score) => {
  if (score == null || score === '-') {
    return <span className='paragraph-small text-text-sub-400 whitespace-nowrap'>-</span>;
  }

  const numericScore = typeof score === 'number' ? score : Number.parseFloat(score);
  if (Number.isNaN(numericScore) || !Number.isFinite(numericScore)) {
    return <span className='paragraph-small text-text-sub-400 whitespace-nowrap'>-</span>;
  }

  const rounded = Math.round(numericScore);
  const badgeColor = getBadgeColor(rounded);

  return (
    <Badge.Root variant='light' color={badgeColor} size='medium'>
      {score}
    </Badge.Root>
  );
};

const STATUS_BADGE_CLASS =
  'inline-flex items-center justify-center rounded-full px-2 py-0.5 font-[Figtree] text-subheading-2xs font-medium uppercase tracking-[0.22px] whitespace-nowrap';

const parseCenterNames = (centerValue) => {
  if (!centerValue || centerValue === '-') return [];
  if (Array.isArray(centerValue)) return centerValue.filter(Boolean);
  if (typeof centerValue === 'string') {
    return centerValue
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
  }
  return [];
};

const renderCenterBadges = (centerValue) => {
  const centerNames = parseCenterNames(centerValue);

  if (centerNames.length === 0) {
    return <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>-</span>;
  }

  const firstCenter = centerNames[0];
  const additionalCenters = centerNames.slice(1);
  const additionalCount = additionalCenters.length;
  const centerMatch = firstCenter.match(/^(.+?)\s*\(([^)]+)\)$/);
  const centerName = centerMatch ? centerMatch[1].trim() : firstCenter;
  const centerCode = centerMatch ? centerMatch[2] : null;

  return (
    <div className='flex items-center gap-2 whitespace-nowrap'>
      <Badge.Root
        variant='stroke'
        color='gray'
        size='medium'
        className='rounded-full bg-bg-white-0 px-2 py-0.5 ring-1 ring-inset ring-stroke-soft-200'
      >
        <span className='text-label-xs font-medium text-text-sub-500'>{centerName}</span>
        {centerCode ? (
          <span className='ml-1 font-[Figtree] text-subheading-2xs font-medium uppercase tracking-[0.22px] text-text-soft-400'>
            ({centerCode})
          </span>
        ) : null}
      </Badge.Root>
      {additionalCount > 0 ? (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Badge.Root
              variant='lighter'
              color='gray'
              size='medium'
              className='rounded-full bg-bg-weak-100 px-2 py-0.5'
            >
              <span className='text-label-xs font-medium text-text-sub-500'>
                +{additionalCount}
              </span>
            </Badge.Root>
          </Tooltip.Trigger>
          <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
            <div className='flex flex-col gap-1'>
              <span className='text-paragraph-sm font-medium text-text-strong-950 mb-1'>
                Additional Centers ({additionalCount})
              </span>
              {additionalCenters.map((center, index) => {
                const match = center.match(/^(.+?)\s*\(([^)]+)\)$/);
                const name = match ? match[1].trim() : center;
                const code = match ? match[2] : null;
                return (
                  <div key={index} className='text-paragraph-sm text-text-sub-600'>
                    {name}
                    {code ? <span className='text-text-sub-400 ml-1'>({code})</span> : null}
                  </div>
                );
              })}
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      ) : null}
    </div>
  );
};

const parseFloorNames = (floorValue) => {
  if (!floorValue || floorValue === '-') return [];
  if (Array.isArray(floorValue)) {
    return floorValue.map((f) => String(f).trim()).filter((f) => f && f !== '-');
  }
  if (typeof floorValue === 'string') {
    return floorValue
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f && f !== '-');
  }
  return [];
};

const renderFloorBadges = (floorValue) => {
  const floorNames = parseFloorNames(floorValue);

  if (floorNames.length === 0) {
    return <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>-</span>;
  }

  const firstFloor = floorNames[0];
  const additionalFloors = floorNames.slice(1);
  const additionalCount = additionalFloors.length;

  return (
    <div className='flex items-center gap-2 whitespace-nowrap'>
      <Badge.Root
        variant='stroke'
        color='gray'
        size='medium'
        className='rounded-full bg-bg-white-0 px-2 py-0.5 ring-1 ring-inset ring-stroke-soft-200'
      >
        <span className='text-label-xs font-medium text-text-sub-500'>{firstFloor}</span>
      </Badge.Root>
      {additionalCount > 0 ? (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Badge.Root
              variant='lighter'
              color='gray'
              size='medium'
              className='rounded-full bg-bg-weak-100 px-2 py-0.5'
            >
              <span className='text-label-xs font-medium text-text-sub-500'>
                +{additionalCount}
              </span>
            </Badge.Root>
          </Tooltip.Trigger>
          <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
            <div className='flex flex-col gap-1'>
              <span className='text-paragraph-sm font-medium text-text-strong-950 mb-1'>
                Additional Floors ({additionalCount})
              </span>
              {additionalFloors.map((floor, index) => (
                <div key={index} className='text-paragraph-sm text-text-sub-600'>
                  {floor}
                </div>
              ))}
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      ) : null}
    </div>
  );
};

const renderEngagementCell = (value) => {
  if (!value || value === '-') {
    return <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>-</span>;
  }

  const normalized = String(value).trim();
  if (normalized.includes('%')) {
    return (
      <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>{normalized}</span>
    );
  }

  return (
    <Badge.Root
      variant='light'
      color='orange'
      size='small'
      className='rounded-full px-2 py-0.5 font-[Figtree] text-subheading-2xs font-medium uppercase tracking-[0.22px]'
    >
      {normalized}
    </Badge.Root>
  );
};

const ClientsTable = React.forwardRef(
  (
    {
      rows = [],
      isLoading = false,
      error = null,
      context = 'default',
      onRetry,
      onRowSelect,
      onSortingChange,
      sorting = [],
      variant = 'compact',
      // Scroll pagination props
      onLoadMore,
      hasMore = false,
      isLoadingMore = false,
      enableScrollPagination = false,
    },
    ref,
  ) => {
    const data = Array.isArray(rows) ? rows : [];
    const dispatch = useDispatch();
    const [localSorting, setLocalSorting] = useState(sorting);
    const [expanded, setExpanded] = useState({});
    const [localRows, setLocalRows] = useState(data);
    useEffect(() => setLocalRows(Array.isArray(rows) ? rows : []), [rows]);

    const centerListData = useSelector((state) => state.center.centerListData?.data);
    const centerListStatus = useSelector((state) => state.center.centerListData?.status);
    useEffect(() => {
      // Guard on status, not just data length - two consumers mounting
      // together (e.g. this table + a filter dropdown) both see empty data
      // before either request resolves, so a data-only check fires the same
      // fetch twice.
      const isFetching = centerListStatus === 'loading';
      if ((!centerListData || centerListData.length === 0) && !isFetching) {
        dispatch(getCenterListThunk({ keyword: '', filters: [], pageSize: 999 })).catch(() => {});
      }
    }, [dispatch, centerListData, centerListStatus]);
    const centerOptions = useMemo(
      () =>
        (centerListData || []).map((c) => ({
          value: c.center_name || c.name,
          label: c.center_name || c.name,
        })),
      [centerListData],
    );

    const handleFieldUpdate = useCallback(
      (clientId, field, value, prevRow) => {
        if (!clientId) return;
        setLocalRows((prev) =>
          prev.map((r) => (r.name === clientId ? { ...r, [field]: value } : r)),
        );
        dispatch(updateClientField({ clientId, fieldname: field, value }))
          .unwrap()
          .then(() => showSuccessToast('Saved'))
          .catch((error_) => {
            setLocalRows((prev) => prev.map((r) => (r.name === clientId ? prevRow : r)));
            showErrorToast(error_ || 'Failed to update client');
          });
      },
      [dispatch],
    );

    // Sync local sorting with prop
    useEffect(() => {
      setLocalSorting(sorting);
    }, [sorting]);

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
      scrollContainer: null, // Use window/viewport as scroll container
      enabled: enableScrollPagination && Boolean(onLoadMore),
    });

    const emptyState = useMemo(() => EMPTY_STATES[context] || EMPTY_STATES.default, [context]);

    const allColumnDefs = useMemo(
      () => [
        {
          id: 'name',
          accessorKey: 'customer_name',
          enableSorting: true,
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='whitespace-nowrap'>Name</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Name ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const isParentExpanded =
              row.depth === 0 && row.getCanExpand?.() && row.getIsExpanded?.();
            const clientId = row.original.name;
            const name = (row.original.customer_name || '').trim();
            return (
              <div className='flex items-center gap-2 w-[220px] max-w-[220px] overflow-hidden'>
                <div className='min-w-0 flex-1 overflow-hidden'>
                  <Tooltip.Root size='xsmall'>
                    <Tooltip.Trigger asChild>
                      <div className='min-w-0 overflow-hidden'>
                        <InlineEditableText
                          value={name}
                          editOnIconOnly
                          placeholder='—'
                          displayClassName={cn(
                            'paragraph-small truncate',
                            isParentExpanded
                              ? 'label-small text-text-main-900'
                              : 'text-text-sub-500',
                          )}
                          inputClassName='paragraph-small text-text-sub-500'
                          onSave={(v) => {
                            const next = String(v ?? '').trim();
                            if (next === name) return;
                            handleFieldUpdate(clientId, 'customer_name', next, row.original);
                          }}
                        />
                      </div>
                    </Tooltip.Trigger>
                    {name && <Tooltip.Content size='xsmall'>{name}</Tooltip.Content>}
                  </Tooltip.Root>
                </div>
                {row.depth === 0 && clientRowHasCenterList(row.original) ? (
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <div
                        onClick={(event) => {
                          event.stopPropagation();
                          row.getToggleExpandedHandler()(event);
                        }}
                      >
                        {row.getIsExpanded() ? (
                          <RiArrowDownSFill className='text-primary-base shrink-0' />
                        ) : (
                          <RiArrowDownSLine className='text-primary-base shrink-0' />
                        )}
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <p>View Centers</p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                ) : null}
              </div>
            );
          },
          meta: {
            columnClassName: 'w-[260px] min-w-[260px] max-w-[260px]',
            cellClassName: 'w-[260px] min-w-[260px] max-w-[260px]',
          },
        },
        {
          id: 'center',
          header: <span className='whitespace-nowrap'>Center</span>,
          cell: ({ row }) => renderCenterBadges(row.original.custom_center),
        },
        {
          id: 'floor',
          columnLabel: 'Floor',
          accessorKey: 'floor',
          header: <span className='whitespace-nowrap'>Floor</span>,
          cell: ({ row }) => renderFloorBadges(row.original.floor),
        },
        {
          columnLabel: 'Avg. CSI Score',
          id: 'avgCsiScore',
          header: <span className='whitespace-nowrap'>Avg. CSI Score</span>,
          cell: ({ row }) => renderCsiBadge(row.original.custom_avg_csi_score),
        },
        {
          columnLabel: 'SPOC Name',
          id: 'spoc',
          accessorKey: 'custom_spoc_name',
          enableSorting: true,
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='whitespace-nowrap'>SPOC Name</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by SPOC Name ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const client = row.original;
            const spocName = client.custom_spoc_name || '-';
            if (spocName === '-') {
              return <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>-</span>;
            }

            const nameParts = spocName.trim().split(' ').filter(Boolean);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.length > 1 ? nameParts.at(-1) : '';

            const initials = `${upperFirst(firstName)[0] || ''}${lastName ? upperFirst(lastName)[0] || '' : ''}`;
            const capitalizedFullName = nameParts.map((part) => upperFirst(part)).join(' ');

            return (
              <div className='flex items-center gap-3 pl-3 pr-5 py-3'>
                <Avatar.Root size={24} color='gray'>
                  <span className='text-label-xs'>{initials || '?'}</span>
                </Avatar.Root>
                <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>
                  {spocName}
                </span>
              </div>
            );
          },
        },
        {
          columnLabel: 'SPOC Contact Number',
          id: 'spocContactNumber',
          header: <span className='whitespace-nowrap'>SPOC Contact Number</span>,
          cell: ({ row }) => {
            const contactNumber = row.original.custom_spoc_contact_num;
            const formattedNumber = contactNumber ? contactNumber : '-';
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {formattedNumber}
              </span>
            );
          },
        },
        {
          id: 'engagement',
          header: <span className='whitespace-nowrap'>Engagement</span>,
          cell: ({ row }) => renderEngagementCell(row.original.engagement),
        },
        {
          id: 'status',
          header: <span className='whitespace-nowrap'>Status</span>,
          cell: ({ row }) => {
            const clientId = row.original.name;
            const currentStatus = row.original.custom_status;
            const statusInfo = getClientStatusBadgeVariant(currentStatus, {
              isCenterChild: Boolean(row.original.is_center_child),
            });
            if (!clientId || row.original.is_center_child) {
              if (statusInfo.label === '-')
                return (
                  <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>-</span>
                );
              return (
                <Badge.Root
                  variant='light'
                  color={statusInfo.color ?? 'gray'}
                  size='small'
                  className={cn(STATUS_BADGE_CLASS, statusInfo.customClassName)}
                >
                  {statusInfo.label}
                </Badge.Root>
              );
            }
            const label = statusInfo.label !== '-' ? statusInfo.label : '--';
            return (
              <div className='min-w-[120px]' onClick={(e) => e.stopPropagation()}>
                <SearchableSelect
                  variant='borderless'
                  size='xsmall'
                  showArrow={false}
                  value={currentStatus || ''}
                  options={CLIENT_STATUS_OPTIONS}
                  placeholder='—'
                  searchPlaceholder='Search...'
                  triggerClassName='!h-auto !min-h-8 w-full min-w-0 py-0'
                  contentClassName='min-w-[160px]'
                  onValueChange={(next) => {
                    if (next !== currentStatus)
                      handleFieldUpdate(clientId, 'custom_status', next, row.original);
                  }}
                  renderTrigger={() => (
                    <Badge.Root
                      variant='light'
                      color={statusInfo.color ?? 'gray'}
                      className={cn(STATUS_BADGE_CLASS, statusInfo.customClassName)}
                    >
                      {label}
                    </Badge.Root>
                  )}
                  renderOptionLabel={(opt) => {
                    const badgeInfo = getClientStatusBadgeVariant(opt.value);
                    return (
                      <Badge.Root
                        variant='light'
                        color={badgeInfo.color ?? 'gray'}
                        className={cn(STATUS_BADGE_CLASS, badgeInfo.customClassName)}
                      >
                        {opt.label}
                      </Badge.Root>
                    );
                  }}
                />
              </div>
            );
          },
        },
        // {
        //   id: 'id',
        //   header: <span className='whitespace-nowrap'>ID</span>,
        //   cell: ({ row }) => (
        //     <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
        //       {row.original.name || '-'}
        //     </span>
        //   ),
        // },
        {
          id: 'createdBy',
          header: <span className='whitespace-nowrap'>Created By</span>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {row.original.owner || '-'}
            </span>
          ),
        },
        {
          id: 'createdAt',
          header: <span className='whitespace-nowrap'>Created At</span>,
          cell: ({ row }) => {
            if (!row.original.creation || row.original.creation === '-') {
              return <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>-</span>;
            }
            const formatted = safeDisplayDateTime(row.original.creation, '-');
            return (
              <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                {formatted}
              </span>
            );
          },
        },
      ],
      [handleFieldUpdate, centerOptions],
    );
    // use localRows so optimistic updates show immediately

    const defaultColumnConfig = useMemo(() => {
      const config = prepareColumnsForConfig(allColumnDefs);
      const defaultVisibleOrder = [
        'name',
        'center',
        'floor',
        'avgCsiScore',
        'spoc',
        'spocContactNumber',
        'engagement',
      ];

      const defaultHiddenOrder = ['status', 'createdBy', 'createdAt'];

      const configMap = new Map(config.map((col) => [col.id, col]));

      // Hide all columns first
      config.forEach((col) => {
        if (col.enableHiding !== false) {
          col.visible = false;
        }
      });

      // Show visible columns
      defaultVisibleOrder.forEach((colId, index) => {
        const col = configMap.get(colId);
        if (col) {
          col.visible = true;
          col.order = index;
        }
      });

      // Set order for hidden columns
      let hiddenOrder = defaultVisibleOrder.length;
      defaultHiddenOrder.forEach((colId) => {
        const col = configMap.get(colId);
        if (col) {
          col.visible = false;
          col.order = hiddenOrder++;
        }
      });

      // Set order for any remaining columns
      config.forEach((col) => {
        if (col.order === undefined) {
          col.order = hiddenOrder++;
        }
      });

      return config.sort((a, b) => a.order - b.order);
    }, [allColumnDefs]);

    // Stable callbacks so column pref APIs are not called on every render
    const handlePersistColumnConfig = useCallback(
      async (data) => {
        await dispatch(updateClientColumnList(data)).unwrap();
        await dispatch(fetchClientColumnList());
      },
      [dispatch],
    );

    const handleFetchColumnConfig = useCallback(async () => {
      return dispatch(fetchClientColumnList())
        .unwrap()
        .then((data) => data);
    }, [dispatch]);

    const {
      columns: columnConfig,
      visibleColumns: visibleColumnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    } = useColumnConfig(
      'clients-table',
      defaultColumnConfig,
      handlePersistColumnConfig,
      handleFetchColumnConfig,
      {
        autoSave: true,
        debounce: true,
      },
    );

    const columns = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfig),
      [allColumnDefs, columnConfig],
    );

    const table = useReactTable({
      data: localRows,
      columns,
      state: {
        sorting: localSorting,
        expanded,
      },
      onSortingChange: handleSortingChange,
      onExpandedChange: setExpanded,
      getSubRows: (row) => row?.centers ?? [],
      getCoreRowModel: getCoreRowModel(),
      getExpandedRowModel: getExpandedRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getRowCanExpand: (row) => clientRowHasCenterList(row.original),
      manualSorting: true, // Backend sorting enabled
      enableSortingRemoval: true,
    });

    React.useImperativeHandle(ref, () => ({
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

    if (error) {
      const errorMessage = extractErrorMessage(error, 'Unable to load clients. Please try again.');
      return (
        <div className='flex h-full w-full flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Clients</h3>
          <p className='mb-4 text-sm text-error-darker/80'>{errorMessage}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className='rounded-lg bg-error-base px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-darker'
            >
              Try Again
            </button>
          )}
        </div>
      );
    }

    if (!isLoading && data.length === 0) {
      return (
        <div className='flex h-full w-full flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{emptyState.title}</h3>
          <p className='max-w-md text-sm text-text-sub-600'>{emptyState.description}</p>
        </div>
      );
    }

    const renderSkeleton = () => (
      <Table.Body spacing={8}>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`clients-skeleton-${index}`}>
            <Table.Row>
              {table.getAllColumns().map((column) => (
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

    const hasRows = table.getRowModel().rows.length > 0;

    return (
      <div className='w-full shrink-0 flex-1 min-h-0 flex flex-col'>
        <div className='w-full flex-1 min-h-0 overflow-auto flex flex-col'>
          <Table.Root variant={variant} className='w-full min-h-0 flex-1 overflow-auto'>
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

            {isLoading && !hasRows ? (
              renderSkeleton()
            ) : (
              <Table.Body spacing={8}>
                {table.getRowModel().rows.map((row) => {
                  const isChildRow = row.depth > 0;
                  return (
                    <React.Fragment key={row.id}>
                      <Table.Row
                        className={cn('cursor-pointer', isChildRow && 'bg-bg-weak-25/50')}
                        onClick={() => onRowSelect?.(row.original)}
                      >
                        {row.getVisibleCells().map((cell, cellIndex) => (
                          <Table.Cell
                            key={cell.id}
                            className={cn(
                              isChildRow &&
                                cellIndex === 0 &&
                                'border-l-2 border-l-stroke-soft-200 pl-6',
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </Table.Cell>
                        ))}
                      </Table.Row>
                      <Table.RowDivider />
                    </React.Fragment>
                  );
                })}
                {/* Scroll pagination sentinel and loading indicator (match space-table) */}
                {enableScrollPagination && (
                  <>
                    <Table.Row ref={sentinelRef} data-scroll-sentinel>
                      <Table.Cell colSpan={columns.length} className='h-1 p-0' />
                    </Table.Row>
                    {isLoadingMore && (
                      <Table.Row>
                        <Table.Cell colSpan={columns.length} className='py-8 text-center'>
                          <div className='flex items-center justify-center gap-2'>
                            <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                            <span className='paragraph-small text-text-sub-600'>
                              Loading more clients...
                            </span>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </>
                )}
              </Table.Body>
            )}
          </Table.Root>
        </div>
      </div>
    );
  },
);

ClientsTable.displayName = 'ClientsTable';

export default ClientsTable;
