'use client';

import { useMemo, useState } from 'react';

import {
  STOCKS_FILTER_VALUE_ALL,
  STOCKS_ORDER_FORM_CENTER_OPTIONS,
  STOCKS_ORDER_VENDOR_OPTIONS,
  STOCKS_RULE_GROUP_BY_IDS,
  STOCKS_STOCK_OUT_DEPARTMENT_OPTIONS,
  STOCKS_STOCK_OUT_ISSUE_MODE_OPTIONS,
  STOCKS_VENDOR_RC_GROUP_BY_IDS,
} from '@/components/stocks/constants';
import {
  formatVendorRcDateDisplay,
  getTodayIsoDate,
  vendorRcDateToIso,
  vendorRcIsoToDate,
} from '@/components/stocks/shared/format';
import { normalizeStockCategoryLabels } from '@/components/stocks/shared/stocks-category-badges';
import StocksFormSearchableSelect from '@/components/stocks/shared/stocks-form-searchable-select';
import * as Input from '@/components/ui/input';

export {
  deriveStockInListRowFromDetail,
  getStockInGroupKey,
  splitStockInCenterTitle,
} from '@/components/stocks/stock-in/helpers/list';
export { formatVendorRcDateDisplay, getTodayIsoDate, vendorRcDateToIso, vendorRcIsoToDate };

export const EMPTY_STOCKS_SORTING = [];

export function buildStocksOrderBy(sorting, fieldMap, fallback = 'modified desc') {
  const [sort] = Array.isArray(sorting) ? sorting : [];
  if (!sort?.id) return fallback;
  const field = fieldMap?.[sort.id];
  if (!field) return fallback;
  return `${field} ${sort.desc ? 'desc' : 'asc'}`;
}

/** Display / sort key for grouping purchase order rows (`center`, `vendor`, `category`, `status`). */
export function getOrderGroupKey(row, groupBy) {
  if (!row || !groupBy) return 'Unknown';
  const raw = row[groupBy];
  return String(raw ?? '').trim() || 'Unknown';
}

