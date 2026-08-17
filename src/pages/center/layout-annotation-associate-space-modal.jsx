import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiBox2Fill, RiSearchLine } from 'react-icons/ri';

import { postGetSpacesByFloor } from '@/api/layoutCoordinates';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import { COMMON_AREA_TYPE_OPTIONS } from '@/pages/center/constant';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Modal from '@/components/ui/modal';
import * as Select from '@/components/ui/select';
import SearchableCommonAreaTypeSelect from '@/pages/center/searchable-common-area-type-select';
import { useDebounce } from '@/hooks/use-debounce';
import {
  fetchResourceTypes,
  fetchCommonAreaTypes,
  selectResourceTypes,
  selectCommonAreaTypes,
} from '@/redux/commonSlice';
import { normalizeLayoutFloorSpaceRowForAssociation } from '@/utils/layout-annotation-space';

const MANAGED_OFFICE_TYPE_OPTIONS = [
  { value: 'Fitted Out', label: 'Fitted Out' },
  { value: 'Bare Shell', label: 'Bare Shell' },
];

const COWORKING_SPACE_TYPE_OPTIONS = [
  { value: 'Private Cabin', label: 'Private Cabin' },
  { value: 'Dedicated Desk', label: 'Dedicated Desk' },
  { value: 'Manager Cabin', label: 'Manager Cabin' },
  { value: 'Hot Desk', label: 'Hot Desk' },
];

/** Inventory types we can create from this dialog (payload matches `create_space` expectations). */
const NEW_SPACE_FROM_LAYOUT_TYPES = new Set([
  'Managed Office',
  'Co-working Space',
  'Resource',
  'Common Area',
]);

function getInventoryTypeBadgeColor(inventoryType) {
  const v = String(inventoryType || '')
    .trim()
    .toLowerCase();
  if (v === 'managed office') return 'blue';
  if (v.includes('co-work') || v.includes('cowork')) return 'orange';
  if (v === 'pure rental') return 'purple';
  if (v === 'parking') return 'teal';
  if (v === 'resource') return 'pink';
  if (v.includes('common')) return 'sky';
  return 'gray';
}

/**
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   selectedSpaceRef: string,
 *   onSelectedSpaceRefChange: (value: string) => void,
 *   isSavingLayoutCoordinates: boolean,
 *   isCreateSpaceLoading?: boolean,
 *   onSave: (payload:
 *     | { mode: 'existing' }
 *     | {
 *         mode: 'new',
 *         inventoryName: string,
 *         inventoryType: string,
 *         managedOfficeType?: string,
 *         managedOfficeTotalSeats?: string,
 *         creditPerSeat?: string,
 *         expectedPerSeatRate?: string,
 *         totalRateOfSpace?: string,
 *         coworkingSpaceType?: string,
 *         coworkingTotalSeats?: string,
 *         resourceType?: string,
 *         resourcePax?: string,
 *         commonAreaType?: string,
 *       }
 *   ) => void | Promise<void>,
 *   centerId?: string,
 *   blockFloorId?: string,
 *   floorRef?: string,
 *   initialAssociateSpaceRow?: object | null,
 *   onAssociateSpaceRowOverrideChange?: (row: object | null) => void,
 * }} props
 */
