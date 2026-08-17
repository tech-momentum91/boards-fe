import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { format } from 'date-fns';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiExpandUpDownFill,
} from 'react-icons/ri';
import ProjectStatusDropdown from '@/components/projects/shared/project-status-dropdown';
import ProjectTaskTitleCell from '@/components/projects/shared/project-task-title-cell';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import ProductFormSearchableSelect from '@/components/products/product-form-searchable-select';
import { PRODUCT_FORM_FIELDS } from '@/api/productFormOptions';
import { fetchProductCategoryOptions } from '@/redux/projectMasterSlice';
import {
  ExpandedItemsSection,
  SelectionCategoryAddFooter,
  TruncatedTableSelect,
} from '@/pages/profile/project-master/selection-category-table-shared';
import ProjectMasterTableDeleteButton from '@/pages/profile/project-master/project-master-table-delete-button';
import {
  DeliveryChallanCell,
  DeliveryPhotoCell,
} from '@/components/projects/project-selection/project-selection-delivery-cells';
import { rowToSelectionCategoryDetail } from '@/components/projects/project-selection/project-selection-helpers';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';
import ProjectBadgeSelect, {
  formatProjectPriorityLabel,
  ProjectBadgeLabel,
} from '@/components/projects/shared/project-badge-select';
import * as Badge from '@/components/ui/badge';
import * as Checkbox from '@/components/ui/checkbox';
import { Datepicker } from '@/components/ui/datepicker';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Table from '@/components/ui/table';
import {
  PROJECT_DETAIL_DELIVERY_STATUS_OPTIONS,
  PROJECT_DETAIL_PO_STATUS_OPTIONS,
  PROJECT_DETAIL_SELECTION_PRIORITY_OPTIONS,
  PROJECT_DETAIL_SELECTION_STATUS_OPTIONS,
  PROJECT_DELIVERY_STATUS_META,
  PROJECT_PO_STATUS_META,
  PROJECT_SELECTION_PARENT_TABLE_MIN_WIDTH,
  PROJECT_SELECTION_STATUS_META,
  colorForLayoutPriority,
} from '@/components/projects/constants';
import { parseToDate } from '@/utils/date-utils';
import { normalizeTaskAssigneeEntry } from '@/utils/task-utils';
import { applyColumnConfig } from '@/lib/column-utils';
import { cn } from '@/utils/cn';

function getRowAssigneeValue(row) {
  const fromList = (row?.assignees ?? [])
    .map((entry) =>
      normalizeTaskAssigneeEntry(
        typeof entry === 'string'
          ? entry
          : {
              assignee: entry.assignee || entry.id,
              value: entry.assignee || entry.id,
              label: entry.label || entry.full_name || entry.initials || entry.assignee || entry.id,
              full_name: entry.full_name || entry.label || entry.initials,
              user_image: entry.user_image || entry.image,
            },
      ),
    )
    .filter(Boolean);
  if (fromList.length > 0) return fromList;

  if (row?.assignee) {
    const normalized = normalizeTaskAssigneeEntry({
      assignee: row.assignee,
      value: row.assignee,
      label: row.assignee,
    });
    return normalized ? [normalized] : [];
  }
  return [];
}

