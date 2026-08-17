import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { LuExpand } from 'react-icons/lu';
import {
  RiArrowDownSFill,
  RiArrowUpSFill,
  RiExpandUpDownFill,
  RiExpandUpDownLine,
  RiFileTextFill,
} from 'react-icons/ri';

import { PROJECT_PROCUREMENT_VENDOR_COMPARISON_COLUMN_CONFIG } from '@/components/procurements/constants';
import { formatProcurementAmount } from '@/components/procurements/project-procurements-utils';
import BoqListEmptyState from '@/components/boq/shared/boq-list-empty-state';
import ProjectProcurementVendorComparisonVendorActionsMenu from '@/components/procurements/project-procurement-vendor-comparison-vendor-actions-menu';
import VendorComparisonQuoteStatusBadge from '@/components/procurements/project-procurement-vendor-comparison-quote-status-badge';
import {
  VENDOR_COMPARISON_QUOTE_STATUSES,
  withVendorComparisonQuoteStatuses,
} from '@/components/procurements/project-procurement-vendor-comparison-quote-status';
import { getVendorComparisonSelectableItemIds } from '@/components/procurements/project-procurement-vendor-comparison-selection-utils';
import * as Checkbox from '@/components/ui/checkbox';
import * as CompactButton from '@/components/ui/compact-button';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { prepareColumnsForConfig } from '@/lib/column-utils';

const LEAF_COLUMN_WIDTHS = {
  item: 275,
  uom: 72,
  qty: 96,
  internalRate: 100,
  internalValue: 134,
  vendorRate: 100,
  vendorValue: 134,
  description: 249,
  remarks: 180,
  lastUpdated: 140,
};

const CONFIGURABLE_COLUMN_META = {
  item: { width: LEAF_COLUMN_WIDTHS.item, group: 'category' },
  uom: { width: LEAF_COLUMN_WIDTHS.uom, group: 'category' },
  qty: { width: LEAF_COLUMN_WIDTHS.qty, group: 'category' },
  internalRate: { width: LEAF_COLUMN_WIDTHS.internalRate, group: 'internal' },
  internalValue: { width: LEAF_COLUMN_WIDTHS.internalValue, group: 'internal' },
  description: { width: LEAF_COLUMN_WIDTHS.description, group: 'description' },
  remarks: { width: LEAF_COLUMN_WIDTHS.remarks, group: 'remarks' },
  lastUpdated: { width: LEAF_COLUMN_WIDTHS.lastUpdated, group: 'lastUpdated' },
};

const TAIL_COLUMN_GROUPS = new Set(['description', 'remarks', 'lastUpdated']);

const FROZEN_EDGE_SHADOW = 'shadow-[inset_-2px_0_2px_-2px_rgba(0,0,0,0.25)]';

const headerCellClass =
  'border-b border-r border-stroke-soft-200 bg-bg-weak-100 px-3 py-2 text-left align-middle';
const bodyCellClass =
  'border-b border-r border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-paragraph-sm text-text-sub-500 align-middle';

function formatComparisonQty(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '-';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(numeric);
}

function formatComparisonRate(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '-';
  if (numeric >= 1_00_000) return formatProcurementAmount(numeric);
  return `₹${Math.round(numeric).toLocaleString('en-IN')}`;
}

function formatComparisonValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '-';
  if (numeric >= 1_00_00_000) {
    return `₹ ${Math.round(numeric).toLocaleString('en-IN')}`;
  }
  return formatProcurementAmount(numeric);
}

