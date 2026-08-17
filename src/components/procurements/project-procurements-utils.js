const CRORE = 1_00_00_000;

export function getCurrentIndianFiscalYearStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 3 ? year : year - 1;
}

export function formatFiscalYearLabel(startYear) {
  const endSuffix = String(startYear + 1).slice(-2);
  return `FY ${startYear}–${endSuffix}`;
}

export function buildFiscalYearOptions({ yearsBefore = 3, yearsAfter = 1 } = {}) {
  const currentStart = getCurrentIndianFiscalYearStart();
  const options = [];

  for (let offset = yearsAfter; offset >= -yearsBefore; offset -= 1) {
    const startYear = currentStart + offset;
    options.push({
      value: String(startYear),
      label: formatFiscalYearLabel(startYear),
    });
  }

  return options;
}

export function formatProcurementAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '₹0';

  if (amount >= CRORE) {
    return `₹${(amount / CRORE).toFixed(2)} Cr`;
  }

  if (amount >= 1_00_000) {
    return `₹${(amount / 1_00_000).toFixed(2)} L`;
  }

  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatProcurementDifferenceAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  if (amount === 0) return '0';

  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= CRORE) {
    return `${sign}₹${(abs / CRORE).toFixed(2)} Cr`;
  }

  if (abs >= 1_00_000) {
    const lakhs = abs / 1_00_000;
    const formatted = Number.isInteger(lakhs) ? String(lakhs) : lakhs.toFixed(2);
    return `${sign}₹${formatted} L`;
  }

  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}

export function formatProcurementCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return '0';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(numeric);
}

export const EMPTY_PROJECT_PROCUREMENT_STATS = {
  total_projects: 0,
  total_boq_value: 0,
  total_po_value: 0,
  pending_po_value: 0,
  total_paid: 0,
  pending_vendor_payment: 0,
};

export function normalizeProjectProcurementStats(payload = {}) {
  return {
    total_projects: Number(payload.total_projects) || 0,
    total_boq_value: Number(payload.total_boq_value) || 0,
    total_po_value: Number(payload.total_po_value) || 0,
    pending_po_value: Number(payload.pending_po_value) || 0,
    total_paid: Number(payload.total_paid) || 0,
    pending_vendor_payment: Number(payload.pending_vendor_payment) || 0,
  };
}

export function buildInternalBoqBreakdownItems(breakdown) {
  if (Array.isArray(breakdown)) {
    return breakdown.filter((item) => item?.label && Number(item.value) > 0);
  }

  if (breakdown && typeof breakdown === 'object') {
    const labelMap = {
      main_boq: 'Master BOQ',
      master_boq: 'Master BOQ',
      additional_boq_1: 'Additional BOQ 1',
      additional_boq_2: 'Additional BOQ 2',
      design: 'Design BOQ',
      execution: 'Execution BOQ',
    };

    return Object.entries(breakdown)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([key, value]) => ({
        label: labelMap[key] ?? String(key).replaceAll('_', ' '),
        value: Number(value),
      }));
  }

  return [];
}

export function normalizeProjectProcurementRow(row = {}) {
  const poValue = Number(row.po_value) || 0;
  const paidPayment = Number(row.paid_payment) || 0;
  const pendingPayment =
    row.pending_payment != null && row.pending_payment !== ''
      ? Number(row.pending_payment) || 0
      : Math.max(poValue - paidPayment, 0);

  return {
    id: row.id ?? row.project ?? row.name ?? '',
    project: row.project ?? row.id ?? '',
    name: row.name ?? row.project_name ?? '',
    purchase_boq: row.purchase_boq ?? '',
    purchase_boq_code: row.purchase_boq_code ?? '',
    boq_family: row.boq_family ?? '',
    stage: row.stage ?? row.custom_project_stage ?? '',
    project_status: row.project_status ?? 'Open',
    city: row.city ?? row.custom_city ?? '',
    city_value: row.city_value ?? row.city ?? '',
    internal_boq_value: Number(row.internal_boq_value) || 0,
    purchase_boq_value: Number(row.purchase_boq_value) || 0,
    po_value: poValue,
    pending_po_value: Number(row.pending_po_value) || 0,
    package_count: Number(row.package_count) || 0,
    total_bill_value: Number(row.total_bill_value) || 0,
    paid_payment: paidPayment,
    pending_payment: pendingPayment,
    parent_project: row.parent_project ?? row.custom_parent_project ?? '',
    design_start: row.design_start ?? row.custom_design_start_date ?? '',
    design_end: row.design_end ?? row.custom_design_end_date ?? '',
    last_updated: row.last_updated ?? row.modified ?? '',
    internal_boq_breakdown: buildInternalBoqBreakdownItems(row.internal_boq_breakdown),
  };
}

