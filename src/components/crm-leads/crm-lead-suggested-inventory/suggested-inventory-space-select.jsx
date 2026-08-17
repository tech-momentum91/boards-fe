import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiArmchairLine,
  RiCheckLine,
  RiLayoutColumnLine,
  RiMapPinLine,
  RiSearchLine,
  RiStackLine,
} from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import { selectVariants } from '@/components/ui/select';
import SuggestedInventoryFloorPlanHeader from '@/components/crm-leads/crm-lead-suggested-inventory/suggested-inventory-floor-plan-header';
import SuggestedInventoryFloorPlanPicker from '@/components/crm-leads/crm-lead-suggested-inventory/suggested-inventory-floor-plan-picker';
import { getManualAddFloorPlans, searchSpacesForManualAdd } from '@/api/crmSuggestedInventory';
import { cn } from '@/utils/cn';

/** Floor plan popover caps (px) — also bounded by Radix available viewport space. */
// max-width: 560, max-height: 480

const LIST_CONTENT_CLASS =
  'relative z-50 min-w-[280px] max-h-[300px] max-w-[min(100vw-24px,400px)] w-full cursor-pointer overflow-hidden rounded-2xl bg-bg-white-0 p-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)] ring-1 ring-inset ring-stroke-soft-200';

const FLOOR_PLAN_CONTENT_CLASS =
  'relative z-50 flex h-[min(480px,var(--radix-popover-content-available-height))] max-h-[min(480px,var(--radix-popover-content-available-height))] w-[min(560px,var(--radix-popover-content-available-width))] max-w-[min(560px,var(--radix-popover-content-available-width))] flex-col overflow-hidden rounded-2xl bg-bg-white-0 p-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)] ring-1 ring-inset ring-stroke-soft-200';

const TRIGGER_VALUE_WRAP_CLASS =
  'min-w-0 flex-1 overflow-hidden text-left [&>span]:block [&>span]:min-w-0 [&>span]:max-w-full [&>span]:truncate';

const BORDERLESS_TRIGGER_CLASS = 'h-8 min-h-8 px-0 text-paragraph-sm text-text-sub-500';

function SpaceOptionMeta({ row }) {
  return (
    <div className='flex min-w-0 items-center gap-2 text-paragraph-xs text-text-sub-500'>
      <span className='inline-flex min-w-0 items-center gap-1'>
        <RiMapPinLine className='size-4 shrink-0 text-text-soft-400' />
        <span className='truncate'>{row.floor ? `Floor ${row.floor}` : 'Floor —'}</span>
      </span>
      <span className='size-1 shrink-0 rounded-full bg-text-soft-400' />
      <span className='inline-flex items-center gap-1'>
        <RiArmchairLine className='size-4 shrink-0 text-text-soft-400' />
        <span>{`${row.avail_seats ?? 0} Seats Available`}</span>
      </span>
    </div>
  );
}

