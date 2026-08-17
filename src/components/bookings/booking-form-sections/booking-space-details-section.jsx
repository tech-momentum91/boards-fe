import React, { useMemo, useRef } from 'react';
import { Controller } from 'react-hook-form';
import { RiBuilding2Line } from 'react-icons/ri';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Label from '@/components/ui/label';
import * as Checkbox from '@/components/ui/checkbox';
import ErrorText from '@/components/ui/error-text';

const sortByLabel = (a, b) => (a.label || '').localeCompare(b.label || '');
const sortByName = (a, b) => (a.name || '').localeCompare(b.name || '');

const BookingSpaceDetailsSection = ({
  control,
  errors,
  isSubmitted,
  setValue,
  centers,
  onBookForAnyCenterChange,
  resourceTypes,
  resourceTypesLoading = false,
  filteredResources,
  resourcesLoading,
  selectedResource,
  watchedCenterId = '',
  watchedResourceTypeId = '',
  onCenterChange,
  onResourceTypeChange,
  clearSpaceOnCenterOrTypeChange = true,
}) => {
  const lastCenterIdRef = useRef(watchedCenterId);
  const lastResourceTypeIdRef = useRef(watchedResourceTypeId);
  lastCenterIdRef.current = watchedCenterId;
  lastResourceTypeIdRef.current = watchedResourceTypeId;

  const sortedCenters = useMemo(() => [...centers].sort(sortByLabel), [centers]);
  const sortedResourceTypes = useMemo(() => [...resourceTypes].sort(sortByLabel), [resourceTypes]);
  const sortedFilteredResources = useMemo(
    () => [...filteredResources].sort(sortByName),
    [filteredResources],
  );
  const hasNoSpaces = sortedFilteredResources.length === 0;

  return (
    <div className='border border-stroke-soft-200 rounded-[10px] overflow-hidden shrink-0'>
      <div className='bg-bg-weak-100 flex items-center gap-2 px-3 py-1.5'>
        <RiBuilding2Line className='size-5 text-text-sub-500' />
        <h3 className='text-label-sm text-text-sub-500'>Space Details</h3>
      </div>

      <div className='flex flex-col gap-3 px-4 pb-3 pt-3'>
        <div className='flex gap-4'>
          {/* Center Select */}
          <div className='flex-1 flex flex-col gap-1'>
            <Label.Root className='text-text-main-900'>
              Center <Label.Asterisk />
            </Label.Root>
            <Controller
              name='center_id'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  size='small'
                  value={field.value}
                  onValueChange={(value) => {
                    const valueActuallyChanged = value !== lastCenterIdRef.current;
                    field.onChange(value);
                    if (valueActuallyChanged && clearSpaceOnCenterOrTypeChange)
                      setValue('space_id', '');
                    lastCenterIdRef.current = value;
                    onCenterChange(value);
                  }}
                  hasError={isSubmitted && Boolean(errors.center_id)}
                  options={sortedCenters}
                  placeholder='Select a center'
                  showArrow={true}
                  isolateSearchKeyboard
                />
              )}
            />
            {isSubmitted && errors.center_id && <ErrorText>{errors.center_id.message}</ErrorText>}
            <Controller
              name='book_for_any_center'
              control={control}
              render={({ field }) => (
                <label className='mt-2 flex cursor-pointer items-center gap-2 select-none'>
                  <Checkbox.Root
                    checked={Boolean(field.value)}
                    onCheckedChange={(v) => {
                      const next = v === true;
                      field.onChange(next);
                      onBookForAnyCenterChange?.(next);
                    }}
                  />
                  <span className='text-label-sm text-text-main-900'>Book for any center</span>
                </label>
              )}
            />
          </div>

          {/* Resource Type Select */}
          <div className='flex-1 flex flex-col gap-1'>
            <Label.Root className='text-text-main-900'>
              Resource Type <Label.Asterisk />
            </Label.Root>
            <Controller
              name='resource_type_id'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  size='small'
                  value={field.value}
                  onValueChange={(value) => {
                    const valueActuallyChanged = value !== lastResourceTypeIdRef.current;
                    field.onChange(value);
                    if (valueActuallyChanged && clearSpaceOnCenterOrTypeChange)
                      setValue('space_id', '');
                    lastResourceTypeIdRef.current = value;
                    onResourceTypeChange(value);
                  }}
                  disabled={!watchedCenterId || resourceTypesLoading}
                  hasError={isSubmitted && Boolean(errors.resource_type_id)}
                  options={sortedResourceTypes}
                  placeholder={resourceTypesLoading ? 'Loading types...' : 'Select resource type'}
                  showArrow={true}
                  isolateSearchKeyboard
                />
              )}
            />
            {isSubmitted && errors.resource_type_id && (
              <ErrorText>{errors.resource_type_id.message}</ErrorText>
            )}
          </div>
        </div>

        {/* Specific Space Select */}
        <div className='flex flex-col gap-1'>
          <Label.Root className='text-text-main-900'>
            Space <Label.Asterisk />
          </Label.Root>
          <Controller
            name='space_id'
            control={control}
            render={({ field }) => (
              <SearchableSelect
                size='small'
                value={field.value}
                onValueChange={field.onChange}
                disabled={resourcesLoading}
                hasError={isSubmitted && Boolean(errors.space_id)}
                options={sortedFilteredResources}
                placeholder={resourcesLoading ? 'Loading spaces...' : 'Select a space'}
                getOptionValue={(opt) => opt?.id ?? opt}
                getOptionLabel={(opt) => opt?.name ?? ''}
                showArrow={true}
                isolateSearchKeyboard
              />
            )}
          />
          {isSubmitted && errors.space_id && <ErrorText>{errors.space_id.message}</ErrorText>}
        </div>
      </div>
    </div>
  );
};

export default BookingSpaceDetailsSection;
