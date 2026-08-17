import React, { useCallback, useEffect, useMemo, useImperativeHandle, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { RiUserSharedLine } from 'react-icons/ri';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';

import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import { useDispatch } from 'react-redux';
import {
  fetchPartnerColumnList,
  updatePartnerColumnList,
  updatePartnerThunk,
} from '@/redux/partnerSlice';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';
import { hasStatusBadgeColor, StatusColorPill } from '@/components/ui/status-color-pill';
import * as Tooltip from '@/components/ui/tooltip';
import InlineEditableText from '@/components/ui/inline-editable-text';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { showSuccessToast, showErrorToast } from '@/utils/error-utils';
import {
  PARTNER_FILTER_PRIMARY_CATEGORY_OPTIONS,
  PARTNER_CREATE_SECONDARY_CATEGORY_OPTIONS,
  PARTNER_FILTER_REVENUE_MODEL_OPTIONS,
  PARTNER_INDUSTRY_TYPE_OPTIONS,
  PARTNER_FILTER_COMPANY_SIZE_OPTIONS,
  PARTNER_STAGE_BADGE_COLORS,
} from '@/components/partner/constants';

const partnerSortHeader = (label) => {
  const Inner = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable={column?.id !== 'partner_name'} />
  );
  Inner.displayName = `PartnerSortHeader(${label})`;
  return Inner;
};

