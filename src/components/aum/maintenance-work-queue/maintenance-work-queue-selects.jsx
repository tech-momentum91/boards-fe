import React, { memo, useMemo, useState } from 'react';
import { RiArrowDownSLine, RiCheckLine, RiSearchLine } from 'react-icons/ri';

import { AUM_FILTER_VALUE_ALL } from '@/components/aum/constants';
import {
  MWQ_CENTER_OPTIONS,
  MWQ_MONTH_OPTIONS,
  MWQ_TOOLBAR_COPY,
  getMwqMonthLabel,
} from '@/components/aum/maintenance-work-queue/maintenance-work-queue-constants';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

export const MWQ_DEFAULT_CENTER = AUM_FILTER_VALUE_ALL;

export const MWQ_COMPACT_DROPDOWN_TRIGGER = cn(
  'h-8 min-h-8 shrink-0 gap-1.5 px-2.5 py-1.5',
  'shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]',
);

export function formatMwqCenterLabel(center) {
  if (!center) return '';
  return center.code ? `${center.label} (${center.code})` : center.label;
}

export const MwqMonthSelect = memo(({ value, onValueChange, className }) => {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    getMwqMonthLabel(value, { short: true }) || MWQ_TOOLBAR_COPY.monthPlaceholder;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='small'
          aria-label='Select month'
          aria-expanded={open}
          className={cn(
            MWQ_COMPACT_DROPDOWN_TRIGGER,
            'min-w-[76px] justify-between font-normal',
            open && 'ring-2 ring-primary-base ring-inset',
            className,
          )}
        >
          <span className='text-label-sm text-text-strong-950'>{selectedLabel}</span>
          <RiArrowDownSLine
            className={cn(
              'size-4 shrink-0 text-text-soft-400 transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </Button.Root>
      </Popover.Trigger>
      <Popover.Content
        align='end'
        sideOffset={8}
        collisionPadding={16}
        showArrow={false}
        className='w-[220px] p-2'
      >
        <div className='grid grid-cols-3 gap-1'>
          {MWQ_MONTH_OPTIONS.map((month) => {
            const isSelected = value === month.value;

            return (
              <Button.Root
                key={month.value}
                type='button'
                variant={isSelected ? 'primary' : 'neutral'}
                mode={isSelected ? 'lighter' : 'ghost'}
                size='xsmall'
                aria-label={month.label}
                aria-pressed={isSelected}
                className={cn(
                  'h-8 min-w-0 px-0 text-label-sm',
                  !isSelected && 'text-text-strong-950 hover:bg-bg-weak-50',
                )}
                onClick={() => {
                  onValueChange?.(month.value);
                  setOpen(false);
                }}
              >
                {month.shortLabel}
              </Button.Root>
            );
          })}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
});

MwqMonthSelect.displayName = 'MwqMonthSelect';

export const MwqCenterSelect = memo(
  ({ value, onValueChange, className, centerOptions = MWQ_CENTER_OPTIONS }) => {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    const filteredCenters = useMemo(() => {
      const query = searchValue.trim().toLowerCase();
      if (!query) return centerOptions;

      return centerOptions.filter((center) => {
        const label = String(center.label ?? '').toLowerCase();
        const code = String(center.code ?? '').toLowerCase();
        const centerValue = String(center.value ?? '').toLowerCase();
        return label.includes(query) || code.includes(query) || centerValue.includes(query);
      });
    }, [centerOptions, searchValue]);

    const selectedCenter = useMemo(
      () => centerOptions.find((center) => center.value === value),
      [centerOptions, value],
    );

    const triggerLabel = selectedCenter?.label || MWQ_TOOLBAR_COPY.centerPlaceholder;

    const handleOpenChange = (nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        setSearchValue('');
      }
    };

    const handleSelectCenter = (centerValue) => {
      onValueChange?.(centerValue);
      setOpen(false);
      setSearchValue('');
    };

    return (
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger asChild>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            aria-label='Select center'
            aria-expanded={open}
            className={cn(
              MWQ_COMPACT_DROPDOWN_TRIGGER,
              'w-[118px] justify-between font-normal',
              open && 'ring-2 ring-primary-base ring-inset',
              className,
            )}
          >
            <span className='min-w-0 truncate text-label-sm text-text-strong-950'>
              {triggerLabel}
            </span>
            <RiArrowDownSLine
              className={cn(
                'size-4 shrink-0 text-text-soft-400 transition-transform duration-200',
                open && 'rotate-180',
              )}
            />
          </Button.Root>
        </Popover.Trigger>

        <Popover.Content
          align='end'
          sideOffset={8}
          collisionPadding={16}
          showArrow={false}
          className='w-[220px] overflow-hidden p-0'
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className='border-b border-stroke-soft-200 p-2'>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder='Search...'
                  autoComplete='off'
                  aria-label='Search centers'
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='max-h-[240px] overflow-y-auto p-1'>
            {filteredCenters.length === 0 ? (
              <div className='px-3 py-6 text-center text-label-sm text-text-soft-400'>
                No centers found
              </div>
            ) : (
              filteredCenters.map((center) => {
                const isSelected = center.value === value;

                return (
                  <button
                    key={center.value}
                    type='button'
                    onClick={() => handleSelectCenter(center.value)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-label-sm transition-colors',
                      isSelected
                        ? 'bg-bg-weak-50 text-text-strong-950'
                        : 'text-text-strong-950 hover:bg-bg-weak-50',
                    )}
                  >
                    <span className='min-w-0 flex-1 truncate'>{formatMwqCenterLabel(center)}</span>
                    {isSelected ? (
                      <RiCheckLine className='size-4 shrink-0 text-text-strong-950' aria-hidden />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Root>
    );
  },
);

MwqCenterSelect.displayName = 'MwqCenterSelect';
