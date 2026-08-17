export const PNL_PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export const DEFAULT_PNL_FILTERS = {
  search: '',
  center: '',
  period: 'monthly',
  month: '',
};

/** Session compaction for center-detail PnL tab (month preset only). */
export const CENTER_DETAIL_PNL_FILTER_PERSIST_OPTS = {
  includeKeys: ['month'],
  ignoreStringValuesByKey: {
    month: ['All', 'Last 12 months', 'last_12'],
  },
};

export const MONTH_RANGE_OPTIONS = [
  { value: 'last_3', label: 'Last 3 months' },
  { value: 'last_6', label: 'Last 6 months' },
  { value: 'last_9', label: 'Last 9 months' },
  { value: 'last_12', label: 'Last 12 months' },
];
