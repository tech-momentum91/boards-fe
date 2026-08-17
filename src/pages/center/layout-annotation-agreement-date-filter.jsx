import React, { useCallback, useMemo, useState } from 'react';
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiCalendarLine,
  RiCheckLine,
  RiCloseLine,
} from 'react-icons/ri';

import * as Calendar from '@/components/ui/calendar';
import * as Popover from '@/components/ui/popover';
import { selectVariants } from '@/components/ui/select';
import {
  LAYOUT_AGREEMENT_DATE_FILTER_OPTIONS,
  LAYOUT_AGREEMENT_DATE_RANGE_PRESET_OPTIONS,
} from '@/utils/layout-annotation-filter-utils';
import { getLayoutAgreementDatePresetRange } from '@/utils/layout-agreement-date-presets';
import { cn } from '@/utils/cn';
import { formatDateRangeLabel, formatDateToYYYYMMDD, parseToDate } from '@/utils/date-utils';

/**
 * @typedef {'this_week' | 'next_week' | 'this_month' | 'next_month' | 'next_quarter' | 'custom'} LayoutAgreementDateRangePreset
 */

/**
 * @typedef {{
 *   type: 'agreement_end_date' | 'lock_in_end_date',
 *   fromDate: string,
 *   toDate: string,
 *   preset?: LayoutAgreementDateRangePreset,
 * }} LayoutAgreementDateFilterValue
 */

/**
 * @param {{
 *   value: LayoutAgreementDateFilterValue | null,
 *   onChange: (value: LayoutAgreementDateFilterValue | null) => void,
 *   className?: string,
 *   disabled?: boolean,
 * }} props
 */
