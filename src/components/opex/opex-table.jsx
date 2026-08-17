import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { format, parse } from 'date-fns';
import { RiErrorWarningLine, RiExternalLinkLine } from 'react-icons/ri';
import * as Table from '@/components/ui/table';
import * as Input from '@/components/ui/input';
import * as Checkbox from '@/components/ui/checkbox';
import * as Avatar from '@/components/ui/avatar';
import * as AvatarGroup from '@/components/ui/avatar-group';
import * as Tooltip from '@/components/ui/tooltip';
import * as CompactButton from '@/components/ui/compact-button';
import { Datepicker } from '@/components/ui/datepicker';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { useColumnConfig, useColumnConfigPopoverRef } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import { saveOpexListPref, fetchOpexListPref, fetchVendorsForOpex } from '@/redux/opexSlice';
import { getStatusOptions } from '@/api/dynamic-status';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';
import {
  BILL_UPLOADED_OPTIONS,
  APPROVAL_OPTIONS,
  ZOHO_OPTIONS,
  OPEX_STATUS_FIELD_CHAIN,
  canEditOpexStatusField,
  OPEX_DOCTYPE,
  getOpexStageBlockedFieldMessage,
} from '@/components/opex/constants';
import { showErrorToast, extractErrorMessage } from '@/utils/error-utils';
import OpexStatusDropdown from '@/components/opex/opex-status-dropdown';
import OpexVendorSelect from '@/components/opex/opex-vendor-select';
import CircularProgress from '@/components/ui/circular-progress';
import { formatMonthYear } from '@/utils/date-utils';
import { getOpexProgress } from '@/utils/opex-utils';
import { withPrefix } from '@/lib/utils';
import { CURRENCY } from '@/constants/constants';
import { upperFirst } from 'lodash';
import { vendorSelectOptionsFromRow } from '@/utils/opex-vendor-utils';
import { findScrollableParent } from '@/components/event-management/event-participants-utils';

const OPEX_COLUMN_CONFIG_SEED = [
  { id: 'name', columnLabel: 'Name' },
  { id: 'center', columnLabel: 'Center' },
  { id: 'expense_month', columnLabel: 'Expense Month' },
  { id: 'triggered_month', columnLabel: 'Triggered Month' },
  { id: 'category', columnLabel: 'Category' },
  { id: 'vendor', columnLabel: 'Vendor' },
  { id: 'amount_without_gst', columnLabel: 'Amount Without GST' },
  { id: 'gst_amount', columnLabel: 'GST Amount' },
  { id: 'total_amount', columnLabel: 'Total Amount' },
  { id: 'bill_url', columnLabel: 'Bill URL' },
  { id: 'invoice_date', columnLabel: 'Invoice Date' },
  { id: 'hard_copy_sent', columnLabel: 'Hard Copy Sent' },
  { id: 'bill_uploaded', columnLabel: 'Bill Uploaded' },
  { id: 'zone_head_check', columnLabel: 'Zone Head Check' },
  { id: 'zone_head_checked_date', columnLabel: 'Zone Head Checked Date', visible: false },
  { id: 'purchase_check', columnLabel: 'Purchase Check' },
  { id: 'purchase_checked_date', columnLabel: 'Purchase Checked Date', visible: false },
  { id: 'assignee', columnLabel: 'Assignee' },
  { id: 'zoho_uploaded', columnLabel: 'Zoho Uploaded' },
];

const OPEX_COLUMN_ORDER = [
  'name',
  'center',
  'expense_month',
  'triggered_month',
  'vendor',
  'invoice_date',
  'amount_without_gst',
  'gst_amount',
  'total_amount',
  'bill_url',
  'bill_uploaded',
  'hard_copy_sent',
  'zone_head_check',
  'zone_head_checked_date',
  'purchase_check',
  'purchase_checked_date',
  'assignee',
  'zoho_uploaded',
];

