import React from 'react';
import { RiAddLine, RiSearchLine } from 'react-icons/ri';

import CenterAccessDropdown from '@/components/center-access-dropdown';
import * as Button from '@/components/ui/button';
import * as Dropdown from '@/components/ui/dropdown';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Switch from '@/components/ui/switch';
import * as Tooltip from '@/components/ui/tooltip';
import { MultiSelect } from '@/components/ui/multi-select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { cn } from '@/utils/cn';

import { DEFAULT_TIME_RANGES } from '@/services/dashboard-master-service';

const controlClassName = 'w-full min-w-0 sm:w-auto sm:min-w-[128px]';
const filterDropdownClassName = 'w-full min-w-0 sm:w-auto sm:min-w-[128px] sm:max-w-[180px]';
const dateRangeClassName = 'w-auto min-w-[156px] max-w-[200px]';

const FILTER_LABELS = {
  centers: 'Centres',
  clients: 'Clients',
};

function TruncatedTooltipLabel({ label, className, side = 'top' }) {
  if (!label) return null;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className={cn('truncate', className)}>{label}</span>
      </Tooltip.Trigger>
      <Tooltip.Content size='small' variant='light' side={side} className='max-w-xs'>
        {label}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

function FilterSelectionSummary({
  selectedIds = [],
  options = [],
  allLabel,
  pluralLabel,
  idKey = 'id',
  labelKey = 'label',
}) {
  const total = options.length;

  if (selectedIds.length === 0 || (total > 0 && selectedIds.length === total)) {
    return (
      <TruncatedTooltipLabel label={allLabel} className='text-label-sm text-text-strong-950' />
    );
  }

  if (selectedIds.length === 1) {
    const match = options.find((opt) => opt[idKey] === selectedIds[0]);
    const label = match?.[labelKey] || `1 ${pluralLabel.slice(0, -1)}`;
    return <TruncatedTooltipLabel label={label} className='text-label-sm text-text-strong-950' />;
  }

  const selectedLabels = selectedIds
    .map((id) => options.find((opt) => opt[idKey] === id)?.[labelKey])
    .filter(Boolean);

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className='truncate text-label-sm text-text-strong-950'>
          {selectedIds.length} {pluralLabel}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
        <div className='flex flex-col gap-1'>
          {selectedLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

export default function FilterBar({
  search,
  onSearchChange,
  timeRange,
  onTimeRangeChange,
  customDateRange,
  onCustomDateRangeChange,
  centerFilter = [],
  onCenterFilterChange,
  clientFilter = [],
  onClientFilterChange,
  centers = [],
  centersLoading = false,
  clientOptions = [],
  enabledFilters = { centers: true, clients: true },
  isSetupMode = false,
  onEnabledFiltersChange,
  onAddWidget,
  addWidgetDisabled,
  showAddWidget = false,
}) {
  const showCenters = Boolean(enabledFilters?.centers);
  const showClients = Boolean(enabledFilters?.clients);

  const handleToggleFilter = (key, checked) => {
    onEnabledFiltersChange?.({
      ...enabledFilters,
      [key]: checked,
    });
  };

  const normalizedCenters = React.useMemo(
    () =>
      (centers ?? []).map((center) => ({
        id: center.name,
        label: center.center_name || center.name,
      })),
    [centers],
  );

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className='w-full min-w-0 shrink-0 px-6 py-5'>
        <div className='flex w-full min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between'>
          <div className='w-full min-w-0 xl:max-w-[372px] xl:shrink-0'>
            <Input.Root size='medium' className='w-full'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  placeholder='Search here...'
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center lg:justify-end xl:max-w-none'>
            <Select.Root value={timeRange} onValueChange={onTimeRangeChange} size='medium'>
              <Select.Trigger className={controlClassName}>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {DEFAULT_TIME_RANGES.map((t) => (
                  <Select.Item key={t} value={t}>
                    {t}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            {timeRange === 'Custom' && (
              <DateRangePicker
                value={customDateRange}
                onChange={onCustomDateRangeChange}
                size='medium'
                align='start'
                placeholder='Start - End'
                className={dateRangeClassName}
              />
            )}

            {showCenters && (
              <CenterAccessDropdown
                centers={centers}
                selectedCenters={centerFilter}
                onChange={onCenterFilterChange}
                isLoading={centersLoading}
                buttonMode='stroke'
                listMaxHeight='240px'
                className={filterDropdownClassName}
                renderSelectedSummary={({ selectedCenters }) => (
                  <FilterSelectionSummary
                    selectedIds={selectedCenters}
                    options={normalizedCenters}
                    allLabel='All Centres'
                    pluralLabel='Centres'
                  />
                )}
              />
            )}

            {showClients && (
              <MultiSelect
                options={clientOptions}
                value={clientFilter}
                onValueChange={onClientFilterChange}
                placeholder='All Clients'
                size='medium'
                className={filterDropdownClassName}
                displayMode='count'
                countLabel='Client'
                sortSelectedFirst
                enableSearch
                searchPlaceholder='Search clients...'
                renderOptionLabel={(option) => (
                  <TruncatedTooltipLabel
                    label={option.label}
                    className='flex-1 text-paragraph-sm text-text-strong-950'
                  />
                )}
              />
            )}

            {isSetupMode && (
              <Dropdown.Root>
                <Dropdown.Trigger asChild>
                  <Button.Root
                    variant='neutral'
                    mode='stroke'
                    size='medium'
                    className='w-full min-w-0 gap-1 sm:w-auto'
                  >
                    <Button.Icon as={RiAddLine} />
                    Add Filter
                  </Button.Root>
                </Dropdown.Trigger>
                <Dropdown.Content className='w-[190px] p-2' align='end'>
                  {Object.entries(FILTER_LABELS).map(([key, label]) => (
                    <div
                      key={key}
                      className='flex items-center justify-between gap-2 rounded-lg p-2 text-paragraph-sm text-text-strong-950'
                      onPointerDown={(event) => event.preventDefault()}
                    >
                      <span>{label}</span>
                      <Switch.Root
                        checked={Boolean(enabledFilters?.[key])}
                        onCheckedChange={(checked) => handleToggleFilter(key, checked)}
                        onPointerDown={(event) => event.stopPropagation()}
                      />
                    </div>
                  ))}
                </Dropdown.Content>
              </Dropdown.Root>
            )}

            {showAddWidget && (
              <Button.Root
                size='medium'
                onClick={onAddWidget}
                disabled={addWidgetDisabled}
                className='col-span-2 w-full min-w-0 gap-1 sm:col-span-1 sm:w-auto lg:ml-0'
              >
                <Button.Icon as={RiAddLine} />
                Add
              </Button.Root>
            )}
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
