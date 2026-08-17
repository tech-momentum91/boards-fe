import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  RiCheckLine,
  RiCloseLine,
  RiFileChartLine,
  RiMore2Fill,
  RiRefreshLine,
} from 'react-icons/ri';

import * as Dropdown from '@/components/ui/dropdown';
import { cn } from '@/utils/cn';

export const VENDOR_COMPARISON_ACTIONS = {
  RAISE_PO: 'raise-po',
  RE_SUBMISSION: 're-submission',
  REJECT: 'reject',
};

const VENDOR_ACTION_ITEMS = [
  {
    id: VENDOR_COMPARISON_ACTIONS.RAISE_PO,
    label: 'Raise PO',
    icon: RiFileChartLine,
  },
  {
    id: VENDOR_COMPARISON_ACTIONS.RE_SUBMISSION,
    label: 'Re-submission',
    icon: RiRefreshLine,
  },
  {
    id: VENDOR_COMPARISON_ACTIONS.REJECT,
    label: 'Reject',
    icon: RiCloseLine,
  },
];

const ProjectProcurementVendorComparisonVendorActionsMenu = memo(
  ({
    vendor,
    selectedAction,
    onActionSelect,
    hideRaisePo = false,
    hideReject = false,
    hideResubmission = false,
  }) => {
    const [open, setOpen] = useState(false);

    const actionItems = useMemo(() => {
      return VENDOR_ACTION_ITEMS.filter((action) => {
        if (hideRaisePo && action.id === VENDOR_COMPARISON_ACTIONS.RAISE_PO) return false;
        if (hideReject && action.id === VENDOR_COMPARISON_ACTIONS.REJECT) return false;
        if (hideResubmission && action.id === VENDOR_COMPARISON_ACTIONS.RE_SUBMISSION) {
          return false;
        }
        return true;
      });
    }, [hideRaisePo, hideReject, hideResubmission]);

    const handleSelect = useCallback(
      (actionId) => {
        onActionSelect?.(vendor.id, actionId);
        setOpen(false);
      },
      [onActionSelect, vendor.id],
    );

    // Hide when every action is filtered out (e.g. all lines already PO'd).
    if (actionItems.length === 0) {
      return null;
    }

    return (
      <Dropdown.Root open={open} onOpenChange={setOpen}>
        <Dropdown.Trigger asChild>
          <button
            type='button'
            onClick={(event) => event.stopPropagation()}
            className={cn(
              'inline-flex size-8 shrink-0 items-center justify-center rounded-lg p-1.5 text-text-sub-500',
              'transition-colors hover:bg-bg-weak-50 hover:text-text-strong-950',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-1',
              open && 'bg-bg-weak-50 text-text-strong-950',
            )}
            aria-label={`Open actions for ${vendor.name}`}
          >
            <RiMore2Fill className='size-5' aria-hidden />
          </button>
        </Dropdown.Trigger>

        <Dropdown.Content
          align='end'
          sideOffset={4}
          className='w-[200px] gap-1 rounded-2xl p-2 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
          onClick={(event) => event.stopPropagation()}
        >
          {actionItems.map((action) => {
            const Icon = action.icon;
            const isSelected = selectedAction === action.id;

            return (
              <Dropdown.Item
                key={action.id}
                onSelect={() => handleSelect(action.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg p-2',
                  isSelected ? 'bg-bg-weak-100' : 'bg-bg-white-0',
                )}
              >
                <Icon className='size-5 shrink-0 text-text-sub-600' aria-hidden />
                <span
                  className={cn(
                    'flex-1 text-paragraph-sm text-text-main-900',
                    isSelected ? 'font-medium' : 'font-normal',
                  )}
                >
                  {action.label}
                </span>
                {isSelected ? (
                  <RiCheckLine className='size-5 shrink-0 text-text-sub-600' aria-hidden />
                ) : null}
              </Dropdown.Item>
            );
          })}
        </Dropdown.Content>
      </Dropdown.Root>
    );
  },
);

ProjectProcurementVendorComparisonVendorActionsMenu.displayName =
  'ProjectProcurementVendorComparisonVendorActionsMenu';

export default ProjectProcurementVendorComparisonVendorActionsMenu;
