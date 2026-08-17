/** Analytics tab — stats, tables, chart seed data, and period helpers. */

export const COLLECTIONS_ANALYTICS_STATS = {
  total_boq_value: {
    label: 'Total BOQ Value',
    value: '₹99.15 Cr',
    valueClassName: 'text-text-main-900',
    accentClassName: 'border-t-stroke-soft-200',
  },
  invoiced_with_gst: {
    label: 'Invoiced (W GST)',
    value: '₹64.43 Cr',
    valueClassName: 'text-feature-base',
    accentClassName: 'border-t-feature-base',
  },
  received: {
    label: 'Received',
    value: '₹40.49 Cr',
    valueClassName: 'text-success-base',
    accentClassName: 'border-t-success-base',
  },
  outstanding: {
    label: 'Outstanding',
    value: '₹23.94 Cr',
    valueClassName: 'text-warning-base',
    accentClassName: 'border-t-warning-base',
  },
  overdue: {
    label: 'Overdue',
    value: '₹67.26 L',
    valueClassName: 'text-error-base',
    accentClassName: 'border-t-error-base',
  },
  dlp_outstanding: {
    label: 'DLP Outstanding',
    value: '₹2.94 Cr',
    valueClassName: 'text-information-base',
    accentClassName: 'border-t-information-base',
  },
  post_dlp_due: {
    label: 'Post DLP Due',
    value: '₹1.94 Cr',
    valueClassName: 'text-text-sub-600',
    accentClassName: 'border-t-stroke-soft-200',
  },
};

export const COLLECTIONS_ANALYTICS_FY_OPTIONS = [
  { value: 'fy-2026-27', label: 'FY 2026-27' },
  { value: 'fy-2025-26', label: 'FY 2025-26' },
  { value: 'fy-2024-25', label: 'FY 2024-25' },
];

export const COLLECTIONS_ANALYTICS_PERIOD_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

export const COLLECTIONS_ANALYTICS_STATUS_FILTER_OPTIONS = [
  { value: 'dlp', label: 'DLP' },
  { value: 'all', label: 'All' },
  { value: 'post-dlp', label: 'Post DLP' },
];

export const COLLECTIONS_CHART_COLORS = {
  expected: '#253EA7',
  actual: '#C2D6FF',
};

const ANALYTICS_OUTSTANDING_BASE = [
  {
    id: 'topgrip',
    name: 'Topgrip',
    amount: '49.56 L',
    amount_sort: 4956000,
    last_inv_date: '23rd May 26',
  },
  {
    id: 'iclean',
    name: 'IClean',
    amount: '99.12 L',
    amount_sort: 9912000,
    last_inv_date: '23rd May 26',
  },
  {
    id: 'north-star-mall',
    name: 'North Star Mall',
    amount: '67.26 L',
    amount_sort: 6726000,
    last_inv_date: '23rd May 26',
  },
  {
    id: 'athera-foods',
    name: 'Athera Foods',
    amount: '1.24 Cr',
    amount_sort: 12400000,
    last_inv_date: '23rd May 26',
  },
  {
    id: 'ambertech',
    name: 'AmberTech',
    amount: '49.56 L',
    amount_sort: 4956000,
    last_inv_date: '23rd May 26',
  },
  {
    id: 'nexora-works',
    name: 'Nexora Works',
    amount: '99.12 L',
    amount_sort: 9912000,
    last_inv_date: '23rd May 26',
  },
  {
    id: 'vertex-spaces',
    name: 'Vertex Spaces',
    amount: '67.26 L',
    amount_sort: 6726000,
    last_inv_date: '23rd May 26',
  },
];

export const COLLECTIONS_PROJECT_OUTSTANDING_ROWS = ANALYTICS_OUTSTANDING_BASE.map((row) => ({
  ...row,
  status: 'dlp',
}));

export const COLLECTIONS_DLP_OUTSTANDING_ROWS = ANALYTICS_OUTSTANDING_BASE.map((row, index) => ({
  ...row,
  id: `dlp-${row.id}`,
  amount: index % 2 === 0 ? '38.20 L' : '72.45 L',
  amount_sort: index % 2 === 0 ? 3820000 : 7245000,
  status: 'dlp',
}));

/** Values in rupees (not crores) for chart axis formatting. */
const MONTHLY_LABELS = [
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
  'JAN',
  'FEB',
  'MAR',
];

const MONTHLY_BILLING_EXPECTED = [
  34300000, 52000000, 41000000, 38000000, 45000000, 39000000, 42000000, 47000000, 36000000,
  40000000, 43000000, 48000000,
];
const MONTHLY_BILLING_ACTUAL = [
  13300000, 35000000, 28000000, 25000000, 31000000, 27000000, 29000000, 33000000, 24000000,
  26000000, 30000000, 34000000,
];

const MONTHLY_COLLECTION_EXPECTED = [
  31000000, 48000000, 39000000, 35000000, 42000000, 37000000, 40000000, 44000000, 33000000,
  38000000, 41000000, 46000000,
];
const MONTHLY_COLLECTION_ACTUAL = [
  12000000, 32000000, 26000000, 23000000, 29000000, 25000000, 27000000, 31000000, 22000000,
  24000000, 28000000, 32000000,
];

const WEEKLY_LABELS = [
  'W9',
  'W10',
  'W11',
  'W12',
  'W13',
  'W14',
  'W15',
  'W16',
  'W17',
  'W18',
  'W19',
  'W20',
  'W21',
  'W22',
  'W23',
  'W24',
  'W25',
  'W26',
  'W27',
  'W28',
  'W29',
  'W30',
  'W31',
  'W32',
  'W33',
  'W34',
  'W35',
];

