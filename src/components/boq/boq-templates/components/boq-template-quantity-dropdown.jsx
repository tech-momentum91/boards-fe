import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';

import {
  buildBoqTemplateQuantityLabel,
  computeBoqTemplateQuantityTotal,
  formatBoqQuantityTotalLabel,
  formatBoqTemplateQuantityNumber,
  getBoqTemplateQuantityByFloor,
  mergeProjectFloorsWithQuantity,
} from '@/components/boq/boq-templates/components/boq-template-products-utils';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

const QUANTITY_DROPDOWN_OPEN_EVENT = 'devx:boq-quantity-dropdown-open';

const serializeFloorQuantities = (floors) =>
  JSON.stringify(
    (Array.isArray(floors) ? floors : []).map((entry) => [
      String(entry?.floor ?? ''),
      String(entry?.value ?? '').trim(),
    ]),
  );

const QuantityFloorInput = ({
  value,
  onChange,
  onFocus,
  onBlur,
  onEnterKey,
  isFocused,
  readOnly = false,
}) => (
  <input
    type='text'
    inputMode='decimal'
    value={value}
    readOnly={readOnly}
    tabIndex={readOnly ? -1 : undefined}
    onChange={readOnly ? undefined : onChange}
    onFocus={readOnly ? undefined : onFocus}
    onBlur={readOnly ? undefined : onBlur}
    onKeyDown={
      readOnly
        ? undefined
        : (event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.stopPropagation();
              onEnterKey?.();
            }
          }
    }
    className={cn(
      'h-[22px] w-[62px] rounded bg-bg-white-0 px-1 text-center text-label-xs font-medium text-text-sub-500 outline-none transition-colors',
      readOnly
        ? 'cursor-default border border-black/5'
        : isFocused
          ? 'border border-black/16'
          : 'border border-black/5',
    )}
    aria-label='Floor quantity'
    aria-readonly={readOnly || undefined}
  />
);

const QuantityFloorRow = ({ floor, value, onValueChange, onEnterKey, readOnly = false }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className='relative flex items-center gap-2 rounded-lg bg-bg-weak-100 p-1.5'>
      <span className='min-w-0 flex-1 truncate text-paragraph-sm text-text-main-900'>{floor}</span>
      <QuantityFloorInput
        value={value}
        readOnly={readOnly}
        isFocused={isFocused}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => onValueChange?.(event.target.value)}
        onEnterKey={onEnterKey}
      />
    </div>
  );
};