export function normalizeProjectProcurementPackageRow(row = {}) {
  const parseCategories = (value) => {
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
    }
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map((entry) => String(entry ?? '').trim()).filter(Boolean)
        : [String(value)];
    } catch {
      return String(value)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  };

  const itemCount = Number(row.itemCount ?? row.item_count) || 0;
  const packageValue = Number(row.packageValue ?? row.package_value) || 0;
  const invitedCount = Number(row.invitedCount ?? row.invited_count) || 0;
  const quotesReceived = Number(row.quotesReceived ?? row.quotes_received) || 0;
  const quotesInvited = Number(row.quotesInvited ?? row.quotes_invited) || invitedCount;
  const lastUpdated = row.lastUpdated ?? row.last_updated ?? row.modified ?? '';
  const categoryHierarchy = (
    Array.isArray(row.categoryHierarchy ?? row.category_hierarchy)
      ? (row.categoryHierarchy ?? row.category_hierarchy)
      : []
  )
    .map((entry) => ({
      categoryGroup: String(entry?.categoryGroup ?? entry?.category_group ?? '').trim(),
      categoryType: String(entry?.categoryType ?? entry?.category_type ?? '').trim(),
      productGroup: String(entry?.productGroup ?? entry?.product_group ?? '').trim(),
      productType: String(entry?.productType ?? entry?.product_type ?? '').trim(),
    }))
    .filter((entry) => Object.values(entry).some(Boolean));

  let lowestBidder = row.lowestBidder ?? row.lowest_bidder ?? null;
  if (lowestBidder && typeof lowestBidder === 'object') {
    lowestBidder = {
      name: lowestBidder.name ?? lowestBidder.supplier_name ?? '',
      amount: Number(lowestBidder.amount ?? lowestBidder.quote_amount) || 0,
    };
    if (!lowestBidder.name) lowestBidder = null;
  } else {
    lowestBidder = null;
  }

  return {
    id: row.name ?? row.id ?? '',
    name: row.package_name ?? row.name ?? '',
    code: row.code ?? '',
    purchase_boq: row.purchase_boq ?? '',
    project: row.project ?? '',
    categories: parseCategories(row.categories),
    categoryHierarchy,
    status: row.status ?? '',
    item_count: itemCount,
    itemCount,
    package_value: packageValue,
    packageValue,
    invited_count: invitedCount,
    invitedCount,
    quotes_received: quotesReceived,
    quotesReceived,
    quotes_invited: quotesInvited,
    quotesInvited,
    lowest_bidder: lowestBidder,
    lowestBidder,
    last_updated: lastUpdated,
    lastUpdated,
  };
}

export function normalizeProjectProcurementPosRow(row = {}) {
  const poValue = Number(row.po_value) || 0;
  const paidAmt = Number(row.paid_amt) || 0;
  const pendingAmt =
    row.pending_amt != null && row.pending_amt !== ''
      ? Number(row.pending_amt) || 0
      : Math.max(poValue - paidAmt, 0);

  return {
    id: row.id ?? row.po_number ?? row.name ?? '',
    po_number: row.po_number ?? row.name ?? row.id ?? '',
    vendor_name: row.vendor_name ?? '',
    supplier: row.supplier ?? '',
    package: row.package ?? '',
    package_id: row.package_id ?? '',
    category: row.category ?? '',
    po_date: row.po_date ?? '',
    type: row.type ?? '',
    po_value: poValue,
    paid_amt: paidAmt,
    pending_amt: pendingAmt,
    status: row.status ?? row.release_status ?? '',
    release_status: row.release_status ?? row.status ?? '',
    docstatus: Number(row.docstatus) || 0,
    created_by: row.created_by ?? '',
    updated_by: row.updated_by ?? '',
    project: row.project ?? '',
    project_id: row.project_id ?? '',
    procurement_stage: row.procurement_stage ?? '',
    internal_boq_value: Number(row.internal_boq_value) || 0,
    internal_boq_breakdown: Array.isArray(row.internal_boq_breakdown)
      ? row.internal_boq_breakdown
      : [],
    purchase_boq_value: Number(row.purchase_boq_value) || 0,
    boq_po_value: Number(row.boq_po_value) || 0,
    pending_po_value: Number(row.pending_po_value) || 0,
    paid_payment: Number(row.paid_payment) || 0,
    parent_project: row.parent_project ?? '',
    design_start: row.design_start ?? '',
    design_end: row.design_end ?? '',
    milestone_end: row.milestone_end ?? row.design_end ?? '',
  };
}

export function normalizeProjectProcurementVendorRow(row = {}) {
  const quoteValue = Number(row.quote_value) || 0;
  const poValue = Number(row.po_value) || 0;
  const paidAmt = Number(row.paid_amt) || 0;
  const pendingAmt =
    row.pending_amt != null && row.pending_amt !== ''
      ? Number(row.pending_amt) || 0
      : Math.max(poValue - paidAmt, 0);

  return {
    id: row.id ?? row.supplier ?? '',
    vendor_name: row.vendor_name ?? '',
    type: row.type ?? '',
    category: row.category ?? '',
    packages: Number(row.packages) || 0,
    quotes: Number(row.quotes) || 0,
    pos: Number(row.pos) || 0,
    quote_value: quoteValue,
    po_value: poValue,
    paid_amt: paidAmt,
    pending_amt: pendingAmt,
    last_updated: row.last_updated ?? '',
    work_order_status: row.work_order_status ?? null,
  };
}

