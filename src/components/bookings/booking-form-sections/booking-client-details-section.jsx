import React from 'react';
import { Controller } from 'react-hook-form';
import { RiUserLine } from 'react-icons/ri';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Label from '@/components/ui/label';
import ErrorText from '@/components/ui/error-text';

const BookingClientDetailsSection = ({
  control,
  errors,
  isSubmitted,
  clients,
  selectedClient,
  clientsLoading = false,
}) => {
  return (
    <div className='border border-stroke-soft-200 rounded-[10px] overflow-hidden shrink-0'>
      <div className='bg-bg-weak-100 flex items-center gap-2 px-3 py-1.5'>
        <RiUserLine className='size-5 text-text-sub-500' />
        <h3 className='text-label-sm text-text-sub-500'>Client Details</h3>
      </div>
      <div className='px-4 pb-4 pt-0 mt-3'>
        <div className='flex flex-col gap-1'>
          <Label.Root className='text-text-main-900'>
            Client <Label.Asterisk />
          </Label.Root>
          <Controller
            name='client_id'
            control={control}
            render={({ field }) => (
              <SearchableSelect
                size='small'
                value={field.value}
                onValueChange={field.onChange}
                disabled={clientsLoading}
                hasError={isSubmitted && Boolean(errors.client_id)}
                options={clients}
                placeholder={clientsLoading ? 'Loading clients...' : 'Select a client'}
                showArrow={true}
                isolateSearchKeyboard
              />
            )}
          />
          {isSubmitted && errors.client_id && <ErrorText>{errors.client_id.message}</ErrorText>}
        </div>
      </div>
    </div>
  );
};

export default BookingClientDetailsSection;
