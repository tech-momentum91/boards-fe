import React from 'react';
import { RiArrowLeftLine, RiGlobalLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import FetchDataButton from '@/components/shared/fetch-data-button';

const CrmAccountDetailHeader = ({
  account,
  onBack,
  isWebsiteMissing,
  onFetchData,
  isFetchingData,
}) => {
  const name = account?.account_name || account?.customer_name || '--';
  const website = account?.website || '';

  return (
    <div className='flex h-[88px] items-center justify-between border-b border-stroke-soft-200 px-6 py-5 shrink-0'>
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
        <div className='flex flex-col gap-1'>
          <h1 className='text-title-h5 text-text-main-900'>{name}</h1>
          {website && (
            <a
              href={website.startsWith('http') ? website : `https://${website}`}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-1 text-paragraph-sm text-text-sub-500 hover:text-primary-base transition-colors'
            >
              <RiGlobalLine size={14} />
              {website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      </div>
      <div className='flex items-center gap-3'>
        <FetchDataButton
          isWebsiteMissing={isWebsiteMissing}
          isFetchingData={isFetchingData}
          onFetchData={onFetchData}
        />
      </div>
    </div>
  );
};

export default CrmAccountDetailHeader;
