import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiSearchLine } from 'react-icons/ri';

import { postGetSpaceSubSpaces } from '@/api/layoutCoordinates';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Modal from '@/components/ui/modal';
import * as Select from '@/components/ui/select';
import SearchableCommonAreaTypeSelect from '@/pages/center/searchable-common-area-type-select';
import { useDebounce } from '@/hooks/use-debounce';
import {
  fetchCommonAreaTypes,
  fetchResourceTypes,
  selectCommonAreaTypes,
  selectResourceTypes,
} from '@/redux/commonSlice';
import {
  getManagedOfficeSubSpaceTypeBadgeColor,
  normalizeSubSpaceRowForAssociation,
} from '@/utils/layout-annotation-subspace';

const SUB_SPACE_TOP_TYPES = [
  { value: 'Production Area', label: 'Production Area' },
  { value: 'Common Area', label: 'Common Area' },
  { value: 'Resource', label: 'Resource' },
];

const PRODUCTION_AREA_TYPE_OPTIONS = [
  { value: 'Private Cabin', label: 'Private Cabin' },
  { value: 'Manager Cabin', label: 'Manager Cabin' },
  { value: 'Dedicated Desk', label: 'Dedicated Desk' },
  { value: 'Hot Desk', label: 'Hot Desk' },
  { value: 'Director Cabin', label: 'Director Cabin' },
];

function getSubSpaceTypeBadgeColor(subSpaceType) {
  return getManagedOfficeSubSpaceTypeBadgeColor(subSpaceType);
}

/**
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   parentSpaceId?: string,
 *   parentSpaceTitle?: string,
 *   isSaving: boolean,
 *   onSubmit: (payload:
 *     | {
 *         mode: 'existing',
 *         subSpaceRowId: string,
 *         subSpaceId?: string,
 *       }
 *     | {
 *         mode: 'new',
 *         subSpaceName: string,
 *         subSpaceType: string,
 *         resourceType?: string,
 *         productionAreaType?: string,
 *         commonAreaType?: string,
 *         productionSeatCount?: string,
 *       }
 *   ) => void | Promise<void>,
 * }} props
 */
