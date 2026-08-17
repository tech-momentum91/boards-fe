import { formatTimestampToYYYYMMDD } from '@/utils/date-utils';

/** Today's date as `YYYY-MM-DD` in local calendar. */
export function getTodayIsoDate() {
  return formatTimestampToYYYYMMDD(Date.now());
}

/** Format `YYYY-MM-DD` (or legacy string) for Vendor RC table and drawers. */
export function formatVendorRcDateDisplay(value) {
  if (!value) return '--';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [y, m, d] = String(value)
      .split('-')
      .map((x) => Number.parseInt(x, 10));
    const date = new Date(y, m - 1, d);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return String(value);
}

/** Parse `YYYY-MM-DD` to a local calendar `Date` for Datepicker `value`. */
export function vendorRcIsoToDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return undefined;
  const [y, m, d] = String(iso)
    .split('-')
    .map((x) => Number.parseInt(x, 10));
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Serialize Datepicker selection to `YYYY-MM-DD` for row fields. */
export function vendorRcDateToIso(date) {
  if (!date || Number.isNaN(date.getTime())) return '';
  return formatTimestampToYYYYMMDD(date.getTime());
}
