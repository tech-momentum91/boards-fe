import React, { useMemo, useState } from 'react';
import { RiCloseLine, RiSearchLine } from 'react-icons/ri';

import * as CompactButton from '@/components/ui/compact-button';
import * as Modal from '@/components/ui/modal';
import * as Input from '@/components/ui/input';
import { cn } from '@/utils/cn';
import {
  DASHBOARD_ICONS,
  resolveDashboardIcon,
} from '@/components/dashboard-master/dashboard-icon-utils.jsx';

const DEFAULT_ICON_ID = 'RiFlashlightLine';

export default function IconSelectorModal({ open, onOpenChange, value, onChange }) {
  const [search, setSearch] = useState('');

  const selectedIconId = value || DEFAULT_ICON_ID;
  const SelectedIcon =
    resolveDashboardIcon(selectedIconId) ?? resolveDashboardIcon(DEFAULT_ICON_ID);

  const filteredIcons = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return DASHBOARD_ICONS;
    return DASHBOARD_ICONS.filter(
      (item) => item.label.toLowerCase().includes(query) || item.id.toLowerCase().includes(query),
    );
  }, [search]);

  const handleSelect = (iconId) => {
    onChange?.(iconId);
    onOpenChange?.(false);
  };

  const handleReset = () => {
    onChange?.('');
    setSearch('');
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        className='flex max-w-[460px] flex-col gap-2 overflow-hidden rounded-16 p-2'
        showClose={false}
      >
        <div className='flex h-[50px] items-center justify-between px-2'>
          <div className='flex size-10 items-center justify-center rounded-12 bg-[rgba(243,244,246,0.6)]'>
            {SelectedIcon ? <SelectedIcon className='size-6 text-primary-base' /> : null}
          </div>
          <div className='flex items-center gap-1'>
            <button
              type='button'
              onClick={handleReset}
              className='px-2 py-1 text-[14px] text-text-soft-400 transition-colors hover:text-text-sub-600'
            >
              Reset
            </button>
            <Modal.Close asChild>
              <CompactButton.Root variant='ghost' size='large' aria-label='Close'>
                <CompactButton.Icon as={RiCloseLine} />
              </CompactButton.Root>
            </Modal.Close>
          </div>
        </div>

        <div className='px-1'>
          <Input.Root size='medium'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                placeholder='Search...'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='max-h-[251px] overflow-y-auto rounded-lg border border-stroke-soft-200 p-3'>
          {filteredIcons.length === 0 ? (
            <p className='py-6 text-center text-sm text-text-soft-400'>
              No icons match your search.
            </p>
          ) : (
            <div className='grid grid-cols-9 gap-2'>
              {filteredIcons.map((item) => {
                const isSelected = item.id === selectedIconId;
                const Icon = item.Icon;
                return (
                  <button
                    key={item.id}
                    type='button'
                    onClick={() => handleSelect(item.id)}
                    className={cn(
                      'flex size-10 items-center justify-center rounded-10 border bg-bg-white-0 p-2.5 shadow-regular-xs transition-colors',
                      isSelected
                        ? 'border-primary-base text-primary-base'
                        : 'border-stroke-soft-200 text-text-sub-600 hover:border-stroke-soft-300 hover:bg-bg-weak-50',
                    )}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon className='size-5' />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Modal.Content>
    </Modal.Root>
  );
}
