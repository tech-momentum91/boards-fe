import { AUM_FILTER_VALUE_ALL } from '@/components/aum/constants';

export function filterAssetOutRows(
  rows,
  {
    search = '',
    center = AUM_FILTER_VALUE_ALL,
    reason = AUM_FILTER_VALUE_ALL,
    status = AUM_FILTER_VALUE_ALL,
  } = {},
) {
  const query = search.trim().toLowerCase();

  return rows.filter((row) => {
    if (center && center !== AUM_FILTER_VALUE_ALL && row.centerSlug !== center) {
      return false;
    }
    if (reason && reason !== AUM_FILTER_VALUE_ALL && row.reasonSlug !== reason) {
      return false;
    }
    if (status && status !== AUM_FILTER_VALUE_ALL && row.status !== status) {
      return false;
    }
    if (!query) return true;

    return [
      row.outNumber,
      row.centerName,
      row.floor,
      row.area,
      row.reason,
      row.outType,
      row.createdBy,
      row.value,
      row.status,
      row.destinationCenter,
    ].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(query),
    );
  });
}

export function getAssetOutReasonBadgeColor(reasonSlug) {
  switch (reasonSlug) {
    case 'transfer':
    case 'replacement':
      return 'blue';
    case 'disposal':
    case 'retirement':
      return 'gray';
    case 'damage':
    case 'missing':
      return 'red';
    case 'vendor-return':
      return 'orange';
    default:
      return 'gray';
  }
}

export function getAssetOutStatusBadgeColor(status) {
  switch (status) {
    case 'Completed':
      return 'green';
    case 'Validated':
      return 'blue';
    case 'In Transit':
      return 'purple';
    case 'Pending':
      return 'orange';
    case 'Draft':
    default:
      return 'gray';
  }
}