function buildLeafColumns(configuredColumns, vendors) {
  const columns = [];
  const sortedColumns = [...configuredColumns].sort((left, right) => {
    if (left.id === 'item') return -1;
    if (right.id === 'item') return 1;
    return (left.order ?? 0) - (right.order ?? 0);
  });

  sortedColumns.forEach((configColumn) => {
    if (configColumn.visible === false) return;

    const meta = CONFIGURABLE_COLUMN_META[configColumn.id];
    if (!meta) return;

    columns.push({
      id: configColumn.id,
      width: meta.width,
      group: meta.group,
      label: configColumn.label,
    });
  });

  vendors.forEach((vendor) => {
    columns.push({
      id: `${vendor.id}-rate`,
      width: LEAF_COLUMN_WIDTHS.vendorRate,
      group: `vendor-${vendor.id}`,
      vendorId: vendor.id,
    });
    columns.push({
      id: `${vendor.id}-value`,
      width: LEAF_COLUMN_WIDTHS.vendorValue,
      group: `vendor-${vendor.id}`,
      vendorId: vendor.id,
    });
  });

  return columns;
}

function getTailColumns(leafColumns) {
  return leafColumns.filter((column) => TAIL_COLUMN_GROUPS.has(column.group));
}

function sumColumnWidths(columns) {
  return columns.reduce((total, column) => total + column.width, 0);
}

function getGroupColSpan(leafColumns, groupKey) {
  return leafColumns.filter((column) => column.group === groupKey).length;
}

function getVendorGroupColSpan(leafColumns, vendorId) {
  return leafColumns.filter((column) => column.group === `vendor-${vendorId}`).length;
}

function isFrozenColumn(column) {
  return column.group === 'category' || column.group === 'internal';
}

function getFrozenGroupWidth(leafColumns, groupKey) {
  return leafColumns
    .filter((column) => column.group === groupKey)
    .reduce((total, column) => total + column.width, 0);
}

function getFrozenLeftOffset(leafColumns, columnId) {
  let offset = 0;

  for (const column of leafColumns) {
    if (column.id === columnId) return offset;
    if (isFrozenColumn(column)) offset += column.width;
  }

  return offset;
}

function getLastFrozenColumnId(leafColumns) {
  const frozenColumns = leafColumns.filter(isFrozenColumn);
  return frozenColumns[frozenColumns.length - 1]?.id;
}

function getFrozenColumnIndex(leafColumns, columnId) {
  let index = 0;

  for (const column of leafColumns) {
    if (!isFrozenColumn(column)) continue;
    if (column.id === columnId) return index;
    index += 1;
  }

  return 0;
}

function getFrozenGroupIndex(groupKey) {
  return groupKey === 'category' ? 0 : 1;
}

function getFrozenStickyProps(
  leafColumns,
  columnId,
  { isHeader = false, highlight = false, inStickyHeader = false } = {},
) {
  const lastFrozenColumnId = getLastFrozenColumnId(leafColumns);
  const isLastFrozen = columnId === lastFrozenColumnId;
  const frozenIndex = getFrozenColumnIndex(leafColumns, columnId);
  const baseZIndex = inStickyHeader ? 41 : isHeader ? 26 : 16;
  const column = leafColumns.find((entry) => entry.id === columnId);

  return {
    className: cn(
      'sticky',
      highlight ? '!bg-primary-lighter' : isHeader ? '!bg-bg-weak-100' : '!bg-bg-white-0',
      isLastFrozen && FROZEN_EDGE_SHADOW,
    ),
    style: {
      left: getFrozenLeftOffset(leafColumns, columnId),
      minWidth: column?.width,
      zIndex: baseZIndex + frozenIndex,
    },
  };
}

function getFrozenGroupStickyProps(
  leafColumns,
  groupKey,
  { isHeader = false, inStickyHeader = false } = {},
) {
  const left = groupKey === 'category' ? 0 : getFrozenGroupWidth(leafColumns, 'category');
  const width = getFrozenGroupWidth(leafColumns, groupKey);
  const isLastFrozen =
    getGroupColSpan(leafColumns, 'internal') > 0
      ? groupKey === 'internal'
      : groupKey === 'category';
  const frozenIndex = getFrozenGroupIndex(groupKey);
  const baseZIndex = inStickyHeader ? 41 : isHeader ? 26 : 16;

  return {
    className: cn(
      'sticky',
      isHeader ? '!bg-bg-weak-100' : '!bg-bg-white-0',
      isLastFrozen && FROZEN_EDGE_SHADOW,
    ),
    style: {
      left,
      minWidth: width,
      zIndex: baseZIndex + frozenIndex,
    },
  };
}

