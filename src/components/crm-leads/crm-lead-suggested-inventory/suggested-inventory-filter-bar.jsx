import React from 'react';
import { RiDownloadLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { CREATE_PROPOSAL_LABEL } from '@/components/crm-leads/crm-lead-suggested-inventory/constants';

const SuggestedInventoryFilterBar = ({
  searchValue,
  onSearchChange,
  onDownload,
  tableRef,
  selectedCount,
  onCreateProposal,
}) => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = React.useState(false);

  return (
    <div
      className='flex h-9 w-full items-center justify-between gap-3'
      data-name='suggested-inventory-filter'
    >
      <Input.Root size='small' className='h-9 min-w-0 max-w-[372px] flex-1 shadow-regular-xs'>
        <Input.Wrapper>
          <Input.Icon>
            <RiSearchLine />
          </Input.Icon>
          <Input.Input
            placeholder='Search by space name, center'
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label='Search suggested inventory'
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex shrink-0 items-center gap-3'>
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='small'
          className='size-9 shrink-0 p-2 shadow-regular-xs'
          onClick={onDownload}
          aria-label='Download inventory'
        >
          <Button.Icon as={RiDownloadLine} className='size-5' />
        </Button.Root>

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

        {selectedCount > 0 ? (
          <Button.Root
            type='button'
            variant='primary'
            size='small'
            className='h-9 shrink-0 px-4'
            onClick={onCreateProposal}
          >
            {CREATE_PROPOSAL_LABEL}
          </Button.Root>
        ) : null}
      </div>
    </div>
  );
};

export default SuggestedInventoryFilterBar;
