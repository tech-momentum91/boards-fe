import React from 'react';
import { RiMapPin2Line, RiPencilLine, RiAddLine } from 'react-icons/ri';

import * as CompactButton from '@/components/ui/compact-button';
import * as Button from '@/components/ui/button';
import { cn } from '@/lib/utils';

const hasValue = (v) => v != null && String(v).trim() !== '';

const AddAddressCard = ({ title, onAdd }) => (
  <div className='flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stroke-soft-200 p-3 text-center'>
    <div className='text-subheading-xs uppercase tracking-wider opacity-72 text-text-sub-500'>
      {title}
    </div>
    <Button.Root
      type='button'
      variant='neutral'
      mode='stroke'
      size='xsmall'
      className='gap-1'
      onClick={onAdd}
    >
      <Button.Icon>
        <RiAddLine size={18} />
      </Button.Icon>
      Add Address
    </Button.Root>
  </div>
);

/**
 * Address section for CP Account detail (layout aligned with client detail addresses).
 */
const CpAccountAddressSection = ({
  primaryAddress,
  billingAddress,
  onEditAddress,
  canEditPrimary = false,
  canEditBilling = false,
  canAddPrimary = false,
  canAddBilling = false,
}) => {
  const primary = primaryAddress != null ? String(primaryAddress).trim() : '';
  const billing = billingAddress != null ? String(billingAddress).trim() : '';
  return (
    <div className='flex flex-col gap-3 border-t border-stroke-soft-200 py-4'>
      <div className='flex items-center gap-2'>
        <RiMapPin2Line size={20} className='text-text-soft-400' />
        <span className='text-label-md text-text-sub-500'>Address</span>
      </div>
      <div className='flex gap-3'>
        {hasValue(primary) ? (
          <div
            className={cn(
              'group relative flex flex-1 flex-col gap-1.5 rounded-xl border border-stroke-soft-200 p-3',
            )}
          >
            <div className='text-subheading-xs uppercase tracking-wider opacity-72 text-text-sub-500'>
              PRIMARY ADDRESS
            </div>
            <div className='text-paragraph-sm text-text-sub-500'>{primary}</div>
            {canEditPrimary && typeof onEditAddress === 'function' && (
              <div className='absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                <CompactButton.Root
                  size='large'
                  variant='stroke'
                  onClick={() => onEditAddress('primary')}
                >
                  <CompactButton.Icon as={RiPencilLine} />
                </CompactButton.Root>
              </div>
            )}
          </div>
        ) : (
          canAddPrimary &&
          typeof onEditAddress === 'function' && (
            <AddAddressCard title='PRIMARY ADDRESS' onAdd={() => onEditAddress('primary')} />
          )
        )}
        {hasValue(billing) ? (
          <div
            className={cn(
              'group relative flex flex-1 flex-col gap-1.5 rounded-xl border border-stroke-soft-200 p-3',
            )}
          >
            <div className='text-subheading-xs uppercase tracking-wider opacity-72 text-text-sub-500'>
              BILLING ADDRESS
            </div>
            <div className='text-paragraph-sm text-text-sub-500'>{billing}</div>
            {canEditBilling && typeof onEditAddress === 'function' && (
              <div className='absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                <CompactButton.Root
                  size='large'
                  variant='stroke'
                  onClick={() => onEditAddress('billing')}
                >
                  <CompactButton.Icon as={RiPencilLine} />
                </CompactButton.Root>
              </div>
            )}
          </div>
        ) : (
          canAddBilling &&
          typeof onEditAddress === 'function' && (
            <AddAddressCard title='BILLING ADDRESS' onAdd={() => onEditAddress('billing')} />
          )
        )}
      </div>
    </div>
  );
};

export default CpAccountAddressSection;
