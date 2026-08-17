import React from 'react';
import { RiFileList2Line } from 'react-icons/ri';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Button from '@/components/ui/button';
import { CSI_QUARTER_OPTIONS, CSI_YEAR_OPTIONS } from '@/constants/csi-constants';

const ClientDetailCsiFilters = ({
  quarterFilter,
  yearFilter,
  onQuarterChange,
  onYearChange,
  onSendCsiForm,
}) => {
  return (
    <div className='flex items-center justify-between px-6 py-4'>
      <div className='flex items-center gap-2'>
        <RiFileList2Line size={20} className='text-text-sub-500' />
        <span className='text-label-md text-text-sub-500'>CSI Submission History</span>
      </div>

      <div className='flex items-center gap-3'>
        <SearchableSelect
          value={quarterFilter || 'all'}
          onValueChange={onQuarterChange}
          size='xsmall'
          options={CSI_QUARTER_OPTIONS}
          placeholder='All Quarters'
          searchPlaceholder='Search quarter...'
          showArrow
          isolateSearchKeyboard
        />

        <SearchableSelect
          value={yearFilter || 'all'}
          onValueChange={onYearChange}
          size='xsmall'
          options={CSI_YEAR_OPTIONS}
          placeholder='All Years'
          searchPlaceholder='Search year...'
          showArrow
          isolateSearchKeyboard
        />

        {/* <Button.Root
          variant='primary'
          mode='filled'
          size='xsmall'
          onClick={onSendCsiForm}
          className='gap-2'
        >
          <Button.Icon as={RiSendPlaneLine} />
          Send CSI Form
        </Button.Root> */}
      </div>
    </div>
  );
};

export default ClientDetailCsiFilters;
