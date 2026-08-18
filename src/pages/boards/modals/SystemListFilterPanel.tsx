import { useMemo } from 'react';
import * as Checkbox from '@/components/ui/checkbox';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';

const CLEAR_FILTER_VALUE = '__none__';

export default function SystemListFilterPanel({
  filterOptions = [],
  filterId,
  onFilterIdChange,
  filterValueOptions = [],
  selectedFilterValues = [],
  onSelectedFilterValuesChange,
  isLoadingFilters = false,
  isLoadingValues = false,
  disabled = false,
}) {
  const selectedValueSet = useMemo(() => new Set(selectedFilterValues), [selectedFilterValues]);

  const allSelected =
    filterValueOptions.length > 0 &&
    filterValueOptions.every((option) => selectedValueSet.has(option.value));

  const handleToggleValue = (value, checked) => {
    const next = new Set(selectedFilterValues);
    if (checked) {
      next.add(value);
    } else {
      next.delete(value);
    }
    onSelectedFilterValuesChange?.([...next]);
  };

  const handleToggleAll = (checked) => {
    if (!checked) {
      onSelectedFilterValuesChange?.([]);
      return;
    }

    onSelectedFilterValuesChange?.(filterValueOptions.map((option) => option.value));
  };

  const handleFilterChange = (nextValue) => {
    if (nextValue === CLEAR_FILTER_VALUE) {
      onFilterIdChange?.('');
      return;
    }

    onFilterIdChange?.(nextValue);
  };

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-col gap-1'>
        <Label.Root className='text-sm font-medium leading-5 tracking-[-0.084px] text-text-main-900'>
          Filter
          <span className='ml-1 text-xs font-normal text-text-soft-400'>(optional)</span>
        </Label.Root>

        <Select.Root
          value={filterId || undefined}
          onValueChange={handleFilterChange}
          disabled={disabled || isLoadingFilters || filterOptions.length === 0}
        >
          <Select.Trigger size='small' className='w-full'>
            <Select.Value placeholder={isLoadingFilters ? 'Loading...' : 'No filter'} />
          </Select.Trigger>
          <Select.Content className='max-h-60'>
            <Select.Item value={CLEAR_FILTER_VALUE}>No filter</Select.Item>
            {filterOptions.map((filter) => (
              <Select.Item key={filter.value} value={filter.value}>
                {filter.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>

      {filterId ? (
        <div className='flex flex-col gap-2 rounded-xl border border-stroke-soft-200 bg-[rgba(246,248,250,0.4)] p-3'>
          <div className='flex items-center justify-between gap-3'>
            <span className='text-xs font-medium uppercase tracking-[0.48px] text-text-soft-400'>
              Values
            </span>

            {filterValueOptions.length > 0 ? (
              <button
                type='button'
                onClick={() => handleToggleAll(!allSelected)}
                disabled={disabled || isLoadingValues}
                className='text-xs font-medium text-primary-base transition hover:text-primary-darker disabled:opacity-50'
              >
                {allSelected ? 'Unselect all' : 'Select all'}
              </button>
            ) : null}
          </div>

          {isLoadingValues ? (
            <div className='py-2 text-sm text-text-sub-500'>Loading values...</div>
          ) : filterValueOptions.length === 0 ? (
            <div className='py-2 text-sm text-text-sub-500'>No values found for this filter.</div>
          ) : (
            <div className='flex max-h-48 flex-col gap-2 overflow-y-auto pr-1'>
              {filterValueOptions.map((option) => {
                const isChecked = selectedValueSet.has(option.value);

                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-bg-white-0',
                      disabled && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <Checkbox.Root
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleToggleValue(option.value, checked === true)
                      }
                      disabled={disabled}
                      size='small'
                    />
                    <span className='min-w-0 flex-1 truncate text-sm text-text-main-900'>
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