function downsampleSeries(series, targetLength) {
  if (series.length <= targetLength) return series;
  const chunk = series.length / targetLength;
  return Array.from({ length: targetLength }, (_, index) => {
    const start = Math.floor(index * chunk);
    const end = Math.floor((index + 1) * chunk);
    const slice = series.slice(start, end);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
}

function buildWeeklyFromMonthly(monthlySeries) {
  return downsampleSeries(monthlySeries, WEEKLY_LABELS.length).map((value) =>
    Math.round(value * 0.28),
  );
}

const QUARTERLY_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];
const QUARTERLY_CATEGORY_LABELS = [
  'Q1 (Apr-Jun 2026)',
  'Q2 (Jul-Sep 2026)',
  'Q3 (Oct-Dec 2026)',
  'Q4 (Jan-Mar 2027)',
];

const ANNUAL_LABELS = ['2026 (APR-DEC)', '2027 (JAN-MAR)'];

function buildAnnualFromMonthly(monthlySeries) {
  const firstNine = monthlySeries.slice(0, 9).reduce((sum, value) => sum + value, 0);
  const lastThree = monthlySeries.slice(9).reduce((sum, value) => sum + value, 0);
  return [firstNine, lastThree];
}

function buildWeeklySparse(monthlySeries) {
  const weekly = buildWeeklyFromMonthly(monthlySeries);
  return weekly.map((value, index) => (index < 12 ? value : 0));
}

function buildQuarterlyFromMonthly(monthlySeries) {
  return [0, 1, 2, 3].map((quarter) => {
    const slice = monthlySeries.slice(quarter * 3, quarter * 3 + 3);
    return slice.reduce((sum, value) => sum + value, 0);
  });
}

const CHART_DATASETS = {
  billing: {
    monthly: {
      labels: MONTHLY_LABELS,
      expected: MONTHLY_BILLING_EXPECTED,
      actual: MONTHLY_BILLING_ACTUAL,
    },
    weekly: {
      labels: WEEKLY_LABELS,
      categoryLabels: WEEKLY_LABELS.map((label, index) =>
        index < 12 ? `${label} (15-21 Jun 2026)` : label,
      ),
      expected: buildWeeklySparse(MONTHLY_BILLING_EXPECTED),
      actual: buildWeeklySparse(MONTHLY_BILLING_ACTUAL),
    },
    quarterly: {
      labels: QUARTERLY_LABELS,
      categoryLabels: QUARTERLY_CATEGORY_LABELS,
      expected: buildQuarterlyFromMonthly(MONTHLY_BILLING_EXPECTED),
      actual: buildQuarterlyFromMonthly(MONTHLY_BILLING_ACTUAL),
    },
    annually: {
      labels: ANNUAL_LABELS,
      categoryLabels: ANNUAL_LABELS,
      expected: buildAnnualFromMonthly(MONTHLY_BILLING_EXPECTED),
      actual: buildAnnualFromMonthly(MONTHLY_BILLING_ACTUAL),
    },
  },
  collection: {
    monthly: {
      labels: MONTHLY_LABELS,
      expected: MONTHLY_COLLECTION_EXPECTED,
      actual: MONTHLY_COLLECTION_ACTUAL,
    },
    weekly: {
      labels: WEEKLY_LABELS,
      categoryLabels: WEEKLY_LABELS.map((label, index) =>
        index < 12 ? `${label} (15-21 Jun 2026)` : label,
      ),
      expected: buildWeeklySparse(MONTHLY_COLLECTION_EXPECTED),
      actual: buildWeeklySparse(MONTHLY_COLLECTION_ACTUAL),
    },
    quarterly: {
      labels: QUARTERLY_LABELS,
      categoryLabels: QUARTERLY_CATEGORY_LABELS,
      expected: buildQuarterlyFromMonthly(MONTHLY_COLLECTION_EXPECTED),
      actual: buildQuarterlyFromMonthly(MONTHLY_COLLECTION_ACTUAL),
    },
    annually: {
      labels: ANNUAL_LABELS,
      categoryLabels: ANNUAL_LABELS,
      expected: buildAnnualFromMonthly(MONTHLY_COLLECTION_EXPECTED),
      actual: buildAnnualFromMonthly(MONTHLY_COLLECTION_ACTUAL),
    },
  },
};

export function getCollectionsAnalyticsChartData(chartType, period = 'monthly') {
  const dataset = CHART_DATASETS[chartType]?.[period] ?? CHART_DATASETS.billing.monthly;
  return {
    labels: dataset.labels,
    categoryLabels: dataset.categoryLabels ?? dataset.labels,
    expected: dataset.expected,
    actual: dataset.actual,
  };
}

export function buildCollectionsChartModel({
  expected = [],
  actual = [],
  showExpected,
  showActual,
}) {
  const labels = expected.map((_, index) => index);
  const visibleGroups = [];

  if (showActual) {
    visibleGroups.push({
      label: 'Actual',
      color: COLLECTIONS_CHART_COLORS.actual,
      data: actual,
    });
  }

  if (showExpected) {
    visibleGroups.push({
      label: 'Expected',
      color: COLLECTIONS_CHART_COLORS.expected,
      data: expected,
    });
  }

  const totals = labels.map((_, index) => {
    const actualValue = showActual ? (actual[index] ?? 0) : 0;
    const expectedValue = showExpected ? (expected[index] ?? 0) : 0;
    return Math.max(actualValue, expectedValue);
  });

  const maxRaw = Math.max(...totals, ...expected, ...actual, 1);
  const maxVal = Math.ceil(maxRaw / 15000000) * 15000000 || 60000000;
  const tickValues = [maxVal, (maxVal * 3) / 4, maxVal / 2, maxVal / 4, 0];

  return { totals, maxVal, tickValues, groups: visibleGroups };
}