const SortableHeader = memo(({ label, className, semibold = false, bold = false }) => (
  <div className={cn('inline-flex items-center gap-0.5', className)}>
    <span
      className={cn(
        'text-paragraph-sm leading-5 text-text-soft-400',
        bold ? 'font-bold' : semibold ? 'font-semibold' : 'font-medium',
      )}
    >
      {label}
    </span>
    <RiExpandUpDownFill className='size-5 shrink-0 text-text-soft-400' aria-hidden />
  </div>
));

SortableHeader.displayName = 'SortableHeader';

const ComparisonColGroup = memo(({ columns }) => (
  <colgroup>
    {columns.map((column) => (
      <col key={column.id} style={{ width: column.width, minWidth: column.width }} />
    ))}
  </colgroup>
));

ComparisonColGroup.displayName = 'ComparisonColGroup';

const SummaryHeaderRow = memo(
  ({
    vendors,
    leafColumns,
    isAllCategoriesCollapsed,
    onToggleAllCategories,
    vendorActionsById,
    onVendorActionSelect,
    hideRaisePo = false,
    hideReject = false,
    hideResubmission = false,
  }) => {
    const categorySpan = getGroupColSpan(leafColumns, 'category');
    const internalSpan = getGroupColSpan(leafColumns, 'internal');
    const tailColumns = getTailColumns(leafColumns);

    return (
      <tr>
        {categorySpan > 0 ? (
          <th
            colSpan={categorySpan}
            className={cn(
              headerCellClass,
              'h-16',
              getFrozenGroupStickyProps(leafColumns, 'category', {
                isHeader: true,
                inStickyHeader: true,
              }).className,
            )}
            style={
              getFrozenGroupStickyProps(leafColumns, 'category', {
                isHeader: true,
                inStickyHeader: true,
              }).style
            }
          >
            <div className='flex w-full items-center gap-2.5'>
              <span className='text-paragraph-sm font-semibold text-text-soft-400'>Category</span>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <CompactButton.Root
                    variant='stroke'
                    size='medium'
                    type='button'
                    className='ml-auto size-6 shrink-0 rounded-md p-0.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
                    aria-label={
                      isAllCategoriesCollapsed ? 'Expand all categories' : 'Collapse all categories'
                    }
                    aria-pressed={!isAllCategoriesCollapsed}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleAllCategories?.();
                    }}
                  >
                    <CompactButton.Icon
                      as={isAllCategoriesCollapsed ? LuExpand : RiExpandUpDownLine}
                      className='size-5'
                    />
                  </CompactButton.Root>
                </Tooltip.Trigger>
                <Tooltip.Content size='xsmall' variant='dark' side='top' className='z-[80]'>
                  {isAllCategoriesCollapsed ? 'Expand' : 'Collapse'}
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
          </th>
        ) : null}
        {internalSpan > 0 ? (
          <th
            colSpan={internalSpan}
            className={cn(
              headerCellClass,
              'h-16',
              getFrozenGroupStickyProps(leafColumns, 'internal', {
                isHeader: true,
                inStickyHeader: true,
              }).className,
            )}
            style={
              getFrozenGroupStickyProps(leafColumns, 'internal', {
                isHeader: true,
                inStickyHeader: true,
              }).style
            }
          >
            <SortableHeader label='Int. Value' bold />
          </th>
        ) : null}
        {vendors.map((vendor) => {
          const vendorSpan = getVendorGroupColSpan(leafColumns, vendor.id);
          if (vendorSpan === 0) return null;

          return (
            <th key={vendor.id} colSpan={vendorSpan} className={cn(headerCellClass, 'h-16')}>
              <div className='flex flex-col items-start gap-1.5'>
                <div className='flex w-full min-w-0 items-center justify-between gap-2'>
                  <SortableHeader label={vendor.name} semibold />
                  <ProjectProcurementVendorComparisonVendorActionsMenu
                    vendor={vendor}
                    selectedAction={vendorActionsById?.[vendor.id]}
                    onActionSelect={onVendorActionSelect}
                    hideRaisePo={
                      hideRaisePo ||
                      vendor.quoteStatus === VENDOR_COMPARISON_QUOTE_STATUSES.QUOTE_REJECTED ||
                      vendor.quoteStatus === VENDOR_COMPARISON_QUOTE_STATUSES.RESUBMISSION
                    }
                    hideReject={
                      hideReject ||
                      vendor.quoteStatus === VENDOR_COMPARISON_QUOTE_STATUSES.QUOTE_REJECTED ||
                      vendor.quoteStatus === VENDOR_COMPARISON_QUOTE_STATUSES.QUOTE_PENDING
                    }
                    hideResubmission={hideResubmission}
                  />
                </div>
                <VendorComparisonQuoteStatusBadge quoteStatus={vendor.quoteStatus} />
              </div>
            </th>
          );
        })}
        {tailColumns.map((column, index) => (
          <th
            key={column.id}
            className={cn(
              headerCellClass,
              'h-16',
              index === tailColumns.length - 1 && 'border-r-0',
            )}
          />
        ))}
      </tr>
    );
  },
);

