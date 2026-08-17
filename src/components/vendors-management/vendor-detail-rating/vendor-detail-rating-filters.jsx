import React from 'react';
import { RiFileList2Line, RiSendPlaneLine } from 'react-icons/ri';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Button from '@/components/ui/button';
import { CSI_QUARTER_OPTIONS, CSI_YEAR_OPTIONS } from '@/constants/csi-constants';

const VendorDetailRatingFilters = ({
  quarterFilter,
  yearFilter,
  onQuarterChange,
  onYearChange,
}) => {
  return (
    <div className='flex items-center justify-between px-6 py-4'>
      <div className='flex items-center gap-2'>
        <RiFileList2Line size={20} className='text-text-sub-500' />
        <span className='text-label-md text-text-sub-500'>Survey Submission History</span>
      </div>

      <div className='flex items-center gap-3'>
        <SearchableSelect
          value={quarterFilter || 'all'}
          onValueChange={onQuarterChange}
          size='xsmall'
          options={CSI_QUARTER_OPTIONS}
          placeholder='All Quarters'
          triggerClassName='w-[139px]'
        />

        <SearchableSelect
          value={yearFilter || 'all'}
          onValueChange={onYearChange}
          size='xsmall'
          options={CSI_YEAR_OPTIONS}
          placeholder='All Years'
          triggerClassName='w-[139px]'
        />
      </div>
    </div>
  );
};

export default VendorDetailRatingFilters;
