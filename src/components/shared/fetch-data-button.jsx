import React from 'react';
import { RiRefreshLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';

const FetchDataButton = ({ isWebsiteMissing, isFetchingData, onFetchData, className = '' }) => (
  <Button.Root
    className={`btn-ai-gradient !h-9 !px-4 shadow-none ${className}`}
    onClick={onFetchData}
    disabled={isFetchingData || isWebsiteMissing}
  >
    <div className='flex items-center gap-2'>
      <Button.Icon
        as={isFetchingData ? 'span' : RiRefreshLine}
        className={`${isFetchingData ? 'animate-spin' : ''} text-[#7000FF] !size-4.5`}
      >
        {isFetchingData && (
          <svg
            className='h-4 w-4 animate-spin text-[#7000FF]'
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
          >
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            />
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            />
          </svg>
        )}
      </Button.Icon>
      <span className='btn-ai-gradient-text text-label-sm'>
        {isWebsiteMissing
          ? 'Please Enter Website link'
          : isFetchingData
            ? 'Fetching...'
            : 'Fetch Data'}
      </span>
    </div>
  </Button.Root>
);

export default FetchDataButton;
