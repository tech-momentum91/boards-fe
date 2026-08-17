import React from 'react';
import { Controller } from 'react-hook-form';
import { RiArrowDownSLine, RiSearchLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Dropdown from '@/components/ui/dropdown';
import * as Input from '@/components/ui/input';
import ErrorText from '@/components/ui/error-text';
import { cn } from '@/utils/cn';
import {
  displayStdCode,
  stdOptionAreaText,
} from '@/components/centers-management/utils/emergency-contact-phone-utils';

const StdPhoneInputField = ({
  control,
  errors,
  selectedStdOption,
  stdSearch,
  onStdSearchChange,
  stdFiltered,
  stdOptions,
}) => {
  const searchInputRef = React.useRef(null);

  return (
    <div className='w-full flex flex-col gap-2'>
      <div
        className={cn(
          'flex w-full overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0',
          (errors.std_selection || errors.local_number) && 'border-error-base',
        )}
      >
        <div className='flex w-full items-stretch min-h-0'>
          <Controller
            name='std_selection'
            control={control}
            render={({ field }) => (
              <Dropdown.Root>
                <Dropdown.Trigger asChild>
                  <Button.Root
                    variant='neutral'
                    mode='ghost'
                    size='xsmall'
                    className='shrink-0 w-[84px] h-full min-h-0 self-stretch rounded-none border-r border-stroke-soft-200 justify-between px-3'
                  >
                    <span className='text-label-sm'>
                      {selectedStdOption ? displayStdCode(selectedStdOption) : 'STD'}
                    </span>
                    <RiArrowDownSLine className='size-4' />
                  </Button.Root>
                </Dropdown.Trigger>
                <Dropdown.Content
                  className='w-[min(100vw-2rem,24rem)] min-w-[320px]'
                  onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    window.requestAnimationFrame(() => searchInputRef.current?.focus());
                  }}
                >
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Icon>
                        <RiSearchLine />
                      </Input.Icon>
                      <Input.Input
                        ref={searchInputRef}
                        placeholder='Search STD / city'
                        value={stdSearch}
                        onChange={(e) => onStdSearchChange(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  <div className='max-h-[220px] overflow-y-auto mt-2 pr-1'>
                    {stdFiltered.length === 0 ? (
                      <div className='px-2 py-3 text-paragraph-xs text-text-sub-600'>
                        {stdOptions.length === 0
                          ? 'Set state and city in Basic details to see STD codes for this center.'
                          : 'No matches. Try another search.'}
                      </div>
                    ) : (
                      stdFiltered.map((option) => (
                        <Dropdown.Item
                          key={option.optionKey}
                          className='items-start py-2'
                          onSelect={() => field.onChange(option.optionKey)}
                        >
                          <div className='flex w-full min-w-0 items-baseline gap-3'>
                            <span className='w-[5ch] shrink-0 text-right font-mono text-[13px] tabular-nums leading-none text-text-main-900'>
                              {displayStdCode(option)}
                            </span>
                            <span className='min-w-0 flex-1 border-l border-stroke-soft-200 pl-3 text-left text-paragraph-sm leading-snug text-text-main-900'>
                              {stdOptionAreaText(option)}
                            </span>
                          </div>
                        </Dropdown.Item>
                      ))
                    )}
                  </div>
                </Dropdown.Content>
              </Dropdown.Root>
            )}
          />

          <Controller
            name='local_number'
            control={control}
            render={({ field }) => (
              <Input.Root
                size='xsmall'
                variant='default'
                noRing
                className='w-full border-0 rounded-none min-h-0'
              >
                <Input.Wrapper className='min-w-0 flex-1 rounded-none'>
                  <Input.Input
                    {...field}
                    className='rounded-none'
                    inputMode='numeric'
                    placeholder='Enter local number / short code'
                  />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
        </div>
      </div>
      {errors.std_selection && <ErrorText>{errors.std_selection.message}</ErrorText>}
      {errors.local_number && <ErrorText>{errors.local_number.message}</ErrorText>}
    </div>
  );
};

export default StdPhoneInputField;
