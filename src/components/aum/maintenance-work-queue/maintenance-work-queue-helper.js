import { AUM_FILTER_VALUE_ALL } from '@/components/aum/constants';

export function buildMwqToolbarCenterOptions(centerOptions = []) {
  return [{ value: AUM_FILTER_VALUE_ALL, label: 'All Centers' }, ...centerOptions];
}

export function resolveMwqCenterFilterValue(selectedCenter) {
  return selectedCenter && selectedCenter !== AUM_FILTER_VALUE_ALL ? selectedCenter : '';
}

/**
 * @typedef {Object} MwqAssignee
 * @property {string} name
 * @property {string} initials
 * @property {string} [email]
 */

/**
 * @typedef {Object} MwqAssetRow
 * @property {string} id
 * @property {string} name
 * @property {string} productCode
 * @property {string} [image]
 * @property {MwqAssignee[]} assignees
 * @property {string} primaryAssigneeEmail
 * @property {string} startDate
 * @property {string} dueDate
 * @property {string} condition
 * @property {string} status
 * @property {string} priority
 * @property {string} brand
 * @property {string} area
 * @property {string} center
 * @property {string} centerSlug
 * @property {string} productType
 * @property {string} productTypeSlug
 * @property {string} productGroup
 * @property {string} productCategory
 * @property {string} categoryGroup
 * @property {string} purchaseDate
 * @property {string} warrantyDueDate
 * @property {string} originalValue
 * @property {string} currentValue
 * @property {string} lastMaintenanceDate
 * @property {string} totalMaintenanceValue
 * @property {string|null} [sourcePreventiveCheckId]
 */

/**
 * @typedef {Object} MwqProductTypeGroup
 * @property {string} id
 * @property {string} name
 * @property {MwqAssetRow[]} rows
 */

/** @param {MwqAssetRow[]} rows @param {string} rowId @param {Partial<MwqAssetRow>} patch */
export function updateMwqRow(rows, rowId, patch) {
  return rows.map((row) => {
    if (row.id !== rowId) return row;
    const next = { ...row, ...patch };
    if (patch.condition === 'Good' && patch.status === undefined) {
      next.status = 'Checked';
    }
    return next;
  });
}
