import React, { useEffect, useMemo, useState } from 'react';
import { RiArrowDownSLine, RiBuilding4Line, RiLoader4Line, RiSearchLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import { Root as Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/utils/cn';

// --- Helpers ---

const getCityCode = (center) => {
  // Fallback visual helper
  if (center.city) return center.city.slice(0, 3).toUpperCase();
  if (center.center_code) return center.center_code;
  return '';
};

/** Natural sort so Zone 1, Zone 2, Zone 10 (not Zone 1, Zone 10, Zone 2). */
const firstNumberInName = (value) => {
  const match = String(value || '').match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : Number.NaN;
};

const compareZoneNames = (a, b) => {
  const left = String(a || '');
  const right = String(b || '');
  const leftNum = firstNumberInName(left);
  const rightNum = firstNumberInName(right);
  const leftHasNum = Number.isFinite(leftNum);
  const rightHasNum = Number.isFinite(rightNum);
  if (leftHasNum && rightHasNum && leftNum !== rightNum) return leftNum - rightNum;
  if (leftHasNum !== rightHasNum) return leftHasNum ? -1 : 1;
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
};

const normalizeCenters = (centers = []) => {
  return centers.map((c) => {
    // Support zone/center list (name, center_name) and flat pickers (value, label) e.g. get_all_active_centers_booking
    const id = c.name ?? c.value;
    const label = c.center_name || c.label || c.name || 'Unnamed Center';
    return {
      id,
      label,
      zone: c.zone || 'Unassigned',
      center_code: c.center_code || '',
      city: c.city || '',
    };
  });
};

const TruncatedTooltipLabel = ({ label, className }) => {
  if (!label) return null;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className={cn('truncate', className)}>{label}</span>
      </Tooltip.Trigger>
      <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
        {label}
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

const CenterAccessDropdown = ({
  centers = [],
  selectedCenters = [], // Array of IDs (e.g. ['CTR-01'])
  onChange,
  isLoading,
  renderSelectedSummary,
  buttonVariant = 'neutral',
  buttonMode = 'stroke',
  className = '',
  applyImmediately = false,
  listMaxHeight = '360px',
  /** When false, hide the 3-letter city / location code next to each center. */
  showCityCode = true,
  /**
   * After sorting zones, show them as Zone 1, Zone 2, … instead of the stored zone names.
   * Use when the list is a subset (e.g. event-linked centers) so skipped zone numbers are not shown.
   */
  sequentialZoneLabels = false,
  /** When true, closing with zero centers selected restores the previous selection. */
  requireAtLeastOne = false,
  onRejectEmpty,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [collapsedZones, setCollapsedZones] = useState({});

  // Internal Draft State (using Set for performance/easier logic)
  const [draftSelected, setDraftSelected] = useState(new Set(selectedCenters));

  // 1. Process Data
  const normalizedCenters = useMemo(() => normalizeCenters(centers), [centers]);

  // 2. Filter Data
  const filteredCenters = useMemo(() => {
    if (!searchTerm.trim()) return normalizedCenters;
    const term = searchTerm.toLowerCase();
    return normalizedCenters.filter(
      (c) =>
        c.label.toLowerCase().includes(term) ||
        c.zone.toLowerCase().includes(term) ||
        c.center_code.toLowerCase().includes(term),
    );
  }, [normalizedCenters, searchTerm]);

  // Unfiltered zone order so sequential labels stay stable while searching.
  const unfilteredZoneOrder = useMemo(() => {
    const zones = [];
    const seen = new Set();
    normalizedCenters.forEach((center) => {
      const zone = center.zone;
      if (seen.has(zone)) return;
      seen.add(zone);
      zones.push(zone);
    });
    return zones.sort(compareZoneNames);
  }, [normalizedCenters]);

  // 3. Group Data — sorted Zone 1, Zone 2, … (optional sequential display labels)
  const groupedCenters = useMemo(() => {
    const byZone = filteredCenters.reduce((accumulator, center) => {
      if (!accumulator[center.zone]) accumulator[center.zone] = [];
      accumulator[center.zone].push(center);
      return accumulator;
    }, {});
    return Object.entries(byZone)
      .sort(([left], [right]) => compareZoneNames(left, right))
      .map(([zoneName, items]) => {
        const sequentialIndex = unfilteredZoneOrder.indexOf(zoneName);
        return {
          zoneKey: zoneName,
          zoneLabel: sequentialZoneLabels
            ? `Zone ${sequentialIndex >= 0 ? sequentialIndex + 1 : 1}`
            : zoneName,
          items,
        };
      });
  }, [filteredCenters, sequentialZoneLabels, unfilteredZoneOrder]);

  // --- Sync State on Open/Prop Change ---
  useEffect(() => {
    if (isOpen) {
      setDraftSelected(new Set(selectedCenters));
    }
  }, [isOpen, selectedCenters]);

  // --- Handlers ---

  const handleCommit = (open) => {
    if (!open && onChange && !applyImmediately) {
      const next = [...draftSelected];
      const prev = selectedCenters ?? [];
      if (requireAtLeastOne && next.length === 0) {
        setDraftSelected(new Set(prev));
        setIsOpen(false);
        onRejectEmpty?.();
        return;
      }
      setIsOpen(false);
      const unchanged = next.length === prev.length && next.every((id) => prev.includes(id));
      if (!unchanged) {
        onChange(next);
      }
      return;
    }
    setIsOpen(open);
  };

  const applyDraft = (next) => {
    setDraftSelected(next);
    if (applyImmediately) onChange?.([...next]);
  };

  const toggleCenter = (id) => {
    const next = new Set(draftSelected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    applyDraft(next);
  };

  const toggleZone = (centersInZone) => {
    const idsInZone = centersInZone.map((c) => c.id);
    const allSelected = idsInZone.every((id) => draftSelected.has(id));

    const next = new Set(draftSelected);
    if (allSelected) {
      // Deselect all in zone
      idsInZone.forEach((id) => next.delete(id));
    } else {
      // Select all in zone
      idsInZone.forEach((id) => next.add(id));
    }
    applyDraft(next);
  };

  const toggleAll = () => {
    const allVisibleIds = filteredCenters.map((c) => c.id);
    const areAllSelected = allVisibleIds.every((id) => draftSelected.has(id));

    applyDraft(areAllSelected ? new Set([]) : new Set(normalizedCenters.map((c) => c.id)));
  };

  // --- Derived UI Labels ---

  const getButtonLabel = () => {
    if (isLoading) return 'Loading...';
    if (selectedCenters.length === 0) return 'No centers selected';
    if (selectedCenters.length === normalizedCenters.length && normalizedCenters.length > 0)
      return 'All Centers';

    if (selectedCenters.length === 1) {
      const match = normalizedCenters.find((c) => c.id === selectedCenters[0]);
      return match ? match.label : '1 Center';
    }
    return `${selectedCenters.length} Centers`;
  };

  // --- Render Optimization: Single Center ---
  if (!isLoading && normalizedCenters.length === 1) {
    const center = normalizedCenters[0];
    const isFiltered = selectedCenters.length === 1 && selectedCenters[0] === center.id;
    const label = isFiltered ? center.label : 'All Centres';
    return (
      <div className='flex items-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 shadow-regular-xs min-w-[218px] justify-between'>
        <div className='flex items-center gap-2 overflow-hidden'>
          <RiBuilding4Line className='text-text-sub-600' />
          <span className='truncate text-label-sm text-text-strong-950'>{label}</span>
        </div>
      </div>
    );
  }

  // --- Selection Calculations for UI ---
  // Parent checkboxes are only checked when every child is selected — no indeterminate.
  const totalVisible = filteredCenters.length;
  const selectedVisibleCount = filteredCenters.filter((c) => draftSelected.has(c.id)).length;
  const isAllSelected = totalVisible > 0 && selectedVisibleCount === totalVisible;

  return (
    <Tooltip.Provider delayDuration={300}>
      <Popover.Root open={isOpen} onOpenChange={handleCommit}>
        <Popover.Trigger asChild>
          <Button.Root
            variant={buttonVariant}
            mode={buttonMode}
            size='small'
            className={cn('min-w-[218px] justify-between gap-2 px-3', className)}
          >
            <div className='flex items-center gap-2 overflow-hidden'>
              {renderSelectedSummary ? (
                renderSelectedSummary({ selectedCenters, normalizedCenters })
              ) : (
                <TruncatedTooltipLabel
                  label={getButtonLabel()}
                  className='text-label-sm text-text-strong-950'
                />
              )}
            </div>
            {isLoading ? (
              <Button.Icon as={RiLoader4Line} className='animate-spin' />
            ) : (
              <Button.Icon as={RiArrowDownSLine} />
            )}
          </Button.Root>
        </Popover.Trigger>

        <Popover.Content
          align='end'
          sideOffset={8}
          collisionPadding={16}
          showArrow={false}
          className='flex min-w-[300px] w-(--radix-popper-anchor-width) flex-col gap-3 overflow-hidden p-3'
        >
          {/* Search — Popover avoids DropdownMenu typeahead, which was stealing focus from this input */}
          <div className='shrink-0'>
            <Input.Root>
              <Input.Wrapper>
                <Input.Icon>
                  <RiSearchLine />
                </Input.Icon>
                <Input.Input
                  placeholder='Search centers...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <button
            type='button'
            className='flex shrink-0 items-center gap-3 rounded-lg px-2 py-2 text-left outline-none transition hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-primary-base'
            onClick={toggleAll}
          >
            <Checkbox checked={isAllSelected} readOnly />
            <div className='flex flex-row items-center gap-2'>
              <span className='text-paragraph-sm text-text-strong-950'>All Centers</span>
              <span className='text-paragraph-xs text-text-soft-400'>
                ({normalizedCenters.length})
              </span>
            </div>
          </button>

          <div
            className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1'
            style={{ maxHeight: listMaxHeight }}
          >
            {groupedCenters.map(({ zoneKey, zoneLabel, items }) => {
              const idsInZone = items.map((c) => c.id);
              const selectedInZone = idsInZone.filter((id) => draftSelected.has(id)).length;
              const zoneChecked = idsInZone.length > 0 && selectedInZone === idsInZone.length;
              const isCollapsed = collapsedZones[zoneKey];
              const cityCode = (center) => (showCityCode ? getCityCode(center) : '');

              return (
                <div key={zoneKey} className='flex flex-col gap-1'>
                  <div
                    role='button'
                    tabIndex={0}
                    className='flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-text-soft-400 outline-none transition hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-primary-base'
                    onClick={() =>
                      setCollapsedZones((previous) => ({
                        ...previous,
                        [zoneKey]: !previous[zoneKey],
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setCollapsedZones((previous) => ({
                          ...previous,
                          [zoneKey]: !previous[zoneKey],
                        }));
                      }
                    }}
                  >
                    <div
                      className='flex items-center'
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleZone(items);
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <Checkbox checked={zoneChecked} readOnly />
                    </div>
                    <span className='flex-1 cursor-pointer text-[11px] font-medium uppercase tracking-[0.08em]'>
                      {zoneLabel}
                    </span>
                    <span className='inline-flex items-center justify-center rounded-full bg-bg-weak-100 px-2 py-0.5 text-[12px] text-text-sub-600'>
                      {items.length}
                    </span>
                    <RiArrowDownSLine
                      className={cn(
                        'size-4 shrink-0 transition-transform',
                        isCollapsed ? '-rotate-90' : 'rotate-0',
                      )}
                    />
                  </div>

                  {!isCollapsed &&
                    items.map((center) => {
                      const isSelected = draftSelected.has(center.id);
                      const location = cityCode(center);
                      return (
                        <button
                          key={center.id}
                          type='button'
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-2 py-2 pl-6 text-left outline-none transition hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-primary-base',
                            isSelected ? 'bg-bg-weak-100' : '',
                          )}
                          onClick={() => toggleCenter(center.id)}
                        >
                          <Checkbox checked={isSelected} readOnly />
                          <div className='flex flex-1 items-center justify-between gap-2 min-w-0'>
                            <TruncatedTooltipLabel
                              label={center.label}
                              className='text-paragraph-sm text-text-strong-950'
                            />
                            {location ? (
                              <span className='shrink-0 text-paragraph-xs text-text-soft-400'>
                                {location}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Root>
    </Tooltip.Provider>
  );
};

export default CenterAccessDropdown;
