import React from 'react';
import { RiCollageLine, RiStackLine } from 'react-icons/ri';
import { Controller } from 'react-hook-form';

import * as Button from '@/components/ui/button';
import ErrorText from '@/components/ui/error-text';
import FieldRow from '@/components/ui/field-row';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Select from '@/components/ui/select';

/**
 * Shared floor + area fields for GFC / Graphics / 3D create drawers.
 */
export default function ProjectCreateDrawerFloorAreaFields({
  control,
  errors,
  floorOptions,
  areaOptions,
  watchedFloor,
  isSubmitting = false,
  layoutAreasLoading = false,
  canOpenLayoutPanel = false,
  onOpenLayoutPanel,
}) {
  return (
    <>
      <FieldRow icon={RiStackLine} label='Floor' required>
        <div className='flex w-full min-w-0 items-center gap-1'>
          <div className='min-w-0 flex-1'>
            <Controller
              control={control}
              name='floor'
              render={({ field }) => (
                <Select.Root
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  size='xsmall'
                  variant='borderless'
                  hasError={Boolean(errors.floor)}
                  disabled={isSubmitting || layoutAreasLoading}
                >
                  <Select.Trigger className='h-8'>
                    <Select.Value placeholder={layoutAreasLoading ? 'Loading floors…' : 'Select'} />
                  </Select.Trigger>
                  <Select.Content>
                    {floorOptions.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            />
          </div>

          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className='shrink-0'
            aria-label='View floor layout'
            title='View floor layout'
            disabled={isSubmitting || layoutAreasLoading || !canOpenLayoutPanel}
            onClick={onOpenLayoutPanel}
          >
            <Button.Icon as={RiStackLine} />
          </Button.Root>
        </div>
        <ErrorText>{errors.floor?.message}</ErrorText>
      </FieldRow>

      <FieldRow icon={RiCollageLine} label='Area' required>
        <Controller
          control={control}
          name='area'
          render={({ field }) => (
            <SearchableSelect
              value={field.value}
              onValueChange={field.onChange}
              options={areaOptions}
              placeholder={
                !watchedFloor
                  ? 'Select floor first'
                  : layoutAreasLoading
                    ? 'Loading areas…'
                    : 'Select'
              }
              searchPlaceholder='Search areas…'
              size='xsmall'
              variant='borderless'
              showArrow
              contentClassName='min-w-[200px]'
              disabled={isSubmitting || layoutAreasLoading || !watchedFloor}
            />
          )}
        />
        <ErrorText>{errors.area?.message}</ErrorText>
      </FieldRow>
    </>
  );
}
