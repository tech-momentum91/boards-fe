import React from 'react';

import * as Popover from '@/components/ui/popover';
import * as CompactButton from '@/components/ui/compact-button';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

/**
 * Reusable popover menu for small “actions” lists.
 *
 * @param {object} props
 * @param {React.ElementType} props.triggerIcon Icon component for the trigger
 * @param {string} [props.ariaLabel] aria-label for the trigger button
 * @param {Array<{key?: string, label: string, icon?: React.ElementType, onSelect?: Function, disabled?: boolean}>} props.items
 * @param {number} [props.width] content width in px
 * @param {'start'|'center'|'end'} [props.align]
 * @param {'top'|'right'|'bottom'|'left'} [props.side]
 * @param {number} [props.sideOffset]
 * @param {boolean} [props.showArrow]
 * @param {(open: boolean) => void} [props.onOpenChange]
 * @param {React.ReactNode} [props.tooltipContent]
 */
export default function ActionPopover({
  triggerIcon,
  ariaLabel = 'Open actions',
  items = [],
  width = 220,
  align = 'start',
  side = 'bottom',
  sideOffset = 8,
  showArrow = true,
  onOpenChange,
  tooltipContent = 'Column Settings',
}) {
  const [open, setOpen] = React.useState(false);

  const handleOpenChange = React.useCallback(
    (nextOpen) => {
      setOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );

  const close = React.useCallback(() => handleOpenChange(false), [handleOpenChange]);

  const TriggerIcon = triggerIcon;

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Popover.Trigger asChild>
            <CompactButton.Root
              type='button'
              variant='neutral'
              mode='ghost'
              size='medium'
              aria-label={ariaLabel}
              onClick={(e) => e.stopPropagation()}
            >
              {TriggerIcon ? <CompactButton.Icon as={TriggerIcon} /> : null}
            </CompactButton.Root>
          </Popover.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Content>{tooltipContent}</Tooltip.Content>
      </Tooltip.Root>
      <Popover.Content
        className='p-0'
        align={align}
        side={side}
        sideOffset={sideOffset}
        showArrow={showArrow}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className='p-2' style={{ width }}>
          {items.map((item, idx) => {
            const Icon = item.icon;
            const key = item.key ?? `${item.label}-${idx}`;
            const disabled = item.disabled === true;

            return (
              <button
                key={key}
                type='button'
                disabled={disabled}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-paragraph-sm text-text-strong-950',
                  'hover:bg-bg-weak-50',
                  'disabled:cursor-not-allowed disabled:text-text-disabled-300 disabled:hover:bg-transparent',
                )}
                onClick={() => {
                  if (disabled) return;
                  close();
                  item.onSelect?.();
                }}
              >
                {Icon ? <Icon className='size-5 text-text-sub-600' /> : null}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
