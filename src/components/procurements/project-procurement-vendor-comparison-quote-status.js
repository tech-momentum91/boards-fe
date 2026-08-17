import { VENDOR_COMPARISON_ACTIONS } from '@/components/procurements/project-procurement-vendor-comparison-vendor-actions-menu';

export const VENDOR_COMPARISON_QUOTE_STATUSES = {
  QUOTE_PENDING: 'quote-pending',
  QUOTE_SUBMITTED: 'quote-submitted',
  RESUBMISSION: 'resubmission',
  PARTIAL_PO_RAISED: 'partial-po-raised',
  QUOTE_REJECTED: 'quote-rejected',
};

export const VENDOR_COMPARISON_QUOTE_STATUS_LABELS = {
  [VENDOR_COMPARISON_QUOTE_STATUSES.QUOTE_PENDING]: 'Quote Pending',
  [VENDOR_COMPARISON_QUOTE_STATUSES.QUOTE_SUBMITTED]: 'Quote Submitted',
  [VENDOR_COMPARISON_QUOTE_STATUSES.RESUBMISSION]: 'Resubmission',
  [VENDOR_COMPARISON_QUOTE_STATUSES.PARTIAL_PO_RAISED]: 'Partial PO Raised',
  [VENDOR_COMPARISON_QUOTE_STATUSES.QUOTE_REJECTED]: 'Rejected',
};

export function resolveVendorQuoteStatus(baseStatus, selectedAction) {
  if (baseStatus === VENDOR_COMPARISON_QUOTE_STATUSES.QUOTE_REJECTED) {
    return VENDOR_COMPARISON_QUOTE_STATUSES.QUOTE_REJECTED;
  }

  if (selectedAction === VENDOR_COMPARISON_ACTIONS.REJECT) {
    return VENDOR_COMPARISON_QUOTE_STATUSES.QUOTE_REJECTED;
  }

  if (selectedAction === VENDOR_COMPARISON_ACTIONS.RE_SUBMISSION) {
    return VENDOR_COMPARISON_QUOTE_STATUSES.RESUBMISSION;
  }

  if (selectedAction === VENDOR_COMPARISON_ACTIONS.RAISE_PO) {
    return VENDOR_COMPARISON_QUOTE_STATUSES.PARTIAL_PO_RAISED;
  }

  if (baseStatus === VENDOR_COMPARISON_QUOTE_STATUSES.PARTIAL_PO_RAISED) {
    return VENDOR_COMPARISON_QUOTE_STATUSES.PARTIAL_PO_RAISED;
  }

  return baseStatus;
}

export function withVendorComparisonQuoteStatuses(vendors, vendorActionsById = {}) {
  return vendors.map((vendor) => ({
    ...vendor,
    quoteStatus: resolveVendorQuoteStatus(vendor.quoteStatus, vendorActionsById[vendor.id]),
  }));
}
