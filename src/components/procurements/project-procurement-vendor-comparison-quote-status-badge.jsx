import React, { memo } from 'react';

import {
  VENDOR_COMPARISON_QUOTE_STATUSES,
  VENDOR_COMPARISON_QUOTE_STATUS_LABELS,
} from '@/components/procurements/project-procurement-vendor-comparison-quote-status';
import { cn } from '@/utils/cn';

const VENDOR_QUOTE_STATUS_STYLES = {
  [VENDOR_COMPARISON_QUOTE_STATUSES.QUOTE_PENDING]: {
    className: 'bg-[#fbdfb1] text-[#693d11]',
  },
  [VENDOR_COMPARISON_QUOTE_STATUSES.QUOTE_SUBMITTED]: {
    className: 'bg-[#c2d6ff] text-[#162664]',
  },
  [VENDOR_COMPARISON_QUOTE_STATUSES.RESUBMISSION]: {
    className: 'bg-[#fbdfb1] text-[#693d11]',
  },
  [VENDOR_COMPARISON_QUOTE_STATUSES.PARTIAL_PO_RAISED]: {
    className: 'bg-[#ffdac2] text-[#6e330c]',
  },
  [VENDOR_COMPARISON_QUOTE_STATUSES.QUOTE_REJECTED]: {
    className: 'bg-[#f8c9d2] text-[#710e21]',
  },
};

const VendorComparisonQuoteStatusBadge = memo(({ quoteStatus }) => {
  const style =
    VENDOR_QUOTE_STATUS_STYLES[quoteStatus] ??
    VENDOR_QUOTE_STATUS_STYLES[VENDOR_COMPARISON_QUOTE_STATUSES.QUOTE_SUBMITTED];
  const label =
    VENDOR_COMPARISON_QUOTE_STATUS_LABELS[quoteStatus] ??
    VENDOR_COMPARISON_QUOTE_STATUS_LABELS[VENDOR_COMPARISON_QUOTE_STATUSES.QUOTE_SUBMITTED];

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase leading-3 tracking-[0.22px]',
        style.className,
      )}
    >
      {label}
    </span>
  );
});

VendorComparisonQuoteStatusBadge.displayName = 'VendorComparisonQuoteStatusBadge';

export default VendorComparisonQuoteStatusBadge;
