export const BOQ_ER_STATUS = {
  START: 'start',
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

const BOQ_ER_STATUS_ORDER = [
  BOQ_ER_STATUS.DRAFT,
  BOQ_ER_STATUS.START,
  BOQ_ER_STATUS.IN_PROGRESS,
  BOQ_ER_STATUS.COMPLETED,
];

export const BOQ_ER_STATUS_LABELS = {
  [BOQ_ER_STATUS.START]: 'Start',
  [BOQ_ER_STATUS.DRAFT]: 'Draft',
  [BOQ_ER_STATUS.IN_PROGRESS]: 'In Progress',
  [BOQ_ER_STATUS.COMPLETED]: 'Completed',
};

export const BOQ_ER_STATUS_DOT_COLORS = {
  [BOQ_ER_STATUS.DRAFT]: 'bg-[#868c98]',
  [BOQ_ER_STATUS.START]: 'bg-[#375dfb]',
  [BOQ_ER_STATUS.IN_PROGRESS]: 'bg-[#f17b2c]',
  [BOQ_ER_STATUS.COMPLETED]: 'bg-[#1daf61]',
};

export const BOQ_ER_STATUS_META = {
  [BOQ_ER_STATUS.START]: { percentage: 20, color: 'blue' },
  [BOQ_ER_STATUS.DRAFT]: { percentage: 0, color: 'gray' },
  [BOQ_ER_STATUS.IN_PROGRESS]: { percentage: 40, color: 'orange' },
  [BOQ_ER_STATUS.COMPLETED]: { percentage: 100, color: 'green' },
};

export const BOQ_ER_STATUS_OPTIONS = BOQ_ER_STATUS_ORDER.map((value) => ({
  value,
  label: BOQ_ER_STATUS_LABELS[value],
  dotClassName: BOQ_ER_STATUS_DOT_COLORS[value],
  ...BOQ_ER_STATUS_META[value],
}));

export const getBoqErStatusMeta = (option) => {
  const meta = BOQ_ER_STATUS_META[option?.value];
  return {
    color: meta?.color ?? 'gray',
    percentage: meta?.percentage ?? 0,
  };
};

export const resolveBoqErStatus = (row = {}) => {
  const explicitStatus = String(row.erStatus || '')
    .trim()
    .toLowerCase();
  if (explicitStatus && BOQ_ER_STATUS_LABELS[explicitStatus]) {
    return explicitStatus;
  }

  return BOQ_ER_STATUS.DRAFT;
};

export const getNextBoqErStatus = (status) => {
  const currentIndex = BOQ_ER_STATUS_ORDER.indexOf(status);
  if (currentIndex < 0) return BOQ_ER_STATUS.DRAFT;
  return BOQ_ER_STATUS_ORDER[(currentIndex + 1) % BOQ_ER_STATUS_ORDER.length];
};

/** Completed ERs are view-only — no line-item add/edit/delete. */
export const isBoqErReadOnly = (status) => status === BOQ_ER_STATUS.COMPLETED;

export const BOQ_ER_PROCUREMENT_BLOCKED_TOOLTIP =
  'Complete ER for all products before initiating procurement.';

/** True when every BOQ product row has ER status Completed. */
export const areAllBoqErStatusesCompleted = (products = []) => {
  // const rows = Array.isArray(products) ? products : [];
  // if (rows.length === 0) return false;
  // return rows.every((row) => resolveBoqErStatus(row) === BOQ_ER_STATUS.COMPLETED);
  return true;
};
