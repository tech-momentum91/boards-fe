import {
  STOCKS_CENTER_FILTER_CENTER_SUBSTRING,
  STOCKS_GROUP_BY_IDS,
  STOCKS_STATUS_FILTER_VALUES,
} from '@/components/stocks/constants';
import { STOCKS_FILTER_VALUE_ALL } from '@/components/stocks/shared/constants';
import { formatInrCompact } from '@/utils/inr-format';

function aggregateStockRows(rows) {
  const itemCount = rows.length;
  const criticalCount = rows.filter((r) => r.reorderQtyCritical).length;
  const totalVal = rows.reduce((acc, row) => {
    const n = Number.parseFloat(String(row.stockValue).replaceAll(/[,₹]/g, '')) || 0;
    return acc + n;
  }, 0);
  const valueLabel = formatInrCompact(totalVal);
  return { itemCount, criticalCount, valueLabel };
}

/**
 * Turns category-filtered inventory into sections for `StocksCategorySection`.
 * Default mirrors API categories; other modes group flat rows by center or status.
 */
export function buildStocksDisplaySections(categories, groupBy) {
  if (!groupBy || groupBy === STOCKS_GROUP_BY_IDS.CATEGORY) {
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      itemCount: c.itemCount,
      valueLabel: c.valueLabel,
      criticalCount: c.criticalCount,
      rows: c.rows,
    }));
  }

  const flatRows = categories.flatMap((c) => c.rows);
  const buckets = new Map();

  for (const row of flatRows) {
    const key =
      groupBy === STOCKS_GROUP_BY_IDS.CENTER ? row.center : String(row.status ?? 'Unknown');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => String(a).localeCompare(String(b)))
    .map(([title, rows], idx) => {
      const agg = aggregateStockRows(rows);
      const slug = String(title)
        .toLowerCase()
        .replaceAll(/[^\da-z]+/g, '-')
        .replaceAll(/^-+|-+$/g, '');
      return {
        id: `${groupBy}-${slug || 'group'}-${idx}`,
        name: title,
        ...agg,
        rows,
      };
    });
}

/**
 * Row filter predicate for stock inventory (toolbar search + multiselect filters).
 * @param {object} row
 * @param {{ search: string; centerFilter: string[]; statusFilter: string[] }} filters
 */
export function stockRowMatchesFilters(row, filters) {
  const q = filters.search.trim().toLowerCase();
  if (q) {
    const hay = `${row.product} ${row.center}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }

  const { centerFilter, statusFilter } = filters;

  const centerKeys = Array.isArray(centerFilter) ? centerFilter : [centerFilter].filter(Boolean);
  const centerRestricted = centerKeys.length > 0 && !centerKeys.includes(STOCKS_FILTER_VALUE_ALL);
  if (centerRestricted) {
    const ok = centerKeys.some((key) => {
      const substring = STOCKS_CENTER_FILTER_CENTER_SUBSTRING[key];
      return substring && String(row.center).toLowerCase().includes(substring);
    });
    if (!ok) return false;
  }

  const statusKeys = Array.isArray(statusFilter) ? statusFilter : [statusFilter].filter(Boolean);
  const statusRestricted = statusKeys.length > 0 && !statusKeys.includes(STOCKS_FILTER_VALUE_ALL);
  if (statusRestricted) {
    let matches = false;
    if (
      statusKeys.includes(STOCKS_STATUS_FILTER_VALUES.HEALTHY) &&
      String(row.status).toLowerCase() === STOCKS_STATUS_FILTER_VALUES.HEALTHY
    ) {
      matches = true;
    }
    if (statusKeys.includes(STOCKS_STATUS_FILTER_VALUES.CRITICAL) && row.reorderQtyCritical) {
      matches = true;
    }
    if (!matches) return false;
  }

  return true;
}
