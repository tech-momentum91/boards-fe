/**
 * @param {object} row
 * @returns {import('./maintenance-work-queue-helper').MwqAssetRow}
 */
export function mapPreventiveCheckRowFromApi(row = {}) {
  return {
    id: row.id || row.name || '',
    name: row.name || row.productName || '',
    productName: row.productName || row.name || '',
    serialNumber: row.serialNumber || '',
    productCode: row.productCode || '',
    image: row.image || '',
    assignees: Array.isArray(row.assignees) ? row.assignees : [],
    primaryAssigneeEmail: row.primaryAssigneeEmail || '',
    startDate: row.startDate || '',
    dueDate: row.dueDate || '',
    condition: row.condition || '',
    status: row.status || 'Pending',
    priority: row.priority || 'Medium',
    brand: row.brand || '—',
    brandSlug: row.brandSlug || 'other',
    area: row.area || '—',
    center: row.center || row.centerName || '—',
    centerName: row.centerName || row.center || '—',
    centerSlug: row.centerSlug || '',
    productType: row.productType || '—',
    productTypeSlug: row.productTypeSlug || 'other',
    productGroup: row.productGroup || '—',
    productGroupSlug: row.productGroupSlug || 'other',
    productCategory: row.productCategory || '—',
    productCategorySlug: row.productCategorySlug || 'other',
    categoryGroup: row.categoryGroup || '—',
    purchaseDate: row.purchaseDate || '',
    warrantyDueDate: row.warrantyDueDate || '',
    originalValue: row.originalValue || '—',
    currentValue: row.currentValue || '—',
    lastMaintenanceDate: row.lastMaintenanceDate || '',
    totalMaintenanceValue: row.totalMaintenanceValue || '—',
    sourcePreventiveCheckId: row.sourcePreventiveCheckId || row.id || null,
    floor: row.floor || '',
    maintenanceTaskStatus: row.maintenanceTaskStatus || '',
    maintenanceStatus: row.maintenanceStatus || '',
  };
}

/**
 * @param {object} row
 * @returns {import('./maintenance-work-queue-helper').MwqAssetRow}
 */
export function mapMaintenanceTaskRowFromApi(row = {}) {
  const base = mapPreventiveCheckRowFromApi(row);
  return {
    ...base,
    status: row.status || 'Open',
    condition: row.condition || 'Need Repair',
    rmImpactValue: row.rmImpactValue || '—',
    sourcePreventiveCheckId: row.sourcePreventiveCheckId || row.id || null,
    todoId: row.todoId || '',
    assetRepairId: row.assetRepairId || '',
  };
}

/**
 * Build YYYY-MM month param for preventive checks API from month value (1-12).
 * @param {string|number} monthValue
 * @param {number} [year]
 */
export function buildPreventiveMonthParam(monthValue, year = new Date().getFullYear()) {
  const month = Number(monthValue);
  if (!month || month < 1 || month > 12) return '';
  return `${year}-${String(month).padStart(2, '0')}`;
}
