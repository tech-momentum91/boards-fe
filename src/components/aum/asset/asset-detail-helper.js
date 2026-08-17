import { formatVendorRcDateDisplay } from '@/components/stocks/stocks-helper';

export { formatVendorRcDateDisplay as formatAumDetailDateDisplay };

export function getAumConditionBadgeColor(condition) {
  switch (condition) {
    case 'Good':
    case 'Excellent':
      return 'green';
    case 'Fair':
      return 'orange';
    case 'Damaged':
      return 'red';
    case 'Need Repair':
      return 'orange';
    default:
      return 'gray';
  }
}