export function buildProjectProcurementVendorFilterOptions(rows = []) {
  const types = new Set();
  const categories = new Set();

  for (const row of rows) {
    if (row.type) types.add(row.type);
    if (row.category) categories.add(row.category);
  }

  const toOptions = (values, allLabel) => [
    { value: 'all', label: allLabel },
    ...[...values]
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ value, label: value })),
  ];

  return {
    typeOptions: toOptions(types, 'All Types'),
    categoryOptions: toOptions(categories, 'All Categories'),
  };
}

export function buildProjectProcurementPosFilterOptions(rows = []) {
  const vendors = new Set();
  const packages = new Set();
  const categories = new Set();

  for (const row of rows) {
    if (row.vendor_name) vendors.add(row.vendor_name);
    if (row.package) packages.add(row.package);
    if (row.category) categories.add(row.category);
  }

  const toOptions = (values, allLabel) => [
    { value: 'all', label: allLabel },
    ...[...values]
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({
        value,
        label: value,
      })),
  ];

  return {
    vendorOptions: toOptions(vendors, 'All Vendors'),
    packageOptions: toOptions(packages, 'All Packages'),
    categoryOptions: toOptions(categories, 'All Categories'),
  };
}

export function buildProjectProcurementDetailStats(row = {}) {
  const supplierPaymentValue = Number(row.paid_payment) || 0;
  const pendingSupplierPayment = Math.max((Number(row.po_value) || 0) - supplierPaymentValue, 0);

  return [
    {
      value: formatProcurementAmount(row.internal_boq_value),
      label: 'Internal BOQ',
      tone: 'yellow',
      icon: 'money',
    },
    {
      value: formatProcurementAmount(row.purchase_boq_value),
      label: 'Purchase BOQ',
      tone: 'blue',
      icon: 'money',
    },
    {
      value: formatProcurementAmount(row.po_value),
      label: 'PO Value',
      tone: 'blue',
      icon: 'money',
    },
    {
      value: formatProcurementAmount(row.pending_po_value),
      label: 'Pending PO',
      tone: 'orange',
      icon: 'money',
    },
    {
      value: formatProcurementAmount(supplierPaymentValue),
      label: 'Supplier Payment Value',
      tone: 'purple',
      icon: 'money',
    },
    {
      value: formatProcurementAmount(pendingSupplierPayment),
      label: 'Pending Supplier Payment',
      tone: 'red',
      icon: 'money',
    },
  ];
}

export function buildProjectProcurementInternalBoqStats(row = {}) {
  const breakdown = Array.isArray(row.internal_boq_breakdown) ? row.internal_boq_breakdown : [];
  let mainBoqValue = 0;
  let additionalBoqValue = 0;

  for (const item of breakdown) {
    const value = Number(item?.value) || 0;
    if (value <= 0) continue;
    const label = String(item?.label ?? '').toLowerCase();
    if (label.includes('additional')) {
      additionalBoqValue += value;
    } else {
      mainBoqValue += value;
    }
  }

  const combinedBoqValue = Number(row.internal_boq_value) || mainBoqValue + additionalBoqValue;
  if (mainBoqValue === 0 && additionalBoqValue === 0 && combinedBoqValue <= 0) {
    return [];
  }

  return [
    {
      value: formatProcurementAmount(mainBoqValue),
      label: 'Main BOQ',
      tone: 'pink',
      icon: 'money',
    },
    {
      value: formatProcurementAmount(additionalBoqValue),
      label: 'Additional BOQ',
      tone: 'yellow',
      icon: 'money',
    },
    {
      value: formatProcurementAmount(combinedBoqValue),
      label: 'Combined BOQ',
      tone: 'blue',
      icon: 'money',
    },
  ];
}

const SORT_ACCESSORS = {
  name: (row) => row.name ?? '',
  status: (row) => row.status ?? '',
  city: (row) => row.city ?? '',
  stage: (row) => row.procurement_stage ?? '',
  internal_boq: (row) => row.internal_boq_value ?? 0,
  purchase_boq: (row) => row.purchase_boq_value ?? 0,
  po_value: (row) => row.po_value ?? 0,
  pending_po: (row) => row.pending_po_value ?? 0,
  paid_payment: (row) => row.paid_payment ?? 0,
  pending_payment: (row) => row.pending_payment ?? 0,
  parent_project: (row) => row.parent_project ?? '',
  design_start: (row) => row.design_start ?? '',
  design_end: (row) => row.design_end ?? '',
  last_updated: (row) => row.last_updated ?? '',
};

