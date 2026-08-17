import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { LuExpand } from 'react-icons/lu';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiExpandDiagonalLine,
  RiLayoutColumnLine,
  RiLayoutGridLine,
  RiLayoutTop2Line,
  RiSearchLine,
  RiSendPlaneLine,
} from 'react-icons/ri';

import BoqTemplateNewProductMenu from '@/components/boq/boq-templates/components/boq-template-new-product-menu';
import BoqTemplateProductsFilterDropdown from '@/components/boq/boq-templates/components/boq-template-products-filter-dropdown';
import { DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS } from '@/components/boq/constants';
import {
  cloneBoqTemplateProductFilters,
  countBoqTemplateProductFilters,
} from '@/components/boq/boq-helper';
import ProjectBoqVersionStatusGroup from '@/components/boq/project-boqs/components/project-boq-version-status-group';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Dropdown from '@/components/ui/dropdown';
import * as Filter from '@/components/ui/filter';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as SegmentedControl from '@/components/ui/segmented-control';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

const iconButtonClassName = 'size-8 shrink-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]';

const PROJECT_BOQ_PRODUCT_VIEW_MODES = {
  SINGLE: 'single',
  MULTI: 'multi',
};

const PROJECT_BOQ_PRODUCT_VIEW_OPTIONS = [
  {
    value: PROJECT_BOQ_PRODUCT_VIEW_MODES.SINGLE,
    label: 'Single view',
    icon: RiLayoutTop2Line,
  },
  {
    value: PROJECT_BOQ_PRODUCT_VIEW_MODES.MULTI,
    label: 'Multi view',
    icon: RiLayoutGridLine,
  },
];

