import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiArrowDownSLine,
  RiBuilding2Line,
  RiDownloadLine,
  RiLayoutGridLine,
  RiSearchLine,
  RiStackLine,
} from 'react-icons/ri';

import { fetchLayoutExportFloorOptionsForCenters } from '@/api/layoutExport';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import { Root as Checkbox } from '@/components/ui/checkbox';
import * as Dropdown from '@/components/ui/dropdown';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import { buildLayoutListApiFilters } from '@/utils/space-layout-list-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

function getCenterLabel(center) {
  return String(center?.center_name || center?.name || '').trim() || String(center?.name || '');
}

function resolveCenterPayload(allSelected, selectedValues) {
  if (allSelected) return undefined;
  if (!Array.isArray(selectedValues) || selectedValues.length === 0) return [];
  if (selectedValues.length === 1) return selectedValues[0];
  return selectedValues;
}

function filterOptionsByQuery(options, query) {
  const needle = String(query || '')
    .trim()
    .toLowerCase();
  if (!needle) return options;
  return options.filter((option) => {
    const label = String(option?.label || '').toLowerCase();
    const value = String(option?.value || '').toLowerCase();
    return label.includes(needle) || value.includes(needle);
  });
}

/** Selected items first (in pick order), then unselected alphabetically. */
function sortOptionsWithSelectedFirst(options, selectedValues = []) {
  const selectedSet = new Set(selectedValues);
  const selectedOrder = new Map(selectedValues.map((value, index) => [value, index]));

  return [...options].sort((a, b) => {
    const aSelected = selectedSet.has(a.value);
    const bSelected = selectedSet.has(b.value);

    if (aSelected !== bSelected) return aSelected ? -1 : 1;

    if (aSelected && bSelected) {
      return (selectedOrder.get(a.value) ?? 0) - (selectedOrder.get(b.value) ?? 0);
    }

    return String(a.label || '').localeCompare(String(b.label || ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}

function LayoutExportDropdownOptionRow({
  checked = false,
  disabled = false,
  label,
  emphasized = false,
  onCheckedChange,
}) {
  const handleRowClick = useCallback(() => {
    if (disabled) return;
    onCheckedChange?.(!checked);
  }, [checked, disabled, onCheckedChange]);

  const handleRowKeyDown = useCallback(
    (event) => {
      if (disabled) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onCheckedChange?.(!checked);
      }
    },
    [checked, disabled, onCheckedChange],
  );

  return (
    <div
      role='button'
      tabIndex={disabled ? -1 : 0}
      aria-pressed={checked}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      className={cn(
        'flex w-full cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2',
        'text-paragraph-sm text-text-strong-950 transition duration-200 ease-out',
        'hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/30',
        checked && 'bg-bg-weak-50',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <Checkbox
        size='small'
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        onClick={(event) => event.stopPropagation()}
      />
      <span className={cn('min-w-0 flex-1 truncate', emphasized && 'font-medium')}>{label}</span>
    </div>
  );
}

function LayoutExportSearchableDropdown({
  label,
  icon: Icon,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder,
  allLabel,
  allSelected,
  onAllSelectedChange,
  options = [],
  selectedValues = [],
  onSelectedValuesChange,
  disabled = false,
  isLoading = false,
  placeholder = 'Select',
  emptyMessage = 'No options available',
  hint,
}) {
  const [open, setOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    const filtered = filterOptionsByQuery(options, searchQuery);
    if (allSelected) return filtered;
    return sortOptionsWithSelectedFirst(filtered, selectedValues);
  }, [allSelected, options, searchQuery, selectedValues]);

  const selectedCount = allSelected ? options.length : selectedValues.length;

  const summary = useMemo(() => {
    if (isLoading) return 'Loading…';
    if (allSelected) return allLabel;
    if (!Array.isArray(selectedValues) || selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      return options.find((option) => option.value === selectedValues[0])?.label || '1 selected';
    }
    return `${selectedValues.length} selected`;
  }, [allLabel, allSelected, isLoading, options, placeholder, selectedValues]);

  const toggleValue = useCallback(
    (value, nextChecked) => {
      onAllSelectedChange?.(false);
      const current = Array.isArray(selectedValues) ? selectedValues : [];
      if (nextChecked === true) {
        if (!current.includes(value)) {
          onSelectedValuesChange?.([...current, value]);
        }
        return;
      }
      onSelectedValuesChange?.(current.filter((item) => item !== value));
    },
    [onAllSelectedChange, onSelectedValuesChange, selectedValues],
  );

  const handleAllToggle = useCallback(
    (checked) => {
      const next = checked === true;
      onAllSelectedChange?.(next);
      if (next) onSelectedValuesChange?.([]);
    },
    [onAllSelectedChange, onSelectedValuesChange],
  );

  const visibleOptionCount = allSelected ? 0 : filteredOptions.length;

  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center justify-between gap-2 px-0.5'>
        <div className='flex min-w-0 items-center gap-1.5'>
          {Icon ? <Icon className='size-4 shrink-0 text-text-sub-500' aria-hidden /> : null}
          <span className='text-label-xs font-medium uppercase tracking-wide text-text-sub-500'>
            {label}
          </span>
        </div>
        {!disabled && !isLoading && options.length > 0 ? (
          <Badge.Root size='small' variant='light' color='gray'>
            {allSelected ? 'All' : `${selectedCount} selected`}
          </Badge.Root>
        ) : null}
      </div>

      {hint ? <p className='px-0.5 text-paragraph-xs text-text-sub-500'>{hint}</p> : null}

      <Dropdown.Root open={open} onOpenChange={setOpen} modal={false}>
        <Dropdown.Trigger asChild>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            disabled={disabled || isLoading}
            className='h-9 w-full justify-between px-3 font-normal'
          >
            <span className='truncate text-left text-paragraph-sm text-text-strong-950'>
              {summary}
            </span>
            <RiArrowDownSLine className='size-4 shrink-0 text-text-sub-500' aria-hidden />
          </Button.Root>
        </Dropdown.Trigger>

        <Dropdown.Content
          align='start'
          className='w-[var(--radix-dropdown-menu-trigger-width)] min-w-[280px] gap-0 overflow-hidden p-0'
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <div
            className='sticky top-0 z-10 border-b border-stroke-soft-200 bg-bg-white-0 px-2.5 pb-2.5 pt-2'
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Input.Root size='xsmall'>
              <Input.Wrapper>
                <Input.Icon>
                  <RiSearchLine />
                </Input.Icon>
                <Input.Input
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange?.(event.target.value)}
                  disabled={disabled || isLoading}
                  autoComplete='off'
                  onKeyDown={(event) => event.stopPropagation()}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='flex max-h-56 flex-col overflow-hidden'>
            <div className='border-b border-stroke-soft-200 bg-bg-weak-50/70 px-2.5 py-2'>
              <LayoutExportDropdownOptionRow
                checked={allSelected}
                disabled={disabled || isLoading}
                label={allLabel}
                emphasized
                onCheckedChange={handleAllToggle}
              />
            </div>

            {!allSelected ? (
              <div className='flex min-h-0 flex-1 flex-col'>
                {isLoading ? (
                  <p className='px-3 py-6 text-center text-paragraph-xs text-text-sub-500'>
                    Loading options…
                  </p>
                ) : filteredOptions.length > 0 ? (
                  <>
                    <div className='flex items-center justify-between px-3 pb-1 pt-2'>
                      <span className='text-subheading-xs uppercase text-text-soft-400'>
                        Options
                      </span>
                      <span className='text-paragraph-xs text-text-sub-500'>
                        {visibleOptionCount} available
                      </span>
                    </div>
                    <div className='flex max-h-44 flex-col gap-0.5 overflow-y-auto px-1.5 pb-2'>
                      {filteredOptions.map((option) => {
                        const checked = selectedValues.includes(option.value);
                        return (
                          <LayoutExportDropdownOptionRow
                            key={option.value}
                            checked={checked}
                            disabled={disabled}
                            label={option.label}
                            onCheckedChange={(nextChecked) =>
                              toggleValue(option.value, nextChecked)
                            }
                          />
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className='px-3 py-6 text-center text-paragraph-xs text-text-sub-500'>
                    {searchQuery.trim() ? 'No matches found' : emptyMessage}
                  </p>
                )}
              </div>
            ) : (
              <p className='px-3 py-3 text-paragraph-xs text-text-sub-500'>
                Uncheck &ldquo;{allLabel}&rdquo; to pick specific items.
              </p>
            )}
          </div>
        </Dropdown.Content>
      </Dropdown.Root>
    </div>
  );
}

/**
 * Download floor layout PNG(s) with marked space coordinates (layout view toolbar).
 * get_layout_export_data runs only on Download (via exportSpaceLayoutImages).
 */
export default function SpaceLayoutDownloadDropdown({
  centers = [],
  keyword = '',
  appliedFilters = {},
  disabled = false,
  isExporting = false,
  onDownload,
}) {
  const [open, setOpen] = useState(false);
  const [allCentersSelected, setAllCentersSelected] = useState(true);
  const [selectedCenters, setSelectedCenters] = useState([]);
  const [allFloorsSelected, setAllFloorsSelected] = useState(true);
  const [selectedFloors, setSelectedFloors] = useState([]);
  const [floorOptions, setFloorOptions] = useState([]);
  const [isLoadingFloors, setIsLoadingFloors] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [centerSearchQuery, setCenterSearchQuery] = useState('');
  const [floorSearchQuery, setFloorSearchQuery] = useState('');

  const layoutFilters = useMemo(() => buildLayoutListApiFilters(appliedFilters), [appliedFilters]);

  const centerOptions = useMemo(
    () =>
      (Array.isArray(centers) ? centers : [])
        .map((center) => ({
          value: String(center?.name || '').trim(),
          label: getCenterLabel(center),
        }))
        .filter((option) => option.value),
    [centers],
  );

  const selectedCentersKey = selectedCenters.join('|');

  const centerNameById = useMemo(
    () => Object.fromEntries(centerOptions.map((option) => [option.value, option.label])),
    [centerOptions],
  );

  useEffect(() => {
    if (!open) {
      setCenterSearchQuery('');
      setFloorSearchQuery('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    if (allCentersSelected || selectedCenters.length === 0) {
      setFloorOptions([]);
      setAllFloorsSelected(true);
      setSelectedFloors([]);
      setFloorSearchQuery('');
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setIsLoadingFloors(true);
      try {
        const options = await fetchLayoutExportFloorOptionsForCenters(
          selectedCenters.map((centerId) => ({
            value: centerId,
            label: centerNameById[centerId] || centerId,
          })),
        );
        if (cancelled) return;

        setFloorOptions(options);
        setAllFloorsSelected(true);
        setSelectedFloors([]);
        setFloorSearchQuery('');
      } catch {
        if (!cancelled) {
          setFloorOptions([]);
          showErrorToast('Failed to load floors for selected centers.');
        }
      } finally {
        if (!cancelled) setIsLoadingFloors(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, allCentersSelected, selectedCentersKey, selectedCenters, centerNameById]);

  const handleCenterSelectionChange = useCallback((values) => {
    setSelectedCenters(values);
    setAllFloorsSelected(true);
    setSelectedFloors([]);
    setFloorSearchQuery('');
  }, []);

  const handleAllCentersChange = useCallback((allSelected) => {
    setAllCentersSelected(allSelected);
    if (allSelected) {
      setSelectedCenters([]);
      setAllFloorsSelected(true);
      setSelectedFloors([]);
      setFloorSearchQuery('');
    }
  }, []);

  const handleAllFloorsChange = useCallback((allSelected) => {
    setAllFloorsSelected(allSelected);
    if (allSelected) setSelectedFloors([]);
  }, []);

  const canDownload = allCentersSelected || selectedCenters.length > 0;
  const floorsDisabled = allCentersSelected || selectedCenters.length === 0;

  const downloadSummary = useMemo(() => {
    if (allCentersSelected) {
      return allFloorsSelected ? 'All centers · all floors' : `${selectedFloors.length} floor(s)`;
    }
    const centerPart =
      selectedCenters.length === 1
        ? centerOptions.find((option) => option.value === selectedCenters[0])?.label || '1 center'
        : `${selectedCenters.length} centers`;
    if (allFloorsSelected || floorsDisabled) return centerPart;
    return `${centerPart} · ${selectedFloors.length} floor(s)`;
  }, [
    allCentersSelected,
    allFloorsSelected,
    centerOptions,
    floorsDisabled,
    selectedCenters,
    selectedFloors.length,
  ]);

  const handleDownload = useCallback(async () => {
    if (isExporting || !onDownload || !canDownload) return;

    setProgressLabel('Preparing layouts…');

    try {
      const result = await onDownload({
        all_centers: allCentersSelected,
        center: resolveCenterPayload(allCentersSelected, selectedCenters),
        floor_refs: !allFloorsSelected && selectedFloors.length > 0 ? selectedFloors : undefined,
        keyword,
        filters: layoutFilters,
        onProgress: ({ completed, total }) => {
          setProgressLabel(`Downloading ${completed}/${total}…`);
        },
      });

      if (result.downloaded === 0) {
        showErrorToast('No layout images found for the selected scope.');
        return;
      }

      showSuccessToast(
        result.downloaded === 1
          ? 'Layout image downloaded.'
          : `${result.downloaded} layout images downloaded.`,
      );
      setOpen(false);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to download layout images.' });
    } finally {
      setProgressLabel('');
    }
  }, [
    allCentersSelected,
    allFloorsSelected,
    canDownload,
    isExporting,
    keyword,
    layoutFilters,
    onDownload,
    selectedCenters,
    selectedFloors,
  ]);

  return (
    <Dropdown.Root open={open} onOpenChange={setOpen} modal={false}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Dropdown.Trigger asChild>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='gap-1'
              disabled={disabled || isExporting}
              aria-busy={isExporting}
              aria-label='Download layout images'
            >
              <Button.Icon>
                <RiDownloadLine size={20} />
              </Button.Icon>
            </Button.Root>
          </Dropdown.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>Download layout images</p>
        </Tooltip.Content>
      </Tooltip.Root>

      <Dropdown.Content
        align='end'
        className='w-[min(100vw-2rem,400px)] gap-0 p-0'
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className='flex flex-col'>
          <div className='border-b border-stroke-soft-200 bg-bg-weak-50/80 px-4 py-3.5'>
            <div className='flex items-start gap-3'>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-alpha-10 text-primary-base'>
                <RiLayoutGridLine className='size-5' aria-hidden />
              </div>
              <div className='min-w-0 flex-1'>
                <p className='text-label-sm font-medium text-text-strong-950'>Download layouts</p>
                <p className='mt-0.5 text-paragraph-xs text-text-sub-500'>
                  Export floor plans with marked space coordinates as PNG files.
                </p>
              </div>
            </div>
          </div>

          <div className='flex flex-col gap-4 px-4 py-4'>
            <LayoutExportSearchableDropdown
              label='Centers'
              icon={RiBuilding2Line}
              searchQuery={centerSearchQuery}
              onSearchQueryChange={setCenterSearchQuery}
              searchPlaceholder='Search centers…'
              allLabel='All centers'
              allSelected={allCentersSelected}
              onAllSelectedChange={handleAllCentersChange}
              options={centerOptions}
              selectedValues={selectedCenters}
              onSelectedValuesChange={handleCenterSelectionChange}
              placeholder='Select centers'
              emptyMessage='No centers available'
            />

            <LayoutExportSearchableDropdown
              label='Floors'
              icon={RiStackLine}
              searchQuery={floorSearchQuery}
              onSearchQueryChange={setFloorSearchQuery}
              searchPlaceholder={
                floorsDisabled ? 'Select specific centers first' : 'Search floors…'
              }
              allLabel={allCentersSelected ? 'All floors (all centers)' : 'All floors in selection'}
              allSelected={allFloorsSelected}
              onAllSelectedChange={handleAllFloorsChange}
              options={floorOptions}
              selectedValues={selectedFloors}
              onSelectedValuesChange={setSelectedFloors}
              disabled={floorsDisabled}
              isLoading={isLoadingFloors}
              placeholder={
                allCentersSelected
                  ? 'All floors (all centers)'
                  : floorsDisabled
                    ? 'Select centers first'
                    : 'Select floors'
              }
              emptyMessage='No layout floors found'
              hint={
                allCentersSelected
                  ? 'Floor filter applies when you pick specific centers.'
                  : undefined
              }
            />
          </div>

          <div className='border-t border-stroke-soft-200 bg-bg-weak-50/50 px-4 py-3.5'>
            <div className='mb-3 flex items-center justify-between gap-2 rounded-lg bg-bg-white-0 px-3 py-2 ring-1 ring-inset ring-stroke-soft-200'>
              <span className='text-paragraph-xs text-text-sub-500'>Scope</span>
              <span className='truncate text-paragraph-xs font-medium text-text-strong-950'>
                {downloadSummary}
              </span>
            </div>

            {progressLabel ? (
              <p
                className='mb-3 text-center text-paragraph-xs text-text-sub-500'
                aria-live='polite'
              >
                {progressLabel}
              </p>
            ) : null}

            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              className='w-full'
              disabled={
                isExporting ||
                !onDownload ||
                !canDownload ||
                (!allCentersSelected && isLoadingFloors)
              }
              onClick={handleDownload}
            >
              <Button.Icon>
                <RiDownloadLine className='size-4' />
              </Button.Icon>
              {isExporting ? 'Downloading…' : 'Download PNGs'}
            </Button.Root>
          </div>
        </div>
      </Dropdown.Content>
    </Dropdown.Root>
  );
}
