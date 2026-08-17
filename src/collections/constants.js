import { PROJECT_DETAIL_COLLECTION_STATUS_META } from '@/components/projects/constants';

export const COLLECTIONS_TABS = [
  { id: 'collections', label: 'Collections' },
  { id: 'analytics', label: 'Analytics' },
];

export const COLLECTIONS_LIST_PAGE_SIZE = 20;

export const COLLECTIONS_COLUMN_STORAGE_KEY = 'collections-global-table-columns';

export const GLOBAL_COLLECTIONS_STATS = {
  total_boq_value: {
    label: 'Total BOQ Value',
    value: '₹99.15 Cr',
    valueClassName: 'text-text-main-900',
  },
  invoiced_with_gst: {
    label: 'Invoiced (W GST)',
    value: '₹64.43 Cr',
    valueClassName: 'text-feature-base',
  },
  received: {
    label: 'Received',
    value: '₹40.49 Cr',
    valueClassName: 'text-success-base',
  },
  outstanding: {
    label: 'Outstanding',
    value: '₹23.94 Cr',
    valueClassName: 'text-warning-base',
  },
  overdue: {
    label: 'Overdue',
    value: '₹67.26 L',
    valueClassName: 'text-error-base',
  },
};

export const COLLECTIONS_TABLE_COLUMNS = [
  { id: 'name', label: 'Name', visible: true, enableHiding: false },
  { id: 'account', label: 'Account', visible: true },
  { id: 'boq_value', label: 'BOQ Value (₹)', visible: true },
  { id: 'invoiced', label: 'Invoiced (₹)', visible: true },
  { id: 'received', label: 'Received (₹)', visible: true },
  { id: 'outstanding', label: 'Outstanding (₹)', visible: true },
  { id: 'collection_progress', label: 'Collection', visible: true },
  { id: 'project_progress', label: 'Project', visible: true },
  { id: 'vendor_progress', label: 'Vendor', visible: true },
];

const TOPGRIP_MILESTONES = [
  {
    id: 'topgrip-advance',
    milestone: 'Advance Payment',
    boq_type: 'Original',
    invoice_no: 'INV-TOP-001',
    expected_invoice_date: '23rd Dec 26',
    actual_invoice_date: '23rd Dec 26',
    expected_payment_date: '23rd Dec 26',
    actual_payment_date: '23rd Dec 26',
    payment_status: 'received',
  },
  {
    id: 'topgrip-design',
    milestone: 'Design Approval',
    boq_type: 'Original',
    invoice_no: 'INV-TOP-002',
    expected_invoice_date: '23rd Dec 26',
    actual_invoice_date: '23rd Dec 26',
    expected_payment_date: '23rd Dec 26',
    actual_payment_date: '23rd Dec 26',
    payment_status: 'received',
  },
  {
    id: 'topgrip-site',
    milestone: 'Site Mobilization',
    boq_type: 'Additional',
    invoice_no: 'INV-TOP-003',
    expected_invoice_date: '23rd Dec 26',
    actual_invoice_date: '23rd Dec 26',
    expected_payment_date: '23rd Dec 26',
    actual_payment_date: '23rd Dec 26',
    payment_status: 'planned',
  },
];

