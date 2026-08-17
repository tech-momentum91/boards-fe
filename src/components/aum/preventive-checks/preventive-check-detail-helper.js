import { formatAumDetailDateDisplay } from '@/components/aum/asset/asset-detail-helper';

export function formatMwqDrawerDate(value) {
  if (!value) return '—';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return formatAumDetailDateDisplay(value) || '—';
  }

  const day = parsed.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
        ? 'nd'
        : day % 10 === 3 && day !== 13
          ? 'rd'
          : 'th';

  const month = parsed.toLocaleString('en-GB', { month: 'long' });
  const year = String(parsed.getFullYear()).slice(-2);

  return `${day}${suffix} ${month}, ${year}`;
}

export function getPreventiveCheckDescription(row) {
  return (
    row?.description ||
    'Inspect and maintain the reception and lobby area to ensure it is clean, organized, and welcoming for visitors.'
  );
}

export function getPreventiveCheckFloor(row) {
  return row?.floor || '1st';
}

export function buildPreventiveCheckMetaLine(row) {
  return [row?.productCode, row?.brand, row?.productGroup].filter(Boolean).join(' • ');
}

export function normalizePreventiveCheckAttachments(row) {
  if (Array.isArray(row?.attachments) && row.attachments.length > 0) {
    return row.attachments;
  }

  return [];
}
