import { format } from 'date-fns';
import { generatePDFReport } from '@/utils/pdf-export';
import { formatInrCompact } from '@/utils/inr-format';

const formatPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `${n.toFixed(2)}%`;
};

const COLUMN_LABELS = {
  period: 'Month',
  billed: 'Billed',
  collected: 'Collected',
  pending: 'Pending',
  opex: 'OPEX',
  profit: 'Profit',
  margin_percent: 'Margin%',
  collection_percent: 'Collection%',
};

const DEFAULT_ORDER = [
  'period',
  'billed',
  'collected',
  'pending',
  'opex',
  'profit',
  'margin_percent',
  'collection_percent',
];

const toCell = (colId, row) => {
  switch (colId) {
    case 'billed':
    case 'collected':
    case 'pending':
    case 'opex':
    case 'profit':
      return formatInrCompact(row?.[colId]);
    case 'margin_percent':
    case 'collection_percent':
      return formatPercent(row?.[colId]);
    default:
      return row?.[colId] ?? '-';
  }
};

export const generatePnLPDF = async ({
  rows = [],
  centerName = 'Center',
  centerId = '',
  period = 'monthly',
  month = 'All',
  visibleColumns,
}) => {
  const cols =
    Array.isArray(visibleColumns) && visibleColumns.length > 0 ? visibleColumns : DEFAULT_ORDER;

  const filters = [
    { label: 'Center', value: centerName },
    ...(centerId ? [{ label: 'Center ID', value: String(centerId) }] : []),
    { label: 'Period', value: String(period).toUpperCase() },
    { label: 'Month', value: String(month || 'All') },
    { label: 'Rows', value: String(rows?.length || 0) },
    { label: 'Date', value: format(new Date(), 'dd LLL yyyy, hh:mm a') },
  ];

  const summaryTable = {
    title: 'P&L',
    head: [cols.map((c) => COLUMN_LABELS[c] || c)],
    body: (rows || []).map((row) => cols.map((c) => toCell(c, row))),
    columnStyles: {
      0: { cellWidth: 26 },
    },
  };

  await generatePDFReport({
    title: `${centerName} • P&L Report`,
    fileName: `PnL_Report_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.pdf`,
    brandName: 'DevX',
    filters,
    summaryTable,
    detailPages: [],
  });
};
