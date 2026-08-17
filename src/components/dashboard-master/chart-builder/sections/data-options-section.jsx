import React, { useEffect, useMemo } from 'react';

import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';
import { buildSortByOptions, getDefaultSortOptions } from '../chart-sort-utils';
import SectionCard from './section-card';

const SELECT_CONTENT_CLASS = 'z-[250]';

const DIRECTION_OPTIONS = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

function DirectionChip({ label, active, onClick }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'h-[22px] shrink-0 rounded-md px-2 py-1 label-xsmall transition-colors',
        active
          ? 'bg-primary-base text-static-white'
          : 'bg-bg-soft-200 text-text-sub-500 hover:bg-bg-weak-100',
      )}
    >
      {label}
    </button>
  );
}

export default function DataOptionsSection({
  chartType,
  chartTypeMeta,
  xValue,
  yValue,
  groupByValue,
  sortBy,
  sortDirection,
  rowLimit,
  onChange,
}) {
  const sortByOptions = useMemo(
    () => buildSortByOptions({ chartTypeMeta, xValue, yValue, groupByValue }),
    [chartTypeMeta, xValue, yValue, groupByValue],
  );

  const defaults = useMemo(
    () => getDefaultSortOptions(chartType, chartTypeMeta),
    [chartType, chartTypeMeta],
  );

  const effectiveSortBy = sortBy || defaults.sortBy;
  const effectiveSortDirection = sortDirection || defaults.sortDirection;

  const selectedSortLabel = useMemo(() => {
    const match = sortByOptions.find((opt) => opt.value === effectiveSortBy);
    return match?.label || 'Select field';
  }, [sortByOptions, effectiveSortBy]);

  // Reset sort field when it becomes invalid (e.g. chart type or axis change).
  useEffect(() => {
    if (!sortBy) return;
    if (!sortByOptions.some((opt) => opt.value === sortBy)) {
      onChange({ sortBy: null });
    }
  }, [sortBy, sortByOptions, onChange]);

  const hasSortOptions = sortByOptions.length > 0;

  return (
    <SectionCard title='Sort & Limit' defaultOpen>
      <div className='flex flex-col gap-1'>
        <Label.Root>Sort By</Label.Root>
        <Select.Root
          value={hasSortOptions ? effectiveSortBy : undefined}
          onValueChange={(value) =>
            onChange({
              sortBy: value,
              ...(sortBy ? {} : { sortDirection: defaults.sortDirection }),
            })
          }
          size='small'
          disabled={!hasSortOptions}
        >
          <Select.Trigger className='flex h-9 w-full min-w-0 items-center overflow-hidden'>
            <span className='block min-w-0 flex-1 truncate text-left text-paragraph-sm'>
              {hasSortOptions ? selectedSortLabel : 'Configure axes first'}
            </span>
          </Select.Trigger>
          <Select.Content className={SELECT_CONTENT_CLASS}>
            {sortByOptions.map((opt) => (
              <Select.Item key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label.Root>Sort Direction</Label.Root>
        <div className='flex flex-wrap gap-1'>
          {DIRECTION_OPTIONS.map((opt) => (
            <DirectionChip
              key={opt.value}
              label={opt.label}
              active={effectiveSortDirection === opt.value}
              onClick={() =>
                onChange({
                  sortDirection: opt.value,
                  ...(sortBy ? {} : { sortBy: defaults.sortBy }),
                })
              }
            />
          ))}
        </div>
      </div>

      <div className='flex flex-col gap-1'>
        <Label.Root>Limit</Label.Root>
        <Input.Root size='small'>
          <Input.Wrapper>
            <Input.Input
              type='number'
              min={1}
              max={1000}
              placeholder='No limit (show all)'
              value={rowLimit ?? ''}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (!raw) {
                  onChange({ rowLimit: null });
                  return;
                }
                const parsed = Number.parseInt(raw, 10);
                if (Number.isFinite(parsed) && parsed > 0) {
                  onChange({ rowLimit: Math.min(parsed, 1000) });
                }
              }}
            />
          </Input.Wrapper>
        </Input.Root>
        <p className='paragraph-xsmall text-text-soft-400'>
          Optional. Use for Top N or Bottom N charts (e.g. Top 10 customers).
        </p>
      </div>
    </SectionCard>
  );
}
