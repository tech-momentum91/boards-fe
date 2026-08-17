import React, { memo, useRef, useState } from 'react';
import {
  RiDownloadLine,
  RiExpandUpDownLine,
  RiLayoutColumnLine,
  RiSearchLine,
} from 'react-icons/ri';

import AumFilterDropdown from '@/components/aum/asset/aum-filter-dropdown';
import AumMultiGroupByDropdown from '@/components/aum/asset/aum-multi-group-by-dropdown';
import { AUM_DEFAULT_APPLIED_FILTERS, AUM_TOOLBAR_COPY } from '@/components/aum/constants';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Button from '@/components/ui/button';
import * as Filter from '@/components/ui/filter';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

const iconButtonClass = 'size-9 shrink-0 p-2 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]';

const AumAssetToolbar = memo(
  ({
    searchValue,
    onSearchChange,
    filterOptions,
    appliedFilters = AUM_DEFAULT_APPLIED_FILTERS,
    onFiltersChange,
    onClearFilters,
    groupByRules,
    onGroupByRulesChange,
    columnConfig,
    pinnedColumnId,
    onExport,
    isExporting = false,
    isGroupedView = false,
    groupsExpanded = true,
    onToggleGroupsExpanded,
  }) => {
    const searchId = React.useId();
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const [filterCount, setFilterCount] = useState(0);
    const filterDropdownRef = useRef(null);

    const handleFilterClear = (event) => {
      event?.stopPropagation?.();
      onClearFilters?.();
      setFilterCount(0);
      setIsFilterDropdownOpen(false);
    };

    return (
      <div className='flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div className='w-full min-w-0 shrink-0 lg:max-w-[276px]'>
          <Input.Root size='medium'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                id={searchId}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={AUM_TOOLBAR_COPY.searchPlaceholder}
                autoComplete='off'
                aria-label={AUM_TOOLBAR_COPY.searchAriaLabel}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex min-w-0 flex-wrap items-center justify-end gap-2'>
          <AumMultiGroupByDropdown rules={groupByRules} onChange={onGroupByRulesChange} />

          <Popover.Root
            open={isFilterDropdownOpen}
            onOpenChange={(open) => {
              const wasOpen = isFilterDropdownOpen;
              setIsFilterDropdownOpen(open);
              if (wasOpen && !open && filterDropdownRef.current) {
                filterDropdownRef.current.handleClose();
              }
            }}
          >
            <Filter.TriggerButton
              filterCount={filterCount}
              onClear={handleFilterClear}
              tooltipContent='Filter assets'
              ariaLabel='Filter assets'
            />
            <AumFilterDropdown
              ref={filterDropdownRef}
              open={isFilterDropdownOpen}
              setFilterCount={setFilterCount}
              appliedFilters={appliedFilters}
              onFiltersChange={onFiltersChange}
              filterOptions={filterOptions}
            />
          </Popover.Root>

          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='medium'
            className={iconButtonClass}
            onClick={onToggleGroupsExpanded}
            disabled={!isGroupedView}
            aria-label={
              groupsExpanded
                ? AUM_TOOLBAR_COPY.collapseAllGroupsAriaLabel
                : AUM_TOOLBAR_COPY.expandAllGroupsAriaLabel
            }
          >
            <Button.Icon as={RiExpandUpDownLine} />
          </Button.Root>

          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='medium'
            onClick={onExport}
            disabled={isExporting}
            className={iconButtonClass}
            aria-label='Download barcode labels (PDF)'
          >
            <Button.Icon as={RiDownloadLine} />
          </Button.Root>

          <ColumnManagerDropdown
            open={columnManagerOpen}
            onOpenChange={setColumnManagerOpen}
            config={columnConfig}
            pinnedColumnId={pinnedColumnId}
            tooltipContent={<p>{AUM_TOOLBAR_COPY.columnsTooltip}</p>}
            trigger={
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
                className={cn(
                  iconButtonClass,
                  columnManagerOpen && 'ring-2 ring-stroke-strong-950 ring-inset',
                )}
                aria-label={AUM_TOOLBAR_COPY.columnsAriaLabel}
                aria-expanded={columnManagerOpen}
              >
                <Button.Icon as={RiLayoutColumnLine} />
              </Button.Root>
            }
          />
        </div>
      </div>
    );
  },
);

AumAssetToolbar.displayName = 'AumAssetToolbar';

export default AumAssetToolbar;
