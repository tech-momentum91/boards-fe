import React from 'react';
import { RiCloseLine } from 'react-icons/ri';

import { PROJECT_PROCUREMENT_POS_STATUS_BADGE_STYLES } from '@/components/procurements/constants';
import ProjectProcurementPaymentTag from '@/components/procurements/project-procurement-payment-tag';
import * as CompactButton from '@/components/ui/compact-button';
import { cn } from '@/utils/cn';

function MetaDot() {
  return <span className='size-1 shrink-0 rounded-full bg-text-soft-400' aria-hidden />;
}

function resolveHeaderStatusStyle(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('_', ' ');

  // Header status colors from Figma 34775:94230 (orange pending).
  if (normalized.includes('pending') && normalized.includes('appro')) {
    return 'bg-[#ffdac2] text-[#6e330c]';
  }
  if (normalized.includes('releas') || normalized === 'submitted') {
    return PROJECT_PROCUREMENT_POS_STATUS_BADGE_STYLES.released;
  }
  if (normalized.includes('draft')) {
    return PROJECT_PROCUREMENT_POS_STATUS_BADGE_STYLES.draft;
  }
  if (normalized.includes('cancel')) {
    return PROJECT_PROCUREMENT_POS_STATUS_BADGE_STYLES.cancelled;
  }
  if (PROJECT_PROCUREMENT_POS_STATUS_BADGE_STYLES[normalized]) {
    return PROJECT_PROCUREMENT_POS_STATUS_BADGE_STYLES[normalized];
  }

  return 'bg-[#ffdac2] text-[#6e330c]';
}

export default function ProjectProcurementPoDetailHeader({
  vendorName,
  headerStatus = 'Pending Approval',
  poNumber,
  displayAmount,
  itemCount,
  category,
  onClose,
  className,
}) {
  const itemLabel = Number(itemCount) === 1 ? '1 Item' : `${Number(itemCount) || 0} Items`;

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center gap-4 border-b border-stroke-soft-200 bg-bg-white-0 px-6 py-[18px]',
        className,
      )}
    >
      <div className='flex min-w-0 flex-1 flex-col gap-1 pr-10'>
        <div className='flex flex-wrap items-center gap-2'>
          <h2 className='text-label-lg font-medium tracking-[-0.27px] text-text-main-900'>
            {vendorName}
          </h2>
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-full px-2 py-[2px] text-[11px] font-medium uppercase leading-[12px] tracking-[0.22px]',
              resolveHeaderStatusStyle(headerStatus),
            )}
          >
            {headerStatus}
          </span>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <span className='text-paragraph-sm font-medium uppercase tracking-[0.84px] text-text-sub-500 opacity-72'>
            {poNumber}
          </span>
          <MetaDot />
          <span className='text-paragraph-sm font-medium uppercase tracking-[0.84px] text-text-sub-500 opacity-72'>
            {displayAmount}
          </span>
          <MetaDot />
          <span className='text-paragraph-sm font-medium uppercase tracking-[0.84px] text-text-sub-500 opacity-72'>
            {itemLabel}
          </span>
          {category ? (
            <>
              <MetaDot />
              <ProjectProcurementPaymentTag value={category} />
            </>
          ) : null}
        </div>
      </div>

      <CompactButton.Root
        type='button'
        variant='ghost'
        size='medium'
        onClick={onClose}
        className='absolute right-4 top-4'
        aria-label='Close purchase order details'
      >
        <CompactButton.Icon as={RiCloseLine} />
      </CompactButton.Root>
    </div>
  );
}