const BoqTemplateQuantityDropdown = ({
  quantity,
  quantityByFloor,
  floorOptions = [],
  units = '',
  onQuantityChange,
  editFieldId,
  readOnly = false,
}) => {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const dropdownId = useId();

  const sourceFloors = useMemo(() => {
    if (Array.isArray(floorOptions) && floorOptions.length > 0) {
      return mergeProjectFloorsWithQuantity(floorOptions, quantityByFloor);
    }
    return getBoqTemplateQuantityByFloor({ quantity, quantityByFloor });
  }, [floorOptions, quantity, quantityByFloor]);

  const floorsRef = useRef(sourceFloors);
  const initialFloorsRef = useRef(sourceFloors);
  const [floors, setFloors] = useState(sourceFloors);

  useEffect(() => {
    floorsRef.current = sourceFloors;
    if (!open) {
      setFloors(sourceFloors);
    }
  }, [open, sourceFloors]);

  const total = useMemo(
    () => computeBoqTemplateQuantityTotal(floors.length > 0 ? floors : sourceFloors),
    [floors, sourceFloors],
  );
  const displayTotal = formatBoqTemplateQuantityNumber(total);
  const totalLabel = formatBoqQuantityTotalLabel(units, total);

  const handleFloorValueChange = useCallback((index, nextValue) => {
    setFloors((previous) => {
      const next = previous.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, value: nextValue } : entry,
      );
      floorsRef.current = next;
      return next;
    });
  }, []);

  const commitQuantity = useCallback(() => {
    if (readOnly) return;
    const currentFloors = floorsRef.current;
    if (
      serializeFloorQuantities(currentFloors) === serializeFloorQuantities(initialFloorsRef.current)
    ) {
      return;
    }
    const nextQuantity = buildBoqTemplateQuantityLabel(currentFloors);
    onQuantityChange?.({
      quantity: nextQuantity,
      quantityByFloor: currentFloors,
    });
  }, [onQuantityChange, readOnly]);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      if (nextOpen) {
        window.dispatchEvent(new CustomEvent(QUANTITY_DROPDOWN_OPEN_EVENT, { detail: dropdownId }));
        initialFloorsRef.current = sourceFloors;
        floorsRef.current = sourceFloors;
        setFloors(sourceFloors);
      }
      if (!nextOpen && openRef.current) {
        commitQuantity();
      }
      openRef.current = nextOpen;
      setOpen(nextOpen);
    },
    [commitQuantity, dropdownId, sourceFloors],
  );

  useEffect(() => {
    const closeWhenAnotherQuantityDropdownOpens = (event) => {
      if (event.detail !== dropdownId && openRef.current) {
        handleOpenChange(false);
      }
    };

    window.addEventListener(QUANTITY_DROPDOWN_OPEN_EVENT, closeWhenAnotherQuantityDropdownOpens);
    return () => {
      window.removeEventListener(
        QUANTITY_DROPDOWN_OPEN_EVENT,
        closeWhenAnotherQuantityDropdownOpens,
      );
    };
  }, [dropdownId, handleOpenChange]);

  const handleEnterKey = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  const preventTriggerDismiss = (event) => {
    const target = event?.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-radix-popover-trigger]')) {
      event.preventDefault();
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type='button'
          data-prevent-row-click
          {...(editFieldId && !readOnly ? { 'data-boq-template-edit-field': editFieldId } : {})}
          className='inline-flex h-8 max-w-full items-center justify-center gap-0.5 rounded-lg bg-bg-weak-100 px-1.5 py-1.5 text-label-sm font-medium text-text-sub-500 transition-colors hover:bg-bg-weak-200'
          aria-expanded={open}
          aria-haspopup='dialog'
          aria-label={
            readOnly ? `View quantity by floor: ${displayTotal}` : `Quantity: ${displayTotal}`
          }
        >
          <span className='truncate px-1 font-bold'>{displayTotal}</span>
          <RiArrowDownSLine
            className={cn('size-5 shrink-0 transition-transform', open ? 'rotate-0' : '-rotate-90')}
            aria-hidden
          />
        </button>
      </Popover.Trigger>

      <Popover.Content
        align='start'
        side='bottom'
        sideOffset={6}
        collisionPadding={12}
        showArrow={false}
        data-prevent-row-click
        data-prevent-edit-save
        onKeyDown={(event) => event.stopPropagation()}
        onPointerDownOutside={preventTriggerDismiss}
        onInteractOutside={preventTriggerDismiss}
        className='w-[254px] gap-0 overflow-hidden rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      >
        <div className='flex flex-col gap-1 px-2 pb-4 pt-2'>
          <div className='flex h-6 items-center justify-between gap-2 px-2'>
            <p className='text-subheading-2xs uppercase tracking-[0.22px] text-text-soft-400'>
              Quantity by floor
            </p>
            <p className='shrink-0 text-[10px] leading-[18px] text-text-sub-500/70'>{totalLabel}</p>
          </div>

          <div className='flex w-[238px] flex-col gap-1 pb-2'>
            {floors.map((entry, index) => (
              <QuantityFloorRow
                key={entry.floor}
                floor={entry.floor}
                value={String(entry.value ?? '')}
                readOnly={readOnly}
                onValueChange={
                  readOnly ? undefined : (nextValue) => handleFloorValueChange(index, nextValue)
                }
                onEnterKey={readOnly ? undefined : handleEnterKey}
              />
            ))}
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};

export default BoqTemplateQuantityDropdown;