const SuggestedInventorySpaceSelect = ({
  leadId,
  center,
  inventoryType,
  value,
  onSpaceSelected,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [floors, setFloors] = useState([]);
  const [floorIndex, setFloorIndex] = useState(0);
  const [floorsLoading, setFloorsLoading] = useState(false);
  const [floorsError, setFloorsError] = useState(null);
  const searchInputRef = useRef(null);

  const load = useCallback(
    async (keyword = '') => {
      if (!center) {
        setOptions([]);
        return;
      }
      const list = await searchSpacesForManualAdd({
        leadId,
        center,
        inventoryType: inventoryType || undefined,
        keyword,
        limit: 50,
      });
      setOptions(
        list.map((s) => ({
          value: s.space_id,
          label: s.space_name,
          _row: s,
        })),
      );
    },
    [leadId, center, inventoryType],
  );

  useEffect(() => {
    if (open && viewMode === 'list') load(searchQuery);
  }, [open, viewMode, load, searchQuery]);

  useEffect(() => {
    if (!open || viewMode !== 'floorplan' || !center) {
      setFloors([]);
      setFloorIndex(0);
      setFloorsError(null);
      return undefined;
    }

    let cancelled = false;
    setFloorsLoading(true);
    setFloorsError(null);

    getManualAddFloorPlans({ leadId, center, inventoryType })
      .then((payload) => {
        if (cancelled) return;
        setFloors(payload.floors ?? []);
        setFloorIndex(0);
      })
      .catch(() => {
        if (!cancelled) {
          setFloors([]);
          setFloorsError('Could not load floor plans.');
        }
      })
      .finally(() => {
        if (!cancelled) setFloorsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, viewMode, leadId, center, inventoryType]);

  const { triggerRoot } = selectVariants({ size: 'small', variant: 'borderless' });

  const selectedOption = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const row = opt._row || {};
      const hay = [opt.label, row.floor, row.center_name].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [options, searchQuery]);

  const currentFloor = floors[floorIndex] ?? null;
  const availableCount = currentFloor?.available_count ?? currentFloor?.spaces?.length ?? 0;

  const layoutFitKey = useMemo(() => {
    if (!open || viewMode !== 'floorplan' || floorsLoading || !currentFloor) return '';
    return `${floorIndex}:${currentFloor.floor_ref ?? currentFloor.floor_label ?? ''}`;
  }, [open, viewMode, floorsLoading, floorIndex, currentFloor]);

  const isFloorPlanActive = Boolean(open && viewMode === 'floorplan' && layoutFitKey);

  const handlePick = (row) => {
    if (!row) return;
    onSpaceSelected?.(row);
    setOpen(false);
    setSearchQuery('');
    setViewMode('list');
  };

  const toggleViewMode = () => {
    setViewMode((mode) => (mode === 'list' ? 'floorplan' : 'list'));
  };

  const renderFloorPlanBody = () => {
    if (!center) {
      return (
        <div className='flex flex-1 items-center justify-center px-4 text-paragraph-sm text-text-sub-500'>
          Select a center to view floor plans.
        </div>
      );
    }
    if (floorsLoading) {
      return (
        <div className='flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
          Loading floor plan…
        </div>
      );
    }
    if (floorsError) {
      return (
        <div className='flex flex-1 items-center justify-center px-4 text-center text-paragraph-sm text-text-sub-500'>
          {floorsError}
        </div>
      );
    }
    if (floors.length === 0) {
      return (
        <div className='flex flex-1 items-center justify-center px-4 text-center text-paragraph-sm text-text-sub-500'>
          No floor plans with mapped spaces are available for this center.
        </div>
      );
    }
    return (
      <SuggestedInventoryFloorPlanPicker
        key={layoutFitKey || 'floor-plan-idle'}
        isActive={isFloorPlanActive}
        currentFloor={currentFloor}
        floorIndex={floorIndex}
        selectedSpaceId={value}
        onSpaceSelected={handlePick}
        className='min-h-0 flex-1'
      />
    );
  };

  return (
    <Popover.Root
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSearchQuery('');
          setViewMode('list');
        }
      }}
    >
      <Popover.Trigger asChild>
        <button
          type='button'
          disabled={disabled || !center}
          data-state={open ? 'open' : 'closed'}
          data-placeholder={selectedOption ? undefined : ''}
          className={cn(triggerRoot({ class: BORDERLESS_TRIGGER_CLASS }), 'pr-2')}
        >
          <span className={TRIGGER_VALUE_WRAP_CLASS}>
            <span
              className={cn(
                'block min-w-0 max-w-full truncate',
                !selectedOption && 'text-text-sub-500',
              )}
            >
              {selectedOption?.label || 'Select'}
            </span>
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Content
        align='start'
        side='bottom'
        sideOffset={8}
        avoidCollisions
        collisionPadding={16}
        showArrow={false}
        unstyled
        className={viewMode === 'floorplan' ? FLOOR_PLAN_CONTENT_CLASS : LIST_CONTENT_CLASS}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div
          className={cn(
            'flex flex-col',
            viewMode === 'floorplan' && 'h-full min-h-0 overflow-hidden',
          )}
        >
          <div className='flex shrink-0 items-center gap-2 border-b border-stroke-soft-200 p-2'>
            {viewMode === 'list' ? (
              <Input.Root size='small' className='min-w-0 flex-1'>
                <Input.Wrapper>
                  <Input.Icon as={RiSearchLine} />
                  <Input.Input
                    ref={searchInputRef}
                    placeholder='Search...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </Input.Wrapper>
              </Input.Root>
            ) : (
              <SuggestedInventoryFloorPlanHeader
                className='min-w-0 flex-1'
                floorLabel={currentFloor?.floor_label || 'Floor'}
                availableCount={availableCount}
                floorIndex={floorIndex}
                floorCount={floors.length}
                onPreviousFloor={() => setFloorIndex((i) => Math.max(0, i - 1))}
                onNextFloor={() => setFloorIndex((i) => Math.min(floors.length - 1, i + 1))}
              />
            )}
            <Button.Root
              type='button'
              variant={viewMode === 'floorplan' ? 'primary' : 'neutral'}
              mode={viewMode === 'floorplan' ? 'lighter' : 'stroke'}
              size='small'
              className='size-9 shrink-0 p-1.5'
              onClick={toggleViewMode}
              aria-label={viewMode === 'list' ? 'Show floor plan' : 'Show list'}
              aria-pressed={viewMode === 'floorplan'}
            >
              <Button.Icon as={viewMode === 'floorplan' ? RiLayoutColumnLine : RiStackLine} />
            </Button.Root>
          </div>

          {viewMode === 'list' ? (
            <div
              className='flex max-h-[236px] flex-col gap-1 overflow-y-auto p-2'
              onWheel={(e) => e.stopPropagation()}
            >
              {filteredOptions.length === 0 ? (
                <div className='px-2 py-8 text-center text-paragraph-sm text-text-soft-400'>
                  No spaces found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  const row = opt._row || {};
                  return (
                    <button
                      key={opt.value}
                      type='button'
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg p-2 pr-9 text-left transition',
                        isSelected ? 'bg-bg-weak-100' : 'hover:bg-bg-weak-50',
                      )}
                      onClick={() => handlePick(row)}
                    >
                      <div className='flex min-w-0 flex-1 flex-col gap-1'>
                        <p className='truncate text-paragraph-sm text-text-strong-950'>
                          {opt.label}
                        </p>
                        <SpaceOptionMeta row={row} />
                      </div>
                      {isSelected ? (
                        <RiCheckLine className='size-5 shrink-0 text-primary-base' aria-hidden />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <div
              className='flex min-h-0 flex-1 flex-col overflow-hidden p-2'
              style={{
                backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
                backgroundSize: '18px 18px',
              }}
              onWheel={(e) => e.stopPropagation()}
            >
              <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'>
                {renderFloorPlanBody()}
              </div>
            </div>
          )}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};

export default SuggestedInventorySpaceSelect;
