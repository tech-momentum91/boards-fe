import React, { memo } from 'react';
import { RiCloseLine, RiDeleteBinLine, RiFileTextLine, RiSendPlaneLine } from 'react-icons/ri';

import { cn } from '@/utils/cn';

const actionButtonClass =
  'inline-flex items-center justify-center gap-0.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-1.5 text-label-sm font-medium text-text-sub-500 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] transition-colors hover:bg-bg-weak-50';

const ProjectProcurementPackageItemsSelectionBar = memo(
  ({ selectedCount = 0, onClearSelection, onSendRfq, onRaisePo, onRemove, className }) => {
    if (selectedCount <= 0) return null;

    const itemLabel = selectedCount === 1 ? '1 Item Selected' : `${selectedCount} Item Selected`;

    return (
      <div
        className={cn(
          'flex items-center overflow-hidden rounded-xl border border-stroke-soft-200/60 bg-bg-white-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]',
          className,
        )}
        role='toolbar'
        aria-label='Package items selection actions'
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

        <div className='flex items-center gap-1.5 py-1.5 pl-1.5 pr-2'>
          <button type='button' onClick={onSendRfq} className={actionButtonClass}>
            <RiSendPlaneLine className='size-5 shrink-0' aria-hidden />
            <span className='px-1'>Send RFQ</span>
          </button>

          <button type='button' onClick={onRaisePo} className={actionButtonClass}>
            <RiFileTextLine className='size-5 shrink-0' aria-hidden />
            <span className='px-1'>Raise PO</span>
          </button>

          <button type='button' onClick={onRemove} className={actionButtonClass}>
            <RiDeleteBinLine className='size-5 shrink-0' aria-hidden />
            <span className='px-1'>Remove</span>
          </button>
        </div>
      </div>
    );
  },
);

ProjectProcurementPackageItemsSelectionBar.displayName =
  'ProjectProcurementPackageItemsSelectionBar';

export default ProjectProcurementPackageItemsSelectionBar;