const ProjectBoqProductsToolbar = memo(
  ({
    searchValue,
    onSearchChange,
    appliedFilters = DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS,
    onFiltersChange,
    filterOptionsByTab,
    areaOptions,
    boqTypeOptions,
    onNewProductSelect,
    newProductOptions,
    showNewProduct = true,
    columnConfig,
    allDescriptionsExpanded = false,
    onAllDescriptionsExpandedChange,
    version = 'current',
    onVersionChange,
    versionStatus = 'DRAFT',
    onVersionStatusChange,
    versions = [],
    isVersionLocked = false,
    isStatusLocked = isVersionLocked,
    isStatusChangeDisabled = false,
    isProcurementStatusBlocked = false,
    isViewingCurrentVersion = true,
    onCreateVersion,
    isCreatingVersion = false,
    viewMode = PROJECT_BOQ_PRODUCT_VIEW_MODES.SINGLE,
    onViewModeChange,
    onSaveVersion,
    showVersionStatus = true,
    showViewMode = true,
    layoutViewMode,
    onLayoutViewModeChange,
    layoutViewOptions,
    showSendRfq = false,
    onSendRfq,
  }) => {
    const searchId = React.useId();
    const filterDropdownRef = useRef(null);
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
    const [stagedFilterCount, setStagedFilterCount] = useState(null);

    const selectedViewOption = useMemo(
      () =>
        PROJECT_BOQ_PRODUCT_VIEW_OPTIONS.find((option) => option.value === viewMode) ??
        PROJECT_BOQ_PRODUCT_VIEW_OPTIONS[0],
      [viewMode],
    );
    const SelectedViewIcon = selectedViewOption.icon;

    const appliedFilterCount = countBoqTemplateProductFilters(appliedFilters);
    const filterCount =
      filterOpen && stagedFilterCount != null ? stagedFilterCount : appliedFilterCount;

    const handleClearAllFilters = useCallback(
      (event) => {
        event?.stopPropagation?.();
        onFiltersChange?.(cloneBoqTemplateProductFilters(DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS));
        setStagedFilterCount(null);
        setFilterOpen(false);
      },
      [onFiltersChange],
    );

    const handleExpand = useCallback(() => {
      onAllDescriptionsExpandedChange?.(!allDescriptionsExpanded);
    }, [allDescriptionsExpanded, onAllDescriptionsExpandedChange]);

    const handleSaveVersion = useCallback(() => {
      onSaveVersion?.();
    }, [onSaveVersion]);

    return (
      <div className='flex w-full min-w-0 items-center gap-3'>
        <div className='w-full min-w-0 shrink-0 max-w-[370px]'>
          <Input.Root size='medium'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                id={searchId}
                value={searchValue}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder='Search products, descriptions, icons etc'
                autoComplete='off'
                aria-label='Search project BOQ products'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='ml-auto flex min-w-0 shrink-0 items-center gap-2 overflow-x-auto'>
          {showViewMode ? (
            <ButtonGroup.Root
              size='xsmall'
              className='shrink-0 overflow-hidden rounded-lg shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
            >
              <Dropdown.Root open={viewDropdownOpen} onOpenChange={setViewDropdownOpen}>
                <Dropdown.Trigger asChild>
                  <ButtonGroup.Item
                    asChild
                    className={cn(
                      'h-8 gap-1 px-2 text-text-sub-500 hover:text-text-sub-500',
                      viewDropdownOpen && 'bg-bg-weak-50',
                    )}
                  >
                    <button
                      type='button'
                      aria-label={`${selectedViewOption.label} options`}
                      aria-expanded={viewDropdownOpen}
                    >
                      <SelectedViewIcon className='size-4 shrink-0' aria-hidden />
                      <RiArrowDownSLine className='size-5 shrink-0 text-text-sub-500' aria-hidden />
                    </button>
                  </ButtonGroup.Item>
                </Dropdown.Trigger>

                <Dropdown.Content align='end' className='w-[180px] gap-1 p-2'>
                  {PROJECT_BOQ_PRODUCT_VIEW_OPTIONS.map((option) => {
                    const isSelected = option.value === viewMode;
                    const OptionIcon = option.icon;
                    return (
                      <Dropdown.Item
                        key={option.value}
                        className={cn(
                          'flex items-center gap-2 rounded-lg p-1.5',
                          isSelected ? 'bg-bg-weak-100' : 'bg-transparent',
                        )}
                        onSelect={() => onViewModeChange?.(option.value)}
                      >
                        <OptionIcon className='size-4 shrink-0 text-text-sub-500' aria-hidden />
                        <span className='text-paragraph-sm text-text-main-900'>{option.label}</span>
                      </Dropdown.Item>
                    );
                  })}
                </Dropdown.Content>
              </Dropdown.Root>
            </ButtonGroup.Root>
          ) : null}

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
                className={cn(
                  iconButtonClassName,
                  allDescriptionsExpanded && 'ring-2 ring-stroke-strong-950 ring-inset',
                )}
                aria-label={
                  allDescriptionsExpanded ? 'Collapse descriptions' : 'Expand descriptions'
                }
                aria-pressed={allDescriptionsExpanded}
                onClick={handleExpand}
              >
                <Button.Icon
                  as={allDescriptionsExpanded ? RiExpandDiagonalLine : LuExpand}
                  className='size-4'
                />
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content size='xsmall' side='bottom'>
              {allDescriptionsExpanded ? 'Collapse descriptions' : 'Expand descriptions'}
            </Tooltip.Content>
          </Tooltip.Root>

          <Popover.Root
            open={filterOpen}
            onOpenChange={(open) => {
              const wasOpen = filterOpen;
              setFilterOpen(open);
              if (wasOpen && !open) {
                filterDropdownRef.current?.handleClose?.();
                setStagedFilterCount(null);
              }
            }}
          >
            <Filter.TriggerButton
              filterCount={filterCount}
              onClear={handleClearAllFilters}
              tooltipContent='Filter'
              ariaLabel='Filter project BOQ products'
            />

            <BoqTemplateProductsFilterDropdown
              ref={filterDropdownRef}
              open={filterOpen}
              appliedFilters={appliedFilters}
              onFiltersChange={onFiltersChange}
              filterOptionsByTab={filterOptionsByTab}
              areaOptions={areaOptions}
              boqTypeOptions={boqTypeOptions}
              setFilterCount={setStagedFilterCount}
            />
          </Popover.Root>

          <ColumnManagerDropdown
            open={columnManagerOpen}
            onOpenChange={setColumnManagerOpen}
            config={columnConfig}
            tooltipContent={<p>Columns</p>}
            trigger={
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
                className={cn(
                  iconButtonClassName,
                  columnManagerOpen && 'ring-2 ring-stroke-strong-950 ring-inset',
                )}
                aria-label='Column settings'
                aria-expanded={columnManagerOpen}
              >
                <Button.Icon as={RiLayoutColumnLine} />
              </Button.Root>
            }
          />

          {Array.isArray(layoutViewOptions) && layoutViewOptions.length > 0 ? (
            <SegmentedControl.Root
              value={layoutViewMode}
              onValueChange={onLayoutViewModeChange}
              className='w-auto shrink-0'
            >
              <SegmentedControl.List className='h-8 w-auto gap-1 rounded-[10px] bg-bg-weak-100 p-1'>
                {layoutViewOptions.map((option) => (
                  <SegmentedControl.Trigger
                    key={option.value}
                    value={option.value}
                    className='h-full min-w-0 px-3 data-[state=active]:text-text-main-900'
                  >
                    {option.label}
                  </SegmentedControl.Trigger>
                ))}
              </SegmentedControl.List>
            </SegmentedControl.Root>
          ) : null}

          {showVersionStatus ? (
            <ProjectBoqVersionStatusGroup
              versions={versions}
              version={version}
              onVersionChange={onVersionChange}
              versionStatus={versionStatus}
              onVersionStatusChange={onVersionStatusChange}
              isVersionLocked={isVersionLocked}
              isStatusLocked={isStatusLocked}
              isStatusChangeDisabled={isStatusChangeDisabled}
              isProcurementStatusBlocked={isProcurementStatusBlocked}
              isViewingCurrentVersion={isViewingCurrentVersion}
              onCreateVersion={onCreateVersion}
              isCreatingVersion={isCreatingVersion}
            />
          ) : null}

          {showNewProduct ? (
            <BoqTemplateNewProductMenu onSelect={onNewProductSelect} options={newProductOptions}>
              <Button.Root
                type='button'
                variant='primary'
                mode='filled'
                size='medium'
                className='h-8 shrink-0 gap-1 bg-[#079455] px-2.5 text-white hover:bg-[#067647]'
              >
                <Button.Icon as={RiAddLine} />
                <span className='text-label-sm font-medium'>New Product</span>
              </Button.Root>
            </BoqTemplateNewProductMenu>
          ) : null}

          {showSendRfq ? (
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              className='h-8 shrink-0 gap-0.5 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
              onClick={onSendRfq}
            >
              <Button.Icon as={RiSendPlaneLine} />
              <span className='px-1 text-label-sm font-medium text-text-sub-500'>Send RFQ</span>
            </Button.Root>
          ) : null}
        </div>
      </div>
    );
  },
);

ProjectBoqProductsToolbar.displayName = 'ProjectBoqProductsToolbar';

export default ProjectBoqProductsToolbar;