export default function LayoutAnnotationAssociateSpaceModal({
  open,
  onOpenChange,
  selectedSpaceRef,
  onSelectedSpaceRefChange,
  isSavingLayoutCoordinates,
  isCreateSpaceLoading = false,
  onSave,
  centerId = '',
  blockFloorId = '',
  floorRef = '',
  initialAssociateSpaceRow = null,
  onAssociateSpaceRowOverrideChange,
}) {
  const dispatch = useDispatch();
  const resourceTypes = useSelector(selectResourceTypes);
  const commonAreaTypes = useSelector(selectCommonAreaTypes);

  const [spaceSearchInput, setSpaceSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSpaceSearchLoading, setIsSpaceSearchLoading] = useState(false);
  const [spaceSearchError, setSpaceSearchError] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [pickedExistingRow, setPickedExistingRow] = useState(null);

  const [selectedSpaceType, setSelectedSpaceType] = useState('');
  const [selectedCommonAreaType, setSelectedCommonAreaType] = useState('');
  const [selectedManagedOfficeType, setSelectedManagedOfficeType] = useState('');
  const [managedOfficeTotalSeats, setManagedOfficeTotalSeats] = useState('');
  const [creditPerSeat, setCreditPerSeat] = useState('');
  const [expectedPerSeatRate, setExpectedPerSeatRate] = useState('');
  const [totalRateOfSpace, setTotalRateOfSpace] = useState('');
  const [selectedCoworkingSpaceType, setSelectedCoworkingSpaceType] = useState('');
  const [totalSellableSeats, setTotalSellableSeats] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('');
  const [resourcePax, setResourcePax] = useState('');
  const [searchResourceType, setSearchResourceType] = useState('');

  const debouncedKeyword = useDebounce(spaceSearchInput, 400);
  const listWrapRef = useRef(null);
  const appliedInitialRowRef = useRef(false);
  const didAutoMatchSearchRef = useRef(false);

  const isExistingSelection = Boolean(pickedExistingRow);

  const isCommonAreaSpaceType = selectedSpaceType === 'Common Area';
  const isManagedOffice = selectedSpaceType === 'Managed Office';
  const isCoworkingSpace = selectedSpaceType === 'Co-working Space';
  const isResource = selectedSpaceType === 'Resource';

  const resourceTypeOptions = resourceTypes.data ?? [];
  const isResourceTypesLoading = isResource && open && resourceTypes.isLoading;
  const commonAreaTypeOptions = commonAreaTypes.data ?? [];

  const resolvedCommonAreaTypeOptions = useMemo(() => {
    const base = [...commonAreaTypeOptions];
    const current = String(selectedCommonAreaType).trim();
    if (current && !base.some((opt) => opt.value === current)) {
      base.unshift({ value: current, label: current });
    }
    return base;
  }, [commonAreaTypeOptions, selectedCommonAreaType]);

  const filteredResourceTypeOptions = useMemo(() => {
    const q = String(searchResourceType || '')
      .trim()
      .toLowerCase();
    if (!q) return resourceTypeOptions;
    return resourceTypeOptions.filter((opt) =>
      String(opt?.label || opt?.value || '')
        .toLowerCase()
        .includes(q),
    );
  }, [resourceTypeOptions, searchResourceType]);

  const clearPickAndRef = useCallback(() => {
    setPickedExistingRow(null);
    onSelectedSpaceRefChange('');
    onAssociateSpaceRowOverrideChange?.(null);
  }, [onAssociateSpaceRowOverrideChange, onSelectedSpaceRefChange]);

  useEffect(() => {
    if (!open) {
      setSpaceSearchInput('');
      setSearchResults([]);
      setSpaceSearchError('');
      setSuggestionsOpen(false);
      setPickedExistingRow(null);
      setSelectedSpaceType('');
      setSelectedCommonAreaType('');
      setSelectedManagedOfficeType('');
      setManagedOfficeTotalSeats('');
      setCreditPerSeat('');
      setExpectedPerSeatRate('');
      setTotalRateOfSpace('');
      setSelectedCoworkingSpaceType('');
      setTotalSellableSeats('');
      setSelectedResourceType('');
      setResourcePax('');
      setSearchResourceType('');
      appliedInitialRowRef.current = false;
      didAutoMatchSearchRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !initialAssociateSpaceRow || !selectedSpaceRef || appliedInitialRowRef.current) {
      return;
    }
    const n = normalizeLayoutFloorSpaceRowForAssociation(initialAssociateSpaceRow);
    if (!n) return;
    appliedInitialRowRef.current = true;
    didAutoMatchSearchRef.current = true;
    setSpaceSearchInput(n.inventory_name);
    setPickedExistingRow(n);
    onAssociateSpaceRowOverrideChange?.(n);
  }, [open, initialAssociateSpaceRow, selectedSpaceRef, onAssociateSpaceRowOverrideChange]);

  useEffect(() => {
    if (!open || !isResource) return;
    dispatch(fetchResourceTypes());
  }, [dispatch, open, isResource]);

  useEffect(() => {
    if (!open || !isCommonAreaSpaceType) return;
    dispatch(fetchCommonAreaTypes());
  }, [dispatch, open, isCommonAreaSpaceType]);

  useEffect(() => {
    if (!open || !String(centerId).trim() || !String(blockFloorId).trim()) {
      return undefined;
    }

    const spaceTypeForApi = String(
      selectedSpaceType || pickedExistingRow?.inventory_type || '',
    ).trim();
    if (!spaceTypeForApi) {
      setSearchResults([]);
      setIsSpaceSearchLoading(false);
      setSpaceSearchError('');
      return undefined;
    }

    let cancelled = false;
    setIsSpaceSearchLoading(true);
    setSpaceSearchError('');

    postGetSpacesByFloor({
      center: String(centerId).trim(),
      block_floor_id: String(blockFloorId).trim(),
      floor_ref: String(floorRef ?? '').trim(),
      keyword: String(debouncedKeyword ?? '').trim(),
      space_type: spaceTypeForApi,
      unmapped_only: true,
      page: 1,
      page_size: 50,
    })
      .then((rows) => {
        if (cancelled) return;
        setSearchResults(Array.isArray(rows) ? rows : []);
      })
      .catch((error) => {
        if (cancelled) return;
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          'Could not load spaces for this floor.';
        setSpaceSearchError(String(msg));
        setSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsSpaceSearchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    centerId,
    blockFloorId,
    floorRef,
    debouncedKeyword,
    selectedSpaceType,
    pickedExistingRow,
  ]);

  useEffect(() => {
    if (!open || didAutoMatchSearchRef.current || appliedInitialRowRef.current) return;
    if (!selectedSpaceRef || searchResults.length === 0) return;
    const ref = String(selectedSpaceRef).trim();
    const rawHit = searchResults.find((r) => {
      const n = normalizeLayoutFloorSpaceRowForAssociation(r);
      return n && (String(n.name).trim() === ref || String(n.id).trim() === ref);
    });
    if (!rawHit) return;
    const n = normalizeLayoutFloorSpaceRowForAssociation(rawHit);
    if (!n) return;
    didAutoMatchSearchRef.current = true;
    setSpaceSearchInput(n.inventory_name);
    setPickedExistingRow(n);
    onAssociateSpaceRowOverrideChange?.(n);
  }, [open, searchResults, selectedSpaceRef, onAssociateSpaceRowOverrideChange]);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (!suggestionsOpen) return;
      const el = listWrapRef.current;
      if (el && !el.contains(e.target)) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [suggestionsOpen]);

  const spaceTypeOptions = [
    { value: 'Managed Office', label: 'Managed Office', color: 'purple' },
    { value: 'Co-working Space', label: 'Co-Working Space', color: 'orange' },
    { value: 'Pure Rental', label: 'Pure Rental', color: 'blue' },
    { value: 'Parking', label: 'Parking', color: 'teal' },
    { value: 'Resource', label: 'Resource', color: 'pink' },
    { value: 'Common Area', label: 'Common Area', color: 'sky' },
  ];

  const showFloorContextWarning =
    open && (!String(centerId).trim() || !String(blockFloorId).trim());

  const handleSpaceTypeChange = (value) => {
    setSelectedSpaceType(value);
    clearPickAndRef();
    setSpaceSearchInput('');
    setSearchResults([]);
    setSpaceSearchError('');
    setSuggestionsOpen(false);
    if (value !== 'Common Area') {
      setSelectedCommonAreaType('');
    }
    if (value !== 'Managed Office') {
      setSelectedManagedOfficeType('');
      setManagedOfficeTotalSeats('');
    }
    if (value !== 'Co-working Space') {
      setSelectedCoworkingSpaceType('');
      setTotalSellableSeats('');
    }
    if (value !== 'Managed Office' && value !== 'Co-working Space') {
      setCreditPerSeat('');
      setExpectedPerSeatRate('');
      setTotalRateOfSpace('');
    }
    if (value !== 'Resource') {
      setSelectedResourceType('');
      setResourcePax('');
    }
  };

  const showSpacePricingFields = isManagedOffice || isCoworkingSpace;

  const pricingSeatCount = useMemo(() => {
    if (isManagedOffice) return Number(managedOfficeTotalSeats);
    if (isCoworkingSpace) return Number(totalSellableSeats);
    return Number.NaN;
  }, [isManagedOffice, isCoworkingSpace, managedOfficeTotalSeats, totalSellableSeats]);

  useEffect(() => {
    if (!showSpacePricingFields) {
      setTotalRateOfSpace('');
      return;
    }
    const rate = Number(expectedPerSeatRate);
    if (Number.isFinite(pricingSeatCount) && pricingSeatCount >= 1 && Number.isFinite(rate)) {
      setTotalRateOfSpace(String(Math.round(rate * pricingSeatCount)));
    } else {
      setTotalRateOfSpace('');
    }
  }, [showSpacePricingFields, pricingSeatCount, expectedPerSeatRate]);

  const handleNumericPricingChange = useCallback(
    (setter) => (e) => {
      setter(e.target.value.replaceAll(/\D/g, ''));
    },
    [],
  );

  const trimmedSpaceName = String(spaceSearchInput).trim();

  const isNewTypeSupportedForCreate =
    Boolean(selectedSpaceType) && NEW_SPACE_FROM_LAYOUT_TYPES.has(selectedSpaceType);

  let isNewFlowSubtypeComplete = false;
  if (!isExistingSelection && trimmedSpaceName && isNewTypeSupportedForCreate) {
    if (isManagedOffice) {
      const moSeats = Number(managedOfficeTotalSeats);
      isNewFlowSubtypeComplete =
        Boolean(selectedManagedOfficeType) && Number.isFinite(moSeats) && moSeats >= 1;
    } else if (isCoworkingSpace) {
      const seats = Number(totalSellableSeats);
      isNewFlowSubtypeComplete =
        Boolean(selectedCoworkingSpaceType) && Number.isFinite(seats) && seats >= 1;
    } else if (isResource) {
      const pax = Number(resourcePax);
      isNewFlowSubtypeComplete =
        Boolean(selectedResourceType) &&
        Number.isFinite(pax) &&
        pax >= 1 &&
        resourceTypeOptions.length > 0;
    } else if (isCommonAreaSpaceType) {
      isNewFlowSubtypeComplete = Boolean(String(selectedCommonAreaType).trim());
    }
  }

  const isBusy = isSavingLayoutCoordinates || isCreateSpaceLoading;

  const canSave =
    !showFloorContextWarning &&
    !isBusy &&
    (isExistingSelection ? Boolean(selectedSpaceRef) : isNewFlowSubtypeComplete);

  const handleFooterSave = async () => {
    if (!canSave) return;
    if (isExistingSelection) {
      await onSave({ mode: 'existing' });
      return;
    }
    await onSave({
      mode: 'new',
      inventoryName: trimmedSpaceName,
      inventoryType: selectedSpaceType,
      managedOfficeType: selectedManagedOfficeType,
      managedOfficeTotalSeats,
      creditPerSeat,
      expectedPerSeatRate,
      totalRateOfSpace,
      coworkingSpaceType: selectedCoworkingSpaceType,
      coworkingTotalSeats: totalSellableSeats,
      resourceType: selectedResourceType,
      resourcePax,
      commonAreaType: String(selectedCommonAreaType).trim(),
    });
  };

  let saveButtonLabel = 'Save';
  if (isCreateSpaceLoading) {
    saveButtonLabel = 'Creating…';
  } else if (isSavingLayoutCoordinates) {
    saveButtonLabel = 'Saving…';
  }

  let resourceTypeSelectPlaceholder = 'Select resource type';
  if (isResourceTypesLoading) {
    resourceTypeSelectPlaceholder = 'Loading resource types…';
  } else if (resourceTypeOptions.length === 0) {
    resourceTypeSelectPlaceholder = 'No resource types available';
  }

  const handleSpaceNameInputChange = (e) => {
    const v = e.target.value;
    setSpaceSearchInput(v);
    if (pickedExistingRow) {
      const prevLabel = String(
        pickedExistingRow.inventory_name || pickedExistingRow.spaceName || '',
      ).trim();
      if (String(v).trim() !== prevLabel) {
        clearPickAndRef();
      }
    } else {
      onSelectedSpaceRefChange('');
      onAssociateSpaceRowOverrideChange?.(null);
    }
    setSuggestionsOpen(true);
  };

  const handleSelectSearchRow = (raw) => {
    const n = normalizeLayoutFloorSpaceRowForAssociation(raw);
    if (!n) return;
    setPickedExistingRow(n);
    setSpaceSearchInput(n.inventory_name);
    onSelectedSpaceRefChange(n.name);
    onAssociateSpaceRowOverrideChange?.(n);
    setSuggestionsOpen(false);
  };

  const showNewSpaceFields = !isExistingSelection;

  let spaceSuggestionsBody = null;
  if (!selectedSpaceType && !isExistingSelection) {
    spaceSuggestionsBody = (
      <div className='px-3 py-2 text-paragraph-xs text-text-sub-600'>
        Select a space type to search existing spaces.
      </div>
    );
  } else if (isSpaceSearchLoading) {
    spaceSuggestionsBody = (
      <div className='px-3 py-2 text-paragraph-xs text-text-sub-600'>Searching…</div>
    );
  } else if (searchResults.length === 0) {
    spaceSuggestionsBody = (
      <div className='px-3 py-2 text-paragraph-xs text-text-sub-600'>
        No matches. Fill in the fields below to create a new space and link it to this shape.
      </div>
    );
  } else {
    spaceSuggestionsBody = searchResults.map((raw) => {
      const row = normalizeLayoutFloorSpaceRowForAssociation(raw);
      if (!row) return null;
      const label = row.inventory_name || row.spaceName || row.name;
      const typeLabel = row.inventory_type || row.spaceType || '—';
      return (
        <button
          key={row.name}
          type='button'
          className='flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-paragraph-sm text-text-strong-950 hover:bg-bg-weak-50'
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleSelectSearchRow(raw)}
        >
          <span className='min-w-0 truncate'>{label}</span>
          <Badge.Root
            variant='light'
            color={getInventoryTypeBadgeColor(typeLabel)}
            className='shrink-0'
          >
            {typeLabel}
          </Badge.Root>
        </button>
      );
    });
  }

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[560px] overflow-visible'>
        <Modal.Header
          title='Add Space'
          description='Enter below details to add new space.'
          icon={RiBox2Fill}
        />

        <Modal.Body className='flex max-h-[min(70vh,640px)] flex-col gap-3 overflow-y-auto overflow-x-visible pt-2'>
          {showFloorContextWarning ? (
            <p className='text-paragraph-xs text-text-sub-600'>
              Center or floor context is not ready yet. Close the dialog and try again once the
              layout has loaded.
            </p>
          ) : null}

          {showNewSpaceFields ? (
            <>
              <div>
                <Label.Root>
                  Space Type
                  <Label.Asterisk className='text-red-500' />
                </Label.Root>

                <Select.Root value={selectedSpaceType} onValueChange={handleSpaceTypeChange}>
                  <Select.Trigger className='w-full'>
                    <Select.Value placeholder='Select' />
                  </Select.Trigger>
                  <Select.Content>
                    {spaceTypeOptions.map((opt) => (
                      <Select.Item key={opt.value} value={opt.value}>
                        <Badge.Root variant='light' color={opt.color}>
                          {opt.value}
                        </Badge.Root>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>

              <div className='flex flex-col gap-1.5'>
                <Label.Root>
                  Space Name
                  <Label.Asterisk className='text-red-500' />
                </Label.Root>
                <div ref={listWrapRef} className='relative'>
                  <Input.Root size='small'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        autoComplete='off'
                        placeholder='Search or type a space name'
                        value={spaceSearchInput}
                        onChange={handleSpaceNameInputChange}
                        onFocus={() => setSuggestionsOpen(true)}
                        disabled={
                          showFloorContextWarning || (!selectedSpaceType && !isExistingSelection)
                        }
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {suggestionsOpen && !showFloorContextWarning ? (
                    <div className='absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-1 shadow-regular-md'>
                      {spaceSuggestionsBody}
                    </div>
                  ) : null}
                </div>
                {spaceSearchError ? (
                  <p className='text-paragraph-xs text-red-600'>{spaceSearchError}</p>
                ) : null}
              </div>

              {isManagedOffice ? (
                <div>
                  <Label.Root>
                    Managed Office Type
                    <Label.Asterisk className='text-red-500' />
                  </Label.Root>
                  <Select.Root
                    value={selectedManagedOfficeType}
                    onValueChange={setSelectedManagedOfficeType}
                  >
                    <Select.Trigger className='w-full'>
                      <Select.Value placeholder='Select managed office type' />
                    </Select.Trigger>
                    <Select.Content>
                      {MANAGED_OFFICE_TYPE_OPTIONS.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              ) : null}

              {isManagedOffice ? (
                <div>
                  <Label.Root>
                    Total Seats
                    <Label.Asterisk className='text-red-500' />
                  </Label.Root>

                  <Input.Root size='small'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        inputMode='numeric'
                        autoComplete='off'
                        placeholder='Enter total seats'
                        value={managedOfficeTotalSeats}
                        onChange={(e) => setManagedOfficeTotalSeats(e.target.value)}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              ) : null}

              {isCoworkingSpace ? (
                <>
                  <div>
                    <Label.Root>
                      Coworking Space Type
                      <Label.Asterisk className='text-red-500' />
                    </Label.Root>
                    <Select.Root
                      value={selectedCoworkingSpaceType}
                      onValueChange={setSelectedCoworkingSpaceType}
                    >
                      <Select.Trigger className='w-full'>
                        <Select.Value placeholder='Select coworking space type' />
                      </Select.Trigger>
                      <Select.Content>
                        {COWORKING_SPACE_TYPE_OPTIONS.map((opt) => (
                          <Select.Item key={opt.value} value={opt.value}>
                            {opt.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </div>
                  <div className='flex flex-col gap-1.5'>
                    <Label.Root>
                      Total Sellable Seats
                      <Label.Asterisk className='text-red-500' />
                    </Label.Root>
                    <Input.Root size='small'>
                      <Input.Wrapper>
                        <Input.Input
                          type='text'
                          inputMode='numeric'
                          autoComplete='off'
                          placeholder='Enter total sellable seats'
                          value={totalSellableSeats}
                          onChange={(e) => setTotalSellableSeats(e.target.value)}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </div>
                </>
              ) : null}

              {showSpacePricingFields ? (
                <>
                  <div className='flex flex-col gap-1.5'>
                    <Label.Root>Expected Per Seat Rate</Label.Root>
                    <Input.Root size='small'>
                      <Input.Wrapper>
                        <Input.Input
                          type='text'
                          inputMode='numeric'
                          autoComplete='off'
                          placeholder='Enter rate per seat'
                          value={expectedPerSeatRate}
                          onChange={handleNumericPricingChange(setExpectedPerSeatRate)}
                        />
                        <Input.Affix>₹</Input.Affix>
                      </Input.Wrapper>
                    </Input.Root>
                  </div>
                  <div className='flex flex-col gap-1.5'>
                    <Label.Root>Credit Per Seat</Label.Root>
                    <Input.Root size='small'>
                      <Input.Wrapper>
                        <Input.Input
                          type='text'
                          inputMode='numeric'
                          autoComplete='off'
                          placeholder='Credit per seat'
                          value={creditPerSeat}
                          onChange={handleNumericPricingChange(setCreditPerSeat)}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </div>
                  <div className='flex flex-col gap-1.5 col-span-2'>
                    <Label.Root>Total Rate of Space</Label.Root>
                    <Input.Root size='small'>
                      <Input.Wrapper>
                        <Input.Input
                          type='text'
                          readOnly
                          placeholder='Auto-calculated from seats × rate'
                          value={totalRateOfSpace}
                        />
                        <Input.Affix>₹</Input.Affix>
                      </Input.Wrapper>
                    </Input.Root>
                  </div>
                </>
              ) : null}

              {isResource ? (
                <>
                  <div>
                    <Label.Root>
                      Resource Type
                      <Label.Asterisk className='text-red-500' />
                    </Label.Root>
                    <Select.Root
                      value={selectedResourceType}
                      onValueChange={setSelectedResourceType}
                      disabled={isResourceTypesLoading || resourceTypeOptions.length === 0}
                    >
                      <Select.Trigger className='w-full'>
                        <Select.Value placeholder={resourceTypeSelectPlaceholder} />
                      </Select.Trigger>
                      <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                        <div className='px-2 py-2'>
                          <Input.Root size='small'>
                            <Input.Wrapper>
                              <Input.Icon as={RiSearchLine} />
                              <Input.Input
                                placeholder='Search resource type…'
                                value={searchResourceType}
                                onChange={(e) => setSearchResourceType(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        </div>
                        {filteredResourceTypeOptions.length > 0 ? (
                          filteredResourceTypeOptions.map((opt) => (
                            <Select.Item key={opt.value} value={opt.value}>
                              {opt.label || opt.value}
                            </Select.Item>
                          ))
                        ) : (
                          <div className='px-3 py-2 text-paragraph-sm text-text-sub-500'>
                            No resource types found
                          </div>
                        )}
                      </Select.Content>
                    </Select.Root>
                  </div>
                  <div className='flex flex-col gap-1.5'>
                    <Label.Root>
                      PAX
                      <Label.Asterisk className='text-red-500' />
                    </Label.Root>
                    <Input.Root size='small'>
                      <Input.Wrapper>
                        <Input.Input
                          type='text'
                          inputMode='numeric'
                          autoComplete='off'
                          placeholder='Enter PAX'
                          value={resourcePax}
                          onChange={(e) => setResourcePax(e.target.value)}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </div>
                </>
              ) : null}

              {isCommonAreaSpaceType ? (
                <div className='flex flex-col gap-2'>
                  <Label.Root>
                    Common Area Type
                    <Label.Asterisk className='text-red-500' />
                  </Label.Root>
                  <SearchableCommonAreaTypeSelect
                    value={selectedCommonAreaType}
                    onValueChange={setSelectedCommonAreaType}
                    options={resolvedCommonAreaTypeOptions}
                  />
                </div>
              ) : null}

              {showNewSpaceFields &&
              selectedSpaceType &&
              !NEW_SPACE_FROM_LAYOUT_TYPES.has(selectedSpaceType) ? (
                <p className='text-paragraph-xs text-amber-700'>
                  Creating this space type from the floor plan is not supported here yet. Choose
                  Managed Office, Co-working Space, Resource, or Common Area, or pick an existing
                  space from search.
                </p>
              ) : null}
            </>
          ) : (
            <div className='flex flex-col gap-1.5'>
              <Label.Root>
                Space Name
                <Label.Asterisk className='text-red-500' />
              </Label.Root>
              <div ref={listWrapRef} className='relative'>
                <Input.Root size='small'>
                  <Input.Wrapper>
                    <Input.Input
                      type='text'
                      autoComplete='off'
                      placeholder='Search or type a space name'
                      value={spaceSearchInput}
                      onChange={handleSpaceNameInputChange}
                      onFocus={() => setSuggestionsOpen(true)}
                      disabled={showFloorContextWarning}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {suggestionsOpen && !showFloorContextWarning ? (
                  <div className='absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-1 shadow-regular-md'>
                    {spaceSuggestionsBody}
                  </div>
                ) : null}
              </div>
              {spaceSearchError ? (
                <p className='text-paragraph-xs text-red-600'>{spaceSearchError}</p>
              ) : null}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className='justify-end gap-2 sm:justify-between'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            className='w-full'
            disabled={isBusy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='small'
            className='w-full'
            disabled={!canSave}
            onClick={() => void handleFooterSave()}
          >
            {saveButtonLabel}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
