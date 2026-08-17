import apiClient from '@/api/axios';
import { buildOpexFilters } from '@/redux/opexSlice';
import { formatMonthYear } from '@/utils/date-utils';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const OPEX_EXPORT_COLUMNS = [
  { id: 'name', header: 'Name', get: (row) => row.subcategory || row.name || '' },
  { id: 'center', header: 'Center', get: (row) => row.center_name || row.center || '' },
  {
    id: 'expense_month',
    header: 'Expense Month',
    get: (row) => row.expense_month || formatMonthYear(row.period, ''),
  },
  {
    id: 'triggered_month',
    header: 'Triggered Month',
    get: (row) => row.triggered_month || formatMonthYear(row.trigger_date, ''),
  },
  { id: 'category', header: 'Category', get: (row) => row.category || '' },
  { id: 'vendor', header: 'Vendor', get: (row) => row.vendor || '' },
  {
    id: 'amount_without_gst',
    header: 'Amount Without GST',
    get: (row) => row.amount_without_gst ?? '',
  },
  { id: 'gst_amount', header: 'GST Amount', get: (row) => row.gst_amount ?? '' },
  { id: 'total_amount', header: 'Total Amount', get: (row) => row.total_amount ?? '' },
  { id: 'bill_url', header: 'Bill URL', get: (row) => row.bill_url || '' },
  { id: 'invoice_date', header: 'Invoice Date', get: (row) => row.invoice_date || '' },
  {
    id: 'hard_copy_sent',
    header: 'Hard Copy Sent',
    get: (row) => (row.hard_copy_sent ? 'Yes' : 'No'),
  },
  { id: 'bill_uploaded', header: 'Bill Uploaded', get: (row) => row.bill_uploaded || '' },
  { id: 'zone_head_check', header: 'Zone Head Check', get: (row) => row.zone_head_check || '' },
  {
    id: 'zone_head_checked_date',
    header: 'Zone Head Checked Date',
    get: (row) => row.zone_head_checked_date || '',
  },
  { id: 'purchase_check', header: 'Purchase Check', get: (row) => row.purchase_check || '' },
  {
    id: 'purchase_checked_date',
    header: 'Purchase Checked Date',
    get: (row) => row.purchase_checked_date || '',
  },
  {
    id: 'assignee',
    header: 'Assignee',
    get: (row) => formatOpexAssigneeValue(row.assignee),
  },
  { id: 'zoho_uploaded', header: 'Zoho Uploaded', get: (row) => row.zoho_uploaded || '' },
];

export function buildOpexExportFilename(filters = {}) {
  const year = String(filters.year || new Date().getFullYear());
  const rawMonth = String(filters.month || '').trim();
  const monthPart =
    !rawMonth || rawMonth === 'All' ? 'all' : rawMonth.toLowerCase().replaceAll(/\s+/g, '-');
  return `OPEX-${year}-${monthPart}.xlsx`;
}

export function formatOpexAssigneeValue(assignee) {
  if (!assignee) return '';
  if (Array.isArray(assignee)) {
    return assignee
      .map((entry) => entry?.full_name || entry?.name || entry?.email || entry)
      .filter(Boolean)
      .join(', ');
  }
  return String(assignee);
}

const resolveOpexListHasMore = ({ responseData, apiPage, apiPageSize, apiCount }) => {
  if (responseData.has_more != null) {
    return Boolean(responseData.has_more);
  }
  if (responseData.total_pages != null) {
    return apiPage < Number(responseData.total_pages);
  }
  if (responseData.total_count != null) {
    return apiPage * apiPageSize < Number(responseData.total_count);
  }
  return apiCount >= apiPageSize;
};

export async function fetchAllOpexRowsForExport({
  filters = {},
  orderBy = 'creation desc',
  pageSize = 200,
}) {
  const listFilters = buildOpexFilters(filters);
  const keyword = (filters.search || '').trim();
  const allRows = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await apiClient.post('/method/devx.opex.api.opex.get_opex_list', {
      keyword: keyword || undefined,
      filters: listFilters.length > 0 ? listFilters : undefined,
      status_tab: filters.tab || 'all',
      order_by: orderBy,
      page,
      limit_page_length: pageSize,
    });

    const responseData = response?.data?.message || response?.data || {};
    const rawRows = responseData.results || responseData.data || [];
    const batch = Array.isArray(rawRows) ? rawRows : [];
    allRows.push(...batch);

    const apiPage = responseData.page ?? page;
    const apiPageSize = responseData.page_size ?? pageSize;
    hasMore = resolveOpexListHasMore({
      responseData,
      apiPage,
      apiPageSize,
      apiCount: batch.length,
    });
    page += 1;

    if (batch.length === 0) {
      hasMore = false;
    }
  }

  return allRows;
}

export function flattenGroupedOpexRows(groupedData = {}) {
  return Object.entries(groupedData).flatMap(([groupLabel, items]) =>
    (items || []).map((item) => ({ ...item, _exportGroup: groupLabel })),
  );
}

export async function exportOpexRowsToExcel({
  rows = [],
  filename,
  groupBy = '',
  columns = OPEX_EXPORT_COLUMNS,
}) {
  const XLSX = await import('xlsx');
  const exportColumns = groupBy
    ? [{ id: 'group', header: 'Group', get: (row) => row._exportGroup || '' }, ...columns]
    : columns;

  const headers = exportColumns.map((column) => column.header);
  const dataRows = rows.map((row) => exportColumns.map((column) => column.get(row) ?? ''));

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'OPEX');
  XLSX.writeFile(workbook, filename || buildOpexExportFilename());
}

export { MONTH_NAMES };