export default function LayoutAnnotationDefineSubSpaceModal({
  open,
  onOpenChange,
  parentSpaceId = '',
  parentSpaceTitle = '',
  isSaving,
  onSubmit,
}) {
  const dispatch = useDispatch();
  const resourceTypes = useSelector(selectResourceTypes);
  const commonAreaTypes = useSelector(selectCommonAreaTypes);

  const [subSpaceNameInput, setSubSpaceNameInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSubSpaceSearchLoading, setIsSubSpaceSearchLoading] = useState(false);
  const [subSpaceSearchError, setSubSpaceSearchError] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [pickedExistingRow, setPickedExistingRow] = useState(null);

  const [subSpaceType, setSubSpaceType] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [productionAreaType, setProductionAreaType] = useState('');
  const [selectedCommonAreaType, setSelectedCommonAreaType] = useState('');
  const [productionSeatCount, setProductionSeatCount] = useState('');
  const [searchResourceType, setSearchResourceType] = useState('');

  const debouncedKeyword = useDebounce(subSpaceNameInput, 400);
  const listWrapRef = useRef(null);

  const isExistingSelection = Boolean(pickedExistingRow);
  const isResource = subSpaceType === 'Resource';
  const isProductionArea = subSpaceType === 'Production Area';
  const isCommonArea = subSpaceType === 'Common Area';
  const showNewSubSpaceFields = !isExistingSelection;

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

  const showParentContextWarning = open && !String(parentSpaceId).trim();

  const clearPick = useCallback(() => {
    setPickedExistingRow(null);
  }, []);

  useEffect(() => {
    if (!open) {
      setSubSpaceNameInput('');
      setSearchResults([]);
      setSubSpaceSearchError('');
      setSuggestionsOpen(false);
      setPickedExistingRow(null);
      setSubSpaceType('');
      setResourceType('');
      setProductionAreaType('');
      setSelectedCommonAreaType('');
      setProductionSeatCount('');
      setSearchResourceType('');
      setSelectedCommonAreaType('');
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isResource) return;
    dispatch(fetchResourceTypes());
  }, [dispatch, open, isResource]);

  useEffect(() => {
    if (!open || !isCommonArea) return;
    dispatch(fetchCommonAreaTypes());
  }, [dispatch, open, isCommonArea]);

  useEffect(() => {
    const spaceId = String(parentSpaceId).trim();
    if (!open || !spaceId) {
      return undefined;
    }

    let cancelled = false;
    setIsSubSpaceSearchLoading(true);
    setSubSpaceSearchError('');

    postGetSpaceSubSpaces({
      space_id: spaceId,
      keyword: String(debouncedKeyword ?? '').trim(),
      page: 1,
      limit_page_length: 50,
    })
      .then((rows) => {
        if (cancelled) return;
        const normalized = (Array.isArray(rows) ? rows : [])
          .map((row) => normalizeSubSpaceRowForAssociation(row))
          .filter(Boolean);
        const typeFilter = String(subSpaceType).trim();
        setSearchResults(
          typeFilter ? normalized.filter((row) => row.sub_space_type === typeFilter) : normalized,
        );
      })
      .catch((error) => {
        if (cancelled) return;
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          'Could not load sub-spaces for this space.';
        setSubSpaceSearchError(String(msg));
        setSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsSubSpaceSearchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, parentSpaceId, debouncedKeyword, subSpaceType]);

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

  const handleSubSpaceTypeChange = (value) => {
    setSubSpaceType(value);
    clearPick();
    setSubSpaceNameInput('');
    setSearchResults([]);
    setSubSpaceSearchError('');
    setSuggestionsOpen(false);
    setResourceType('');
    setProductionAreaType('');
    setSelectedCommonAreaType('');
    setProductionSeatCount('');
    setSearchResourceType('');
  };

  const handleSubSpaceNameInputChange = (e) => {
    const value = e.target.value;
    setSubSpaceNameInput(value);
    if (pickedExistingRow) {
      const prevLabel = String(pickedExistingRow.sub_space_name || '').trim();
      if (String(value).trim() !== prevLabel) {
        clearPick();
      }
    }
    setSuggestionsOpen(true);
  };

  const handleSelectSearchRow = (raw) => {
    const row = normalizeSubSpaceRowForAssociation(raw);
    if (!row) return;
    setPickedExistingRow(row);
    setSubSpaceNameInput(row.sub_space_name);
    if (row.sub_space_type) {
      setSubSpaceType(row.sub_space_type);
    }
    setSuggestionsOpen(false);
  };

  const trimmedSubSpaceName = String(subSpaceNameInput).trim();

  const seatsOk =
    !isProductionArea ||
    (String(productionSeatCount).trim().length > 0 &&
      Number.isFinite(Number(productionSeatCount)) &&
      Number(productionSeatCount) >= 1);

  let isNewFlowSubtypeComplete = false;
  if (!isExistingSelection && trimmedSubSpaceName && subSpaceType) {
    if (isResource) {
      isNewFlowSubtypeComplete = Boolean(resourceType) && resourceTypeOptions.length > 0;
    } else if (isProductionArea) {
      isNewFlowSubtypeComplete = Boolean(productionAreaType) && seatsOk;
    } else if (isCommonArea) {
      isNewFlowSubtypeComplete = Boolean(String(selectedCommonAreaType).trim());
    }
  }

  const canSubmit =
    !showParentContextWarning &&
    !isSaving &&
    Boolean(subSpaceType) &&
    (isExistingSelection ? Boolean(pickedExistingRow?.sub_space_row_id) : isNewFlowSubtypeComplete);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isSaving) return;
    if (isExistingSelection) {
      await onSubmit({
        mode: 'existing',
        subSpaceRowId: String(pickedExistingRow.sub_space_row_id).trim(),
        subSpaceId: String(pickedExistingRow.sub_space_id || '').trim() || undefined,
      });
      return;
    }
    await onSubmit({
      mode: 'new',
      subSpaceName: trimmedSubSpaceName,
      subSpaceType,
      resourceType: isResource ? resourceType : undefined,
      productionAreaType: isProductionArea ? productionAreaType : undefined,
      commonAreaType: isCommonArea ? String(selectedCommonAreaType).trim() : undefined,
      productionSeatCount: isProductionArea ? String(productionSeatCount).trim() : undefined,
    });
  }, [
    canSubmit,
    isSaving,
    isExistingSelection,
    pickedExistingRow,
    onSubmit,
    trimmedSubSpaceName,
    subSpaceType,
    isResource,
    isProductionArea,
    isCommonArea,
    resourceType,
    productionAreaType,
    selectedCommonAreaType,
    productionSeatCount,
  ]);

  let resourcePlaceholder = 'Select resource type';
  if (isResourceTypesLoading) resourcePlaceholder = 'Loading resource types…';
  else if (resourceTypeOptions.length === 0) resourcePlaceholder = 'No resource types available';

  let subSpaceSuggestionsBody = null;
  if (!subSpaceType) {
    subSpaceSuggestionsBody = (
      <div className='px-3 py-2 text-paragraph-xs text-text-sub-600'>
        Select a sub-space type to search existing sub-spaces.
      </div>
    );
  } else if (isSubSpaceSearchLoading) {
    subSpaceSuggestionsBody = (
      <div className='px-3 py-2 text-paragraph-xs text-text-sub-600'>Searching…</div>
    );
  } else if (searchResults.length === 0) {
    subSpaceSuggestionsBody = (
      <div className='px-3 py-2 text-paragraph-xs text-text-sub-600'>
        No matches. Fill in the fields below to create a new sub-space and link it to this shape.
      </div>
    );
  } else {
    subSpaceSuggestionsBody = searchResults.map((row) => (
      <button
        key={row.sub_space_row_id || row.sub_space_id}
        type='button'
        className='flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-paragraph-sm text-text-strong-950 hover:bg-bg-weak-50'
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleSelectSearchRow(row)}
      >
        <span className='min-w-0 truncate'>{row.sub_space_name}</span>
        {row.sub_space_type ? (
          <Badge.Root
            variant='light'
            color={getSubSpaceTypeBadgeColor(row.sub_space_type)}
            className='shrink-0'
          >
            {row.sub_space_type}
          </Badge.Root>
        ) : null}
      </button>
    ));
  }

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[480px] overflow-visible'>
        <Modal.Header
          title='Define sub-space'
          description={
            parentSpaceTitle
              ? `Link this shape to a sub-space under “${parentSpaceTitle}”.`
              : 'Name this sub-space and choose its type.'
          }
        />
        <Modal.Body className='flex max-h-[min(70vh,640px)] flex-col gap-3 overflow-y-auto overflow-x-visible pt-2'>
          {showParentContextWarning ? (
            <p className='text-paragraph-xs text-text-sub-600'>
              Parent space context is not ready yet. Close the dialog and try again.
            </p>
          ) : null}

          <div className='flex flex-col gap-1.5'>
            <Label.Root>
              Sub Space Type
              <Label.Asterisk className='text-red-500' />
            </Label.Root>
            <Select.Root value={subSpaceType} onValueChange={handleSubSpaceTypeChange}>
              <Select.Trigger className='w-full'>
                <Select.Value placeholder='Select type' />
              </Select.Trigger>
              <Select.Content>
                {SUB_SPACE_TOP_TYPES.map((opt) => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>

          <div className='flex flex-col gap-1.5'>
            <Label.Root>
              Sub Space Name
              <Label.Asterisk className='text-red-500' />
            </Label.Root>
            <div ref={listWrapRef} className='relative'>
              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Input
                    value={subSpaceNameInput}
                    onChange={handleSubSpaceNameInputChange}
                    onFocus={() => setSuggestionsOpen(true)}
                    autoComplete='off'
                    placeholder='Search or type a sub-space name'
                    disabled={showParentContextWarning || !subSpaceType}
                  />
                </Input.Wrapper>
              </Input.Root>
              {suggestionsOpen && !showParentContextWarning ? (
                <div className='absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-1 shadow-regular-md'>
                  {subSpaceSuggestionsBody}
                </div>
              ) : null}
            </div>
            {subSpaceSearchError ? (
              <p className='text-paragraph-xs text-red-600'>{subSpaceSearchError}</p>
            ) : null}
          </div>

          {showNewSubSpaceFields && isResource ? (
            <div className='flex flex-col gap-1.5'>
              <Label.Root>
                Resource Type
                <Label.Asterisk className='text-red-500' />
              </Label.Root>
              <Select.Root
                value={resourceType}
                onValueChange={setResourceType}
                disabled={isResourceTypesLoading || resourceTypeOptions.length === 0}
              >
                <Select.Trigger className='w-full'>
                  <Select.Value placeholder={resourcePlaceholder} />
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
          ) : null}

          {showNewSubSpaceFields && isProductionArea ? (
            <>
              <div className='flex flex-col gap-1.5'>
                <Label.Root>
                  Production Area Type
                  <Label.Asterisk className='text-red-500' />
                </Label.Root>
                <Select.Root value={productionAreaType} onValueChange={setProductionAreaType}>
                  <Select.Trigger className='w-full'>
                    <Select.Value placeholder='Select production area type' />
                  </Select.Trigger>
                  <Select.Content>
                    {PRODUCTION_AREA_TYPE_OPTIONS.map((opt) => (
                      <Select.Item key={opt.value} value={opt.value}>
                        {opt.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
              <div className='flex flex-col gap-1.5'>
                <Label.Root>
                  No. of seats
                  <Label.Asterisk className='text-red-500' />
                </Label.Root>
                <Input.Root size='small'>
                  <Input.Wrapper>
                    <Input.Input
                      type='text'
                      inputMode='numeric'
                      autoComplete='off'
                      placeholder='Enter seat count'
                      value={productionSeatCount}
                      onChange={(e) => setProductionSeatCount(e.target.value)}
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>
            </>
          ) : null}

          {showNewSubSpaceFields && isCommonArea ? (
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
        </Modal.Body>
        <Modal.Footer className='justify-end gap-2'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='small'
            disabled={!canSubmit || isSaving}
            onClick={() => void handleSubmit()}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
