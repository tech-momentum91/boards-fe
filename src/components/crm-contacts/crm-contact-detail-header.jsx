import React from 'react';
import { RiArrowLeftLine, RiBuilding2Line } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';

const CrmContactHeader = ({ contact, onBack }) => {
  return (
    <div className='flex h-[88px] items-center justify-between border-b border-stroke-soft-200 px-6 py-5 shrink-0'>
      <div className='flex items-center gap-4'>
        <Button.Root
          variant='neutral'
          mode='stroke'
          size='xsmall'
          onClick={onBack}
          className='shrink-0'
        >
          <Button.Icon as={RiArrowLeftLine} />
        </Button.Root>
        <div className='flex items-center gap-3'>
          <CrmAccountAvatar
            name={contact?.full_name || contact?.name}
            index={0}
            size={40}
            className='shrink-0'
          />
          <div className='flex flex-col gap-1'>
            <h1 className='text-label-lg font-semibold text-text-main-900'>
              {contact?.full_name || contact?.name || '--'}
            </h1>
            <div className='flex items-center gap-1.5 text-paragraph-sm text-text-sub-500'>
              <RiBuilding2Line size={16} className='text-text-soft-400 shrink-0' />
              <span className='font-normal text-sm text-text-main-500'>
                {contact?.account || contact?.associate_account || '--'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CrmContactHeader;