const PartnerTable = React.forwardRef(
  (
    {
      rows = [],
      sorting: sortingFromParent = [],
      onSortingChange,
      isLoading,
      isLoadingMore = false,
      hasMore = false,
      onLoadMore,
      enableScrollPagination = false,
      tableId = 'partner-table',
      onRowClick,
      columns = [],
      // Caller-supplied empty-state copy. Used by the global centre header
      // contract to render the shared "No centers selected" message instead
      // of the default "Add your first partner" prompt.
      emptyTitle,
      emptyDescription,
      onboardingStageOptions = [],
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const [isSetStatusesOpen, setIsSetStatusesOpen] = useState(false);
    const [localSorting, setLocalSorting] = useState(sortingFromParent);
    const [localRows, setLocalRows] = useState(rows);
    useEffect(() => setLocalRows(rows), [rows]);

    const handleFieldUpdate = useCallback(
      (partnerName, field, value, prevRow) => {
        if (!partnerName) return;
        setLocalRows((prev) =>
          prev.map((r) => (r.name === partnerName ? { ...r, [field]: value } : r)),
        );
        dispatch(updatePartnerThunk({ partnerName, fields: { [field]: value } }))
          .unwrap()
          .then(() => showSuccessToast('Saved'))
          .catch((error) => {
            setLocalRows((prev) => prev.map((r) => (r.name === partnerName ? prevRow : r)));
            showErrorToast(error || 'Failed to update partner');
          });
      },
      [dispatch],
    );

    const renderInlineText = useCallback(
      (row, field) => {
        const partnerName = row.original.name;
        const display = row.original[field] == null ? '' : String(row.original[field]);
        return (
          <div
            className='w-[160px] max-w-[160px] overflow-hidden'
            onClick={(e) => e.stopPropagation()}
          >
            <InlineEditableText
              value={display}
              placeholder='—'
              displayClassName='paragraph-small truncate text-text-sub-600'
              inputClassName='paragraph-small text-text-sub-600'
              onSave={(v) => {
                const next = String(v ?? '').trim();
                if (next === display.trim()) return;
                handleFieldUpdate(partnerName, field, next, row.original);
              }}
            />
          </div>
        );
      },
      [handleFieldUpdate],
    );

    const renderInlineSelect = useCallback(
      (row, field, options) => {
        const partnerName = row.original.name;
        const value = row.original[field] || '';
        const label = options.find((o) => o.value === value)?.label || value || '--';
        return (
          <div className='min-w-[150px]' onClick={(e) => e.stopPropagation()}>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              showArrow={false}
              value={value}
              options={options}
              placeholder='—'
              searchPlaceholder='Search...'
              triggerClassName='!h-auto !min-h-8 w-full min-w-0 py-0'
              contentClassName='min-w-[200px]'
              onValueChange={(next) => {
                if (next !== value) handleFieldUpdate(partnerName, field, next, row.original);
              }}
              renderTrigger={() => (
                <span className='paragraph-small text-nowrap text-text-sub-600'>{label}</span>
              )}
            />
          </div>
        );
      },
      [handleFieldUpdate],
    );

    useEffect(() => {
      setLocalSorting(sortingFromParent);
    }, [sortingFromParent]);

    const handleSortingChange = useCallback(
      (updaterOrValue) => {
        const next =
          typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
        setLocalSorting(next);
        onSortingChange?.(next);
      },
      [localSorting, onSortingChange],
    );

    const { sentinelRef } = useScrollPagination({
      onLoadMore: onLoadMore || (() => {}),
      hasMore: Boolean(hasMore && enableScrollPagination),
      isLoading: Boolean(isLoadingMore || isLoading),
      threshold: 200,
      scrollContainer: null,
      enabled: Boolean(enableScrollPagination && onLoadMore),
    });

    const defaultStaticDefs = useMemo(
      () => [
        {
          id: 'partner_name',
          accessorKey: 'partner_name',
          columnLabel: 'Partner Name',
          header: partnerSortHeader('Partner Name'),
          cell: ({ row }) => {
            const partnerName = row.original.name;
            const val = (row.original.partner_name || '').trim();
            return (
              <div
                className='w-[230px] max-w-[230px] overflow-hidden'
                onClick={(e) => e.stopPropagation()}
              >
                <Tooltip.Root size='xsmall'>
                  <Tooltip.Trigger asChild>
                    <div className='min-w-0 overflow-hidden'>
                      <InlineEditableText
                        value={val}
                        placeholder='—'
                        displayClassName='paragraph-small truncate text-text-sub-500 font-medium'
                        inputClassName='paragraph-small text-text-sub-500'
                        onSave={(v) => {
                          const next = String(v ?? '').trim();
                          if (next === val) return;
                          handleFieldUpdate(partnerName, 'partner_name', next, row.original);
                        }}
                      />
                    </div>
                  </Tooltip.Trigger>
                  {val && <Tooltip.Content size='xsmall'>{val}</Tooltip.Content>}
                </Tooltip.Root>
              </div>
            );
          },
          meta: {
            columnClassName: 'w-[250px] min-w-[250px] max-w-[250px]',
            cellClassName: 'w-[250px] min-w-[250px] max-w-[250px] whitespace-nowrap',
          },
          enableSorting: false,
        },
        {
          id: 'website',
          accessorKey: 'website',
          columnLabel: 'Website',
          header: partnerSortHeader('Website'),
          cell: ({ row }) => renderInlineText(row, 'website'),
          enableSorting: true,
        },
        {
          id: 'primary_category',
          accessorKey: 'primary_category',
          columnLabel: 'Primary Category',
          header: partnerSortHeader('Primary Category'),
          cell: ({ row }) =>
            renderInlineSelect(row, 'primary_category', PARTNER_FILTER_PRIMARY_CATEGORY_OPTIONS),
          enableSorting: true,
        },
        {
          id: 'revenue_model',
          accessorKey: 'revenue_model',
          columnLabel: 'Revenue Model',
          header: partnerSortHeader('Revenue Model'),
          cell: ({ row }) => {
            const partnerName = row.original.name;
            const rawValue = row.original.revenue_model;
            let models = [];
            if (Array.isArray(rawValue)) {
              models = rawValue
                .map((m) => (typeof m === 'string' ? m : m?.revenue_model))
                .filter(Boolean);
            } else if (typeof rawValue === 'string') {
              models = rawValue
                .split(',')
                .map((m) => m.trim())
                .filter(Boolean);
            }
            const currentValues = models;
            const label =
              models.length > 0
                ? models[0] + (models.length > 1 ? ` +${models.length - 1}` : '')
                : '--';
            return (
              <div className='min-w-[180px]' onClick={(e) => e.stopPropagation()}>
                <SearchableSelect
                  variant='borderless'
                  size='xsmall'
                  showArrow={false}
                  value={currentValues}
                  options={PARTNER_FILTER_REVENUE_MODEL_OPTIONS}
                  placeholder='—'
                  searchPlaceholder='Search...'
                  triggerClassName='!h-auto !min-h-8 w-full min-w-0 py-0'
                  contentClassName='min-w-[220px]'
                  multiple
                  onValueChange={(next) => {
                    const nextArr = Array.isArray(next) ? next : [next].filter(Boolean);
                    handleFieldUpdate(
                      partnerName,
                      'revenue_model',
                      nextArr.map((v) => ({ revenue_model: v })),
                      row.original,
                    );
                  }}
                  renderTrigger={() => (
                    <span className='paragraph-small text-nowrap text-text-sub-600'>{label}</span>
                  )}
                />
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'secondary_category',
          accessorKey: 'secondary_category',
          columnLabel: 'Secondary Category',
          header: partnerSortHeader('Secondary Category'),
          cell: ({ row }) =>
            renderInlineSelect(
              row,
              'secondary_category',
              PARTNER_CREATE_SECONDARY_CATEGORY_OPTIONS,
            ),
          enableSorting: true,
        },
        {
          id: 'partner_base_city',
          accessorKey: 'partner_base_city',
          columnLabel: 'Partner Base City',
          header: partnerSortHeader('Partner Base City'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>
              {row.original.partner_base_city || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'industry_type',
          accessorKey: 'industry_type',
          columnLabel: 'Industry Type',
          header: partnerSortHeader('Industry Type'),
          cell: ({ row }) =>
            renderInlineSelect(row, 'industry_type', PARTNER_INDUSTRY_TYPE_OPTIONS),
          enableSorting: true,
        },
        {
          id: 'company_size',
          accessorKey: 'company_size',
          columnLabel: 'Company Size',
          header: partnerSortHeader('Company Size'),
          cell: ({ row }) =>
            renderInlineSelect(row, 'company_size', PARTNER_FILTER_COMPANY_SIZE_OPTIONS),
          enableSorting: true,
        },
        {
          id: 'linkedin_url',
          accessorKey: 'linkedin_url',
          columnLabel: 'LinkedIn URL',
          header: partnerSortHeader('LinkedIn URL'),
          cell: ({ row }) => renderInlineText(row, 'linkedin_url'),
          enableSorting: true,
        },
        {
          id: 'instagram_url',
          accessorKey: 'instagram_url',
          columnLabel: 'Instagram URL',
          header: partnerSortHeader('Instagram URL'),
          cell: ({ row }) => renderInlineText(row, 'instagram_url'),
          enableSorting: true,
        },
        {
          id: 'facebook_url',
          accessorKey: 'facebook_url',
          columnLabel: 'Facebook URL',
          header: partnerSortHeader('Facebook URL'),
          cell: ({ row }) => renderInlineText(row, 'facebook_url'),
          enableSorting: true,
        },
        {
          id: 'youtube_url',
          accessorKey: 'youtube_url',
          columnLabel: 'YouTube URL',
          header: partnerSortHeader('YouTube URL'),
          cell: ({ row }) => renderInlineText(row, 'youtube_url'),
          enableSorting: true,
        },
        {
          id: 'partner_owner',
          accessorKey: 'partner_owner',
          columnLabel: 'Partner Owner',
          header: partnerSortHeader('Partner Owner'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>
              {row.original.partner_owner || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'estimated_engagement_frequency',
          accessorKey: 'estimated_engagement_frequency',
          columnLabel: 'Frequency',
          header: partnerSortHeader('Frequency'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>
              {row.original.estimated_engagement_frequency || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'contact_name',
          accessorKey: 'contact_name',
          columnLabel: 'Primary Contact',
          header: partnerSortHeader('Primary Contact'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>
              {row.original.contact_name || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'contact_email',
          accessorKey: 'contact_email',
          columnLabel: 'Email',
          header: partnerSortHeader('Email'),
          cell: ({ row }) => {
            const email = row.original.contact_email;
            if (!email) return <span className='paragraph-small text-text-sub-500'>--</span>;
            return (
              <a
                href={`mailto:${email}`}
                className='paragraph-small text-text-sub-500 hover:underline'
                onClick={(e) => e.stopPropagation()}
              >
                {email}
              </a>
            );
          },
          enableSorting: true,
        },
        {
          id: 'onboarding_stage',
          accessorKey: 'onboarding_stage',
          columnLabel: 'Onboarding Stage',
          header: partnerSortHeader('Onboarding Stage'),
          cell: ({ row }) => {
            const stage = row.original.onboarding_stage;
            const raw = row.original.onboarding_stage_color;
            const partnerName = row.original.name;
            const value = stage || '';
            const label =
              onboardingStageOptions.find((o) => o.value === value)?.label || value || '--';

            const renderStageDisplay = () => {
              if (!value) {
                return <span className='paragraph-small text-text-sub-500'>--</span>;
              }
              if (hasStatusBadgeColor(raw)) {
                return (
                  <StatusColorPill value={value} color={raw} className='max-w-[min(100%,160px)]' />
                );
              }
              const color = PARTNER_STAGE_BADGE_COLORS[value] || 'gray';
              return (
                <Badge.Root
                  size='small'
                  variant='light'
                  color={color}
                  className='whitespace-nowrap'
                >
                  {value}
                </Badge.Root>
              );
            };

            return (
              <div className='min-w-[150px]' onClick={(e) => e.stopPropagation()}>
                <SearchableSelect
                  variant='borderless'
                  size='xsmall'
                  showArrow={false}
                  value={value}
                  options={onboardingStageOptions}
                  placeholder='—'
                  searchPlaceholder='Search...'
                  triggerClassName='!h-auto !min-h-8 w-full min-w-0 py-0'
                  contentClassName='min-w-[200px]'
                  onValueChange={(next) => {
                    if (next !== value) {
                      handleFieldUpdate(partnerName, 'onboarding_stage', next, row.original);
                    }
                  }}
                  renderTrigger={() => renderStageDisplay()}
                />
              </div>
            );
          },
          enableSorting: true,
        },
      ],
      [onboardingStageOptions, handleFieldUpdate],
    );

    const defaultColumnConfig = useMemo(
      () => prepareColumnsForConfig(defaultStaticDefs),
      [defaultStaticDefs],
    );

    const columnConfigHook = useColumnConfig(
      tableId,
      defaultColumnConfig,
      async (data) => {
        await dispatch(updatePartnerColumnList(data)).unwrap();
      },
      async () => {
        const result =
          columns.length > 0 ? columns : await dispatch(fetchPartnerColumnList()).unwrap();
        return result || defaultColumnConfig;
      },
      {
        autoSave: true,
        debounce: 300,
      },
    );

    const allColumnDefs = useMemo(
      () =>
        defaultStaticDefs.map((def) =>
          def.id === 'onboarding_stage'
            ? {
                ...def,
                header: () => (
                  <div className='flex items-center gap-0.5'>
                    <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                      Onboarding Stage
                    </span>
                    <StatusColumnPopover
                      columnId='onboarding_stage'
                      columnConfigHook={columnConfigHook}
                      onOpenStatuses={() => setIsSetStatusesOpen(true)}
                    />
                  </div>
                ),
              }
            : def,
        ),
      [defaultStaticDefs, columnConfigHook],
    );

    useImperativeHandle(ref, () => ({
      columnConfigHook,
    }));

    const visibleDefs = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfigHook.columns),
      [allColumnDefs, columnConfigHook.columns],
    );

    const table = useReactTable({
      data: localRows,
      columns: visibleDefs,
      state: { sorting: localSorting },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      manualSorting: true,
      enableSortingRemoval: true,
    });

    const hasRows = table.getRowModel().rows.length > 0;

    const renderSkeleton = () => (
      <Table.Body spacing={8}>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`partner-skeleton-${index}`}>
            <Table.Row>
              {visibleDefs.map((column) => (
                <Table.Cell key={column.id || column.accessorKey}>
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {index < array.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );

    if (!isLoading && !hasRows) {
      return (
        <div className='w-full overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-sm'>
          <div className='flex flex-col items-center justify-center py-16 gap-3'>
            <RiUserSharedLine size={40} className='text-text-soft-300' />
            <p className='text-paragraph-sm text-text-sub-600 font-medium'>
              {emptyTitle || 'No partners found'}
            </p>
            <p className='text-paragraph-xs text-text-soft-400'>
              {emptyDescription || 'Add your first partner to get started.'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className='flex-1 min-h-0 flex flex-col w-full overflow-hidden'>
        <SetStatusesModal
          open={isSetStatusesOpen}
          onOpenChange={setIsSetStatusesOpen}
          doctype='Partner'
          field='onboarding_stage'
        />
        <Table.Root
          variant='compact'
          className='min-h-0 flex-1 overflow-auto'
          tableClassName='min-w-max'
          tableInstance={table}
        >
          <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
            <Table.Row>
              {table.getHeaderGroups().map((headerGroup) =>
                headerGroup.headers.map((header) => (
                  <Table.Head key={header.id} column={header.column}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Head>
                )),
              )}
            </Table.Row>
          </Table.Header>
          {isLoading && !hasRows ? (
            renderSkeleton()
          ) : (
            <Table.Body spacing={8}>
              {table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <Table.Row
                    className='cursor-pointer hover:bg-bg-weak-50/50'
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell key={cell.id} column={cell.column}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  <Table.RowDivider />
                </React.Fragment>
              ))}
              {enableScrollPagination && !isLoading && hasRows && (
                <>
                  {hasMore && (
                    <Table.Row ref={sentinelRef} data-scroll-sentinel>
                      <Table.Cell colSpan={visibleDefs.length} className='h-1 p-0' />
                    </Table.Row>
                  )}
                  {isLoadingMore && (
                    <Table.Row>
                      <Table.Cell colSpan={visibleDefs.length} className='py-6 text-center'>
                        <div className='flex items-center justify-center gap-2'>
                          <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                          <span className='paragraph-small text-text-sub-600'>
                            Loading more partners…
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
    );
  },
);

PartnerTable.displayName = 'PartnerTable';

export default PartnerTable;