export default function LayoutAnnotationAgreementDateFilter({
  value,
  onChange,
  className,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  /** @type {'type' | 'preset' | 'calendar'} */
  const [step, setStep] = useState('type');
  const [pendingType, setPendingType] = useState('');
  const [draftRange, setDraftRange] = useState({ from: undefined, to: undefined });

  const { triggerRoot, triggerArrow } = selectVariants({ size: 'small' });

  const activeTypeLabel = useMemo(() => {
    if (!value?.type) return '';
    return (
      LAYOUT_AGREEMENT_DATE_FILTER_OPTIONS.find((opt) => opt.value === value.type)?.label ?? ''
    );
  }, [value?.type]);

  const triggerLabel = useMemo(() => {
    if (!value?.fromDate || !value?.toDate) return 'Agreement date';
    const rangeLabel = formatDateRangeLabel(value.fromDate, value.toDate);
    return activeTypeLabel ? `${activeTypeLabel}: ${rangeLabel}` : rangeLabel;
  }, [activeTypeLabel, value?.fromDate, value?.toDate]);

  const resetPanelState = useCallback(() => {
    setStep('type');
    setPendingType('');
    setDraftRange({ from: undefined, to: undefined });
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      if (disabled) return;
      setOpen(nextOpen);
      if (!nextOpen) {
        resetPanelState();
      }
    },
    [disabled, resetPanelState],
  );

  const handleSelectType = useCallback((type) => {
    setPendingType(type);
    setStep('preset');
    setDraftRange({ from: undefined, to: undefined });
  }, []);

  const applyRange = useCallback(
    (type, from, to, preset) => {
      if (!type || !from || !to) return;
      onChange({
        type,
        fromDate: formatDateToYYYYMMDD(from),
        toDate: formatDateToYYYYMMDD(to),
        ...(preset ? { preset } : {}),
      });
      setOpen(false);
      resetPanelState();
    },
    [onChange, resetPanelState],
  );

  const handleSelectPreset = useCallback(
    (preset) => {
      if (!pendingType) return;

      if (preset === 'custom') {
        setStep('calendar');
        if (
          value?.type === pendingType &&
          value?.preset === 'custom' &&
          value.fromDate &&
          value.toDate
        ) {
          setDraftRange({
            from: parseToDate(value.fromDate) ?? undefined,
            to: parseToDate(value.toDate) ?? undefined,
          });
          return;
        }
        setDraftRange({ from: undefined, to: undefined });
        return;
      }

      const range = getLayoutAgreementDatePresetRange(preset);
      if (!range) return;
      applyRange(pendingType, range.from, range.to, preset);
    },
    [applyRange, pendingType, value],
  );

  const handleRangeSelect = useCallback(
    (range) => {
      setDraftRange(range ?? { from: undefined, to: undefined });
      if (!pendingType || !range?.from || !range?.to) return;
      applyRange(pendingType, range.from, range.to, 'custom');
    },
    [applyRange, pendingType],
  );

  const handleClear = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      onChange(null);
      setOpen(false);
      resetPanelState();
    },
    [onChange, resetPanelState],
  );

  const pendingTypeLabel = useMemo(() => {
    return (
      LAYOUT_AGREEMENT_DATE_FILTER_OPTIONS.find((opt) => opt.value === pendingType)?.label ?? ''
    );
  }, [pendingType]);

  const isFilterActive = Boolean(value?.type && value?.fromDate && value?.toDate);

  const renderOptionButton = (option, isSelected, onClick) => (
    <button
      key={option.value}
      type='button'
      aria-selected={isSelected}
      className={cn(
        'relative flex w-full items-center rounded-lg px-2 py-2 pr-9 text-left text-paragraph-sm text-text-strong-950 transition',
        isSelected ? 'bg-primary-lighter ring-1 ring-primary-base' : 'hover:bg-bg-weak-50',
      )}
      onClick={onClick}
    >
      {option.label}
      {isSelected ? (
        <RiCheckLine
          className='pointer-events-none absolute right-2 top-1/2 size-5 shrink-0 -translate-y-1/2 text-primary-base'
          aria-hidden
        />
      ) : null}
    </button>
  );

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type='button'
          disabled={disabled}
          data-placeholder={value ? undefined : ''}
          className={cn(
            triggerRoot(),
            'h-9 gap-2 rounded-10 px-2.5',
            className,
            isFilterActive && 'bg-primary-lighter ring-1 ring-primary-base',
            disabled && 'pointer-events-none opacity-60',
          )}
        >
          <RiCalendarLine className='size-4 shrink-0 text-text-soft-400' aria-hidden />
          <span className='min-w-0 flex-1 truncate text-left'>{triggerLabel}</span>
          {value ? (
            <span
              role='button'
              tabIndex={0}
              aria-label='Clear agreement date filter'
              className='shrink-0 text-text-soft-400 hover:text-text-strong-950'
              onClick={handleClear}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  handleClear(event);
                }
              }}
            >
              <RiCloseLine className='size-4' />
            </span>
          ) : (
            <RiArrowDownSLine className={triggerArrow()} aria-hidden />
          )}
        </button>
      </Popover.Trigger>
      <Popover.Content className='w-auto p-0' align='end' side='bottom' sideOffset={8}>
        {step === 'type' ? (
          <div className='flex w-[240px] flex-col gap-1 p-2'>
            <p className='px-2 py-1 text-label-xs text-text-sub-600'>Filter by</p>
            {LAYOUT_AGREEMENT_DATE_FILTER_OPTIONS.map((option) =>
              renderOptionButton(option, value?.type === option.value, () =>
                handleSelectType(option.value),
              ),
            )}
          </div>
        ) : null}

        {step === 'preset' ? (
          <div className='flex w-[240px] flex-col'>
            <div className='flex items-center gap-2 border-b border-stroke-soft-200 px-3 py-2'>
              <button
                type='button'
                className='flex size-7 items-center justify-center rounded-lg text-text-sub-600 hover:bg-bg-weak-50'
                aria-label='Back to filter type'
                onClick={() => setStep('type')}
              >
                <RiArrowLeftSLine className='size-5' />
              </button>
              <span className='min-w-0 flex-1 truncate text-label-sm text-text-strong-950'>
                {pendingTypeLabel}
              </span>
            </div>
            <div className='flex flex-col gap-1 p-2'>
              <p className='px-2 py-1 text-label-xs text-text-sub-600'>Date range</p>
              {LAYOUT_AGREEMENT_DATE_RANGE_PRESET_OPTIONS.map((option) => {
                const isSelected =
                  value?.type === pendingType &&
                  (option.value === 'custom'
                    ? value?.preset === 'custom'
                    : value?.preset === option.value);
                return renderOptionButton(option, isSelected, () =>
                  handleSelectPreset(option.value),
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 'calendar' ? (
          <div className='flex flex-col'>
            <div className='flex items-center gap-2 border-b border-stroke-soft-200 px-3 py-2'>
              <button
                type='button'
                className='flex size-7 items-center justify-center rounded-lg text-text-sub-600 hover:bg-bg-weak-50'
                aria-label='Back to date range presets'
                onClick={() => setStep('preset')}
              >
                <RiArrowLeftSLine className='size-5' />
              </button>
              <span className='min-w-0 flex-1 truncate text-label-sm text-text-strong-950'>
                Custom
              </span>
            </div>
            <Calendar.Calendar
              mode='range'
              selected={draftRange}
              onSelect={handleRangeSelect}
              defaultMonth={draftRange.from}
              numberOfMonths={1}
            />
          </div>
        ) : null}
      </Popover.Content>
    </Popover.Root>
  );
}
