import React, { useCallback, useEffect, useState } from 'react';
import { RiFilter3Line } from 'react-icons/ri';

import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';

const FilterRow = ({ label, children, isLast = false, onClear, hasValue = false }) => {
  return (
    <div
      className={cn(
        'flex h-11 items-center border-b border-stroke-soft-200',
        isLast && 'border-b-0',
      )}
    >
      <div className='w-40 shrink-0 border-r border-stroke-soft-200 pl-3 pr-0 flex items-center h-full'>
        <span className='label-small text-text-main-900 whitespace-nowrap'>{label}</span>
      </div>
      <div className='flex-1 flex items-center py-1 gap-2 pr-2'>{children}</div>
      {hasValue && onClear && (
        <>
          <div className='shrink-0 w-px h-6 bg-stroke-soft-200' />
          <button
            type='button'
            onClick={onClear}
            className='shrink-0 w-8 h-8 flex items-center justify-center rounded hover:bg-stroke-soft-200 transition-colors mr-2'
            aria-label={`Clear ${label}`}
          >
            <span className='text-label-sm text-text-sub-600'>×</span>
          </button>
        </>
      )}
    </div>
  );
};

const ClientsFilterSidebar = ({
  open,
  onOpenChange,
  filters,
  onApply,
  onClear,
  centerOptions = [],
  cityOptions = [],
  statusOptions = [],
}) => {
  const [center, setCenter] = useState(filters?.center || '');
  const [city, setCity] = useState(filters?.city || '');
  const [status, setStatus] = useState(filters?.status || 'all');

  useEffect(() => {
    if (open) {
      setCenter(filters?.center || '');
      setCity(filters?.city || '');
      setStatus(filters?.status || 'all');
    }
  }, [open, filters]);

  const handleApply = useCallback(() => {
    onApply?.({
      center: center || '',
      city: city || '',
      status: status || 'all',
    });
    onOpenChange?.(false);
  }, [center, city, status, onApply, onOpenChange]);

  const handleClearAll = useCallback(() => {
    setCenter('');
    setCity('');
    setStatus('all');
    onClear?.();
  }, [onClear]);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content side='right' className='max-w-[480px]'>
        <Drawer.Header className='gap-4 px-6 py-5'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-white-0 ring-1 ring-inset ring-stroke-soft-200'>
            <RiFilter3Line className='size-5 text-text-sub-600' />
          </div>
          <div className='flex-1 space-y-1'>
            <Drawer.Title>Filter</Drawer.Title>
            <p className='paragraph-small text-text-sub-600'>
              Select filters to view specific clients
            </p>
          </div>
        </Drawer.Header>

        <Drawer.Body className='flex-1 overflow-y-auto px-6 py-6'>
          <div className='border border-stroke-soft-200 rounded-xl bg-bg-white-0'>
            <FilterRow label='Center' hasValue={Boolean(center)} onClear={() => setCenter('')}>
              <Select.Root
                value={center || undefined}
                onValueChange={setCenter}
                variant='borderless'
              >
                <Select.Trigger className='w-full'>
                  <Select.Value placeholder='Select center' />
                </Select.Trigger>
                <Select.Content>
                  {centerOptions.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FilterRow>

            <FilterRow label='City' hasValue={Boolean(city)} onClear={() => setCity('')}>
              <Select.Root value={city || undefined} onValueChange={setCity} variant='borderless'>
                <Select.Trigger className='w-full'>
                  <Select.Value placeholder='Select city' />
                </Select.Trigger>
                <Select.Content>
                  {cityOptions.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FilterRow>

            <FilterRow
              label='Status'
              isLast
              hasValue={status && status !== 'all'}
              onClear={() => setStatus('all')}
            >
              <Select.Root value={status || 'all'} onValueChange={setStatus} variant='borderless'>
                <Select.Trigger className='w-full'>
                  <Select.Value placeholder='Select status' />
                </Select.Trigger>
                <Select.Content>
                  {statusOptions.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FilterRow>
          </div>
        </Drawer.Body>

        <Drawer.Footer className='border-t border-stroke-soft-200 px-6 py-6'>
          <div className='flex items-center justify-end gap-3 w-full'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='medium'
              onClick={handleClearAll}
              className='w-[76px]'
            >
              Clear
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='medium'
              onClick={handleApply}
              className='w-[76px]'
            >
              Apply
            </Button.Root>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default ClientsFilterSidebar;
