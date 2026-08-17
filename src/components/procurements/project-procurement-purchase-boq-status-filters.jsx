import React, { memo } from 'react';

import { PROJECT_PROCUREMENT_PURCHASE_BOQ_STATUS_FILTERS } from '@/components/procurements/constants';
import { cn } from '@/utils/cn';

const ProjectProcurementPurchaseBoqStatusFilters = memo(
  ({
    value = 'all',
    onValueChange,
    options = PROJECT_PROCUREMENT_PURCHASE_BOQ_STATUS_FILTERS,
    className,
  }) => (
    <div
      className={cn(
        'flex w-full min-w-0 flex-wrap items-center gap-1.5 rounded-none bg-bg-weak-50 px-8 py-4',
        className,
      )}
      role='group'
      aria-label='Filter purchase BOQ by status'
    >
      {options.map((option) => {
        const isActive = value === option.id;

        return (
          <button
            key={option.id}
            type='button'
            aria-pressed={isActive}
            onClick={() => onValueChange?.(option.id)}
            className={cn(
              'inline-flex h-7 shrink-0 items-center rounded-md border border-solid px-3 py-1 text-label-sm font-medium text-[#344054] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-1',
              isActive
                ? 'border-[rgba(71,84,103,0.5)] bg-bg-white-0'
                : 'border-[#eaecf0] bg-bg-white-0 hover:bg-bg-weak-50',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  ),
);

ProjectProcurementPurchaseBoqStatusFilters.displayName =
  'ProjectProcurementPurchaseBoqStatusFilters';

export default ProjectProcurementPurchaseBoqStatusFilters;