SummaryHeaderRow.displayName = 'SummaryHeaderRow';

const CategoryRow = memo(({ category, vendors, leafColumns, isExpanded, onToggle }) => {
  const categorySpan = getGroupColSpan(leafColumns, 'category');
  const internalSpan = getGroupColSpan(leafColumns, 'internal');
  const tailColumns = getTailColumns(leafColumns);

  return (
    <tr>
      {categorySpan > 0 ? (
        <td
          colSpan={categorySpan}
          className={cn(
            bodyCellClass,
            'h-10',
            getFrozenGroupStickyProps(leafColumns, 'category').className,
          )}
          style={getFrozenGroupStickyProps(leafColumns, 'category').style}
        >
          <button
            type='button'
            onClick={onToggle}
            className='flex w-full items-center gap-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-1'
            aria-expanded={isExpanded}
          >
            <span className='truncate text-paragraph-sm font-semibold text-text-sub-500'>
              {category.name}
            </span>
            {isExpanded ? (
              <RiArrowUpSFill className='size-5 shrink-0 text-text-sub-500' aria-hidden />
            ) : (
              <RiArrowDownSFill className='size-5 shrink-0 text-text-sub-500' aria-hidden />
            )}
          </button>
        </td>
      ) : null}
      {internalSpan > 0 ? (
        <td
          colSpan={internalSpan}
          className={cn(
            bodyCellClass,
            'h-10 font-bold',
            getFrozenGroupStickyProps(leafColumns, 'internal').className,
          )}
          style={getFrozenGroupStickyProps(leafColumns, 'internal').style}
        >
          {formatProcurementAmount(category.internalValue)}
        </td>
      ) : null}
      {vendors.map((vendor) => {
        const vendorSpan = getVendorGroupColSpan(leafColumns, vendor.id);
        if (vendorSpan === 0) return null;

        return (
          <td key={vendor.id} colSpan={vendorSpan} className={cn(bodyCellClass, 'h-10 font-bold')}>
            {formatProcurementAmount(category.vendorTotals?.[vendor.id])}
          </td>
        );
      })}
      {tailColumns.map((column, index) => (
        <td
          key={column.id}
          className={cn(bodyCellClass, 'h-10', index === tailColumns.length - 1 && 'border-r-0')}
        />
      ))}
    </tr>
  );
});

CategoryRow.displayName = 'CategoryRow';

function getProductHeaderLabel(column) {
  if (column.id === 'item') return column.label || 'Name';
  if (column.id === 'internalRate' || column.id.endsWith('-rate')) return 'Rate';
  if (column.id === 'internalValue' || column.id.endsWith('-value')) return 'Value';
  return column.label || column.id;
}

