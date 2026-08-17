import React, { memo, useMemo, useState } from 'react';
import {
  RiArrowDownSLine,
  RiCalendarScheduleLine,
  RiSearchLine,
  RiSettings3Line,
} from 'react-icons/ri';

import { MS_TOOLBAR_COPY } from '@/components/aum/maintenance-scheduler/maintenance-scheduler-helper';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

const CenterSetupPopover = memo(
  ({
    selectedCenter,
    onCenterChange,
    onMasterSetupClick,
    onExitMasterSetup,
    isMasterSetupMode = false,
    centerOptions = [],
  }) => {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    const filteredCenters = useMemo(() => {
      const query = searchValue.trim().toLowerCase();
      if (!query) return centerOptions;
      return centerOptions.filter(
        (center) =>
          center.label.toLowerCase().includes(query) ||
          String(center.code ?? '')
            .toLowerCase()
            .includes(query),
      );
    }, [centerOptions, searchValue]);

    const selectedCenterOption = useMemo(
      () => centerOptions.find((center) => center.value === selectedCenter),
      [centerOptions, selectedCenter],
    );

    const triggerLabel = isMasterSetupMode
      ? MS_TOOLBAR_COPY.masterSetupLabel
      : (selectedCenterOption?.label ?? MS_TOOLBAR_COPY.masterSetupLabel);

    const handleSelectCenter = (centerValue) => {
      onCenterChange?.(centerValue);
      setOpen(false);
      setSearchValue('');
    };

    const handleMasterSetup = () => {
      setOpen(false);
      setSearchValue('');
      onMasterSetupClick?.();
    };

    const handleExitMasterSetup = () => {
      setOpen(false);
      setSearchValue('');
      onExitMasterSetup?.();
    };

    return (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type='button'
            className='inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-2 text-paragraph-sm text-text-main-900 shadow-regular-xs'
          >
            <RiSettings3Line className='size-5 shrink-0 text-text-sub-500' aria-hidden />
            <span className='max-w-[160px] truncate whitespace-nowrap'>{triggerLabel}</span>
            <RiArrowDownSLine className='size-5 shrink-0 text-text-sub-500' aria-hidden />
          </button>
        </Popover.Trigger>

        <Popover.Content
          align='end'
          sideOffset={8}
          showArrow={false}
          className='w-[294px] overflow-hidden rounded-2xl p-0 shadow-regular-lg'
        >
          <div className='border-b border-stroke-soft-200 p-2'>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder={MS_TOOLBAR_COPY.centerSearchPlaceholder}
                  autoComplete='off'
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='max-h-[204px] overflow-y-auto px-2 py-1'>
            {filteredCenters.map((center) => {
              const isSelected = center.value === selectedCenter;
              return (
                <button
                  key={center.value}
                  type='button'
                  onClick={() => handleSelectCenter(center.value)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-paragraph-sm transition-colors',
                    isSelected
                      ? 'bg-bg-weak-100 font-medium text-text-main-900'
                      : 'text-text-main-900 hover:bg-bg-weak-100',
                  )}
                >
                  <span className='truncate'>{center.label}</span>
                  <span className='ml-6 shrink-0 text-paragraph-xs text-text-soft-400'>
                    {center.code}
                  </span>
                </button>
              );
            })}
          </div>

          <div className='border-t border-stroke-soft-200 p-2'>
            {isMasterSetupMode ? (
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                className='w-full gap-1.5'
                onClick={handleExitMasterSetup}
              >
                <Button.Icon as={RiCalendarScheduleLine} className='mx-0' />
                Maintenance Scheduler
              </Button.Root>
            ) : (
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                className='w-full gap-1.5'
                onClick={handleMasterSetup}
              >
                <Button.Icon as={RiSettings3Line} className='mx-0' />
                {MS_TOOLBAR_COPY.masterSetupLabel}
              </Button.Root>
            )}
          </div>
        </Popover.Content>
      </Popover.Root>
    );
  },
);

CenterSetupPopover.displayName = 'CenterSetupPopover';

export default CenterSetupPopover;
