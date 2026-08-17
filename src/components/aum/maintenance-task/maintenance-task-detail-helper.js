export {
  buildPreventiveCheckMetaLine as buildMaintenanceTaskMetaLine,
  formatMwqDrawerDate,
  getPreventiveCheckDescription as getMaintenanceTaskDescription,
  getPreventiveCheckFloor as getMaintenanceTaskFloor,
  normalizePreventiveCheckAttachments as normalizeMaintenanceTaskAttachments,
} from '@/components/aum/preventive-checks/preventive-check-detail-helper';

export function formatMaintenanceTaskRmImpactValue(row) {
  const value = row?.rmImpactValue ?? row?.rm_impact;
  if (value === null || value === undefined || value === '') return '—';

  const numeric = Number(String(value).replaceAll(/[^\d.-]/g, ''));
  if (Number.isNaN(numeric)) return String(value);

  return numeric.toLocaleString('en-IN');
}
