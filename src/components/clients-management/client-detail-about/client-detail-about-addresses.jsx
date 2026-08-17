import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiMapPin2Line, RiPencilLine } from 'react-icons/ri';
import {
  selectPrimaryAddress,
  selectBillingAddress,
  openEditAddressModal,
} from '@/redux/clientDetailSlice';
import { CLIENT_DETAIL_EMPTY_STATES } from '@/components/clients-management/constants';
import * as CompactButton from '@/components/ui/compact-button';
import { cn } from '@/lib/utils';

const ClientDetailAboutAddresses = () => {
  const dispatch = useDispatch();
  const primaryAddress = useSelector(selectPrimaryAddress);
  const billingAddress = useSelector(selectBillingAddress);

  const handleEditAddress = (addressType) => {
    dispatch(openEditAddressModal(addressType));
  };

  return (
    <div className='flex flex-col gap-3 border-t border-stroke-soft-200 py-4'>
      <div className='flex items-center gap-2'>
        <RiMapPin2Line size={20} className='text-text-soft-400' />
        <span className='text-label-md text-text-sub-500'>Address</span>
      </div>
      <div className='flex gap-3'>
        {primaryAddress && (
          <div
            className={cn(
              'group relative flex flex-1 flex-col gap-1.5 rounded-xl border border-stroke-soft-200 p-3',
            )}
          >
            <div className='text-subheading-xs uppercase tracking-wider opacity-72 text-text-sub-500'>
              PRIMARY ADDRESS
            </div>
            <div className='text-paragraph-sm text-text-sub-500'>{primaryAddress}</div>
            <div className='absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
              <CompactButton.Root
                size='large'
                variant='stroke'
                onClick={() => handleEditAddress('primary')}
              >
                <CompactButton.Icon as={RiPencilLine} />
              </CompactButton.Root>
            </div>
          </div>
        )}
        {billingAddress && (
          <div
            className={cn(
              'group relative flex flex-1 flex-col gap-1.5 rounded-xl border border-stroke-soft-200 p-3',
            )}
          >
            <div className='text-subheading-xs uppercase tracking-wider opacity-72 text-text-sub-500'>
              BILLING ADDRESS
            </div>
            <div className='text-paragraph-sm text-text-sub-500'>{billingAddress}</div>
            <div className='absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
              <CompactButton.Root
                size='large'
                variant='stroke'
                onClick={() => handleEditAddress('billing')}
              >
                <CompactButton.Icon as={RiPencilLine} />
              </CompactButton.Root>
            </div>
          </div>
        )}
        {!primaryAddress && !billingAddress && (
          <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center w-full'>
            <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>
              {CLIENT_DETAIL_EMPTY_STATES.addresses.title}
            </h3>
            <p className='max-w-md text-sm text-text-sub-600'>
              {CLIENT_DETAIL_EMPTY_STATES.addresses.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDetailAboutAddresses;
