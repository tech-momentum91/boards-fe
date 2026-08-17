import React, { useCallback, useEffect, useState } from 'react';
import { RiArmchairLine, RiMapPinLine } from 'react-icons/ri';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { listCentersForManualAdd, searchSpacesForManualAdd } from '@/api/crmSuggestedInventory';
import { INVENTORY_TYPE_OPTIONS } from '@/components/crm-leads/crm-lead-suggested-inventory/constants';
import { cn } from '@/utils/cn';

const BORDERLESS_SELECT_PROPS = {
  variant: 'borderless',
  size: 'small',
  triggerClassName: 'h-8 min-h-8 px-0 text-paragraph-sm text-text-sub-500',
};

export function ManualCenterSelect({ leadId, value, onValueChange }) {
  const [options, setOptions] = useState([]);

  const load = useCallback(
    async (keyword = '') => {
      const opts = await listCentersForManualAdd({ leadId, keyword });
      setOptions(opts);
    },
    [leadId],
  );

  useEffect(() => {
    load('');
  }, [load]);

  return (
    <SearchableSelect
      placeholder='Select'
      value={value || ''}
      onValueChange={onValueChange}
      options={options}
      onOpenChange={(open) => {
        if (open) load('');
      }}
      {...BORDERLESS_SELECT_PROPS}
    />
  );
}

export function ManualSpaceTypeSelect({ value, onValueChange }) {
  return (
    <SearchableSelect
      placeholder='Select'
      value={value || ''}
      onValueChange={onValueChange}
      options={INVENTORY_TYPE_OPTIONS}
      {...BORDERLESS_SELECT_PROPS}
    />
  );
}

export function ManualSpaceSelect({ leadId, center, inventoryType, value, onSpaceSelected }) {
  const [options, setOptions] = useState([]);

  const load = useCallback(
    async (keyword = '') => {
      if (!center) {
        setOptions([]);
        return;
      }
      const list = await searchSpacesForManualAdd({
        leadId,
        center,
        inventoryType: inventoryType || undefined,
        keyword,
      });
      setOptions(
        list.map((s) => ({
          value: s.space_id,
          label: s.space_name,
          _row: s,
        })),
      );
    },
    [leadId, center, inventoryType],
  );

  useEffect(() => {
    load('');
  }, [load]);

  return (
    <SearchableSelect
      placeholder='Select'
      searchPlaceholder='Search...'
      value={value || ''}
      onValueChange={(spaceId) => {
        const opt = options.find((o) => o.value === spaceId);
        if (opt?._row) onSpaceSelected(opt._row);
      }}
      options={options}
      contentClassName='min-w-[320px] rounded-2xl shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      renderOptionLabel={(opt) => {
        const row = opt?._row || {};
        return (
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <p className='truncate text-paragraph-sm text-text-strong-950'>{opt.label}</p>
            <div className='flex min-w-0 items-center gap-2 text-paragraph-xs text-text-sub-500'>
              <span className='inline-flex items-center gap-1'>
                <RiMapPinLine className='size-4 text-text-soft-400' />
                <span className='truncate'>{row.floor ? `Floor ${row.floor}` : 'Floor —'}</span>
              </span>
              <span className='size-1 rounded-full bg-text-soft-400' />
              <span className='inline-flex items-center gap-1'>
                <RiArmchairLine className='size-4 text-text-soft-400' />
                <span>{`${row.avail_seats ?? 0} Seats Available`}</span>
              </span>
            </div>
          </div>
        );
      }}
      renderTrigger={({ selectedOption, selectedLabel, placeholder }) => (
        <span
          className={cn(
            'block min-w-0 max-w-full truncate',
            !selectedOption && 'text-text-sub-500',
          )}
        >
          {selectedOption ? selectedLabel : placeholder}
        </span>
      )}
      disabled={!center}
      onOpenChange={(open) => {
        if (open) load('');
      }}
      {...BORDERLESS_SELECT_PROPS}
    />
  );
}
