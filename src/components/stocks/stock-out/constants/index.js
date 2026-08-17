/** Issue mode values accepted by `save_stock_out` API. */
export const STOCK_OUT_API_ISSUE_MODE = {
  MANUAL: 'Manual',
  QR_SCAN: 'QR Scan',
  TRANSFER: 'Transfer',
};

export const STOCK_OUT_CREATE_ISSUE_MODE_OPTIONS = [
  { value: STOCK_OUT_API_ISSUE_MODE.MANUAL, label: 'Manual' },
  { value: STOCK_OUT_API_ISSUE_MODE.QR_SCAN, label: 'Qr based' },
  { value: STOCK_OUT_API_ISSUE_MODE.TRANSFER, label: 'Transfer' },
];

export const STOCK_OUT_TRANSFER_STATUS = {
  DRAFT: 'Draft',
  IN_TRANSIT: 'In Transit',
  PARTIALLY_TRANSFERRED: 'Partially Transferred',
  TRANSFERRED: 'Transferred',
};

export function stockOutStatusBadgeColor(status) {
  if (status === STOCK_OUT_TRANSFER_STATUS.DRAFT) return 'gray';
  if (status === STOCK_OUT_TRANSFER_STATUS.TRANSFERRED) return 'green';
  if (status === STOCK_OUT_TRANSFER_STATUS.IN_TRANSIT) return 'orange';
  if (status === STOCK_OUT_TRANSFER_STATUS.PARTIALLY_TRANSFERRED) return 'yellow';
  if (status === 'Issued') return 'green';
  return 'gray';
}