export const GLOBAL_COLLECTIONS_PROJECTS_SEED = [
  {
    id: 'topgrip',
    name: 'Topgrip',
    account: 'Topgrip',
    city: 'Mumbai',
    boq_value: '3.50 Cr',
    invoiced: '2.35 Cr',
    received: '98.50 L',
    outstanding: '67.26 L',
    collection_progress: 80,
    project_progress: 30,
    vendor_progress: 80,
    milestones: TOPGRIP_MILESTONES,
  },
  {
    id: 'iclean',
    name: 'IClean',
    account: 'IClean',
    city: 'Pune',
    boq_value: '4.20 Cr',
    invoiced: '2.15 Cr',
    received: '98.50 L',
    outstanding: '67.26 L',
    collection_progress: 80,
    project_progress: 80,
    vendor_progress: 80,
    milestones: TOPGRIP_MILESTONES.map((row, index) => ({
      ...row,
      id: `iclean-${index}`,
      invoice_no: `INV-ICL-00${index + 1}`,
    })),
  },
  {
    id: 'north-star-mall',
    name: 'North Star Mall',
    account: 'North Star Mall',
    city: 'Delhi',
    boq_value: '2.55 Cr',
    invoiced: '4.25 Cr',
    received: '98.50 L',
    outstanding: '67.26 L',
    collection_progress: 80,
    project_progress: 80,
    vendor_progress: 80,
    milestones: TOPGRIP_MILESTONES.map((row, index) => ({
      ...row,
      id: `north-star-${index}`,
      invoice_no: `INV-NSM-00${index + 1}`,
    })),
  },
  {
    id: 'athera-foods',
    name: 'Athera Foods',
    account: 'Athera Foods',
    city: 'Bengaluru',
    boq_value: '3.35 Cr',
    invoiced: '0.85 Cr',
    received: '98.50 L',
    outstanding: '67.26 L',
    collection_progress: 80,
    project_progress: 80,
    vendor_progress: 80,
    milestones: TOPGRIP_MILESTONES.map((row, index) => ({
      ...row,
      id: `athera-${index}`,
      invoice_no: `INV-ATH-00${index + 1}`,
    })),
  },
  {
    id: 'ambertech',
    name: 'AmberTech',
    account: 'AmberTech',
    city: 'Hyderabad',
    boq_value: '4.80 Cr',
    invoiced: '3.25 Cr',
    received: '98.50 L',
    outstanding: '67.26 L',
    collection_progress: 80,
    project_progress: 80,
    vendor_progress: 80,
    milestones: TOPGRIP_MILESTONES.map((row, index) => ({
      ...row,
      id: `ambertech-${index}`,
      invoice_no: `INV-AMB-00${index + 1}`,
    })),
  },
  {
    id: 'nexora-works',
    name: 'Nexora Works',
    account: 'Nexora Works',
    city: 'Chennai',
    boq_value: '3.10 Cr',
    invoiced: '4.45 Cr',
    received: '98.50 L',
    outstanding: '67.26 L',
    collection_progress: 80,
    project_progress: 80,
    vendor_progress: 80,
    milestones: TOPGRIP_MILESTONES.map((row, index) => ({
      ...row,
      id: `nexora-${index}`,
      invoice_no: `INV-NEX-00${index + 1}`,
    })),
  },
  {
    id: 'bluepeak-mall',
    name: 'BluePeak Mall',
    account: 'BluePeak Mall',
    city: 'Kolkata',
    boq_value: '2.90 Cr',
    invoiced: '1.75 Cr',
    received: '98.50 L',
    outstanding: '67.26 L',
    collection_progress: 80,
    project_progress: 80,
    vendor_progress: 80,
    milestones: TOPGRIP_MILESTONES.map((row, index) => ({
      ...row,
      id: `bluepeak-${index}`,
      invoice_no: `INV-BPM-00${index + 1}`,
    })),
  },
  {
    id: 'vertex-spaces',
    name: 'Vertex Spaces',
    account: 'Vertex Spaces',
    city: 'Ahmedabad',
    boq_value: '4.60 Cr',
    invoiced: '3.85 Cr',
    received: '98.50 L',
    outstanding: '—',
    collection_progress: 80,
    project_progress: 80,
    vendor_progress: 100,
    milestones: TOPGRIP_MILESTONES.map((row, index) => ({
      ...row,
      id: `vertex-${index}`,
      invoice_no: `INV-VRT-00${index + 1}`,
    })),
  },
];

export const COLLECTIONS_PROJECT_FILTER_OPTIONS = [
  { value: 'all', label: 'All Projects' },
  ...GLOBAL_COLLECTIONS_PROJECTS_SEED.map((project) => ({
    value: project.id,
    label: project.name,
  })),
];

export function getStoredCollectionsColumnConfig() {
  try {
    const raw = localStorage.getItem(COLLECTIONS_COLUMN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredCollectionsColumnConfig(columns) {
  localStorage.setItem(COLLECTIONS_COLUMN_STORAGE_KEY, JSON.stringify(columns));
}

export function filterCollectionsProjects({
  rows = GLOBAL_COLLECTIONS_PROJECTS_SEED,
  keyword = '',
  projectFilter = 'all',
}) {
  const normalizedKeyword = String(keyword ?? '')
    .trim()
    .toLowerCase();

  return rows.filter((row) => {
    if (projectFilter !== 'all' && row.id !== projectFilter) return false;
    if (!normalizedKeyword) return true;

    return [row.name, row.account, row.city]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedKeyword));
  });
}

export function paginateCollectionsRows(rows, page = 1, pageSize = COLLECTIONS_LIST_PAGE_SIZE) {
  const totalCount = rows.length;
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;
  const start = (page - 1) * pageSize;
  const results = rows.slice(start, start + pageSize);

  return {
    results,
    page,
    page_size: pageSize,
    total_count: totalCount,
    total_pages: totalPages,
    has_more: page * pageSize < totalCount,
  };
}

export { PROJECT_DETAIL_COLLECTION_STATUS_META as COLLECTION_PAYMENT_STATUS_META };