function StopPropagation({ children }) {
  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

function formatDateCell(value) {
  return value || 'DD/MM/YY';
}

function VendorRowStatus({ value, options, meta, onChange }) {
  return (
    <ProjectStatusDropdown
      value={value || 'Pending'}
      onValueChange={onChange}
      statusOptions={options}
      statusMetaMap={meta}
      size='xsmall'
    />
  );
}

function EditableDateCell({ value, onChange }) {
  return (
    <Datepicker
      value={parseToDate(value) ?? undefined}
      onChange={(next) => onChange?.(next ? format(next, 'yyyy-MM-dd') : '')}
      size='xsmall'
      variant='borderless'
      placeholder='DD/MM/YY'
      className='h-8 min-w-[120px]'
    />
  );
}

function EditableTextCell({ value, onChange, placeholder = 'Enter value' }) {
  return (
    <Input.Root size='xsmall' variant='borderless'>
      <Input.Wrapper>
        <Input.Input
          value={value ?? ''}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
        />
      </Input.Wrapper>
    </Input.Root>
  );
}

function PriorityCell({ value, onChange, editable = false }) {
  if (editable) {
    return (
      <Select.Root
        value={value || undefined}
        onValueChange={(next) => onChange?.(next)}
        size='xsmall'
        variant='borderless'
      >
        <Select.Trigger className='h-8 min-w-[90px]'>
          {value && value !== 'select' ? (
            <Badge.Root size='small' variant='light' color={colorForLayoutPriority(value)}>
              {value.toUpperCase()}
            </Badge.Root>
          ) : (
            <Select.Value placeholder='Select' />
          )}
        </Select.Trigger>
        <Select.Content className='min-w-[148px]'>
          {PROJECT_DETAIL_SELECTION_PRIORITY_OPTIONS.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              <ProjectBadgeLabel
                value={option.value}
                colorFn={colorForLayoutPriority}
                label={option.label}
              />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    );
  }

  if (!value || value === 'select') {
    return (
      <button
        type='button'
        onClick={() => onChange?.('low')}
        className='inline-flex items-center gap-1 text-paragraph-sm text-text-sub-500 hover:text-text-main-900'
      >
        Select
        <RiArrowDownSLine className='size-4' />
      </button>
    );
  }

  return (
    <button type='button' onClick={() => onChange?.('select')}>
      <Badge.Root size='small' variant='light' color={colorForLayoutPriority(value)}>
        {value.toUpperCase()}
      </Badge.Root>
    </button>
  );
}

function SortableColumnHeader({ label }) {
  return (
    <div className='flex items-center gap-0.5 whitespace-nowrap'>
      <span className='label-small font-medium text-text-soft-400'>{label}</span>
      <RiExpandUpDownFill className='size-5 shrink-0 text-text-sub-600' aria-hidden />
    </div>
  );
}

function ProjectDetailColumnHeader({ label }) {
  return <SortableColumnHeader label={label} />;
}

/** Item Group doc-name key on each option's `row` for a given selectedLevel (0..3). */
const CATEGORY_LEVEL_ID_KEYS = [
  'categoryGroupId',
  'parentCategoryId',
  'categoryId',
  'productGroupId',
];

function resolveProductCategoryIdFromOption(option) {
  if (!option || typeof option !== 'object') return '';
  const row = option.row || {};
  const level = Number.isInteger(option.selectedLevel)
    ? option.selectedLevel
    : CATEGORY_LEVEL_ID_KEYS.length - 1;
  const idKey =
    CATEGORY_LEVEL_ID_KEYS[Math.max(0, Math.min(level, CATEGORY_LEVEL_ID_KEYS.length - 1))];
  return String(row[idKey] || row.leafId || option.value || '').trim();
}

function ProductCategoryHierarchicalCell({
  value,
  onChange,
  disabled = false,
  displayLabelFallback = '',
  placeholder = 'Select',
  minWidthClass = 'min-w-[140px]',
}) {
  const displayText = String(value ?? displayLabelFallback ?? '').trim();

  // Stop pointer/mouse events from bubbling to the parent row's click handler
  // (which opens the vendor drawer) so the popover opens on the very first click.
  const stopBubbling = (event) => event.stopPropagation();

  return (
    <div
      className='w-full'
      onClick={stopBubbling}
      onMouseDown={stopBubbling}
      onPointerDown={stopBubbling}
    >
      <ProductFormSearchableSelect
        field={PRODUCT_FORM_FIELDS.CATEGORY}
        value={value || ''}
        onValueChange={(_optionValue, option) => {
          const nextId = resolveProductCategoryIdFromOption(option);
          if (nextId) onChange(nextId);
        }}
        disabled={disabled}
        placeholder={placeholder}
        searchPlaceholder='Search category...'
        emptyMessage='Start typing to browse categories'
        size='xsmall'
        variant='borderless'
        allowCreate={false}
        triggerClassName={cn('h-8 w-full', minWidthClass)}
        renderTriggerValue={({ selectedOption }) => (
          <span className='block min-w-0 max-w-full truncate text-paragraph-sm text-text-strong-950'>
            {selectedOption?.label || displayText || placeholder}
          </span>
        )}
        renderOptionLabel={(opt) => (
          <span className='flex min-w-0 w-full flex-col gap-0.5'>
            <span className='truncate text-paragraph-sm font-medium text-text-main-900'>
              {opt.title || opt.label || opt.value}
            </span>
            {opt.breadcrumb ? (
              <span className='truncate text-paragraph-xs text-text-sub-500'>{opt.breadcrumb}</span>
            ) : null}
          </span>
        )}
      />
    </div>
  );
}

export default function ProjectDetailSelectionTable({
  group,
  projectId,
  columnConfig,
  expandedRows,
  onToggleExpand,
  onUpdateRow,
  onOpenVendor,
  onOpenItem,
  onUpdateItem,
  onSubmitNewCategory,
  onSaveCategoryDetail,
  onAddColumn,
  onRemoveColumn,
  onItemSelect,
  onItemRemove,
  loadItemOptions,
  allowAddCategory = true,
}) {
  const dispatch = useDispatch();
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(null);
  const [itemOptionsMap, setItemOptionsMap] = useState({});
  const [showDraftRow, setShowDraftRow] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftProductCategory, setDraftProductCategory] = useState('');
  const [draftAssignees, setDraftAssignees] = useState([]);
  const [productOptions, setProductOptions] = useState([]);

  useEffect(() => {
    dispatch(fetchProductCategoryOptions({}))
      .unwrap()
      .then((data) => setProductOptions(data?.results ?? []))
      .catch(() => setProductOptions([]));
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      const entries = await Promise.all(
        (group.rows ?? [])
          .filter((row) => expandedRows.has(row.id))
          .map(async (row) => {
            const options = await loadItemOptions?.(row.id, row.product_category);
            return [row.id, options ?? []];
          }),
      );
      if (cancelled) return;
      setItemOptionsMap((prev) => ({
        ...prev,
        ...Object.fromEntries(entries),
      }));
    };
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [expandedRows, group.rows, loadItemOptions]);

  const searchItemOptions = useCallback(
    async (rowId, keyword) => {
      const row = (group.rows ?? []).find((entry) => entry.id === rowId);
      const productCategory = row?.product_category ?? '';
      const options = await loadItemOptions?.(rowId, productCategory, keyword);
      setItemOptionsMap((prev) => ({
        ...prev,
        [rowId]: options ?? [],
      }));
    },
    [group.rows, loadItemOptions],
  );

  const resetDraftRow = useCallback(() => {
    setDraftName('');
    setDraftProductCategory('');
    setDraftAssignees([]);
  }, []);

  const openDraftRow = useCallback(() => {
    if (showDraftRow) return;
    resetDraftRow();
    setShowDraftRow(true);
  }, [resetDraftRow, showDraftRow]);

  const cancelDraftRow = useCallback(() => {
    setShowDraftRow(false);
    resetDraftRow();
  }, [resetDraftRow]);

  const submitNew = useCallback(
    async (overrides = {}) => {
      const name = String(overrides.name ?? draftName).trim();
      const productCategory = String(
        overrides.product_category ?? draftProductCategory ?? '',
      ).trim();
      // Wait for both name and product category — name blur alone must not create the row.
      if (!name || !productCategory || isCreating) return;

      setIsCreating(true);
      try {
        await onSubmitNewCategory?.(group.id, {
          name,
          product_category: productCategory,
          order_category: group.id !== 'ungrouped' ? group.id : '',
          assignees: overrides.assignees ?? draftAssignees,
        });
        setShowDraftRow(false);
        resetDraftRow();
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      } finally {
        setIsCreating(false);
      }
    },
    [
      draftAssignees,
      draftName,
      draftProductCategory,
      group.id,
      isCreating,
      onSubmitNewCategory,
      resetDraftRow,
    ],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const updateWidth = () => setContainerWidth(element.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const allColumnDefs = useMemo(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: () => <ProjectDetailColumnHeader label='Title' />,
        cell: ({ row: tableRow }) => {
          const row = tableRow.original;
          const expanded = expandedRows.has(row.id);
          const isEditableRow = Boolean(row.isNew);
          return (
            <div className='flex min-w-0 w-full max-w-[280px] items-center gap-1'>
              {isEditableRow ? (
                <StopPropagation>
                  <EditableTextCell
                    value={row.title}
                    onChange={(value) => onUpdateRow(group.id, row.id, { title: value })}
                    placeholder='Enter title'
                  />
                </StopPropagation>
              ) : (
                <button
                  type='button'
                  className='min-w-0 flex-1 overflow-hidden text-left hover:underline'
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenVendor(group.id, row.id);
                  }}
                >
                  <ProjectTaskTitleCell title={row.title} />
                </button>
              )}
              <button
                type='button'
                className='inline-flex size-5 shrink-0 items-center justify-center rounded text-text-soft-400 hover:bg-bg-weak-100'
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleExpand(group.id, row.id);
                }}
                aria-label={expanded ? 'Collapse category items' : 'Expand category items'}
              >
                {expanded ? (
                  <RiArrowDownSLine className='size-4 text-text-soft-400' />
                ) : (
                  <RiArrowRightSLine className='size-4 text-text-soft-400' />
                )}
              </button>
            </div>
          );
        },
        meta: { headClassName: 'w-[280px] min-w-[280px] max-w-[280px] whitespace-nowrap' },
      },
      {
        id: 'product_category',
        accessorKey: 'product_category',
        header: () => <ProjectDetailColumnHeader label='Product Category' />,
        cell: ({ row: tableRow }) => {
          const row = tableRow.original;
          const fallbackLabel =
            productOptions.find((opt) => opt.value === row.product_category)?.label ?? '';
          return (
            <StopPropagation>
              <ProductCategoryHierarchicalCell
                value={row.product_category || ''}
                displayLabelFallback={fallbackLabel}
                onChange={(nextValue) =>
                  onUpdateRow(group.id, row.id, { product_category: nextValue })
                }
              />
            </StopPropagation>
          );
        },
        meta: { headClassName: 'w-[170px] whitespace-nowrap' },
      },
      {
        id: 'assignee',
        accessorKey: 'assignees',
        header: () => <ProjectDetailColumnHeader label='Assignee' />,
        cell: ({ row: tableRow }) => {
          const row = tableRow.original;
          return (
            <StopPropagation>
              <AssigneeMultiSelect
                value={getRowAssigneeValue(row)}
                onBlur={(nextValue) =>
                  onUpdateRow(group.id, row.id, {
                    assignees: Array.isArray(nextValue) ? nextValue : [],
                  })
                }
                placeholder='Select'
                maxVisibleAvatars={2}
                variant='borderless'
                projectId={projectId}
                size='xsmall'
              />
            </StopPropagation>
          );
        },
        meta: { headClassName: 'w-[120px] whitespace-nowrap' },
      },
      {
        id: 'exp_selection_date',
        accessorKey: 'exp_selection_date',
        header: () => <ProjectDetailColumnHeader label='Exp. Selection Date' />,
        cell: ({ row: tableRow }) => {
          const row = tableRow.original;
          return (
            <StopPropagation>
              <EditableDateCell
                value={row.exp_selection_date}
                onChange={(value) => onUpdateRow(group.id, row.id, { exp_selection_date: value })}
              />
            </StopPropagation>
          );
        },
        meta: { headClassName: 'w-[180px] whitespace-nowrap' },
      },
      {
        id: 'selection_status',
        accessorKey: 'selection_status',
        header: () => <ProjectDetailColumnHeader label='Selection status' />,
        cell: ({ row: tableRow }) => {
          const row = tableRow.original;
          return (
            <StopPropagation>
              <VendorRowStatus
                value={row.selection_status}
                options={PROJECT_DETAIL_SELECTION_STATUS_OPTIONS}
                meta={PROJECT_SELECTION_STATUS_META}
                onChange={(value) => onUpdateRow(group.id, row.id, { selection_status: value })}
              />
            </StopPropagation>
          );
        },
        meta: { headClassName: 'w-[184px] whitespace-nowrap' },
      },
      {
        id: 'exp_po_date',
        accessorKey: 'exp_po_date',
        header: () => <ProjectDetailColumnHeader label='Exp. PO Date' />,
        cell: ({ row: tableRow }) => {
          const row = tableRow.original;
          return (
            <StopPropagation>
              <EditableDateCell
                value={row.exp_po_date}
                onChange={(value) => onUpdateRow(group.id, row.id, { exp_po_date: value })}
              />
            </StopPropagation>
          );
        },
        meta: { headClassName: 'w-[129px] whitespace-nowrap' },
      },
      {
        id: 'po_status',
        accessorKey: 'po_status',
        header: () => <ProjectDetailColumnHeader label='PO Status' />,
        cell: ({ row: tableRow }) => {
          const row = tableRow.original;
          return (
            <StopPropagation>
              <VendorRowStatus
                value={row.po_status}
                options={PROJECT_DETAIL_PO_STATUS_OPTIONS}
                meta={PROJECT_PO_STATUS_META}
                onChange={(value) => onUpdateRow(group.id, row.id, { po_status: value })}
              />
            </StopPropagation>
          );
        },
        meta: { headClassName: 'w-[120px] whitespace-nowrap' },
      },
      {
        id: 'exp_delivery_date',
        accessorKey: 'exp_delivery_date',
        header: () => <ProjectDetailColumnHeader label='Exp. Delivery Date' />,
        cell: ({ row: tableRow }) => {
          const row = tableRow.original;
          return (
            <StopPropagation>
              <EditableDateCell
                value={row.exp_delivery_date}
                onChange={(value) => onUpdateRow(group.id, row.id, { exp_delivery_date: value })}
              />
            </StopPropagation>
          );
        },
        meta: { headClassName: 'w-[170px] whitespace-nowrap' },
      },
      {
        id: 'delivery_status',
        accessorKey: 'delivery_status',
        header: () => <ProjectDetailColumnHeader label='Delivery Status' />,
        cell: ({ row: tableRow }) => {
          const row = tableRow.original;
          return (
            <StopPropagation>
              <VendorRowStatus
                value={row.delivery_status}
                options={PROJECT_DETAIL_DELIVERY_STATUS_OPTIONS}
                meta={PROJECT_DELIVERY_STATUS_META}
                onChange={(value) => onUpdateRow(group.id, row.id, { delivery_status: value })}
              />
            </StopPropagation>
          );
        },
        meta: { headClassName: 'w-[186px] whitespace-nowrap' },
      },
      {
        id: 'delivery_photo',
        accessorKey: 'delivery_photo',
        header: () => <ProjectDetailColumnHeader label='Delivery Photo' />,
        cell: ({ row: tableRow }) => {
          const row = tableRow.original;
          return (
            <StopPropagation>
              <DeliveryPhotoCell
                photoUrl={row.delivery_photo_url || row.delivery_photo || ''}
                onChange={(value) => onUpdateRow(group.id, row.id, { delivery_photo: value })}
              />
            </StopPropagation>
          );
        },
        meta: { headClassName: 'w-[122px] whitespace-nowrap' },
      },
      {
        id: 'delivery_challan',
        accessorKey: 'delivery_challan',
        header: () => <ProjectDetailColumnHeader label='Delivery Challan' />,
        cell: ({ row: tableRow }) => {
          const row = tableRow.original;
          return (
            <StopPropagation>
              <DeliveryChallanCell
                challan={row.delivery_challan}
                onChange={(value) => onUpdateRow(group.id, row.id, { delivery_challan: value })}
              />
            </StopPropagation>
          );
        },
        meta: { headClassName: 'w-[271px] whitespace-nowrap' },
      },
      {
        id: 'priority',
        accessorKey: 'priority',
        header: () => <ProjectDetailColumnHeader label='Priority' />,
        cell: ({ row: tableRow }) => {
          const row = tableRow.original;
          const isEditableRow = Boolean(row.isNew);
          return (
            <StopPropagation>
              <PriorityCell
                value={row.priority}
                editable
                onChange={(value) => onUpdateRow(group.id, row.id, { priority: value })}
              />
            </StopPropagation>
          );
        },
        meta: { headClassName: 'w-[114px] whitespace-nowrap' },
      },
    ],
    [expandedRows, group.id, onOpenVendor, onToggleExpand, onUpdateRow, productOptions],
  );

  const columns = useMemo(
    () => applyColumnConfig(allColumnDefs, columnConfig),
    [allColumnDefs, columnConfig],
  );

  const table = useReactTable({
    data: group.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div
      ref={containerRef}
      className='flex max-h-[min(70vh,800px)] w-full min-w-0 flex-col overflow-hidden rounded-xl bg-bg-white-0'
    >
      <div className='min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-x-contain'>
        <Table.Root
          variant='compact'
          className='!overflow-x-visible min-w-0'
          style={{ minWidth: PROJECT_SELECTION_PARENT_TABLE_MIN_WIDTH, width: 'max-content' }}
        >
          <Table.Header>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row
                key={headerGroup.id}
                className='border-0 bg-bg-weak-50 hover:bg-bg-weak-50'
              >
                {headerGroup.headers.map((header) => (
                  <Table.Head
                    key={header.id}
                    className={cn(
                      'h-9 border-0 !rounded-none px-3 py-2',
                      header.column.columnDef.meta?.headClassName,
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Head>
                ))}
              </Table.Row>
            ))}
          </Table.Header>
          <Table.Body spacing={0}>
            {table.getRowModel().rows.map((row, rowIndex) => {
              const rowData = row.original;
              const expanded = expandedRows.has(rowData.id);
              return (
                <React.Fragment key={row.id}>
                  <Table.Row
                    className={cn(
                      'group/parent-row h-10 cursor-pointer border-0 transition-colors hover:bg-bg-weak-50',
                      expanded && 'bg-bg-weak-50',
                    )}
                    onClick={() => onOpenVendor(group.id, rowData.id)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell
                        key={cell.id}
                        className={cn(
                          'h-10 min-w-0 border-0 bg-bg-white-0 !rounded-none !p-0 group-hover/parent-row:bg-bg-weak-50',
                          expanded && 'bg-bg-weak-50',
                        )}
                      >
                        <div className='flex h-10 min-w-0 items-center px-3'>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  {expanded ? (
                    <tr className='border-0'>
                      <td
                        colSpan={columns.length}
                        className='!p-0 align-top border-t border-stroke-soft-200 bg-bg-weak-100'
                      >
                        <div
                          className='sticky left-0 z-10 min-w-0 max-w-full overflow-hidden'
                          style={containerWidth ? { width: containerWidth } : undefined}
                        >
                          <ExpandedItemsSection
                            categoryDetail={rowToSelectionCategoryDetail(rowData)}
                            itemOptions={itemOptionsMap[rowData.id] ?? []}
                            onSave={onSaveCategoryDetail}
                            onAddColumn={(payload) => onAddColumn?.(rowData.id, payload)}
                            onRemoveColumn={(columnLabel) =>
                              onRemoveColumn?.(rowData.id, columnLabel)
                            }
                            onOpenItem={(item) => onOpenItem?.(group.id, rowData.id, item.name)}
                            onItemFieldChange={(item, field, value) =>
                              onUpdateItem?.(group.id, rowData.id, item.name, { [field]: value })
                            }
                            onItemSelect={(itemIndex, itemCode, selected) =>
                              onItemSelect?.(group.id, rowData.id, itemIndex, itemCode, selected)
                            }
                            onItemRemove={(item) => onItemRemove?.(group.id, rowData.id, item.name)}
                            onSearchItems={(keyword) => {
                              void searchItemOptions(rowData.id, keyword);
                            }}
                            showProjectItemFields
                            itemStatusOptions={PROJECT_DETAIL_SELECTION_STATUS_OPTIONS}
                            itemStatusMetaMap={PROJECT_SELECTION_STATUS_META}
                            onUploadCustomImage={(item, columnLabel, file) =>
                              onUpdateItem?.(group.id, rowData.id, item.name, {
                                custom_image: { column_label: columnLabel, file },
                              })
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  {rowIndex < table.getRowModel().rows.length - 1 || showDraftRow ? (
                    <Table.RowDivider />
                  ) : null}
                </React.Fragment>
              );
            })}

            {showDraftRow ? (
              <Table.Row
                className='h-10 border-0 hover:bg-transparent'
                onClick={(event) => event.stopPropagation()}
              >
                {columns.map((column, index) => {
                  const columnId = column.id || column.accessorKey;
                  const isLast = index === columns.length - 1;

                  if (isLast) {
                    return (
                      <Table.Cell
                        key={columnId}
                        className='h-10 border-0 bg-bg-white-0 !rounded-none p-0'
                      >
                        <div className='flex h-10 items-center justify-center'>
                          <ProjectMasterTableDeleteButton
                            ariaLabel='Cancel new selection category'
                            onClick={cancelDraftRow}
                          />
                        </div>
                      </Table.Cell>
                    );
                  }

                  if (columnId === 'title') {
                    return (
                      <Table.Cell
                        key={columnId}
                        className='h-10 min-w-0 border-0 bg-bg-white-0 !rounded-none !p-0'
                      >
                        <div className='flex h-10 min-w-0 items-center px-3'>
                          <Input.Root variant='borderless' size='xsmall' className='w-full'>
                            <Input.Wrapper>
                              <Input.Input
                                autoFocus
                                value={draftName}
                                placeholder='Enter selection category name'
                                className='label-small font-medium text-text-strong-950 placeholder:font-normal'
                                onChange={(event) => setDraftName(event.target.value)}
                                onBlur={() => {
                                  if (draftName.trim() && draftProductCategory.trim()) {
                                    void submitNew();
                                  }
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    if (draftName.trim() && draftProductCategory.trim()) {
                                      void submitNew();
                                    }
                                  }
                                  if (event.key === 'Escape') {
                                    event.preventDefault();
                                    cancelDraftRow();
                                  }
                                }}
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        </div>
                      </Table.Cell>
                    );
                  }

                  if (columnId === 'product_category') {
                    return (
                      <Table.Cell
                        key={columnId}
                        className='h-10 min-w-0 border-0 bg-bg-white-0 !rounded-none !p-0'
                      >
                        <div className='flex h-10 min-w-0 items-center px-3'>
                          <ProductCategoryHierarchicalCell
                            value={draftProductCategory}
                            disabled={isCreating}
                            minWidthClass='w-full'
                            onChange={(value) => {
                              setDraftProductCategory(value);
                              if (draftName.trim()) {
                                void submitNew({ product_category: value });
                              }
                            }}
                          />
                        </div>
                      </Table.Cell>
                    );
                  }

                  if (columnId === 'assignee') {
                    return (
                      <Table.Cell
                        key={columnId}
                        className='h-10 min-w-0 border-0 bg-bg-white-0 !rounded-none !p-0'
                      >
                        <div className='flex h-10 min-w-0 items-center px-3'>
                          <AssigneeMultiSelect
                            value={draftAssignees}
                            onBlur={(nextValue) => {
                              const next = Array.isArray(nextValue) ? nextValue : [];
                              setDraftAssignees(next);
                              if (draftName.trim() && draftProductCategory.trim()) {
                                void submitNew({ assignees: next });
                              }
                            }}
                            placeholder='Select'
                            maxVisibleAvatars={2}
                            variant='borderless'
                            projectId={projectId}
                            size='xsmall'
                            disabled={isCreating}
                          />
                        </div>
                      </Table.Cell>
                    );
                  }

                  return (
                    <Table.Cell
                      key={columnId}
                      className='h-10 border-0 bg-bg-white-0 !rounded-none !p-0'
                    />
                  );
                })}
              </Table.Row>
            ) : null}
          </Table.Body>
        </Table.Root>
      </div>

      {allowAddCategory ? (
        <SelectionCategoryAddFooter disabled={isCreating} onClick={openDraftRow} />
      ) : null}
    </div>
  );
}