export function filterStaticProjectProcurementRows(
  rows = [],
  { search = '', stageFilter = 'all', statusFilter = 'all', cityFilter = 'all' } = {},
) {
  const keyword = search.trim().toLowerCase();
  const resolvedStageFilter = stageFilter !== 'all' ? stageFilter : statusFilter;

  return rows.filter((row) => {
    if (keyword) {
      const haystack = `${row.name ?? ''} ${row.city ?? ''}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    if (resolvedStageFilter !== 'all') {
      const stage = row.stage ?? row.custom_project_stage ?? '';
      // Prefer stage match; fall back to legacy project_status for old callers.
      if (stage) {
        if (stage !== resolvedStageFilter) return false;
      } else if (row.project_status !== resolvedStageFilter) {
        return false;
      }
    }
    if (cityFilter !== 'all' && row.city_value !== cityFilter) return false;

    return true;
  });
}

const VENDOR_SORT_ACCESSORS = {
  vendor_name: (row) => row.vendor_name ?? '',
  type: (row) => row.type ?? '',
  packages: (row) => row.packages ?? 0,
  quotes: (row) => row.quotes ?? 0,
  pos: (row) => row.pos ?? 0,
  quote_value: (row) => row.quote_value ?? 0,
  po_value: (row) => row.po_value ?? 0,
  paid_amt: (row) => row.paid_amt ?? 0,
  pending_amt: (row) => row.pending_amt ?? 0,
  last_updated: (row) => row.last_updated ?? '',
};

export function filterProjectProcurementVendorRows(
  rows = [],
  { search = '', typeFilter = 'all', categoryFilter = 'all' } = {},
) {
  const keyword = search.trim().toLowerCase();

  return rows.filter((row) => {
    if (keyword) {
      const haystack = [row.vendor_name, row.type, row.category, row.packages, row.quotes, row.pos]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    if (typeFilter !== 'all' && row.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && row.category !== categoryFilter) return false;

    return true;
  });
}

const POS_SORT_ACCESSORS = {
  po_number: (row) => row.po_number ?? '',
  vendor_name: (row) => row.vendor_name ?? '',
  package: (row) => row.package ?? '',
  category: (row) => row.category ?? '',
  po_date: (row) => row.po_date ?? '',
  type: (row) => row.type ?? '',
  po_value: (row) => row.po_value ?? 0,
  paid_amt: (row) => row.paid_amt ?? 0,
  pending_amt: (row) => row.pending_amt ?? 0,
  status: (row) => row.status ?? '',
  created_by: (row) => row.created_by ?? '',
  updated_by: (row) => row.updated_by ?? '',
};

export function filterProjectProcurementPosRows(
  rows = [],
  { search = '', vendorFilter = 'all', packageFilter = 'all', categoryFilter = 'all' } = {},
) {
  const keyword = search.trim().toLowerCase();

  return rows.filter((row) => {
    if (keyword) {
      const haystack = [
        row.po_number,
        row.vendor_name,
        row.package,
        row.category,
        row.type,
        row.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    if (vendorFilter !== 'all') {
      const matchesVendor = row.supplier === vendorFilter || row.vendor_name === vendorFilter;
      if (!matchesVendor) return false;
    }
    if (packageFilter !== 'all') {
      const matchesPackage = row.package_id === packageFilter || row.package === packageFilter;
      if (!matchesPackage) return false;
    }
    if (categoryFilter !== 'all') {
      const categoryName = categoryFilter.includes('::')
        ? categoryFilter.slice(0, categoryFilter.indexOf('::'))
        : categoryFilter;
      if (row.category !== categoryName && row.category !== categoryFilter) return false;
    }

    return true;
  });
}

export function sortProjectProcurementPosRows(rows = [], sorting = []) {
  if (!Array.isArray(sorting) || sorting.length === 0) return rows;

  const { id, desc } = sorting[0] ?? {};
  const accessor = POS_SORT_ACCESSORS[id];
  if (!accessor) return rows;

  const direction = desc ? -1 : 1;

  return [...rows].sort((left, right) => {
    const leftValue = accessor(left);
    const rightValue = accessor(right);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * direction;
    }

    return (
      String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: 'base',
      }) * direction
    );
  });
}

const PROCUREMENT_POS_SORT_ACCESSORS = {
  ...POS_SORT_ACCESSORS,
  project: (row) => row.project ?? '',
  stage: (row) => row.procurement_stage ?? '',
  internal_boq: (row) => row.internal_boq_value ?? 0,
  purchase_boq: (row) => row.purchase_boq_value ?? 0,
  boq_po_value: (row) => row.boq_po_value ?? 0,
  pending_po: (row) => row.pending_po_value ?? 0,
  paid_payment: (row) => row.paid_payment ?? 0,
  parent_project: (row) => row.parent_project ?? '',
  design_start: (row) => row.design_start ?? '',
  design_end: (row) => row.design_end ?? '',
  milestone_end: (row) => row.milestone_end ?? '',
};

export function filterProcurementPosRows(
  rows = [],
  {
    search = '',
    vendorFilter = 'all',
    packageFilter = 'all',
    categoryFilter = 'all',
    statusTab = 'all',
  } = {},
) {
  const keyword = search.trim().toLowerCase();

  return rows.filter((row) => {
    if (keyword) {
      const haystack = [
        row.po_number,
        row.project,
        row.vendor_name,
        row.package,
        row.category,
        row.type,
        row.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    if (vendorFilter !== 'all') {
      const matchesVendor = row.supplier === vendorFilter || row.vendor_name === vendorFilter;
      if (!matchesVendor) return false;
    }
    if (packageFilter !== 'all') {
      const matchesPackage = row.package_id === packageFilter || row.package === packageFilter;
      if (!matchesPackage) return false;
    }
    if (categoryFilter !== 'all') {
      const categoryName = categoryFilter.includes('::')
        ? categoryFilter.slice(0, categoryFilter.indexOf('::'))
        : categoryFilter;
      // Composite values are `name::level` from master options; match the bare category name.
      if (row.category !== categoryName && row.category !== categoryFilter) return false;
    }

    if (statusTab !== 'all') {
      const releaseStatusByTab = {
        released: 'Released',
        draft: 'Draft',
        'pending-approval': 'Pending Approval',
      };
      const expectedStatus = releaseStatusByTab[statusTab];
      if (expectedStatus && row.release_status !== expectedStatus) return false;
    }

    return true;
  });
}

export function getProcurementPosStatusTabCounts(rows = []) {
  return {
    all: rows.length,
    released: rows.filter((row) => row.release_status === 'Released').length,
    draft: rows.filter((row) => row.release_status === 'Draft').length,
    'pending-approval': rows.filter((row) => row.release_status === 'Pending Approval').length,
  };
}

const PROCUREMENT_POS_GROUP_BY_FIELD_MAP = {
  Vendor: 'vendor_name',
  Package: 'package',
  Category: 'category',
  Project: 'project',
  vendor_name: 'vendor_name',
  package: 'package',
  category: 'category',
  project: 'project',
};

/**
 * Build stock-style grouped sections for the PO's list.
 * @returns {Array<{ id: string, groupName: string, rows: Array, count: number }>}
 */
export function buildProcurementPosGroupedSections(rows = [], groupBy = '', groupOrder = 'asc') {
  if (!groupBy) return [];

  const field = PROCUREMENT_POS_GROUP_BY_FIELD_MAP[groupBy] ?? groupBy;
  const groups = rows.reduce((accumulator, row) => {
    const raw = row?.[field];
    const key = String(raw ?? '').trim() || 'Unknown';
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(row);
    return accumulator;
  }, {});

  const sortedEntries = Object.entries(groups).sort(([leftKey], [rightKey]) => {
    const comparison = leftKey.localeCompare(rightKey, undefined, { sensitivity: 'base' });
    return groupOrder === 'desc' ? -comparison : comparison;
  });

  return sortedEntries.map(([groupName, groupedRows]) => ({
    id: `${groupBy}-${groupName.toLowerCase().replaceAll(/\s+/g, '-') || 'unknown'}`,
    groupName,
    rows: groupedRows,
    count: groupedRows.length,
  }));
}

export function sortProcurementPosRows(rows = [], sorting = []) {
  if (!Array.isArray(sorting) || sorting.length === 0) return rows;

  const { id, desc } = sorting[0] ?? {};
  const accessor = PROCUREMENT_POS_SORT_ACCESSORS[id];
  if (!accessor) return rows;

  const direction = desc ? -1 : 1;

  return [...rows].sort((left, right) => {
    const leftValue = accessor(left);
    const rightValue = accessor(right);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * direction;
    }

    return (
      String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: 'base',
      }) * direction
    );
  });
}

export function sortProjectProcurementVendorRows(rows = [], sorting = []) {
  if (!Array.isArray(sorting) || sorting.length === 0) return rows;

  const { id, desc } = sorting[0] ?? {};
  const accessor = VENDOR_SORT_ACCESSORS[id];
  if (!accessor) return rows;

  const direction = desc ? -1 : 1;

  return [...rows].sort((left, right) => {
    const leftValue = accessor(left);
    const rightValue = accessor(right);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * direction;
    }

    return (
      String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: 'base',
      }) * direction
    );
  });
}

const PAYMENT_REGISTER_SORT_ACCESSORS = {
  vendor: (row) => row.vendor ?? '',
  po_no: (row) => row.po_no ?? '',
  package: (row) => row.package ?? '',
  category: (row) => row.category ?? '',
  po_value: (row) => row.po_value ?? 0,
  paid_amt: (row) => row.paid_amt ?? 0,
  pending_amt: (row) => row.pending_amt ?? 0,
  status: (row) => row.status ?? '',
  created_at: (row) => row.created_at ?? '',
};

export function filterProjectProcurementPaymentRegisterRows(
  rows = [],
  { search = '', vendorFilter = 'all', categoryFilter = 'all', statusFilter = 'all' } = {},
) {
  const keyword = search.trim().toLowerCase();

  return rows.filter((row) => {
    if (keyword) {
      const haystack = [row.vendor, row.po_no, row.package, row.category, row.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    if (vendorFilter !== 'all' && row.vendor_id !== vendorFilter && row.vendor !== vendorFilter) {
      return false;
    }
    if (categoryFilter !== 'all' && row.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && row.status !== statusFilter) return false;

    return true;
  });
}

export function sortProjectProcurementPaymentRegisterRows(rows = [], sorting = []) {
  if (!Array.isArray(sorting) || sorting.length === 0) return rows;

  const { id, desc } = sorting[0] ?? {};
  const accessor = PAYMENT_REGISTER_SORT_ACCESSORS[id];
  if (!accessor) return rows;

  const direction = desc ? -1 : 1;

  return [...rows].sort((left, right) => {
    const leftValue = accessor(left);
    const rightValue = accessor(right);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * direction;
    }

    return (
      String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: 'base',
      }) * direction
    );
  });
}

const PAYMENT_SHEETS_SORT_ACCESSORS = {
  sheet_name: (row) => row.sheet_name ?? '',
  sheet_no: (row) => row.sheet_no ?? '',
  master_sheet: (row) => row.master_sheet ?? '',
  expected_payment_date: (row) => row.expected_payment_date ?? '',
  requested_budget: (row) => row.requested_budget ?? 0,
  allocated_budget: (row) => row.allocated_budget ?? 0,
  vendors: (row) => row.vendors ?? 0,
  status: (row) => row.status ?? '',
  created_by: (row) => row.created_by ?? '',
  created_at: (row) => row.created_at ?? '',
  last_updated: (row) => row.last_updated ?? '',
};

export function filterProjectProcurementPaymentSheetRows(
  rows = [],
  { search = '', statusFilter = 'all' } = {},
) {
  const keyword = search.trim().toLowerCase();

  return rows.filter((row) => {
    if (keyword) {
      const haystack = [row.sheet_name, row.sheet_no, row.master_sheet, row.status, row.created_by]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    if (statusFilter !== 'all' && row.status !== statusFilter) return false;

    return true;
  });
}

export function sortProjectProcurementPaymentSheetRows(rows = [], sorting = []) {
  if (!Array.isArray(sorting) || sorting.length === 0) return rows;

  const { id, desc } = sorting[0] ?? {};
  const accessor = PAYMENT_SHEETS_SORT_ACCESSORS[id];
  if (!accessor) return rows;

  const direction = desc ? -1 : 1;

  return [...rows].sort((left, right) => {
    const leftValue = accessor(left);
    const rightValue = accessor(right);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * direction;
    }

    return (
      String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: 'base',
      }) * direction
    );
  });
}

export function sortStaticProjectProcurementRows(rows = [], sorting = []) {
  if (!Array.isArray(sorting) || sorting.length === 0) return rows;

  const { id, desc } = sorting[0] ?? {};
  const accessor = SORT_ACCESSORS[id];
  if (!accessor) return rows;

  const direction = desc ? -1 : 1;

  return [...rows].sort((left, right) => {
    const leftValue = accessor(left);
    const rightValue = accessor(right);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * direction;
    }

    return (
      String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: 'base',
      }) * direction
    );
  });
}

const VENDOR_PAYMENTS_SORT_ACCESSORS = {
  vendor_name: (row) => row.vendor_name ?? '',
  project: (row) => row.project ?? '',
  payment_date: (row) => row.payment_date ?? '',
  po_no: (row) => row.po_no ?? '',
  invoice_no: (row) => row.invoice_no ?? '',
  gross_amt: (row) => row.gross_amt ?? 0,
  tds: (row) => row.tds ?? 0,
  net_paid: (row) => row.net_paid ?? 0,
  bill_received: (row) => row.bill_received ?? 0,
  bill_no: (row) => row.bill_no ?? '',
  status: (row) => row.status ?? '',
  procurement_stage: (row) => row.procurement_stage ?? '',
  internal_boq: (row) => row.internal_boq_value ?? 0,
  purchase_boq: (row) => row.purchase_boq_value ?? 0,
  po_value: (row) => row.po_value ?? 0,
  pending_po: (row) => row.pending_po_value ?? 0,
  paid_payment: (row) => row.paid_payment ?? 0,
  parent_project: (row) => row.parent_project ?? '',
  design_start: (row) => row.design_start ?? '',
  design_end: (row) => row.design_end ?? '',
  milestone_end: (row) => row.milestone_end ?? '',
  created_by: (row) => row.created_by ?? '',
  last_updated: (row) => row.last_updated ?? '',
};

export function filterVendorPaymentsRows(
  rows = [],
  { search = '', vendorFilter = 'all', projectFilter = 'all' } = {},
) {
  const keyword = search.trim().toLowerCase();

  return rows.filter((row) => {
    if (keyword) {
      const haystack = [
        row.vendor_name,
        row.project,
        row.po_no,
        row.invoice_no,
        row.bill_no,
        row.bill_received,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    if (vendorFilter !== 'all' && row.vendor_name !== vendorFilter) return false;
    if (projectFilter !== 'all' && row.project !== projectFilter) return false;

    return true;
  });
}

export function sortVendorPaymentsRows(rows = [], sorting = []) {
  if (!Array.isArray(sorting) || sorting.length === 0) return rows;

  const { id, desc } = sorting[0] ?? {};
  const accessor = VENDOR_PAYMENTS_SORT_ACCESSORS[id];
  if (!accessor) return rows;

  const direction = desc ? -1 : 1;

  return [...rows].sort((left, right) => {
    const leftValue = accessor(left);
    const rightValue = accessor(right);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * direction;
    }

    return (
      String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: 'base',
      }) * direction
    );
  });
}

const BILL_AND_INVOICE_SORT_ACCESSORS = {
  invoice_no: (row) => row.invoice_no ?? '',
  vendor: (row) => row.vendor ?? '',
  project: (row) => row.project ?? '',
  po_no: (row) => row.po_no ?? '',
  po_value: (row) => row.po_value ?? 0,
  bill_date: (row) => row.bill_date ?? '',
  bill_amt: (row) => row.bill_amt ?? 0,
  gst_amt: (row) => row.gst_amt ?? 0,
  linked_bill: (row) =>
    typeof row.linked_bill === 'object' && row.linked_bill?.name
      ? row.linked_bill.name
      : (row.linked_bill ?? ''),
  status: (row) => row.status ?? '',
  created_by: (row) => row.created_by ?? '',
  last_updated: (row) => row.last_updated ?? '',
};

export function filterBillAndInvoiceRows(rows = [], { search = '', statusFilter = 'all' } = {}) {
  const keyword = search.trim().toLowerCase();

  return rows.filter((row) => {
    if (keyword) {
      const haystack = [
        row.invoice_no,
        row.vendor,
        row.project,
        row.po_no,
        typeof row.linked_bill === 'object' && row.linked_bill?.name
          ? row.linked_bill.name
          : row.linked_bill,
        row.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    if (statusFilter !== 'all' && row.status !== statusFilter) return false;

    return true;
  });
}

export function sortBillAndInvoiceRows(rows = [], sorting = []) {
  if (!Array.isArray(sorting) || sorting.length === 0) return rows;

  const { id, desc } = sorting[0] ?? {};
  const accessor = BILL_AND_INVOICE_SORT_ACCESSORS[id];
  if (!accessor) return rows;

  const direction = desc ? -1 : 1;

  return [...rows].sort((left, right) => {
    const leftValue = accessor(left);
    const rightValue = accessor(right);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * direction;
    }

    return (
      String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: 'base',
      }) * direction
    );
  });
}

const MASTER_PAYMENT_SHEETS_SORT_ACCESSORS = {
  sheet_name: (row) => row.sheet_name ?? '',
  month: (row) => row.month ?? '',
  budgeted: (row) => row.budgeted ?? 0,
  requested: (row) => row.requested ?? 0,
  difference: (row) => row.difference ?? 0,
  status: (row) => row.status ?? '',
  vendors: (row) => row.vendors ?? 0,
  projects: (row) => row.projects ?? 0,
  created_by: (row) => row.created_by ?? '',
  last_updated: (row) => row.last_updated ?? '',
};

export function filterMasterPaymentSheetRows(
  rows = [],
  { search = '', statusFilter = 'all' } = {},
) {
  const keyword = search.trim().toLowerCase();

  return rows.filter((row) => {
    if (keyword) {
      const haystack = [row.sheet_name, row.month, row.status, row.created_by]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    if (statusFilter !== 'all' && row.status !== statusFilter) return false;

    return true;
  });
}

export function sortMasterPaymentSheetRows(rows = [], sorting = []) {
  if (!Array.isArray(sorting) || sorting.length === 0) return rows;

  const { id, desc } = sorting[0] ?? {};
  const accessor = MASTER_PAYMENT_SHEETS_SORT_ACCESSORS[id];
  if (!accessor) return rows;

  const direction = desc ? -1 : 1;

  return [...rows].sort((left, right) => {
    const leftValue = accessor(left);
    const rightValue = accessor(right);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * direction;
    }

    return (
      String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: 'base',
      }) * direction
    );
  });
}

const MASTER_PAYMENT_SHEET_DETAIL_SORT_ACCESSORS = {
  project: (row) => row.project_name || row.project || '',
  vendor: (row) => row.vendor ?? '',
  category: (row) => row.category ?? '',
  po_no: (row) => row.po_no ?? '',
  po_value: (row) => row.po_value ?? 0,
  paid_amt: (row) => row.paid_amt ?? 0,
  pending_amt: (row) => row.pending_amt ?? 0,
  requested_amt: (row) => row.requested_amt ?? 0,
  allocated_amt: (row) => row.allocated_amt ?? '',
  remarks: (row) => row.remarks ?? '',
};

export function filterMasterPaymentSheetDetailRows(
  rows = [],
  { search = '', projectFilter = 'all', vendorFilter = 'all', categoryFilter = 'all' } = {},
) {
  const keyword = search.trim().toLowerCase();

  return rows.filter((row) => {
    if (keyword) {
      const haystack = [row.project_name || row.project, row.vendor, row.category, row.po_no]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    if (projectFilter !== 'all' && row.project !== projectFilter) return false;
    if (vendorFilter !== 'all' && row.vendor !== vendorFilter) return false;
    if (categoryFilter !== 'all' && row.category !== categoryFilter) return false;

    return true;
  });
}

export function sortMasterPaymentSheetDetailRows(rows = [], sorting = []) {
  if (!Array.isArray(sorting) || sorting.length === 0) return rows;

  const { id, desc } = sorting[0] ?? {};
  const accessor = MASTER_PAYMENT_SHEET_DETAIL_SORT_ACCESSORS[id];
  if (!accessor) return rows;

  const direction = desc ? -1 : 1;

  return [...rows].sort((left, right) => {
    const leftValue = accessor(left);
    const rightValue = accessor(right);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * direction;
    }

    return (
      String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: 'base',
      }) * direction
    );
  });
}

export function normalizeProjectPaymentRegisterRow(row = {}) {
  const purchaseOrder = row.purchase_order || row.po_no || row.id || '';
  return {
    id: purchaseOrder,
    purchase_order: purchaseOrder,
    po_no: row.po_no || purchaseOrder,
    vendor: row.vendor_name || row.vendor || '',
    vendor_id: row.vendor || row.vendor_id || '',
    package: row.package ?? '',
    category: row.category ?? '',
    po_value: Number(row.po_value) || 0,
    paid_amt: Number(row.paid_amt ?? row.paid_amount) || 0,
    pending_amt: Number(row.pending_amt ?? row.pending_amount) || 0,
    status: row.status ?? '',
    created_at: row.created_at ?? '',
  };
}

export function normalizeProjectPaymentRegisterRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map(normalizeProjectPaymentRegisterRow);
}

export function normalizeCreatePaymentSheetVendors(vendors = []) {
  return (Array.isArray(vendors) ? vendors : []).map((vendor) => ({
    ...vendor,
    id: vendor.id || vendor.vendor,
    vendor: vendor.vendor || vendor.id,
    vendor_name: vendor.vendor_name || vendor.vendor || '',
    expanded: Boolean(vendor.expanded),
    pos: (vendor.pos || []).map((po) => ({
      ...po,
      id: po.id || po.purchase_order || po.po_no,
      purchase_order: po.purchase_order || po.po_no || po.id,
      po_no: po.po_no || po.purchase_order || po.id,
    })),
  }));
}

function parseAmountInput(raw) {
  const value = String(raw ?? '')
    .trim()
    .replaceAll(',', '');
  if (!value) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function buildCreateProjectPaymentSheetPayload({
  sheetName,
  projectId,
  masterSheet = '',
  expectedPaymentDate = null,
  remarks = '',
  status = 'Draft',
  vendors = [],
  poAmounts = {},
  poPercents = {},
} = {}) {
  const items = [];
  for (const vendor of vendors) {
    for (const po of vendor.pos || []) {
      const poKey = po.id || po.purchase_order || po.po_no;
      const requested = parseAmountInput(poAmounts[poKey]);
      if (requested == null || requested <= 0) continue;
      const requestedPct = parseAmountInput(poPercents[poKey]);
      items.push({
        vendor: vendor.vendor || vendor.id,
        purchase_order: po.purchase_order || poKey,
        po_no: po.po_no || po.purchase_order || poKey,
        package: po.package || undefined,
        category: po.category || undefined,
        po_value: Number(po.po_value) || 0,
        due_as_per_terms: Number(po.due_as_per_terms) || 0,
        due_terms_pct: Number(po.due_terms_pct) || 0,
        requested_amount: requested,
        requested_pct: requestedPct ?? 0,
        design_end: po.design_end || null,
        milestone_end: po.milestone_end || null,
      });
    }
  }

  return {
    sheet_name: String(sheetName || '').trim(),
    project: projectId,
    master_payment_sheet: masterSheet || undefined,
    expected_payment_date: expectedPaymentDate || undefined,
    remarks: remarks || undefined,
    status,
    items,
  };
}

export function buildPaymentRegisterFilterOptions(rows = []) {
  const vendors = new Map();
  const categories = new Set();
  for (const row of rows) {
    if (row.vendor_id || row.vendor) {
      vendors.set(row.vendor_id || row.vendor, row.vendor || row.vendor_id);
    }
    if (row.category) categories.add(row.category);
  }
  return {
    vendorOptions: [
      { value: 'all', label: 'All Vendors' },
      ...[...vendors.entries()].map(([value, label]) => ({ value, label })),
    ],
    categoryOptions: [
      { value: 'all', label: 'All Categories' },
      ...[...categories].sort().map((value) => ({ value, label: value })),
    ],
  };
}

export function buildProjectProcurementPurchaseBoqStats(row = {}) {
  const boqValue = Number(row.internal_boq_value) || 0;
  const purchaseBoqValue = Number(row.purchase_boq_value) || 0;
  const poValue = Number(row.po_value) || 0;
  const pendingPoValue = Number(row.pending_po_value) || 0;
  const packageCount = Number(row.package_count) || 0;
  const totalBillValue = Number(row.total_bill_value) || 0;
  const paidPayment = Number(row.paid_payment) || 0;
  const pendingPayment =
    row.pending_payment != null && row.pending_payment !== ''
      ? Number(row.pending_payment) || 0
      : Math.max(poValue - paidPayment, 0);

  return [
    {
      value: formatProcurementAmount(boqValue),
      label: 'BOQ Value',
      tone: 'pink',
      icon: 'money',
    },
    {
      value: formatProcurementAmount(purchaseBoqValue),
      label: 'Purchase BOQ',
      tone: 'teal',
      icon: 'chart',
    },
    {
      value: formatProcurementAmount(poValue),
      label: 'PO Value',
      tone: 'yellow',
      icon: 'money',
    },
    {
      value: formatProcurementAmount(pendingPoValue),
      label: 'Pending PO Value',
      tone: 'blue',
      icon: 'money',
    },
    {
      value: String(packageCount).padStart(2, '0'),
      label: 'No. of Packages',
      tone: 'purple',
      icon: 'box',
    },
    {
      value: formatProcurementAmount(totalBillValue),
      label: 'Total Bill Value',
      tone: 'red',
      icon: 'money',
    },
    {
      value: formatProcurementAmount(paidPayment),
      label: 'Paid Payment',
      tone: 'green',
      icon: 'money',
    },
    {
      value: formatProcurementAmount(pendingPayment),
      label: 'Pending Payment',
      tone: 'orange',
      icon: 'money',
    },
  ];
}