const ProductHeaderRow = memo(
  ({ leafColumns, category, selectedItemIds, onToggleCategorySelection }) => {
    const selectableItemIds = useMemo(
      () => getVendorComparisonSelectableItemIds(category),
      [category],
    );

    const selectedInCategoryCount = useMemo(
      () => selectableItemIds.filter((itemId) => selectedItemIds.has(itemId)).length,
      [selectableItemIds, selectedItemIds],
    );

    const headerCheckboxState = useMemo(() => {
      if (selectableItemIds.length === 0) return false;
      if (selectedInCategoryCount === selectableItemIds.length) return true;
      if (selectedInCategoryCount > 0) return 'indeterminate';
      return false;
    }, [selectableItemIds.length, selectedInCategoryCount]);

    return (
      <tr className='bg-bg-weak-100'>
        {leafColumns.map((column, index) => {
          const frozenSticky = isFrozenColumn(column)
            ? getFrozenStickyProps(leafColumns, column.id, { isHeader: true })
            : null;

          return (
            <th
              key={column.id}
              className={cn(
                headerCellClass,
                'h-9',
                frozenSticky?.className,
                index === leafColumns.length - 1 && 'border-r-0',
              )}
              style={frozenSticky?.style}
            >
              {column.id === 'item' ? (
                <div className='flex items-center gap-2.5'>
                  <Checkbox.Root
                    size='medium'
                    checked={headerCheckboxState}
                    disabled={selectableItemIds.length === 0}
                    onCheckedChange={(checked) =>
                      onToggleCategorySelection?.(category, checked === true)
                    }
                    aria-label={`Select all items in ${category.name}`}
                  />
                  <span className='text-paragraph-sm font-medium text-text-soft-400'>
                    {getProductHeaderLabel(column)}
                  </span>
                </div>
              ) : (
                <SortableHeader label={getProductHeaderLabel(column)} />
              )}
            </th>
          );
        })}
      </tr>
    );
  },
);

ProductHeaderRow.displayName = 'ProductHeaderRow';

const VendorComparisonPoRaisedIcon = memo(() => (
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      <span
        className={cn(
          'inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-light',
          'shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]',
        )}
        aria-label='PO Raised'
      >
        <RiFileTextFill className='size-3 text-primary-base' aria-hidden />
      </span>
    </Tooltip.Trigger>
    <Tooltip.Content size='xsmall' variant='dark' side='top' className='z-[80]'>
      PO Raised
    </Tooltip.Content>
  </Tooltip.Root>
));

VendorComparisonPoRaisedIcon.displayName = 'VendorComparisonPoRaisedIcon';

const ProductRow = memo(({ item, leafColumns, isSelected, onToggleSelect }) => {
  const isSelectable = !item.poRaised;

  return (
    <tr>
      {leafColumns.map((column, index) => {
        const vendorQuote = column.vendorId ? item.vendorQuotes?.[column.vendorId] : null;
        const highlightVendor = vendorQuote?.isLowest;
        const frozenSticky = isFrozenColumn(column)
          ? getFrozenStickyProps(leafColumns, column.id, { highlight: false })
          : null;

        let content = null;

        if (column.id === 'item') {
          content = (
            <div className='flex items-center gap-3'>
              <Checkbox.Root
                size='medium'
                checked={isSelected}
                disabled={!isSelectable}
                onCheckedChange={(checked) => onToggleSelect?.(item.id, checked === true)}
                aria-label={`Select ${item.name}`}
              />
              <div className='size-8 shrink-0 rounded bg-bg-weak-100' aria-hidden />
              <span className='min-w-0 flex-1 truncate'>{item.name}</span>
              {item.poRaised ? <VendorComparisonPoRaisedIcon /> : null}
            </div>
          );
        } else if (column.id === 'uom') {
          content = item.uom;
        } else if (column.id === 'qty') {
          content = formatComparisonQty(item.qty);
        } else if (column.id === 'internalRate') {
          content = formatComparisonRate(item.internalRate);
        } else if (column.id === 'internalValue') {
          content = formatComparisonValue(item.internalValue);
        } else if (column.id.endsWith('-rate')) {
          content = formatComparisonRate(vendorQuote?.rate);
        } else if (column.id.endsWith('-value')) {
          content = formatComparisonValue(vendorQuote?.value);
        } else if (column.id === 'description') {
          content = <span className='truncate'>{item.description}</span>;
        } else if (column.id === 'remarks') {
          content = <span className='truncate'>{item.remarks || '-'}</span>;
        } else if (column.id === 'lastUpdated') {
          content = item.lastUpdated || '-';
        }

        return (
          <td
            key={column.id}
            className={cn(
              bodyCellClass,
              'h-10',
              frozenSticky?.className,
              highlightVendor && column.vendorId && 'bg-primary-lighter',
              index === leafColumns.length - 1 && 'border-r-0',
            )}
            style={frozenSticky?.style}
          >
            {content}
          </td>
        );
      })}
    </tr>
  );
});

