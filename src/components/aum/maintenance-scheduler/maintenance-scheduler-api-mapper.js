import { MS_MONTH_COLUMNS } from '@/components/aum/maintenance-scheduler/maintenance-scheduler-constants';
import { getMsAllowedMonthIndexes } from '@/components/aum/maintenance-scheduler/maintenance-scheduler-helper';

const FREQUENCY_TO_UI = {
  Monthly: 'monthly',
  Quarterly: 'quarterly',
  Annually: 'annually',
  monthly: 'monthly',
  quarterly: 'quarterly',
  annually: 'annually',
};

const FREQUENCY_TO_API = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
  Monthly: 'Monthly',
  Quarterly: 'Quarterly',
  Annually: 'Annually',
};

export function normalizeFrequencyToUi(frequency) {
  const value = String(frequency ?? '').trim();
  if (!value) return '';
  return FREQUENCY_TO_UI[value] ?? value.toLowerCase();
}

export function normalizeFrequencyToApi(frequency) {
  const value = String(frequency ?? '').trim();
  if (!value) return '';
  return FREQUENCY_TO_API[value] ?? value;
}

function mapPlannedMonthsToCells(frequency, plannedMonths = []) {
  const plannedSet = new Set(
    (plannedMonths ?? [])
      .filter((row) => row?.is_planned)
      .map((row) => String(row.month ?? '').trim())
      .filter(Boolean),
  );
  const uiFrequency = normalizeFrequencyToUi(frequency);
  const allowedIndexes = getMsAllowedMonthIndexes(uiFrequency);

  return MS_MONTH_COLUMNS.map((column, index) => {
    if (!allowedIndexes.includes(index)) {
      return { type: 'empty' };
    }
    return { type: plannedSet.has(column.label) ? 'planned' : 'add' };
  });
}

function mapCellsToPlannedMonths(frequency, monthCells = []) {
  const uiFrequency = normalizeFrequencyToUi(frequency);
  const allowedIndexes = getMsAllowedMonthIndexes(uiFrequency);

  return MS_MONTH_COLUMNS.map((column, index) => {
    if (!allowedIndexes.includes(index)) return null;
    return {
      month: column.label,
      is_planned: monthCells[index]?.type === 'planned' ? 1 : 0,
    };
  }).filter(Boolean);
}

/**
 * @param {object} node
 * @returns {import('./maintenance-scheduler-constants').MsSchedulerRow}
 */
function mapApiNodeToSchedulerRow(node) {
  const children = Array.isArray(node.children)
    ? node.children.map(mapApiNodeToSchedulerRow)
    : undefined;

  return {
    id: node.name || node.product_type,
    productType: node.product_type || '',
    assigneeRole: node.assignee_role || '',
    frequency: normalizeFrequencyToUi(node.frequency) || 'monthly',
    monthCells: mapPlannedMonthsToCells(node.frequency || 'Monthly', node.planned_months),
    children,
    showGroupDividerAfter: Boolean(children?.length),
    apiMeta: {
      name: node.name || '',
      scheduleMaster: node.schedule_master || node.name || '',
      productType: node.product_type || '',
      isCustomized: Boolean(node.is_customized),
    },
  };
}

/** @param {object[]} tree */
export function mapApiTreeToSchedulerRows(tree = []) {
  return (tree ?? []).map(mapApiNodeToSchedulerRow);
}

/** @param {import('./maintenance-scheduler-constants').MsSchedulerRow} row */
export function mapSchedulerRowToApiPayload(row) {
  const frequency = normalizeFrequencyToApi(row.frequency) || 'Monthly';

  return {
    name: row.apiMeta?.name || row.id,
    product_type: row.apiMeta?.productType || row.productType,
    assignee_role: row.assigneeRole || null,
    frequency,
    planned_months: mapCellsToPlannedMonths(frequency, row.monthCells),
    is_customized: row.apiMeta?.isCustomized ? 1 : 0,
  };
}
