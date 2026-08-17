import React, { useState } from 'react';
import { RiStackLine, RiArrowUpLine, RiArrowDownLine, RiCloseLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';
import * as ButtonGroup from '@/components/ui/button-group';
import * as LinkButton from '@/components/ui/link-button';

/**
 * Toolbar control for choosing a group-by field and sort order (same pattern as Opex toolbar).
 */
export default function GroupByToolbarControl({
  options = [],
  groupBy = '',
  onGroupByChange,
  groupOrder = 'asc',
  onGroupOrderChange,
  size = 'small',
}) {
  const [open, setOpen] = useState(false);
  const ordBtn = groupOrder;
  const setOrdBtn = (value) =>
    onGroupOrderChange?.(typeof value === 'function' ? value(groupOrder) : value);

  const selectedLabel = options.find((o) => o.value === groupBy)?.label;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button.Root
          variant={groupBy ? 'primary' : 'neutral'}
          mode={groupBy ? 'lighter' : 'stroke'}
          size={size}
          className={`gap-2 flex items-center justify-center shrink-0 ${groupBy ? 'ring-1 ring-primary-base' : ''}`}
          aria-label='Group by'
        >
          <Button.Icon as={RiStackLine} />
          {selectedLabel ? <span className='label-small'>{selectedLabel}</span> : null}
          {groupBy ? (
            <span
              role='button'
              tabIndex={0}
              className='cursor-pointer flex items-center justify-center ml-1'
              onClick={(e) => {
                e.stopPropagation();
                setOrdBtn((previous) => (previous === 'asc' ? 'desc' : 'asc'));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setOrdBtn((previous) => (previous === 'asc' ? 'desc' : 'asc'));
                }
              }}
              title={ordBtn === 'asc' ? 'Ascending' : 'Descending'}
            >
              {ordBtn === 'asc' ? <RiArrowUpLine size={20} /> : <RiArrowDownLine size={20} />}
            </span>
          ) : null}
          {groupBy ? (
            <RiCloseLine
              onClick={(e) => {
                e.stopPropagation();
                onGroupByChange?.('');
              }}
              size={18}
              className='text-primary-dark bg-primary-light rounded-sm ml-1 hover:bg-primary-light/80 transition-colors'
              title='Clear grouping'
            />
          ) : null}
        </Button.Root>
      </Popover.Trigger>

      <Popover.Content align='start' className='w-[300px] p-3'>
        <div className='flex w-full flex-col gap-2'>
          <div className='w-full flex items-center justify-between'>
            <span className='text-subheading-2xs text-text-soft-400'>GROUP BY</span>
            <LinkButton.Root
              variant='primary'
              size='small'
              onClick={() => {
                setOrdBtn('asc');
                onGroupByChange?.('');
              }}
            >
              Clear
            </LinkButton.Root>
          </div>

          <Select.Root
            value={groupBy || undefined}
            onValueChange={(value) => {
              onGroupByChange?.(value);
              setOpen(false);
            }}
            size='small'
          >
            <Select.Trigger className='w-full'>
              <Select.Value placeholder='Select group by' />
            </Select.Trigger>
            <Select.Content>
              {options.map((opt) => (
                <Select.Item key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          <ButtonGroup.Root>
            <ButtonGroup.Item
              data-state={ordBtn === 'asc' ? 'on' : 'off'}
              onClick={() => setOrdBtn('asc')}
              className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
            >
              <ButtonGroup.Icon
                data-state={ordBtn === 'asc' ? 'on' : 'off'}
                className='data-[state=on]:text-primary-base'
                as={RiArrowUpLine}
              />
              Ascending
            </ButtonGroup.Item>
            <ButtonGroup.Item
              data-state={ordBtn === 'desc' ? 'on' : 'off'}
              onClick={() => setOrdBtn('desc')}
              className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
            >
              <ButtonGroup.Icon
                data-state={ordBtn === 'desc' ? 'on' : 'off'}
                className='data-[state=on]:text-primary-base'
                as={RiArrowDownLine}
              />
              Descending
            </ButtonGroup.Item>
          </ButtonGroup.Root>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