ProductRow.displayName = 'ProductRow';

const ProjectProcurementVendorComparisonTable = memo(
  ({
    searchQuery = '',
    columnConfig,
    vendors = [],
    categories = [],
    selectedItemIds,
    onSelectedItemIdsChange,
    hasSelectionBar = false,
    vendorActionsById: vendorActionsByIdProp,
    onVendorActionSelect: onVendorActionSelectProp,
    hideRaisePo = false,
    hideReject = false,
    hideResubmission = false,
  }) => {
    const [expandedCategoryIds, setExpandedCategoryIds] = useState(
      () => new Set([categories[0]?.id].filter(Boolean)),
    );
    const [localVendorActionsById, setLocalVendorActionsById] = useState({});
    const vendorActionsById = vendorActionsByIdProp ?? localVendorActionsById;

    const configuredColumns = useMemo(() => {
      const columns = columnConfig?.columns;
      if (Array.isArray(columns) && columns.length > 0) return columns;

      return prepareColumnsForConfig(PROJECT_PROCUREMENT_VENDOR_COMPARISON_COLUMN_CONFIG).map(
        (column, index) => ({
          ...column,
          order: index,
        }),
      );
    }, [columnConfig]);

    const leafColumns = useMemo(
      () => buildLeafColumns(configuredColumns, vendors),
      [configuredColumns, vendors],
    );

    const vendorsWithQuoteStatus = useMemo(
      () => withVendorComparisonQuoteStatuses(vendors, vendorActionsById),
      [vendors, vendorActionsById],
    );

    const tableWidth = useMemo(() => sumColumnWidths(leafColumns), [leafColumns]);

    const filteredCategories = useMemo(() => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return categories;

      return categories
        .map((category) => {
          const items = category.items.filter((item) => {
            const haystack = [item.name, item.description, item.uom]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();
            return haystack.includes(query);
          });
          if (items.length === 0) return null;
          return { ...category, items };
        })
        .filter(Boolean);
    }, [categories, searchQuery]);

    const visibleItemIds = useMemo(
      () =>
        new Set(filteredCategories.flatMap((category) => category.items.map((item) => item.id))),
      [filteredCategories],
    );

    useEffect(() => {
      if (!onSelectedItemIdsChange || !selectedItemIds) return;

      const next = new Set([...selectedItemIds].filter((itemId) => visibleItemIds.has(itemId)));
      if (next.size === selectedItemIds.size) return;

      onSelectedItemIdsChange(next);
    }, [onSelectedItemIdsChange, selectedItemIds, visibleItemIds]);

    const handleToggleItemSelect = useCallback(
      (itemId, checked) => {
        if (!onSelectedItemIdsChange) return;

        const next = new Set(selectedItemIds ?? []);
        if (checked) next.add(itemId);
        else next.delete(itemId);
        onSelectedItemIdsChange(next);
      },
      [onSelectedItemIdsChange, selectedItemIds],
    );

    const handleToggleCategorySelection = useCallback(
      (category, checked) => {
        if (!onSelectedItemIdsChange) return;

        const selectableIds = getVendorComparisonSelectableItemIds(category);
        const next = new Set(selectedItemIds ?? []);
        selectableIds.forEach((itemId) => {
          if (checked) next.add(itemId);
          else next.delete(itemId);
        });
        onSelectedItemIdsChange(next);
      },
      [onSelectedItemIdsChange, selectedItemIds],
    );

    const isAllCategoriesCollapsed = useMemo(() => {
      if (filteredCategories.length === 0) return true;
      return filteredCategories.every((category) => !expandedCategoryIds.has(category.id));
    }, [filteredCategories, expandedCategoryIds]);

    const handleVendorActionSelect = useCallback(
      (vendorId, actionId) => {
        if (onVendorActionSelectProp) {
          onVendorActionSelectProp(vendorId, actionId);
          return;
        }

        setLocalVendorActionsById((previous) => ({
          ...previous,
          [vendorId]: actionId,
        }));
      },
      [onVendorActionSelectProp],
    );

    const handleToggleAllCategories = useCallback(() => {
      if (isAllCategoriesCollapsed) {
        setExpandedCategoryIds(new Set(filteredCategories.map((category) => category.id)));
        return;
      }

      setExpandedCategoryIds(new Set());
    }, [filteredCategories, isAllCategoriesCollapsed]);

    const handleToggleCategory = useCallback((categoryId) => {
      setExpandedCategoryIds((previous) => {
        const next = new Set(previous);
        if (next.has(categoryId)) next.delete(categoryId);
        else next.add(categoryId);
        return next;
      });
    }, []);

    if (filteredCategories.length === 0) {
      return (
        <BoqListEmptyState
          embedded
          title='No products found'
          description='Try adjusting your search to find comparison line items.'
        />
      );
    }

    return (
      <div
        className={cn(
          'isolate h-full min-h-0 w-full min-w-0 overflow-x-auto overflow-y-auto overscroll-contain rounded-xl border border-stroke-soft-200 bg-bg-white-0',
          hasSelectionBar && 'pb-24',
        )}
      >
        <table
          className='table-fixed border-separate border-spacing-0'
          style={{ width: tableWidth, minWidth: '100%' }}
        >
          <ComparisonColGroup columns={leafColumns} />
          <Table.Header className='sticky top-0 z-40 bg-bg-weak-100'>
            <SummaryHeaderRow
              vendors={vendorsWithQuoteStatus}
              leafColumns={leafColumns}
              isAllCategoriesCollapsed={isAllCategoriesCollapsed}
              onToggleAllCategories={handleToggleAllCategories}
              vendorActionsById={vendorActionsById}
              onVendorActionSelect={handleVendorActionSelect}
              hideRaisePo={hideRaisePo}
              hideReject={hideReject}
              hideResubmission={hideResubmission}
            />
          </Table.Header>
          <Table.Body>
            {filteredCategories.map((category) => {
              const isExpanded = expandedCategoryIds.has(category.id);

              return (
                <React.Fragment key={category.id}>
                  <CategoryRow
                    category={category}
                    vendors={vendors}
                    leafColumns={leafColumns}
                    isExpanded={isExpanded}
                    onToggle={() => handleToggleCategory(category.id)}
                  />
                  {isExpanded ? (
                    <>
                      <ProductHeaderRow
                        leafColumns={leafColumns}
                        category={category}
                        selectedItemIds={selectedItemIds ?? new Set()}
                        onToggleCategorySelection={handleToggleCategorySelection}
                      />
                      {category.items.map((item) => (
                        <ProductRow
                          key={item.id}
                          item={item}
                          leafColumns={leafColumns}
                          isSelected={selectedItemIds?.has(item.id) ?? false}
                          onToggleSelect={handleToggleItemSelect}
                        />
                      ))}
                    </>
                  ) : null}
                </React.Fragment>
              );
            })}
          </Table.Body>
        </table>
      </div>
    );
  },
);

ProjectProcurementVendorComparisonTable.displayName = 'ProjectProcurementVendorComparisonTable';

export default ProjectProcurementVendorComparisonTable;
