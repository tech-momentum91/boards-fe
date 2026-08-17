import { formatDateWithOrdinal } from '@/utils/date-utils';
import { getProposalValidityStatusBadge } from '@/components/crm-proposals/constants';

function formatExportAmount(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(String(value).replaceAll(/[^\d.-]/g, ''));
  if (!Number.isFinite(num)) return '';
  return num.toLocaleString('en-IN');
}

function formatExportDate(value) {
  if (!value || value === '-') return '';
  return formatDateWithOrdinal(value) || '';
}

const EXPORT_COLUMNS = [
  { id: 'proposal', header: 'Proposal Name', get: (row) => row.proposal_title || '' },
  {
    id: 'suggested_inventory',
    header: 'Space proposed',
    get: (row) => (Array.isArray(row.spaces) ? row.spaces : []).join('; '),
  },
  {
    id: 'proposal_amount',
    header: 'Proposal Amount (₹)',
    get: (row) => formatExportAmount(row.proposal_amount),
  },
  {
    id: 'proposal_date',
    header: 'Proposal Date',
    get: (row) => formatExportDate(row.proposal_date),
  },
  {
    id: 'valid_till',
    header: 'Valid Till',
    get: (row) => formatExportDate(row.valid_till),
  },
  {
    id: 'validity_status',
    header: 'Status',
    get: (row) => getProposalValidityStatusBadge(row.validity_status).label,
  },
];

export function exportLeadProposalsCsv(rows, visibleColumnIds) {
  const active = EXPORT_COLUMNS.filter((col) => visibleColumnIds.includes(col.id));
  const header = active.map((col) => col.header).join(',');
  const lines = rows.map((row) =>
    active
      .map((col) => {
        const val = String(col.get(row) ?? '').replaceAll('"', '""');
        return `"${val}"`;
      })
      .join(','),
  );
  return [header, ...lines].join('\n');
}
