import React, { useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  DATETIME_FILTER_PRESET,
  DATETIME_FILTER_PRESET_OPTIONS,
  DEFAULT_DATETIME_FILTER,
} from '@/components/crm-accounts/constants';
import {
  getDatetimeFilterCalendarSelection,
  normalizeDatetimeFilter,
  shouldShowDatetimeCalendar,
  toIsoDateString,
} from '@/utils/date-utils';

export function DateTimeFilterPanel({ value, onChange, label }) {
  const filter = useMemo(() => normalizeDatetimeFilter(value), [value]);
  const showCalendar = shouldShowDatetimeCalendar(filter.preset);
  const calendarConfig = useMemo(() => getDatetimeFilterCalendarSelection(filter), [filter]);

  const handlePresetChange = (preset) => {
    const nextPreset = preset || DATETIME_FILTER_PRESET.ANY_TIME;
    onChange?.({
      ...DEFAULT_DATETIME_FILTER,
      preset: nextPreset,
      ...(nextPreset === DATETIME_FILTER_PRESET.IS_BETWEEN
        ? { from: filter.from, to: filter.to }
        : {}),
      ...(nextPreset === DATETIME_FILTER_PRESET.IS_BEFORE ||
      nextPreset === DATETIME_FILTER_PRESET.IS_AFTER
        ? { date: filter.date }
        : {}),
    });
  };

  const handleCalendarSelect = (selection) => {
    if (filter.preset === DATETIME_FILTER_PRESET.IS_BETWEEN) {
      onChange?.({
        ...filter,
        from: toIsoDateString(selection?.from),
        to: toIsoDateString(selection?.to),
      });
      return;
    }

    if (
      filter.preset === DATETIME_FILTER_PRESET.IS_BEFORE ||
      filter.preset === DATETIME_FILTER_PRESET.IS_AFTER
    ) {
      onChange?.({
        ...filter,
        date: toIsoDateString(selection),
      });
      return;
    }

    if (selection?.from) {
      onChange?.({
        preset: DATETIME_FILTER_PRESET.IS_BETWEEN,
        date: null,
        from: toIsoDateString(selection.from),
        to: toIsoDateString(selection.to || selection.from),
      });
    }
  };

  return (
    <div className='flex flex-col gap-3 p-3'>
      {label ? <span className='paragraph-small text-text-sub-500'>{label}</span> : null}

      <SearchableSelect
        value={filter.preset}
        onValueChange={handlePresetChange}
        options={DATETIME_FILTER_PRESET_OPTIONS}
        placeholder='Any time'
        searchPlaceholder='Search...'
        size='small'
        showArrow
        triggerClassName='w-full'
        contentClassName='min-w-[var(--radix-popover-trigger-width)]'
      />

      {showCalendar ? (
        <div className='flex justify-center'>
          {calendarConfig.mode === 'range' ? (
            <Calendar
              mode='range'
              numberOfMonths={1}
              selected={calendarConfig.selected}
              onSelect={(range) => handleCalendarSelect(range || null)}
              defaultMonth={calendarConfig.defaultMonth}
              initialFocus
            />
          ) : (
            <Calendar
              mode='single'
              numberOfMonths={1}
              selected={calendarConfig.selected}
              onSelect={(date) => handleCalendarSelect(date || null)}
              defaultMonth={calendarConfig.defaultMonth}
              initialFocus
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
