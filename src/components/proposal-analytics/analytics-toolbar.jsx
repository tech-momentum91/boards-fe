import React, { useMemo, useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Funnel, RefreshCcw } from 'lucide-react';
import { RiCalendarLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

const PRESETS = [
  { id: 'today', label: 'Today', days: 0 },
  { id: 'yesterday', label: 'Yesterday', days: 1, single: true },
  { id: '7', label: 'Last 7 days', days: 6 },
  { id: '30', label: 'Last 30 days', days: 29 },
  { id: '90', label: 'Last 90 days', days: 89 },
];

function rangeFromPreset(presetId) {
  const today = startOfDay(new Date());
  if (presetId === 'today') {
    return { from: today, to: endOfDay(new Date()) };
  }
  if (presetId === 'yesterday') {
    const day = subDays(today, 1);
    return { from: day, to: endOfDay(day) };
  }
  const preset = PRESETS.find((item) => item.id === presetId);
  if (!preset || preset.days == null) return null;
  return {
    from: startOfDay(subDays(today, preset.days)),
    to: endOfDay(new Date()),
  };
}

/**
 * Refresh + date range (presets + calendar) + filters toolbar.
 */
export function AnalyticsToolbar({
  dateRange,
  onDateRangeChange,
  onRefresh,
  refreshing = false,
  filterOptions = [],
  selectedFilters = [],
  onFiltersChange,
  className,
}) {
  const [dateOpen, setDateOpen] = useState(false);
  const [activePreset, setActivePreset] = useState('all');
  const [draft, setDraft] = useState(dateRange);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const displayText = useMemo(() => {
    const source = dateOpen ? draft : dateRange;
    if (!source?.from && !source?.to) return 'All time';
    if (source?.from && source?.to) {
      return `${format(source.from, 'MMM dd, yyyy')} - ${format(source.to, 'MMM dd, yyyy')}`;
    }
    if (source?.from) return `${format(source.from, 'MMM dd, yyyy')} - …`;
    return 'All time';
  }, [dateOpen, draft, dateRange]);

  const handlePreset = (presetId) => {
    setActivePreset(presetId);
    const next = rangeFromPreset(presetId);
    setDraft(next);
    onDateRangeChange?.(next);
    setDateOpen(false);
  };

  const handleAllTime = () => {
    setActivePreset('all');
    setDraft(null);
    onDateRangeChange?.(null);
    setDateOpen(false);
  };

  const handleDateOpenChange = (open) => {
    if (open) setDraft(dateRange ?? null);
    setDateOpen(open);
  };

  const toggleFilter = (value) => {
    const next = selectedFilters.includes(value)
      ? selectedFilters.filter((item) => item !== value)
      : [...selectedFilters, value];
    onFiltersChange?.(next);
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button.Root
        type='button'
        variant='neutral'
        mode='stroke'
        size='small'
        className='size-9 shrink-0 px-0'
        onClick={onRefresh}
        disabled={refreshing}
        aria-label='Refresh analytics'
      >
        <RefreshCcw className={cn('size-4', refreshing && 'animate-spin')} aria-hidden />
      </Button.Root>

      <Popover.Root open={dateOpen} onOpenChange={handleDateOpenChange}>
        <Popover.Trigger asChild>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            className='h-9 min-w-[220px] justify-start gap-2 px-3'
          >
            <RiCalendarLine className='size-4 shrink-0 text-text-sub-500' aria-hidden />
            <span className='truncate text-left text-[13px]'>{displayText}</span>
          </Button.Root>
        </Popover.Trigger>
        <Popover.Content align='start' className='w-auto overflow-hidden p-0' showArrow={false}>
          <div className='flex min-w-[420px]'>
            <div className='w-[160px] border-r border-stroke-soft-200 py-2'>
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type='button'
                  className={cn(
                    'flex w-full px-3 py-2 text-left text-[13px] text-text-sub-600 hover:bg-bg-weak-50',
                    activePreset === preset.id && 'bg-bg-weak-50 font-medium text-text-strong-950',
                  )}
                  onClick={() => handlePreset(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type='button'
                className={cn(
                  'mt-1 flex w-full px-3 py-2 text-left text-[13px] text-text-soft-400 hover:bg-bg-weak-50',
                  activePreset === 'all' && 'bg-bg-weak-50 font-medium text-text-strong-950',
                )}
                onClick={handleAllTime}
              >
                All time
              </button>
            </div>
            <div className='p-2'>
              <Calendar
                initialFocus
                mode='range'
                defaultMonth={draft?.from ?? dateRange?.from ?? new Date()}
                selected={draft ?? undefined}
                onSelect={(range) => {
                  setDraft(range);
                  if (range?.from && range?.to) {
                    setActivePreset('');
                    onDateRangeChange?.({
                      from: startOfDay(range.from),
                      to: endOfDay(range.to),
                    });
                    setDateOpen(false);
                  }
                }}
                numberOfMonths={1}
              />
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>

      {filterOptions.length > 0 ? (
        <Popover.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
          <Popover.Trigger asChild>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='h-9 gap-2 px-3'
            >
              <Funnel className='size-3.5' aria-hidden />
              Filters
              {selectedFilters.length > 0 ? (
                <span className='rounded-full bg-bg-weak-50 px-1.5 text-[11px] text-text-soft-400'>
                  {selectedFilters.length}
                </span>
              ) : null}
            </Button.Root>
          </Popover.Trigger>
          <Popover.Content align='start' className='w-56 p-2' showArrow={false}>
            <p className='px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-text-soft-400'>
              Event type
            </p>
            <div className='mt-1 flex flex-col gap-0.5'>
              {filterOptions.map((option) => {
                const checked = selectedFilters.includes(option);
                return (
                  <button
                    key={option}
                    type='button'
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-bg-weak-50',
                      checked && 'bg-bg-weak-50 font-medium',
                    )}
                    onClick={() => toggleFilter(option)}
                  >
                    <span
                      className={cn(
                        'flex size-3.5 items-center justify-center rounded border border-stroke-soft-200',
                        checked && 'border-primary-base bg-primary-base text-white',
                      )}
                    >
                      {checked ? '✓' : null}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>
            {selectedFilters.length > 0 ? (
              <button
                type='button'
                className='mt-2 w-full px-2 py-1.5 text-left text-[12px] text-text-sub-500 hover:text-text-strong-950'
                onClick={() => onFiltersChange?.([])}
              >
                Clear filters
              </button>
            ) : null}
          </Popover.Content>
        </Popover.Root>
      ) : null}
    </div>
  );
}

export default AnalyticsToolbar;
