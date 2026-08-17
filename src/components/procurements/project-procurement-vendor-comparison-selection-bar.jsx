import React, { memo } from 'react';
import { RiCloseLine, RiFileTextLine } from 'react-icons/ri';

import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

export const VENDOR_COMPARISON_RAISE_PO_DISABLED_REASON =
  'Raise PO is only available when selected items belong to the same category.';

const actionButtonClass =
  'inline-flex items-center justify-center gap-0.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-1.5 text-label-sm font-medium text-text-sub-500 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] transition-colors hover:bg-bg-weak-50 disabled:pointer-events-none disabled:border-stroke-soft-200 disabled:bg-bg-white-0 disabled:text-text-disabled-300 disabled:shadow-none';

const ProjectProcurementVendorComparisonSelectionBar = memo(
  ({
    selectedCount = 0,
    canRaisePo = false,
    raisePoDisabledReason = VENDOR_COMPARISON_RAISE_PO_DISABLED_REASON,
    onClearSelection,
    onRaisePo,
    className,
  }) => {
    if (selectedCount <= 0) return null;

    const itemLabel = selectedCount === 1 ? '1 Item Selected' : `${selectedCount} Item Selected`;

    const raisePoButton = (
      <button
        type='button'
        onClick={onRaisePo}
        disabled={!canRaisePo}
        className={actionButtonClass}
        aria-disabled={!canRaisePo}
      >
        <RiFileTextLine className='size-5 shrink-0' aria-hidden />
        <span className='px-1'>Raise PO</span>
      </button>
    );

    return (
      <div
        className={cn(
          'flex items-center overflow-hidden rounded-xl border border-stroke-soft-200/60 bg-bg-white-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]',
          className,
        )}
        role='toolbar'
        aria-label='Vendor comparison item selection actions'
      >
        <div className='flex shrink-0 items-center border-r border-stroke-soft-200 py-1.5 pl-1.5 pr-2'>
          <button
            type='button'
            onClick={onClearSelection}
            className='inline-flex items-center justify-center gap-0.5 rounded-lg bg-bg-weak-100 p-1.5 text-label-sm font-medium text-text-main-900 transition-colors hover:bg-bg-weak-200'
            aria-label='Clear selection'
          >
            <span className='px-1'>{itemLabel}</span>
            <RiCloseLine className='size-5 shrink-0' aria-hidden />
          </button>
        </div>

        <div className='flex items-center py-1.5 pl-1.5 pr-2'>
          {canRaisePo ? (
            raisePoButton
          ) : (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span className='inline-flex'>{raisePoButton}</span>
              </Tooltip.Trigger>
              <Tooltip.Content size='xsmall' variant='dark' side='top' className='z-[80] max-w-xs'>
                {raisePoDisabledReason}
              </Tooltip.Content>
            </Tooltip.Root>
          )}
        </div>
      </div>
    );
  },
);

ProjectProcurementVendorComparisonSelectionBar.displayName =
  'ProjectProcurementVendorComparisonSelectionBar';

export default ProjectProcurementVendorComparisonSelectionBar;
