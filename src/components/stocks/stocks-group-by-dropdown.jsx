import React, { memo, useState } from 'react';
import { RiArrowDownLine, RiArrowUpLine, RiCloseLine, RiStackLine } from 'react-icons/ri';

import {
  STOCKS_GROUP_BY_DEFAULT,
  STOCKS_GROUP_BY_OPTIONS,
  STOCKS_TOOLBAR_COPY,
} from '@/components/stocks/constants';
import StocksFormSearchableSelect from '@/components/stocks/shared/stocks-form-searchable-select';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as LinkButton from '@/components/ui/link-button';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

const StocksGroupByDropdown = memo(
  ({
    value,
    onChange,
    groupOrder = 'asc',
    onGroupOrderChange,
    options = STOCKS_GROUP_BY_OPTIONS,
    defaultValue = STOCKS_GROUP_BY_DEFAULT,
    menuLabel = STOCKS_TOOLBAR_COPY.groupByMenuLabel,
    clearLabel = STOCKS_TOOLBAR_COPY.groupByClear,
    triggerAriaLabel = STOCKS_TOOLBAR_COPY.viewOptionsAriaLabel,
    tooltipLabel = 'Group-By',
    selectPlaceholder = 'Select group by',
  }) => {
    const [isGroupByOpen, setIsGroupByOpen] = useState(false);
    const [localOrdButton, setLocalOrdButton] = useState(groupOrder);

    React.useEffect(() => {
      setLocalOrdButton(groupOrder);
    }, [groupOrder]);

    const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

    const ordButton = onGroupOrderChange ? groupOrder : localOrdButton;
    const setOrdButton = (next) =>
      onGroupOrderChange
        ? onGroupOrderChange(typeof next === 'function' ? next(groupOrder) : next)
        : setLocalOrdButton((previous) => (typeof next === 'function' ? next(previous) : next));

    const handleClear = () => {
      setOrdButton('');
      onChange?.('');
    };

    return (
      <Popover.Root open={isGroupByOpen} onOpenChange={setIsGroupByOpen}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Popover.Trigger asChild>
              <Button.Root
                type='button'
                variant={value ? 'primary' : 'neutral'}
                mode={value ? 'lighter' : 'stroke'}
                size='small'
                className={cn(
                  'gap-2 flex items-center justify-center',
                  value && 'ring-1 ring-primary-base',
                )}
                aria-label={triggerAriaLabel}
              >
                <Button.Icon as={RiStackLine} />
                {value && <span className='label-small'>{selectedLabel}</span>}
                {value ? (
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span
                        className='cursor-pointer flex items-center justify-center'
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrdButton((previous) => (previous === 'asc' ? 'desc' : 'asc'));
                        }}
                      >
                        {ordButton === 'asc' ? (
                          <RiArrowUpLine size={20} />
                        ) : (
                          <RiArrowDownLine size={20} />
                        )}
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <span className='paragraph-xsmall'>
                        {ordButton === 'asc' ? 'Asc' : 'Desc'}
                      </span>
                    </Tooltip.Content>
                  </Tooltip.Root>
                ) : null}
                {value && (
                  <RiCloseLine
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange?.('');
                    }}
                    size={18}
                    className='text-primary-dark bg-primary-light rounded-sm'
                  />
                )}
              </Button.Root>
            </Popover.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <span className='paragraph-xsmall'>{tooltipLabel}</span>
          </Tooltip.Content>
        </Tooltip.Root>

        <Popover.Content align='left' className='w-[300px] p-3'>
          <div className='flex w-full flex-col gap-2'>
            <div className='w-full flex items-center justify-between'>
              <span className='text-subheading-2xs text-text-soft-400 uppercase'>{menuLabel}</span>
              <LinkButton.Root variant='primary' size='small' onClick={handleClear}>
                {clearLabel}
              </LinkButton.Root>
            </div>

            <StocksFormSearchableSelect
              value={value || ''}
              onValueChange={(next) => {
                onChange?.(next || defaultValue);
                setIsGroupByOpen(false);
              }}
              options={options}
              placeholder={selectPlaceholder}
              size='small'
              matchTriggerWidth
            />

            <ButtonGroup.Root>
              <ButtonGroup.Item
                data-state={ordButton === 'asc' ? 'on' : 'off'}
                onClick={() => setOrdButton('asc')}
                className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
              >
                <ButtonGroup.Icon
                  data-state={ordButton === 'asc' ? 'on' : 'off'}
                  className='data-[state=on]:text-primary-base'
                  as={RiArrowUpLine}
                />
                Ascending
              </ButtonGroup.Item>
              <ButtonGroup.Item
                data-state={ordButton === 'desc' ? 'on' : 'off'}
                onClick={() => setOrdButton('desc')}
                className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
              >
                <ButtonGroup.Icon
                  data-state={ordButton === 'desc' ? 'on' : 'off'}
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
  },
);

StocksGroupByDropdown.displayName = 'StocksGroupByDropdown';

export default StocksGroupByDropdown;
