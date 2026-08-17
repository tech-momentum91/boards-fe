import React, { useState } from 'react';
import { RiAddLine, RiDownloadLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import {
  GLOBAL_PROPOSAL_FILTER_ALL,
  GLOBAL_PROPOSAL_SEARCH_PLACEHOLDER,
  LEAD_PROPOSAL_SEARCH_PLACEHOLDER,
  PROPOSAL_STATUS_FILTER_OPTIONS,
} from '@/components/crm-proposals/constants';

const GlobalProposalFilterSelect = ({ value, onValueChange, placeholder, options, ariaLabel }) => (
  <Select.Root value={value} onValueChange={onValueChange} size='small'>
    <Select.Trigger className='min-w-0 shrink-0 w-[150px]' aria-label={ariaLabel}>
      <Select.Value placeholder={placeholder} />
    </Select.Trigger>
    <Select.Content>
      {options.map((option) => (
        <Select.Item key={option.value} value={option.value}>
          {option.label}
        </Select.Item>
      ))}
    </Select.Content>
  </Select.Root>
);

const CrmProposalsToolbar = ({
  variant = 'lead',
  searchValue = '',
  onSearchChange,
  tableRef,
  appliedFilters = {},
  onFiltersChange,
  filterOptions = {},
  onCreate,
  onDownload,
}) => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);

  const pipelineOptions = [
    { value: GLOBAL_PROPOSAL_FILTER_ALL, label: 'All Pipeline' },
    ...(filterOptions.pipelines || []),
  ];

  const lifecycleStageOptions = [
    { value: GLOBAL_PROPOSAL_FILTER_ALL, label: 'All Life Cycle Stage' },
    ...(filterOptions.stages || []),
  ];

  if (variant === 'global') {
    return (
      <header className='flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <Input.Root className='w-full shrink-0 lg:w-[372px]'>
          <Input.Wrapper>
            <Input.Icon>
              <RiSearchLine className='text-text-sub-500' />
            </Input.Icon>
            <Input.Input
              placeholder={GLOBAL_PROPOSAL_SEARCH_PLACEHOLDER}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              aria-label='Search proposals'
            />
          </Input.Wrapper>
        </Input.Root>

        <div className='flex flex-wrap items-center justify-end gap-2'>
          <GlobalProposalFilterSelect
            value={appliedFilters.pipeline || GLOBAL_PROPOSAL_FILTER_ALL}
            onValueChange={(next) => onFiltersChange?.({ ...appliedFilters, pipeline: next })}
            placeholder='All Pipeline'
            options={pipelineOptions}
            ariaLabel='Filter by pipeline'
          />
          <GlobalProposalFilterSelect
            value={appliedFilters.lifecycle_stage || GLOBAL_PROPOSAL_FILTER_ALL}
            onValueChange={(next) =>
              onFiltersChange?.({ ...appliedFilters, lifecycle_stage: next })
            }
            placeholder='All Life Cycle Stage'
            options={lifecycleStageOptions}
            ariaLabel='Filter by life cycle stage'
          />
          <GlobalProposalFilterSelect
            value={appliedFilters.status || GLOBAL_PROPOSAL_FILTER_ALL}
            onValueChange={(next) => onFiltersChange?.({ ...appliedFilters, status: next })}
            placeholder='All Status'
            options={PROPOSAL_STATUS_FILTER_OPTIONS}
            ariaLabel='Filter by status'
          />

          <Button.Root variant='primary' size='small' className='gap-1 shrink-0' onClick={onCreate}>
            <Button.Icon>
              <RiAddLine size={20} />
            </Button.Icon>
            Create
          </Button.Root>
        </div>
      </header>
    );
  }

  return (
    <header className='flex h-9 w-full items-center justify-between gap-3'>
      <Input.Root size='small' className='h-9 min-w-0 max-w-[372px] flex-1 shadow-regular-xs'>
        <Input.Wrapper>
          <Input.Icon>
            <RiSearchLine />
          </Input.Icon>
          <Input.Input
            placeholder={LEAD_PROPOSAL_SEARCH_PLACEHOLDER}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            aria-label='Search proposals'
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex shrink-0 items-center gap-3'>
        {onDownload ? (
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            className='size-9 shrink-0 p-2 shadow-regular-xs'
            onClick={onDownload}
            aria-label='Download proposals'
          >
            <Button.Icon as={RiDownloadLine} className='size-5' />
          </Button.Root>
        ) : null}

        <ColumnManagerDropdown
          open={isColumnManagerOpen}
          onOpenChange={setIsColumnManagerOpen}
          config={tableRef?.current?.columnConfigHook}
          trigger={
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='size-9 shrink-0 p-2 shadow-regular-xs'
              aria-label='Column manager'
            >
              <Button.Icon as={RiLayoutColumnLine} className='size-5' />
            </Button.Root>
          }
        />
      </div>
    </header>
  );
};

export default CrmProposalsToolbar;
