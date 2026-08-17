import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as Popover from '@/components/ui/popover';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import apiClient from '@/api/axios';
import { fetchResourceTypesForCenter, selectResourceTypesForCenter } from '@/redux/commonSlice';

const GET_BOOKING_DRAWER_SPACES =
  '/method/devx.seat_inventory.doctype.space.space.get_booking_drawer_spaces';

const sortByLabel = (a, b) => String(a.label || '').localeCompare(String(b.label || ''));
const sortByName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''));

/**
 * Popover body: Resource Type + Space selects and Save/Cancel (same center only).
 */
export const BookingSpaceEditPopoverContent = ({
  centerId,
  initialResourceTypeId,
  initialSpaceId,
  bookForAnyCenter = false,
  onSave,
  onCancel,
  isSaving = false,
}) => {
  const dispatch = useDispatch();
  const resourceTypesState = useSelector(selectResourceTypesForCenter);

  const [resourceTypeId, setResourceTypeId] = useState(initialResourceTypeId || '');
  const [spaceId, setSpaceId] = useState(initialSpaceId || '');
  const [spaces, setSpaces] = useState([]);
  const [spacesLoading, setSpacesLoading] = useState(false);

  useEffect(() => {
    setResourceTypeId(initialResourceTypeId || '');
    setSpaceId(initialSpaceId || '');
  }, [initialResourceTypeId, initialSpaceId]);

  useEffect(() => {
    if (!centerId) return;
    dispatch(fetchResourceTypesForCenter(centerId));
  }, [centerId, dispatch]);

  useEffect(() => {
    let cancelled = false;
    if (!centerId || !resourceTypeId) {
      setSpaces([]);
      setSpacesLoading(false);
    } else {
      (async () => {
        setSpacesLoading(true);
        try {
          const params = { center: centerId, resource_type: resourceTypeId };
          if (bookForAnyCenter) params.book_for_any_center = 1;
          const response = await apiClient.get(GET_BOOKING_DRAWER_SPACES, { params });
          const message = response?.data?.message ?? response?.data;
          const raw = Array.isArray(message) ? message : [];
          if (!cancelled) setSpaces(raw);
        } catch {
          if (!cancelled) setSpaces([]);
        } finally {
          if (!cancelled) setSpacesLoading(false);
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [centerId, resourceTypeId, bookForAnyCenter]);

  const resourceTypeOptions = useMemo(() => {
    const rows = resourceTypesState?.data || [];
    return [...rows].sort(sortByLabel);
  }, [resourceTypesState?.data]);

  const spaceOptions = useMemo(() => {
    return [...spaces].sort(sortByName).map((s) => ({
      value: s.name,
      label: s.inventory_name || s.name,
      floor: s.floor ?? '',
    }));
  }, [spaces]);

  const handleResourceTypeChange = useCallback((nextTypeId) => {
    setResourceTypeId(nextTypeId);
    setSpaceId('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!resourceTypeId || !spaceId) return;
    await onSave?.({ space_id: spaceId, resource_type: resourceTypeId });
  }, [onSave, resourceTypeId, spaceId]);

  const resourceTypesLoading = resourceTypesState?.isLoading ?? false;

  return (
    <Popover.Content
      className='w-[min(100vw-2rem,360px)] p-4'
      align='end'
      sideOffset={8}
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <div className='flex flex-col gap-4'>
        <p className='text-subheading-2xsmall text-text-soft-400 uppercase tracking-wide'>
          Change space
        </p>

        <div className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1'>
            <Label.Root className='text-text-main-900'>Resource Type</Label.Root>
            <SearchableSelect
              size='small'
              value={resourceTypeId}
              onValueChange={handleResourceTypeChange}
              disabled={resourceTypesLoading || !centerId}
              options={resourceTypeOptions}
              placeholder='Select resource type'
              showArrow={true}
              isolateSearchKeyboard
            />
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root className='text-text-main-900'>Space</Label.Root>
            <SearchableSelect
              size='small'
              value={spaceId}
              onValueChange={setSpaceId}
              disabled={spacesLoading || !resourceTypeId}
              options={spaceOptions}
              placeholder={spacesLoading ? 'Loading…' : 'Select space'}
              renderOptionLabel={(opt) => (
                <>
                  {opt.label}
                  {opt.floor !== '' && opt.floor != null ? ` · Floor ${opt.floor}` : ''}
                </>
              )}
              showArrow={true}
              isolateSearchKeyboard
            />
          </div>
        </div>

        <div className='flex items-center justify-end gap-3 pt-1'>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='small'
            type='button'
            onClick={onCancel}
          >
            Cancel
          </Button.Root>
          <Button.Root
            variant='primary'
            mode='filled'
            size='small'
            type='button'
            disabled={isSaving || !resourceTypeId || !spaceId}
            onClick={handleSave}
          >
            Save
          </Button.Root>
        </div>
      </div>
    </Popover.Content>
  );
};
