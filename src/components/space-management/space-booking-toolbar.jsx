import React, { useState } from 'react';
import {
  RiTimeLine,
  RiAddLine,
  RiLayoutColumnLine,
  RiCalendarLine,
  RiCloseLine,
} from 'react-icons/ri';
import { BOOKING_STATUS } from '../bookings/constants';
import * as Select from '@/components/ui/select';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as DatepickerPrimivites from '@/components/ui/calendar';
import { formatDateRangeLabel } from '@/utils/date-utils';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';

import { useDispatch } from 'react-redux';
import { openBookingForm } from '@/redux/bookingSlice';

const SpaceBookingToolbar = ({
  tableRef,
  dateRange = { from: null, to: null },
  onDateRangeChange,
  clients = [],
  clientFilter = 'all',
  onClientFilterChange,
  space,
}) => {
  const dispatch = useDispatch();
  const size = 'xsmall';
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);

  // Client options
  const clientOptions = [
    { value: 'all', label: 'All Client' },
    ...clients.map((client) => ({
      value: client.name,
      label: client.customer_name || client.name,
    })),
  ];

  const handleNewBooking = () => {
    if (!space) return;

    dispatch(
      openBookingForm({
        mode: 'create',
        initialData: {
          title: space.spaceName || '',
          space: {
            spaceId: space.id,
            centerId: space.centerId || '',
            resourceTypeId: space.subSpaceType || '',
          },
        },
      }),
    );
  };

  // Date Picker Logic
  const handleClearDateRange = () => {
    if (!onDateRangeChange) return;
    onDateRangeChange({ from: null, to: null });
  };

  const listViewDateRange = {
    from: dateRange?.from ? new Date(dateRange.from) : undefined,
    to: dateRange?.to ? new Date(dateRange.to) : undefined,
  };

  const handleListViewDateRangeChange = (range) => {
    if (!onDateRangeChange) return;

    if (!range) {
      onDateRangeChange({ from: null, to: null });
      return;
    }

    onDateRangeChange({
      from: range.from ?? null,
      to: range.to ?? null,
    });
  };

  return (
    <div className='flex w-full min-w-0 flex-wrap items-center justify-between gap-2'>
      <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
        <RiTimeLine className='size-5 text-text-sub-600' />
        <div className='text-title-h6 text-text-strong-950'>Booking History</div>
      </div>
      <div className='flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2'>
        {/* Date Range Picker (List View) with inline clear icon */}
        <Popover.Root>
          <Popover.Trigger asChild>
            <div className='w-[215px] shrink-0 min-w-0'>
              <Input.Root size={size}>
                <Input.Wrapper>
                  <Input.Icon>
                    <RiCalendarLine />
                  </Input.Icon>
                  <Input.Input
                    readOnly
                    placeholder='DD/MM/YY - DD/MM/YY'
                    value={
                      listViewDateRange?.from || listViewDateRange?.to
                        ? formatDateRangeLabel(listViewDateRange.from, listViewDateRange.to)
                        : ''
                    }
                    className='min-w-0'
                  />
                  {(dateRange?.from || dateRange?.to) && (
                    <Input.Affix
                      className='bg-transparent cursor-pointer px-0'
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClearDateRange();
                      }}
                    >
                      <RiCloseLine size={20} className='text-text-soft-400' />
                    </Input.Affix>
                  )}
                </Input.Wrapper>
              </Input.Root>
            </div>
          </Popover.Trigger>
          <Popover.Content className='p-0' align='start' side='bottom' sideOffset={8}>
            <DatepickerPrimivites.Calendar
              mode='range'
              selected={listViewDateRange}
              onSelect={handleListViewDateRangeChange}
            />
          </Popover.Content>
        </Popover.Root>

        <div className='w-[200px] shrink-0 min-w-0'>
          <Select.Root
            value={clientFilter || 'all'}
            onValueChange={onClientFilterChange}
            size={size}
          >
            <Select.Trigger className='min-w-0'>
              <Select.Value placeholder='All Client' />
            </Select.Trigger>
            <Select.Content>
              {clientOptions.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>

        {/* Column Manager Button */}
        {tableRef && (
          <ColumnManagerDropdown
            open={isColumnManagerOpen}
            onOpenChange={setIsColumnManagerOpen}
            config={
              tableRef.current?.columnConfigHook || {
                columns: [],
                visibleColumns: [],
              }
            }
            tooltipContent='Column Manager'
            trigger={
              <Button.Root variant='neutral' mode='stroke' size={size} aria-label='Columns'>
                <Button.Icon as={RiLayoutColumnLine} />
              </Button.Root>
            }
          />
        )}

        {/* New Booking Button */}
        <Button.Root
          variant='primary'
          mode='filled'
          size={size}
          onClick={handleNewBooking}
          className='gap-1 shrink-0'
        >
          <Button.Icon as={RiAddLine} />
          New Booking
        </Button.Root>
      </div>
    </div>
  );
};

export default SpaceBookingToolbar;
