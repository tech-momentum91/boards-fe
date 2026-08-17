import React from 'react';
import { RiCloseLine, RiArrowLeftSLine, RiArrowRightSLine, RiDeleteBinLine } from 'react-icons/ri';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';

const BookingDetailHeader = ({
  isLoading,
  hasPrevious,
  hasNext,
  canDelete = true,
  onPrevious,
  onNext,
  onDelete,
  onClose,
}) => {
  return (
    <Drawer.Header className='px-6 py-3 border-b border-stroke-soft-200' showCloseButton={false}>
      <div className='flex items-center justify-between w-full'>
        {isLoading ? (
          <>
            <div className='h-8 w-32 bg-bg-weak-100 rounded animate-pulse' />
            <div className='flex items-center gap-3'>
              <div className='h-8 w-16 bg-bg-weak-100 rounded animate-pulse' />
              <div className='h-8 w-8 bg-bg-weak-100 rounded animate-pulse' />
            </div>
          </>
        ) : (
          <>
            <div className='flex items-center gap-2'>
              <ButtonGroup.Root size='xsmall'>
                <ButtonGroup.Item onClick={onPrevious} disabled={!hasPrevious}>
                  <ButtonGroup.Icon as={RiArrowLeftSLine} />
                </ButtonGroup.Item>
                <ButtonGroup.Item onClick={onNext} disabled={!hasNext}>
                  <ButtonGroup.Icon as={RiArrowRightSLine} />
                </ButtonGroup.Item>
              </ButtonGroup.Root>
            </div>
            <div className='flex items-center gap-3'>
              {canDelete && (
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  onClick={onDelete}
                  className='shrink-0 gap-1.5'
                >
                  <Button.Icon as={RiDeleteBinLine} className='shrink-0' />
                  <span>Cancel Booking</span>
                </Button.Root>
              )}
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                onClick={onClose}
                className='shrink-0'
              >
                <Button.Icon as={RiCloseLine} className='shrink-0' />
              </Button.Root>
            </div>
          </>
        )}
      </div>
    </Drawer.Header>
  );
};

export default BookingDetailHeader;
