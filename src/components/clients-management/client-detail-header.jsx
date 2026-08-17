import React from 'react';
import { RiArrowLeftLine, RiAddLine } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import FetchDataButton from '@/components/shared/fetch-data-button';
import { getClientStatusBadgeVariant } from '@/components/clients-management/constants';

const ClientDetailHeader = ({
  clientName,
  status,
  onBack,
  isWebsiteMissing,
  onFetchData,
  isFetchingData,
  onCreateBooking,
  onCreateTicket,
  widgetVisibilityDropdown,
}) => {
  const statusBadge = getClientStatusBadgeVariant(status);

  return (
    <div className='flex h-[88px] items-center justify-between border-b border-stroke-soft-200 px-6 py-5'>
      <div className='flex flex-1 items-center gap-4'>
        <Button.Root
          variant='neutral'
          mode='stroke'
          size='xsmall'
          onClick={onBack}
          className='shrink-0'
        >
          <Button.Icon as={RiArrowLeftLine} />
        </Button.Root>
        <div className='flex flex-col gap-1.5'>
          <h1 className='text-title-h5 text-text-main-900'>{clientName || '--'}</h1>
          <Badge.Root
            variant='light'
            color={statusBadge.color ?? 'gray'}
            className='w-fit text-nowrap'
          >
            {statusBadge.label === '-' ? '--' : statusBadge.label}
          </Badge.Root>
        </div>
      </div>
      <div className='flex items-center gap-3'>
        <FetchDataButton
          isWebsiteMissing={isWebsiteMissing}
          isFetchingData={isFetchingData}
          onFetchData={onFetchData}
        />
        <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onCreateBooking}>
          <Button.Icon as={RiAddLine} className='mr-0.5' />
          Create Booking
        </Button.Root>
        <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onCreateTicket}>
          <Button.Icon as={RiAddLine} className='mr-0.5' />
          Create Ticket
        </Button.Root>
        {widgetVisibilityDropdown}
      </div>
    </div>
  );
};

export default ClientDetailHeader;