const OPEX_STATUS_FIELD_CONFIG = {
  bill_uploaded: { label: 'Bill Uploaded', fallback: BILL_UPLOADED_OPTIONS },
  zone_head_check: { label: 'Zone Head Check', fallback: APPROVAL_OPTIONS },
  purchase_check: { label: 'Purchase Check', fallback: APPROVAL_OPTIONS },
  zoho_uploaded: { label: 'Zoho Uploaded', fallback: ZOHO_OPTIONS },
};

const toOpexDropdownOptions = (dynamicOptions, fallbackOptions) => {
  if (Array.isArray(dynamicOptions) && dynamicOptions.length > 0) {
    return dynamicOptions.map((o) => ({
      value: o.value,
      label: o.label,
      color: o.color,
    }));
  }
  return (fallbackOptions || []).map((o) => ({
    value: o.value,
    label: o.label,
    color: o.color,
  }));
};

const OpexTable = React.forwardRef(
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
      permissions = {},
      tableId = 'opex-table',
      columnConfig: externalColumnConfig,
      onColumnConfigChange,
      onRowChange,
      onLoadMore,
      hasMore = false,
      isLoadingMore = false,
      enableScrollPagination = false,
      variant = 'compact',
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const [localRows, setLocalRows] = useState(rows);
    const [localSorting, setLocalSorting] = useState(sorting);
    const [editingCell, setEditingCell] = useState(null);
    const [activeStatusField, setActiveStatusField] = useState(null);
    const [dynamicStatusOptionsByField, setDynamicStatusOptionsByField] = useState({});
    const { statusPopoverColumnConfig, syncColumnConfigHookToPopover } =
      useColumnConfigPopoverRef();
    const localRowsRef = useRef(localRows);
    const lastRowChangeRef = useRef({ key: '', at: 0 });
    localRowsRef.current = localRows;

    // Sync local rows with props
    useEffect(() => {
      setLocalRows(rows);
    }, [rows]);

    React.useEffect(() => {
      setLocalSorting(sorting);
    }, [sorting]);

    React.useEffect(() => {
      let cancelled = false;
      const fetchAll = async () => {
        const entries = await Promise.all(
          Object.keys(OPEX_STATUS_FIELD_CONFIG).map(async (field) => {
            try {
              const opts = await getStatusOptions({ doctype: OPEX_DOCTYPE, field });
              return [field, opts];
            } catch {
              return [field, []];
            }
          }),
        );
        if (!cancelled) {
          setDynamicStatusOptionsByField(Object.fromEntries(entries));
        }
      };
      fetchAll();
      return () => {
        cancelled = true;
      };
    }, [activeStatusField]);

    const getOpexStatusOptions = useCallback(
      (field) =>
        toOpexDropdownOptions(
          dynamicStatusOptionsByField[field],
          OPEX_STATUS_FIELD_CONFIG[field]?.fallback,
        ),
      [dynamicStatusOptionsByField],
    );

    const renderOpexStatusHeader = useCallback(
      (column, label, fieldKey) => (
        <div className='flex items-center gap-0.5'>
          <Table.SortableHeader column={column} label={label} className='w-[180px]' sortable />
          <StatusColumnPopover
            columnId={fieldKey}
            columnConfigHook={statusPopoverColumnConfig}
            onOpenStatuses={() => setActiveStatusField(fieldKey)}
          />
        </div>
      ),
      [statusPopoverColumnConfig],
    );

    const opexTableRootRef = useRef(null);
    const [scrollContainerEl, setScrollContainerEl] = useState(null);

    useEffect(() => {
      const next = opexTableRootRef.current ? findScrollableParent(opexTableRootRef.current) : null;
      setScrollContainerEl(next || null);
    }, [localRows.length, isLoading, isLoadingMore, enableScrollPagination]);

    // Setup scroll pagination
    const { sentinelRef } = useScrollPagination({
      onLoadMore: onLoadMore || (() => {}),
      hasMore: hasMore && enableScrollPagination,
      isLoading: isLoadingMore || isLoading,
      threshold: 200,
      scrollContainer: scrollContainerEl,
      enabled: Boolean(scrollContainerEl && enableScrollPagination && onLoadMore),
    });

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

    const buildUpdatedRow = useCallback((existing = {}, field, value) => {
      const updated = { ...existing, [field]: value };

      if (field === 'gst_amount' || field === 'amount_without_gst') {
        const gst = Number.parseFloat(field === 'gst_amount' ? value : existing.gst_amount) || 0;
        const withoutGst =
          Number.parseFloat(field === 'amount_without_gst' ? value : existing.amount_without_gst) ||
          0;
        updated.total_amount = gst + withoutGst;
      }

      return updated;
    }, []);

    const emitRowChange = useCallback(
      (updatedRow, rowIndex, fieldName) => {
        if (!onRowChange || !updatedRow || !fieldName) return;

        const rowId = updatedRow?.name ?? updatedRow?.id ?? rowIndex;
        const value = updatedRow[fieldName];
        const eventKey = `${rowId}::${fieldName}::${value === undefined ? '' : String(value)}`;
        const now = Date.now();

        // Guard against duplicate callback emissions for the same change in quick succession.
        if (lastRowChangeRef.current.key === eventKey && now - lastRowChangeRef.current.at < 500) {
          return;
        }

        lastRowChangeRef.current = { key: eventKey, at: now };
        onRowChange(updatedRow, rowIndex, fieldName);
      },
      [onRowChange],
    );

    const setLocalRowField = useCallback(
      (rowIndex, field, value) => {
        setLocalRows((previous) => {
          const next = [...previous];
          const existing = next[rowIndex] || {};
          const updated = buildUpdatedRow(existing, field, value);

          next[rowIndex] = updated;
          return next;
        });
      },
      [buildUpdatedRow],
    );

    const updateRowField = useCallback(
      (rowIndex, field, value) => {
        const currentRow = localRowsRef.current[rowIndex];
        const currentValue = currentRow?.[field];

        let isSame = false;
        if (typeof value === 'boolean') {
          isSame = Boolean(currentValue) === value;
        } else {
          const normalizedCurrent =
            currentValue === null || currentValue === undefined ? '' : String(currentValue);
          const normalizedNew = value === null || value === undefined ? '' : String(value);
          isSame = normalizedCurrent === normalizedNew;
        }

        if (isSame) return;

        if (OPEX_STATUS_FIELD_CHAIN.includes(field)) {
          console.log('currentRow', currentRow?.opex_stage);
          console.log('field', field);
          const blockMessage = getOpexStageBlockedFieldMessage(field, currentRow?.opex_stage);
          if (blockMessage) {
            showErrorToast(blockMessage);
            return;
          }
        }

        const updated = buildUpdatedRow(currentRow, field, value);
        setLocalRows((prev) => {
          const next = [...prev];
          next[rowIndex] = updated;
          return next;
        });
        emitRowChange(updated, rowIndex, field);
      },
      [buildUpdatedRow, emitRowChange],
    );

    const handleInputBlur = useCallback(
      (rowIndex, fieldName) => {
        setEditingCell(null);
        const updated = localRowsRef.current?.[rowIndex];
        if (!updated) return;

        const originalValue = rows?.[rowIndex]?.[fieldName];
        const newValue = updated[fieldName];

        const normalizedOriginal =
          originalValue === null || originalValue === undefined ? '' : String(originalValue);
        const normalizedNew = newValue === null || newValue === undefined ? '' : String(newValue);

        if (normalizedOriginal === normalizedNew) return;

        emitRowChange(updated, rowIndex, fieldName);
      },
      [emitRowChange, rows],
    );

    const canEdit = permissions.canEdit !== false;
    const userRoleType = permissions.roleType;
    const canEditOpexField = useCallback(
      (field) => canEditOpexStatusField(field, canEdit, userRoleType),
      [canEdit, userRoleType],
    );

    // Define all available columns with IDs for column management
    const allColumnDefs = useMemo(() => {
      return [
        {
          id: 'name',
          accessorKey: 'subcategory',
          columnLabel: 'Name',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Name' className='w-[200px]' sortable />
          ),
          cell: ({ row }) => {
            const { percentage, color } = getOpexProgress(
              row.original.bill_uploaded,
              row.original.zoho_uploaded,
            );

            return (
              <div className='flex items-center gap-3 w-[200px]'>
                <CircularProgress percentage={percentage} color={color} size={15} />
                <Tooltip.Root size='xsmall'>
                  <Tooltip.Trigger asChild>
                    <span className='paragraph-small text-text-strong-950 whitespace-nowrap overflow-hidden text-ellipsis'>
                      {row.original.subcategory || '--'}
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Content side='bottom'>
                    {row.original.subcategory || '--'}
                  </Tooltip.Content>
                </Tooltip.Root>
              </div>
            );
          },
          meta: {
            cellClassName: 'min-w-[200px] max-w-[200px] whitespace-nowrap',
          },
          enableSorting: true,
        },
        {
          id: 'assignee',
          accessorKey: 'assignee',
          columnLabel: 'Assignee',
          header: () => <Table.SortableHeader label='Assignee' />,
          cell: ({ row }) => {
            const assigneeRaw = row.original.assignee;
            const assigneeValue = Array.isArray(assigneeRaw)
              ? assigneeRaw
              : assigneeRaw
                ? [assigneeRaw]
                : [];

            if (assigneeValue.length === 0) {
              return <span className='paragraph-small text-text-sub-400'>-</span>;
            }

            return (
              <AvatarGroup.Root size={24}>
                {assigneeValue.slice(0, 3).map((assigneeItem, index) => {
                  const assigneeName =
                    typeof assigneeItem === 'string'
                      ? assigneeItem
                      : assigneeItem.full_name || assigneeItem.name || assigneeItem.email || 'User';
                  const assigneeImage =
                    typeof assigneeItem === 'object'
                      ? assigneeItem.user_image || assigneeItem.image || assigneeItem.avatar
                      : null;

                  return (
                    <Tooltip.Root size='xsmall' key={assigneeName || index}>
                      <Tooltip.Trigger asChild>
                        <Avatar.Root size={24} color='gray'>
                          {assigneeImage ? (
                            <Avatar.Image src={assigneeImage} alt={assigneeName} />
                          ) : (
                            <span className='text-label-sm'>
                              {(() => {
                                const nameParts = assigneeName.trim().split(' ').filter(Boolean);
                                if (nameParts.length === 0) return 'U';
                                const fInitial = upperFirst(nameParts[0])[0] || '';
                                const lInitial =
                                  nameParts.length > 1 ? upperFirst(nameParts.at(-1))[0] || '' : '';
                                return fInitial + lInitial;
                              })()}
                            </span>
                          )}
                        </Avatar.Root>
                      </Tooltip.Trigger>
                      {assigneeName && (
                        <Tooltip.Content size='xsmall' side='bottom'>
                          {assigneeName}
                        </Tooltip.Content>
                      )}
                    </Tooltip.Root>
                  );
                })}
                {assigneeValue.length > 3 && (
                  <AvatarGroup.Overflow size={24}>+{assigneeValue.length - 3}</AvatarGroup.Overflow>
                )}
              </AvatarGroup.Root>
            );
          },
          enableSorting: false,
        },
        {
          id: 'center',
          accessorKey: 'center_name',
          columnLabel: 'Center',
          header: ({ column }) => <Table.SortableHeader column={column} label='Center' sortable />,
          cell: ({ row }) => (
            <span className='paragraph-small line-clamp-1 text-text-sub-600 whitespace-nowrap'>
              {row.original.center_name || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'expense_month',
          accessorKey: 'period',
          columnLabel: 'Expense Month',
          visible: true,
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Expense Month' sortable />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
              {formatMonthYear(row.original.period, '--')}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'triggered_month',
          accessorKey: 'triggered_month',
          columnLabel: 'Triggered Month',
          visible: true,
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Triggered Month' sortable />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
              {formatMonthYear(row.original.triggered_month, '--')}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'category',
          accessorKey: 'category',
          columnLabel: 'Category',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Category' className='w-[140px]' sortable />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small line-clamp-1 text-text-sub-600 text-nowrap'>
              {row.original.category || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'vendor',
          accessorKey: 'vendor',
          columnLabel: 'Vendor',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Vendor' className='w-[200px]' sortable />
          ),
          cell: ({ row }) => {
            const rowData = row.original;
            const rowVendorOptions = vendorSelectOptionsFromRow(rowData);
            const vid = rowData.vendor;
            const selectedVendor =
              vid == null || vid === ''
                ? null
                : rowVendorOptions.find((v) => String(v.id) === String(vid)) || null;

            return canEditOpexField('vendor') ? (
              <div onClick={(e) => e.stopPropagation()}>
                <OpexVendorSelect
                  plainTrigger
                  truncateAt={20}
                  value={selectedVendor}
                  vendorOptions={rowVendorOptions}
                  loadVendorOptionsOnOpen={() =>
                    dispatch(
                      fetchVendorsForOpex({
                        center: rowData.center ?? rowData.center_name,
                        category: rowData.category,
                      }),
                    ).unwrap()
                  }
                  onChange={(vendor) => updateRowField(row.index, 'vendor', vendor?.id || '')}
                />
              </div>
            ) : (
              (() => {
                const vendorName =
                  selectedVendor?.name || rowData.vendor_name || rowData.vendor || '--';
                const shouldTruncate = vendorName !== '--' && String(vendorName).length > 20;
                const vendorDisplay = shouldTruncate
                  ? `${String(vendorName).slice(0, 20)}...`
                  : vendorName;

                if (!shouldTruncate) {
                  return (
                    <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
                      {vendorDisplay}
                    </span>
                  );
                }

                return (
                  <Tooltip.Root size='xsmall'>
                    <Tooltip.Trigger asChild>
                      <span className='paragraph-small text-text-sub-600 whitespace-nowrap cursor-default'>
                        {vendorDisplay}
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content side='bottom'>{vendorName}</Tooltip.Content>
                  </Tooltip.Root>
                );
              })()
            );
          },
          enableSorting: true,
        },
        {
          id: 'amount_without_gst',
          accessorKey: 'amount_without_gst',
          columnLabel: 'Amount Without GST',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Amount Without GST' sortable />
          ),
          cell: ({ row }) => {
            const value = row.original.amount_without_gst || '';
            const isEditing =
              canEdit &&
              editingCell?.rowIndex === row.index &&
              editingCell?.columnId === 'amount_without_gst';

            if (isEditing) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        value={value}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setLocalRowField(row.index, 'amount_without_gst', val);
                          }
                        }}
                        onBlur={() => handleInputBlur(row.index, 'amount_without_gst')}
                        placeholder='0'
                        autoFocus
                      />
                      <Input.InlineAffix>₹</Input.InlineAffix>
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              );
            }

            return (
              <div
                className='paragraph-small text-text-sub-600 cursor-pointer'
                onClick={(e) => {
                  e.stopPropagation();
                  if (canEdit)
                    setEditingCell({ rowIndex: row.index, columnId: 'amount_without_gst' });
                }}
              >
                {withPrefix(CURRENCY, value || '0')}
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'gst_amount',
          accessorKey: 'gst_amount',
          columnLabel: 'GST Amount',
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='GST Amount'
              className='w-[120px]'
              sortable
            />
          ),
          cell: ({ row }) => {
            const value = row.original.gst_amount || '';
            const isEditing =
              canEdit &&
              editingCell?.rowIndex === row.index &&
              editingCell?.columnId === 'gst_amount';

            if (isEditing) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        value={value}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          if (newValue === '' || /^\d*\.?\d*$/.test(newValue)) {
                            setLocalRowField(row.index, 'gst_amount', newValue);
                          }
                        }}
                        onBlur={() => handleInputBlur(row.index, 'gst_amount')}
                        placeholder='0'
                        autoFocus
                      />
                      <Input.InlineAffix>₹</Input.InlineAffix>
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              );
            }

            return (
              <div
                className='paragraph-small text-text-sub-600 cursor-pointer'
                onClick={(e) => {
                  e.stopPropagation();
                  if (canEdit) setEditingCell({ rowIndex: row.index, columnId: 'gst_amount' });
                }}
              >
                {withPrefix(CURRENCY, value || '0')}
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'total_amount',
          accessorKey: 'total_amount',
          columnLabel: 'Total Amount',
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='Total Amount'
              className='w-[120px]'
              sortable
            />
          ),
          cell: ({ row }) => {
            const value = row.original.total_amount || '';
            const isEditing =
              canEdit &&
              editingCell?.rowIndex === row.index &&
              editingCell?.columnId === 'total_amount';

            if (isEditing) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        value={value}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          if (newValue === '' || /^\d*\.?\d*$/.test(newValue)) {
                            setLocalRowField(row.index, 'total_amount', newValue);
                          }
                        }}
                        onBlur={() => handleInputBlur(row.index, 'total_amount')}
                        placeholder='0'
                        autoFocus
                      />
                      <Input.InlineAffix>₹</Input.InlineAffix>
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              );
            }

            return (
              <div
                className='paragraph-small text-text-sub-600 cursor-pointer whitespace-nowrap'
                onClick={(e) => {
                  e.stopPropagation();
                  if (canEdit) setEditingCell({ rowIndex: row.index, columnId: 'total_amount' });
                }}
              >
                {withPrefix(CURRENCY, value || '0')}
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'bill_url',
          accessorKey: 'bill_url',
          columnLabel: 'Bill URL',
          header: () => <Table.SortableHeader label='Bill URL' className='w-[250px]' />,
          cell: ({ row }) => {
            const isEditing =
              canEdit &&
              editingCell?.rowIndex === row.index &&
              editingCell?.columnId === 'bill_url';
            const value = row.original.bill_url || '';
            const fullUrl = row.original.bill_url ?? '';

            if (isEditing) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        value={value}
                        onChange={(e) => setLocalRowField(row.index, 'bill_url', e.target.value)}
                        onBlur={() => handleInputBlur(row.index, 'bill_url')}
                        placeholder='https://...'
                        autoFocus
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              );
            }

            return (
              <div
                className='group/cell flex items-center gap-1.5 w-[250px]'
                onClick={(e) => {
                  e.stopPropagation();
                  if (canEdit) setEditingCell({ rowIndex: row.index, columnId: 'bill_url' });
                }}
                title={fullUrl || undefined}
              >
                <div className='paragraph-small text-primary-base min-w-0 flex-1 truncate'>
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
          cell: ({ row }) => {
            const value = row.original.invoice_date || '';
            const dateObject = value
              ? (() => {
                  try {
                    const d = parse(value, 'yyyy-MM-dd', new Date());
                    return Number.isNaN(d.getTime()) ? null : d;
                  } catch {
                    return null;
                  }
                })()
              : null;

            if (!canEdit) {
              return (
                <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
                  {dateObject ? format(dateObject, 'LLL dd, y') : '--'}
                </span>
              );
            }

            return (
              <div onClick={(e) => e.stopPropagation()}>
                <Datepicker
                  value={dateObject ?? undefined}
                  onChange={(date) =>
                    updateRowField(
                      row.index,
                      'invoice_date',
                      date ? format(date, 'yyyy-MM-dd') : '',
                    )
                  }
                  placeholder='-'
                  size='xsmall'
                  variant='borderless'
                  formatDate={(d) => format(d, 'LLL dd, y')}
                  className='p-0'
                />
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'hard_copy_sent',
          accessorKey: 'hard_copy_sent',
          columnLabel: 'Hard Copy Sent',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Hard Copy Sent' sortable />
          ),
          cell: ({ row }) =>
            canEdit ? (
              <div className='flex justify-center' onClick={(e) => e.stopPropagation()}>
                <Checkbox.Root
                  checked={Boolean(row.original.hard_copy_sent)}
                  onCheckedChange={(checked) =>
                    updateRowField(row.index, 'hard_copy_sent', Boolean(checked))
                  }
                />
              </div>
            ) : (
              <span className='paragraph-small text-text-sub-600'>
                {row.original.hard_copy_sent ? 'Yes' : 'No'}
              </span>
            ),
          enableSorting: true,
        },
        {
          id: 'bill_uploaded',
          accessorKey: 'bill_uploaded',
          columnLabel: 'Bill Uploaded',
          header: ({ column }) => renderOpexStatusHeader(column, 'Bill Uploaded', 'bill_uploaded'),
          cell: ({ row }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <OpexStatusDropdown
                value={row.original.bill_uploaded}
                onValueChange={(value) => updateRowField(row.index, 'bill_uploaded', value)}
                statusOptions={getOpexStatusOptions('bill_uploaded')}
                disabled={!canEditOpexField('bill_uploaded')}
                showArrow={canEditOpexField('bill_uploaded')}
              />
            </div>
          ),
          enableSorting: true,
        },
        {
          id: 'zone_head_check',
          accessorKey: 'zone_head_check',
          columnLabel: 'Zone Head Check',
          header: ({ column }) =>
            renderOpexStatusHeader(column, 'Zone Head Check', 'zone_head_check'),
          cell: ({ row }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <OpexStatusDropdown
                value={row.original.zone_head_check}
                onValueChange={(value) => updateRowField(row.index, 'zone_head_check', value)}
                statusOptions={getOpexStatusOptions('zone_head_check')}
                disabled={!canEditOpexField('zone_head_check')}
                showArrow={canEditOpexField('zone_head_check')}
              />
            </div>
          ),
          enableSorting: true,
        },
        // Hidden by default – Column Manager
        {
          id: 'zone_head_checked_date',
          accessorKey: 'zone_head_checked_date',
          columnLabel: 'Zone Head Checked Date',
          visible: false,
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Zone Head Checked Date' sortable />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
              {row.original.zone_head_checked_date || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'purchase_check',
          accessorKey: 'purchase_check',
          columnLabel: 'Purchase Check',
          header: ({ column }) =>
            renderOpexStatusHeader(column, 'Purchase Check', 'purchase_check'),
          cell: ({ row }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <OpexStatusDropdown
                value={row.original.purchase_check}
                onValueChange={(value) => updateRowField(row.index, 'purchase_check', value)}
                statusOptions={getOpexStatusOptions('purchase_check')}
                disabled={!canEditOpexField('purchase_check')}
                showArrow={canEditOpexField('purchase_check')}
              />
            </div>
          ),
          enableSorting: true,
        },
        // Hidden by default – Column Manager
        {
          id: 'purchase_checked_date',
          accessorKey: 'purchase_checked_date',
          columnLabel: 'Purchase Checked Date',
          visible: false,
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Purchase Checked Date' sortable />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
              {row.original.purchase_checked_date || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'zoho_uploaded',
          accessorKey: 'zoho_uploaded',
          columnLabel: 'Zoho Uploaded',
          header: ({ column }) => renderOpexStatusHeader(column, 'Zoho Uploaded', 'zoho_uploaded'),
          cell: ({ row }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <OpexStatusDropdown
                value={row.original.zoho_uploaded}
                onValueChange={(value) => updateRowField(row.index, 'zoho_uploaded', value)}
                statusOptions={getOpexStatusOptions('zoho_uploaded')}
                disabled={!canEditOpexField('zoho_uploaded')}
                showArrow={canEditOpexField('zoho_uploaded')}
              />
            </div>
          ),
          enableSorting: true,
        },
        // Remaining (hidden by default)
      ];
    }, [
      canEdit,
      canEditOpexField,
      editingCell,
      getOpexStatusOptions,
      renderOpexStatusHeader,
      dispatch,
      setLocalRowField,
      updateRowField,
      handleInputBlur,
    ]);

    const defaultColumnConfig = useMemo(() => {
      const config = prepareColumnsForConfig(OPEX_COLUMN_CONFIG_SEED);
      const configMap = new Map(config.map((col) => [col.id, col]));
      const ordered = [];
      const used = new Set();

      OPEX_COLUMN_ORDER.forEach((id) => {
        const col = configMap.get(id);
        if (col) {
          ordered.push(col);
          used.add(id);
        }
      });

      // Keep any remaining columns at the end in original def order.
      config.forEach((col) => {
        if (!used.has(col.id)) {
          ordered.push(col);
        }
      });

      return ordered.map((col, index) => ({
        ...col,
        order: index,
      }));
    }, []);

    // Use column configuration hook (only if external config not provided)
    const internalColumnConfigHook = useColumnConfig(
      tableId,
      defaultColumnConfig,
      async (data) => {
        await dispatch(saveOpexListPref({ react_table_id: tableId, columns: data })).unwrap();
      },
      async () => {
        const result = await dispatch(fetchOpexListPref({ react_table_id: tableId })).unwrap();
        return result || defaultColumnConfig;
      },
      {
        autoSave: true,
        debounce: 500,
      },
    );

    // Use external config if provided, otherwise use internal hook
    const {
      columns: columnConfig,
      visibleColumns: visibleColumnConfig,
      isLoading: isLoadingColumnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    } = externalColumnConfig || internalColumnConfigHook;

    syncColumnConfigHookToPopover(externalColumnConfig || internalColumnConfigHook);

    // Expose methods to parent via ref
    React.useImperativeHandle(ref, () => ({
      columnConfig,
      columnConfigHook: externalColumnConfig || internalColumnConfigHook,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    }));

    // Apply column config
    const columns = useMemo(() => {
      return applyColumnConfig(allColumnDefs, columnConfig);
    }, [allColumnDefs, columnConfig]);

    const table = useReactTable({
      data: localRows,
      columns,
      state: {
        sorting: localSorting,
        columnPinning: {
          left: ['name'],
        },
      },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: true,
      enableSortingRemoval: true,
    });

    // Error state
    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load OPEX</h3>
          <p className='mb-4 text-sm text-error-darker/80'>
            {typeof error === 'string' ? error : extractErrorMessage(error, 'Unable to load OPEX')}
          </p>
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

    // Empty state
    if (!isLoading && localRows.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>No OPEX records found</h3>
          <p className='max-w-md text-sm text-text-sub-600'>
            Add an OPEX entry or adjust your filters to see results.
          </p>
        </div>
      );
    }

    // Loading skeleton
    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`skeleton-${index}`}>
            <Table.Row>
              {columns.map((col) => (
                <Table.Cell key={col.id}>
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
      <div ref={opexTableRootRef} className='flex min-h-0 w-full flex-1 flex-col'>
        <Table.Root
          variant={variant}
          tableInstance={table}
          className='min-h-0 flex-1 overflow-auto'
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

          {isLoading && localRows.length === 0 ? (
            renderSkeleton()
          ) : (
            <Table.Body>
              {table.getRowModel().rows.map((row, i, rows) => (
                <React.Fragment key={row.id}>
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
                          if (cell.column.id === 'actions') {
                            e.stopPropagation();
                          }
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>

                  {i < rows.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}

              {/* Scroll pagination sentinel and loading indicator */}
              {enableScrollPagination && (
                <>
                  {hasMore && (
                    <Table.Row ref={sentinelRef} data-scroll-sentinel>
                      <Table.Cell colSpan={columns.length} className='h-1 p-0' />
                    </Table.Row>
                  )}
                  {isLoadingMore && (
                    <Table.Row key='loading-more'>
                      <Table.Cell colSpan={columns.length} className='py-8 text-center'>
                        <div className='flex items-center justify-center gap-2'>
                          <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                          <span className='paragraph-small text-text-sub-600'>
                            Loading more OPEX records...
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
        {activeStatusField ? (
          <SetStatusesModal
            open={Boolean(activeStatusField)}
            onOpenChange={(open) => {
              if (!open) setActiveStatusField(null);
            }}
            doctype={OPEX_DOCTYPE}
            field={activeStatusField}
            fieldLabel={OPEX_STATUS_FIELD_CONFIG[activeStatusField]?.label}
            showImport={false}
          />
        ) : null}
      </div>
    );
  },
);

OpexTable.displayName = 'OpexTable';

export default OpexTable;
