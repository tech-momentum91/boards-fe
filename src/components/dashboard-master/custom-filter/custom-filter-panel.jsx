import React, { useCallback } from 'react';

import * as Button from '@/components/ui/button';
import FilterGroup from './filter-group';
import { countRules, emptyRootGroup } from './filter-model';

/**
 * Full "Custom Filters" panel matching the Figma design.
 */
export default function CustomFilterPanel({
  value,
  onChange,
  fieldOptions = [],
  getValueOptions,
  searchValueOptions,
  savedFilters = [],
  onSelectSavedFilter,
  onSaveCurrent,
  onApply,
  applyDisabled = false,
  className = '',
}) {
  const root = value && value.kind === 'group' ? value : emptyRootGroup();
  const total = countRules(root);

  const clearAll = useCallback(() => {
    onChange(emptyRootGroup());
  }, [onChange]);

  return (
    <div className={`w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 ${className}`}>
      <div className='flex items-center justify-between border-b border-stroke-soft-200 px-4 py-3'>
        <div className='label-xsmall uppercase tracking-wide text-text-sub-500'>Custom Filters</div>
        <SavedFiltersDropdown
          items={savedFilters}
          onSelect={onSelectSavedFilter}
          onSaveCurrent={onSaveCurrent}
        />
      </div>

      <div className='max-h-[360px] overflow-y-auto overflow-x-visible p-4'>
        <FilterGroup
          group={root}
          fieldOptions={fieldOptions}
          getValueOptions={getValueOptions}
          searchValueOptions={searchValueOptions}
          onChange={onChange}
        />
      </div>

      <div className='flex items-center justify-between rounded-b-xl border-t border-stroke-soft-200 bg-bg-weak-50 px-4 py-3'>
        <span className='paragraph-xsmall text-text-sub-500'>
          {total === 0 ? 'No filters yet' : `${total} filter${total === 1 ? '' : 's'} applied`}
        </span>
        <div className='flex items-center gap-2'>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='xsmall'
            onClick={clearAll}
            disabled={total === 0}
            className='!border-primary-base !text-primary-base'
          >
            Clear All
          </Button.Root>
          {onApply && (
            <Button.Root
              variant='primary'
              mode='filled'
              size='xsmall'
              onClick={onApply}
              disabled={applyDisabled}
            >
              Apply
            </Button.Root>
          )}
        </div>
      </div>
    </div>
  );
}

function SavedFiltersDropdown({ items, onSelect, onSaveCurrent }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className='relative'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='inline-flex items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-1 label-xsmall text-text-strong-950 hover:bg-bg-weak-50'
      >
        Saved filters
        <span className='text-text-soft-400'>▾</span>
      </button>
      {open && (
        <div className='absolute right-0 top-full z-10 mt-1 w-[220px] rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-1 shadow-md'>
          {items.length === 0 && (
            <div className='px-2 py-1.5 text-xs text-text-soft-400'>No saved filters</div>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              type='button'
              onClick={() => {
                onSelect?.(item);
                setOpen(false);
              }}
              className='w-full rounded px-2 py-1.5 text-left text-sm hover:bg-bg-weak-50'
            >
              {item.label}
            </button>
          ))}
          {onSaveCurrent && (
            <>
              <div className='my-1 border-t border-stroke-soft-200' />
              <button
                type='button'
                onClick={() => {
                  onSaveCurrent();
                  setOpen(false);
                }}
                className='w-full rounded px-2 py-1.5 text-left text-sm text-primary-base hover:bg-bg-weak-50'
              >
                Save current filter…
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