/** Build toolbar filter options from list rows (always includes the “All” option first). */
export function buildToolbarFilterOptionsFromRows(rows, field, allLabel) {
  const unique = [
    ...new Set(
      (Array.isArray(rows) ? rows : [])
        .map((row) => String(row[field] ?? '').trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return [
    { value: STOCKS_FILTER_VALUE_ALL, label: allLabel },
    ...unique.map((value) => ({ value, label: value })),
  ];
}

/**
 * Merge newly seen filter values into existing options so dropdowns stay complete
 * after the table list is narrowed by active filters.
 */
export function mergeToolbarFilterOptions(previousOptions, rows, field, allLabel) {
  const fresh = buildToolbarFilterOptionsFromRows(rows, field, allLabel);
  const map = new Map();
  for (const option of [...(previousOptions ?? []), ...fresh]) {
    if (option?.value) map.set(option.value, option);
  }
  const allOption = map.get(STOCKS_FILTER_VALUE_ALL) ?? {
    value: STOCKS_FILTER_VALUE_ALL,
    label: allLabel,
  };
  map.delete(STOCKS_FILTER_VALUE_ALL);
  const sorted = [...map.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
  );
  return [allOption, ...sorted];
}

/** Build center toolbar options from the global center list. */
export function buildToolbarCenterOptions(centers, allLabel = 'All Centers') {
  const allOption = { value: STOCKS_FILTER_VALUE_ALL, label: allLabel };
  const options = (Array.isArray(centers) ? centers : [])
    .map((center) => {
      const value = String(center?.value ?? center?.name ?? '').trim();
      if (!value) return null;
      return {
        value,
        label: String(center?.label ?? center?.center_name ?? value).trim() || value,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  return [allOption, ...options];
}

/** Normalize API category options and optionally prepend the toolbar "All" option. */
export function buildStocksCategoryOptions(
  categories,
  { includeAll = false, allLabel = 'All Categories' } = {},
) {
  const byValue = new Map();
  for (const category of Array.isArray(categories) ? categories : []) {
    const value = String(category?.value ?? category?.name ?? category ?? '').trim();
    if (!value || value === STOCKS_FILTER_VALUE_ALL || byValue.has(value)) continue;
    byValue.set(value, {
      value,
      label: String(category?.label ?? category?.name ?? category ?? value).trim() || value,
    });
  }
  const options = [...byValue.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
  );
  return includeAll ? [{ value: STOCKS_FILTER_VALUE_ALL, label: allLabel }, ...options] : options;
}

/** Display / sort key for grouping stock-out rows (`center`, `department`, `category`, `issueMode`, `status`). */
export function getStockOutGroupKey(row, groupBy) {
  if (!row || !groupBy) return 'Unknown';
  const raw = row[groupBy];
  return String(raw ?? '').trim() || 'Unknown';
}

/**
 * Recomputes stock-out list row fields from a detail payload (same shape as create-stock-out form).
 */
export function deriveStockOutListRowFromDetail(detail, { id, status }) {
  if (!detail || !id) return null;
  const center =
    STOCKS_ORDER_FORM_CENTER_OPTIONS.find((option) => option.value === detail.center)?.label ??
    String(detail.center ?? '');
  const department =
    STOCKS_STOCK_OUT_DEPARTMENT_OPTIONS.find((option) => option.value === detail.department)
      ?.label ?? String(detail.department ?? '');
  const categoryLabels = normalizeStockCategoryLabels(detail.category);
  const category =
    categoryLabels.length <= 1 ? (categoryLabels[0] ?? '') : categoryLabels.join(', ');
  const issueModeLabel =
    STOCKS_STOCK_OUT_ISSUE_MODE_OPTIONS.find((option) => option.value === detail.issueMode)
      ?.label ?? String(detail.issueMode ?? '');
  const dateIso = String(detail.entryDate ?? '').trim();
  const date = dateIso ? formatVendorRcDateDisplay(dateIso) : '—';
  const filled = (detail.lineItems ?? []).filter((line) => String(line.product ?? '').trim());
  let issuedSum = 0;
  for (const line of filled) {
    const q = Number.parseFloat(String(line.issued ?? '').replaceAll(',', ''));
    if (!Number.isNaN(q)) issuedSum += q;
  }
  const issuedQty =
    issuedSum > 0 ? String(Number.isInteger(issuedSum) ? issuedSum : issuedSum.toFixed(2)) : '0';

  return {
    id,
    center,
    department,
    date,
    dateIso,
    category,
    items: filled.length,
    issuedQty,
    issueMode: issueModeLabel,
    status,
    detail: {
      ...detail,
      lineItems: Array.isArray(detail.lineItems) ? detail.lineItems.map((row) => ({ ...row })) : [],
    },
  };
}

/** Display / sort key for grouping stock rule rows (`pattern` → consumption). */
export function getStockRuleGroupKey(row, groupBy) {
  if (!row || !groupBy) return 'Unknown';
  if (groupBy === STOCKS_RULE_GROUP_BY_IDS.PATTERN) {
    return String(row.consumption ?? '').trim() || 'Unknown';
  }
  const raw = row[groupBy];
  return String(raw ?? '').trim() || 'Unknown';
}

/** Group-by key for Vendor RC (`center` uses first center in `centers[]`). */
export function getVendorRcGroupKey(row, groupBy) {
  if (!row || !groupBy) return 'Unknown';
  if (groupBy === STOCKS_VENDOR_RC_GROUP_BY_IDS.CENTER) {
    const first = Array.isArray(row.centers) ? row.centers[0] : null;
    return String(first ?? '').trim() || 'Unknown';
  }
  const raw = row[groupBy];
  return String(raw ?? '').trim() || 'Unknown';
}

/**
 * Borderless select used inside field rows, tables, and dense forms.
 * Options: `{ value, label }[]` (value must be a string for Radix Select).
 */
export function InlineFieldSelect({
  value,
  onValueChange,
  options = [],
  placeholder = 'Select',
  triggerClassName = 'w-full',
  size = 'xsmall',
  variant = 'borderless',
  disabled,
  hasError,
  ...rest
}) {
  return (
    <StocksFormSearchableSelect
      value={value ?? ''}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      triggerClassName={triggerClassName}
      size={size}
      variant={variant}
      disabled={disabled}
      hasError={hasError}
      showArrow={false}
      matchTriggerWidth
      {...rest}
    />
  );
}

/**
 * Borderless single-line input for the same contexts as InlineFieldSelect.
 */
/** Radix Select requires `value` to match a Select.Item; return '' when it does not. */
export function valueInSelectOptions(value, options) {
  if (!value) return '';
  const list = Array.isArray(options) ? options : [];
  return list.some((option) => option.value === value) ? value : '';
}

/** Keep the current value visible when options were narrowed by a scoped API fetch. */
export function selectOptionsIncludingValue(value, options) {
  const id = String(value ?? '').trim();
  const list = Array.isArray(options) ? options : [];
  if (!id) return list;
  if (list.some((option) => option.value === id)) return list;
  const fromMeta = list.find((option) => option.label === id);
  if (fromMeta) return list;
  return [{ value: id, label: id }, ...list];
}

/** Local column visibility/order state for stocks tables without list-pref API. */
export function useStocksLocalColumnConfig(initialColumns) {
  const [columns, setColumns] = useState(initialColumns);

  return useMemo(
    () => ({
      columns,
      toggleColumnVisibility: (columnId) =>
        setColumns((previous) =>
          previous.map((column) =>
            column.id === columnId ? { ...column, visible: !column.visible } : column,
          ),
        ),
      reorderColumns: (oldIndex, newIndex) =>
        setColumns((previous) => {
          const next = [...previous];
          const [moved] = next.splice(oldIndex, 1);
          next.splice(newIndex, 0, moved);
          return next;
        }),
      showAllColumns: () =>
        setColumns((previous) => previous.map((column) => ({ ...column, visible: true }))),
      hideAllColumns: () =>
        setColumns((previous) =>
          previous.map((column) =>
            column.enableHiding === false ? column : { ...column, visible: false },
          ),
        ),
    }),
    [columns],
  );
}

export function InlineFieldInput({
  value,
  readOnly,
  onChange,
  onBlur,
  type = 'text',
  min,
  max,
  placeholder,
  inputRef,
  className,
  ...rootProps
}) {
  return (
    <Input.Root variant='borderless' size='xsmall' {...rootProps}>
      <Input.Wrapper>
        <Input.Input
          ref={inputRef}
          type={type}
          min={min}
          max={max}
          readOnly={readOnly}
          value={value ?? ''}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={className}
        />
      </Input.Wrapper>
    </Input.Root>
  );
}

const isActiveStocksFilterValue = (value) => {
  if (Array.isArray(value)) {
    if (value.length === 0) return false;
    if (value.length === 1 && value[0] === STOCKS_FILTER_VALUE_ALL) return false;
    return true;
  }
  if (value === STOCKS_FILTER_VALUE_ALL || value === '' || value == null) return false;
  return true;
};

/** True when search or any toolbar filter is narrowed (not “All”). */
export function hasStocksListFilters({ search = '', filters = {} } = {}) {
  if (String(search).trim()) return true;
  return Object.values(filters).some(isActiveStocksFilterValue);
}

export function resolveStocksEmptyContext(params) {
  return hasStocksListFilters(params) ? 'search' : 'default';
}
