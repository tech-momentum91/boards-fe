import {
  STOCKS_ORDER_CATEGORY_OPTIONS,
  STOCKS_ORDER_FORM_CENTER_OPTIONS,
  STOCKS_ORDER_VENDOR_OPTIONS,
  STOCKS_STOCK_IN_SOURCE_LABELS,
  STOCKS_STOCK_IN_SOURCE_TYPE_FORM_OPTIONS,
} from '@/components/stocks/constants';
import { STOCKS_FILTER_VALUE_ALL } from '@/components/stocks/shared/constants';
import { formatVendorRcDateDisplay } from '@/components/stocks/shared/format';

/** Resolve receiving center id for transfer receive from list row + toolbar filter. */
export function resolveStockInReceivingCenterId(row, centerFilter, centerItems) {
  const filters = (Array.isArray(centerFilter) ? centerFilter : []).filter(
    (value) => value && value !== STOCKS_FILTER_VALUE_ALL,
  );
  if (filters.length === 1) return filters[0];

  const list = Array.isArray(centerItems) ? centerItems : [];
  const rowCenter = String(row?.center ?? row?.centerLabel ?? '').trim();
  if (rowCenter && rowCenter !== '—') {
    const byValue = list.find((option) => option.value === rowCenter);
    if (byValue) return byValue.value;
    const byLabel = list.find((option) => option.label === rowCenter);
    if (byLabel) return byLabel.value;
  }
  return '';
}

/** Split center label into primary name and parenthetical suffix, e.g. "Skyline Hub (BOM)". */
export function splitStockInCenterTitle(center) {
  const text = String(center ?? '').trim();
  const match = /^(.+?)\s*(\([^)]+\))\s*$/.exec(text);
  if (match) return { primary: match[1].trim(), secondary: match[2].trim() };
  return { primary: text || '—', secondary: null };
}

/** Display / sort key for grouping stock-in rows (`center`, `vendor`, `source`, `status`). */
export function getStockInGroupKey(row, groupBy) {
  if (!row || !groupBy) return 'Unknown';
  const raw = row[groupBy];
  return String(raw ?? '').trim() || 'Unknown';
}

function digitsFromAmountStockInSummary(value) {
  const digits = String(value ?? '').replaceAll(/\D/g, '');
  if (!digits) return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isNaN(n) ? 0 : n;
}

function formatRupeeStockInSummary(n) {
  if (!n || n <= 0) return '₹0';
  return `₹${n.toLocaleString('en-IN')}`;
}

/**
 * Recomputes stock-in list row fields from a detail payload (same shape as create-stock-in form).
 */
export function deriveStockInListRowFromDetail(detail, { id, status }) {
  if (!detail || !id) return null;
  const center =
    STOCKS_ORDER_FORM_CENTER_OPTIONS.find((option) => option.value === detail.center)?.label ??
    String(detail.center ?? '');
  const vendor =
    STOCKS_ORDER_VENDOR_OPTIONS.find((option) => option.value === detail.vendor)?.label ??
    String(detail.vendor ?? '');
  const sourceLabel =
    STOCKS_STOCK_IN_SOURCE_TYPE_FORM_OPTIONS.find((option) => option.value === detail.sourceType)
      ?.label ??
    STOCKS_STOCK_IN_SOURCE_LABELS[detail.sourceType] ??
    String(detail.sourceType ?? '');
  const dateIso = String(detail.poDate ?? '').trim();
  const date = dateIso ? formatVendorRcDateDisplay(dateIso) : '—';
  const filled = (detail.lineItems ?? []).filter((line) => String(line.product ?? '').trim());
  let acceptedSum = 0;
  let totalDigits = 0;
  for (const line of filled) {
    const a = Number.parseFloat(String(line.accepted ?? '').replaceAll(',', ''));
    if (!Number.isNaN(a)) acceptedSum += a;
    totalDigits += digitsFromAmountStockInSummary(line.total);
  }
  const acceptedQty =
    acceptedSum > 0
      ? String(Number.isInteger(acceptedSum) ? acceptedSum : acceptedSum.toFixed(2))
      : '0';
  const totalValue = totalDigits > 0 ? formatRupeeStockInSummary(totalDigits) : '₹0';

  return {
    id,
    name: id,
    center,
    vendor,
    date,
    dateIso,
    source: sourceLabel,
    sourceKey: detail.sourceType,
    items: filled.length,
    acceptedQty,
    totalValue,
    status,
    detail: {
      ...detail,
      lineItems: Array.isArray(detail.lineItems) ? detail.lineItems.map((row) => ({ ...row })) : [],
    },
  };
}
