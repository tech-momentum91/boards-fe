import React, { memo } from 'react';
import { RiBox3Line, RiCloseLine, RiSendPlaneLine, RiSplitCellsVertical } from 'react-icons/ri';

import {
  PURCHASE_BOQ_NON_PRODUCT_DISABLED_REASON,
  PURCHASE_BOQ_RAISE_PO_DISABLED_REASON,
} from '@/components/procurements/project-procurement-purchase-boq-selection-utils';
import { getNonProductLinesFromSelection } from '@/components/boq/boq-line-product-utils';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

const actionButtonBaseClass =
  'inline-flex items-center justify-center gap-0.5 rounded-lg p-1.5 text-label-sm font-medium transition-colors';

const enabledActionClass =
  'border border-stroke-soft-200 bg-bg-white-0 text-text-sub-500 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] hover:bg-bg-weak-50';

const disabledActionClass = 'bg-bg-weak-100 text-text-disabled-300 cursor-not-allowed';

const ProjectProcurementPurchaseBoqSelectionBar = memo(
  ({
    selectedCount = 0,
    selectedProducts = [],
    disabled = false,
    canRaiseDirectPo = false,
    canAddToPackage = false,
    raisePoDisabledReason = PURCHASE_BOQ_RAISE_PO_DISABLED_REASON,
    packageDisabledReason = PURCHASE_BOQ_NON_PRODUCT_DISABLED_REASON,
    onClearSelection,
    onSplit,
    onAddToPackage,
    onRaiseDirectPo,
    onConvertToProduct,
    className,
  }) => {
    if (selectedCount <= 0) return null;

    const itemLabel = selectedCount === 1 ? '1 Item Selected' : `${selectedCount} Items Selected`;
    const nonProductLines = getNonProductLinesFromSelection(selectedProducts);
    const showConvertToProduct = nonProductLines.length > 0 && Boolean(onConvertToProduct);
    const addToPackageEnabled = canAddToPackage && !disabled;
    const raisePoEnabled = canRaiseDirectPo && !disabled;

    const raisePoButton = (
      <button
        type='button'
        onClick={raisePoEnabled ? onRaiseDirectPo : undefined}
        disabled={!raisePoEnabled}
        className={cn(
          actionButtonBaseClass,
          raisePoEnabled ? enabledActionClass : disabledActionClass,
        )}
        aria-disabled={!raisePoEnabled}
      >
        <RiSendPlaneLine className='size-5 shrink-0' aria-hidden />
        <span className='px-1'>Raise Direct PO</span>
      </button>
    );

    return (
      <div
        className={cn(
          'flex items-center overflow-hidden rounded-xl border border-stroke-soft-200/60 bg-bg-white-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]',
          className,
        )}
        role='toolbar'
        aria-label='Purchase BOQ selection actions'
      >
        <div className='flex shrink-0 items-center border-r border-stroke-soft-200 py-1.5 pl-1.5 pr-2'>
          <button
            type='button'
            onClick={onClearSelection}
            disabled={disabled}
            className={cn(
              actionButtonBaseClass,
              'bg-bg-weak-100 text-text-main-900 hover:bg-bg-weak-200',
              disabled && 'cursor-not-allowed opacity-60',
            )}
            aria-label='Clear selection'
          >
            <span className='px-1'>{itemLabel}</span>
            <RiCloseLine className='size-5 shrink-0' aria-hidden />
          </button>
        </div>

        <div className='flex items-center gap-1.5 py-1.5 pl-1.5 pr-2'>
          {showConvertToProduct ? (
            <button
              type='button'
              onClick={() => onConvertToProduct?.(nonProductLines)}
              disabled={disabled}
              className={cn(
                actionButtonBaseClass,
                disabled ? disabledActionClass : enabledActionClass,
              )}
            >
              <span className='px-1'>Convert to Product</span>
            </button>
          ) : null}

          <button
            type='button'
            onClick={onSplit}
            disabled={disabled}
            className={cn(
              actionButtonBaseClass,
              disabled ? disabledActionClass : enabledActionClass,
            )}
          >
            <RiSplitCellsVertical className='size-5 shrink-0' aria-hidden />
            <span className='px-1'>Split</span>
          </button>

          <button
            type='button'
            onClick={addToPackageEnabled ? onAddToPackage : undefined}
            disabled={!addToPackageEnabled}
            className={cn(
              actionButtonBaseClass,
              addToPackageEnabled ? enabledActionClass : disabledActionClass,
            )}
          >
            <RiBox3Line className='size-5 shrink-0' aria-hidden />
            <span className='px-1'>Add to Package</span>
          </button>

          {raisePoEnabled ? (
            raisePoButton
          ) : (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span className='inline-flex'>{raisePoButton}</span>
              </Tooltip.Trigger>
              <Tooltip.Content size='xsmall' variant='dark' side='top' className='z-[80] max-w-xs'>
                {disabled
                  ? 'Please wait…'
                  : !canRaiseDirectPo && nonProductLines.length > 0
                    ? packageDisabledReason
                    : raisePoDisabledReason}
              </Tooltip.Content>
            </Tooltip.Root>
          )}
        </div>
      </div>
    );
  },
);

ProjectProcurementPurchaseBoqSelectionBar.displayName = 'ProjectProcurementPurchaseBoqSelectionBar';

export default ProjectProcurementPurchaseBoqSelectionBar;
