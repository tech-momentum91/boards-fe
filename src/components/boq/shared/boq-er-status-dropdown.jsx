import React, { memo } from 'react';
import { RiArrowRightLine, RiCheckLine } from 'react-icons/ri';

import {
  BOQ_ER_STATUS,
  BOQ_ER_STATUS_LABELS,
  BOQ_ER_STATUS_OPTIONS,
  getBoqErStatusMeta,
} from '@/components/boq/shared/boq-er-utils';
import CircularProgress, { resolveBadgeColor } from '@/components/ui/circular-progress';
import * as Dropdown from '@/components/ui/dropdown';
import { cn } from '@/utils/cn';

const BOQ_ER_STATUS_TRIGGER_STYLES = {
  [BOQ_ER_STATUS.DRAFT]: {
    root: 'bg-bg-weak-100 hover:bg-[#eceff3]',
    label: 'text-[12px] font-medium uppercase leading-4 tracking-[0.48px] text-text-sub-500',
    icon: 'text-text-sub-500',
    iconSize: 'size-5',
    padding: 'py-1 pl-2.5 pr-1.5',
    gap: 'gap-0.5',
    radius: 'rounded-lg',
    height: 'h-8',
    uppercase: true,
  },
  [BOQ_ER_STATUS.START]: {
    root: 'bg-[#c2d6ff] hover:bg-[#b8ccff]',
    label: 'text-[12px] font-medium leading-[18px] text-[#162664]',
    icon: 'text-[#162664]',
    iconSize: 'size-5',
    padding: 'py-0.5 pl-1.5 pr-1',
    gap: 'gap-1',
    radius: 'rounded-[6px]',
    height: 'h-auto',
    uppercase: false,
  },
  [BOQ_ER_STATUS.IN_PROGRESS]: {
    root: 'bg-[#f17b2c] hover:bg-[#e56f22]',
    label: 'text-[12px] font-medium uppercase leading-4 tracking-[0.48px] text-white',
    icon: 'text-white',
    iconSize: 'size-5',
    padding: 'py-1 pl-2.5 pr-1.5',
    gap: 'gap-0.5',
    radius: 'rounded-lg',
    height: 'h-8',
    uppercase: true,
  },
  [BOQ_ER_STATUS.COMPLETED]: {
    root: 'bg-[#ddf7e8] hover:bg-[#cff1dd]',
    label: 'text-[12px] font-medium uppercase leading-4 tracking-[0.48px] text-[#0f6b3f]',
    icon: 'text-[#0f6b3f]',
    iconSize: 'size-5',
    padding: 'py-1 pl-2.5 pr-1.5',
    gap: 'gap-0.5',
    radius: 'rounded-lg',
    height: 'h-8',
    uppercase: true,
  },
};

const BoqErStatusDropdown = ({
  status,
  onStatusChange,
  onOpenEr,
  className,
  disabled = false,
  options = BOQ_ER_STATUS_OPTIONS,
}) => {
  const normalizedStatus = BOQ_ER_STATUS_LABELS[status] ? status : BOQ_ER_STATUS.DRAFT;
  const styles =
    BOQ_ER_STATUS_TRIGGER_STYLES[normalizedStatus] ??
    BOQ_ER_STATUS_TRIGGER_STYLES[BOQ_ER_STATUS.DRAFT];
  const label = BOQ_ER_STATUS_LABELS[normalizedStatus] ?? BOQ_ER_STATUS_LABELS[BOQ_ER_STATUS.DRAFT];
  const triggerLabel = styles.uppercase ? label.toUpperCase() : label;

  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild disabled={disabled && !onOpenEr}>
        <button
          type='button'
          data-prevent-row-click
          disabled={disabled && !onOpenEr}
          className={cn(
            'inline-flex max-w-full items-center overflow-hidden transition-colors',
            styles.height,
            styles.root,
            styles.padding,
            styles.gap,
            styles.radius,
            disabled && 'cursor-not-allowed pointer-events-none',
            className,
          )}
          aria-label={`ER status: ${label}`}
          aria-disabled={disabled || undefined}
        >
          <span className={cn('truncate', styles.label)}>{triggerLabel}</span>
          <RiArrowRightLine className={cn('shrink-0', styles.iconSize, styles.icon)} aria-hidden />
        </button>
      </Dropdown.Trigger>

      <Dropdown.Content align='start' className='w-[220px] gap-1 p-2'>
        <Dropdown.Label className='px-2 py-1 text-subheading-2xs uppercase tracking-[0.22px] text-text-soft-400'>
          ER STATUS
        </Dropdown.Label>

        <div className='flex flex-col gap-1'>
          {options.map((option) => {
            const isSelected = option.value === normalizedStatus;
            const meta = getBoqErStatusMeta(option);
            const color = resolveBadgeColor(meta.color);

            return (
              <Dropdown.Item
                key={option.value}
                disabled={disabled}
                className={cn(
                  'relative flex items-center gap-2 rounded-lg p-2 pr-9',
                  isSelected && 'bg-bg-weak-100',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
                onSelect={() => {
                  if (disabled || option.value === normalizedStatus) return;
                  onStatusChange?.(option.value);
                }}
              >
                <CircularProgress
                  percentage={meta.percentage ?? 0}
                  color={color}
                  size={15}
                  variant='sector'
                  aria-label={`${option.label} progress`}
                />
                <span className='min-w-0 flex-1 text-paragraph-sm text-text-main-900'>
                  {option.label}
                </span>
                {isSelected ? (
                  <RiCheckLine
                    className='absolute right-2 top-1/2 size-5 shrink-0 -translate-y-1/2 text-text-soft-400'
                    aria-hidden
                  />
                ) : null}
              </Dropdown.Item>
            );
          })}
        </div>

        {typeof onOpenEr === 'function' ? (
          <>
            <Dropdown.Separator className='mx-0 my-0' />
            <Dropdown.Item className='rounded-lg p-2' onSelect={() => onOpenEr()}>
              <span className='text-paragraph-sm text-text-main-900'>Open ER</span>
            </Dropdown.Item>
          </>
        ) : null}
      </Dropdown.Content>
    </Dropdown.Root>
  );
};

export default memo(BoqErStatusDropdown);
