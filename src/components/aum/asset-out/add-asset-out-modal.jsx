import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowRightUpLine, RiCloseLine, RiInformationLine } from 'react-icons/ri';

import { AUM_OUT_TYPE_OPTIONS, AUM_OUT_TYPES } from '@/components/aum/constants';
import {
  fetchAumOptions,
  fetchAumCenterFloors,
  fetchAumSpacesForFloor,
  selectAumFloors,
  selectAumOptions,
  selectAumSpaces,
} from '@/redux/aumOptionsSlice';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';

const FieldLabel = ({ children, required }) => (
  <span className='flex items-center gap-px text-label-sm font-medium text-text-main-900'>
    {children}
    {required ? <span className='text-text-soft-400'>*</span> : null}
  </span>
);

function buildFormPayload({
  outType,
  center,
  centerLabel,
  floor,
  floorLabel,
  area,
  areaLabel,
  destinationCenter,
  destinationCenterLabel,
  destinationFloor,
  destinationFloorLabel,
  destinationArea,
  destinationAreaLabel,
}) {
  return {
    outType,
    centerSlug: center,
    centerName: centerLabel,
    floor,
    floorLabel,
    areaLabel,
    space: area,
    destinationCenterSlug: destinationCenter,
    destinationCenterName: destinationCenterLabel,
    destinationFloor,
    destinationFloorLabel,
    destinationAreaLabel,
    destinationSpace: destinationArea,
    reasonLabel:
      outType === AUM_OUT_TYPES.TRANSFER
        ? 'Transfer'
        : outType === AUM_OUT_TYPES.SELL
          ? 'Disposal'
          : 'Retirement',
    reasonSlug:
      outType === AUM_OUT_TYPES.TRANSFER
        ? 'transfer'
        : outType === AUM_OUT_TYPES.SELL
          ? 'disposal'
          : 'retirement',
  };
}

function useLocationCascade({ center, floor, enabled }) {
  const dispatch = useDispatch();
  const { centers, status: centersStatus } = useSelector(selectAumOptions);
  const { byCenter: floorsByCenter, status: floorsStatus } = useSelector(selectAumFloors);
  const {
    byFloorKey: spacesByFloorKey,
    status: spacesStatus,
    error: spacesError,
  } = useSelector(selectAumSpaces);

  const floorKey = center && floor ? `${center}::${floor}` : '';

  useEffect(() => {
    if (!enabled || !center) return undefined;
    dispatch(fetchAumCenterFloors(center));
    return undefined;
  }, [center, enabled, dispatch]);

  useEffect(() => {
    if (!enabled || !center || !floor) return undefined;
    dispatch(fetchAumSpacesForFloor({ center, block_floor_id: floor }));
    return undefined;
  }, [center, floor, enabled, dispatch]);

  return {
    centers: enabled ? centers : [],
    floors: center ? (floorsByCenter[center] ?? []) : [],
    areas: floorKey ? (spacesByFloorKey[floorKey] ?? []) : [],
    isLoadingCenters: centersStatus === 'loading',
    isLoadingFloors: floorsStatus === 'loading',
    isLoadingAreas: spacesStatus === 'loading',
    areasLoadError: spacesError || '',
  };
}

export default function AddAssetOutModal({ isOpen, onOpenChange, onSave, isSaving = false }) {
  const dispatch = useDispatch();

  const [outType, setOutType] = useState(AUM_OUT_TYPES.TRANSFER);
  const [center, setCenter] = useState('');
  const [floor, setFloor] = useState('');
  const [area, setArea] = useState('');
  const [destinationCenter, setDestinationCenter] = useState('');
  const [destinationFloor, setDestinationFloor] = useState('');
  const [destinationArea, setDestinationArea] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;
    dispatch(fetchAumOptions());
    return undefined;
  }, [dispatch, isOpen]);

  const sourceLocation = useLocationCascade({
    center,
    floor,
    enabled: isOpen,
  });
  const destinationLocation = useLocationCascade({
    center: destinationCenter,
    floor: destinationFloor,
    enabled: isOpen,
  });

  const isTransfer = outType === AUM_OUT_TYPES.TRANSFER;

  const sourceCenterLabel =
    sourceLocation.centers.find((option) => option.value === center)?.label || '';
  const sourceFloorLabel =
    sourceLocation.floors.find((option) => option.value === floor)?.label || '';
  const sourceAreaLabel = sourceLocation.areas.find((option) => option.value === area)?.label || '';

  const destinationCenterLabel =
    destinationLocation.centers.find((option) => option.value === destinationCenter)?.label || '';
  const destinationFloorLabel =
    destinationLocation.floors.find((option) => option.value === destinationFloor)?.label || '';
  const destinationAreaLabel =
    destinationLocation.areas.find((option) => option.value === destinationArea)?.label || '';

  const canContinue = useMemo(() => {
    const hasLocation = Boolean(center && floor && area);
    const hasDestination =
      !isTransfer || Boolean(destinationCenter && destinationFloor && destinationArea);
    return hasLocation && hasDestination;
  }, [center, floor, area, isTransfer, destinationCenter, destinationFloor, destinationArea]);

  const resetForm = useCallback(() => {
    setOutType(AUM_OUT_TYPES.TRANSFER);
    setCenter('');
    setFloor('');
    setArea('');
    setDestinationCenter('');
    setDestinationFloor('');
    setDestinationArea('');
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const handleCenterChange = useCallback((value) => {
    setCenter(value);
    setFloor('');
    setArea('');
    setDestinationCenter('');
    setDestinationFloor('');
    setDestinationArea('');
  }, []);

  const handleFloorChange = useCallback((value) => {
    setFloor(value);
    setArea('');
  }, []);

  const handleDestinationCenterChange = useCallback((value) => {
    setDestinationCenter(value);
    setDestinationFloor('');
    setDestinationArea('');
  }, []);

  const handleDestinationFloorChange = useCallback((value) => {
    setDestinationFloor(value);
    setDestinationArea('');
  }, []);

  const handleContinue = () => {
    if (!canContinue || isSaving) return;
    onSave?.(
      buildFormPayload({
        outType,
        center,
        centerLabel: sourceCenterLabel,
        floor,
        floorLabel: sourceFloorLabel,
        area,
        areaLabel: sourceAreaLabel,
        destinationCenter,
        destinationCenterLabel,
        destinationFloor,
        destinationFloorLabel,
        destinationArea,
        destinationAreaLabel,
      }),
    );
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content
        showClose={false}
        className='flex max-h-[min(90vh,calc(100vh-32px))] max-w-[min(560px,calc(100vw-16px))] flex-col overflow-hidden p-0'
      >
        <div className='sticky top-0 z-10 flex shrink-0 flex-col border-b border-stroke-soft-200 bg-bg-white-0 px-8 py-5'>
          <div className='flex w-full items-start justify-between gap-4'>
            <div className='flex min-w-0 flex-1 items-start gap-4'>
              <div className='mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 text-text-sub-600'>
                <RiArrowRightUpLine className='size-6' />
              </div>
              <div className='flex min-w-0 flex-col gap-1'>
                <Modal.Title className='text-label-lg font-medium text-text-main-900'>
                  Add New Out Entry
                </Modal.Title>
                <Modal.Description className='paragraph-small text-text-sub-600'>
                  Enter location details, then select assets on the next page.
                </Modal.Description>
              </div>
            </div>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </div>

        <Modal.Body className='min-h-0 flex-1 space-y-5 overflow-y-auto px-8 py-6'>
          <section className='flex flex-col gap-3'>
            <div className='flex items-center gap-2 text-label-md font-medium text-text-sub-500'>
              <RiInformationLine className='size-5 shrink-0 text-text-sub-600' />
              Basic information
            </div>
            <div className='grid grid-cols-1 gap-4'>
              <div className='flex flex-col gap-1'>
                <FieldLabel required>Out type</FieldLabel>
                <Select.Root value={outType} onValueChange={setOutType} size='medium'>
                  <Select.Trigger>
                    <Select.Value placeholder='Select type' />
                  </Select.Trigger>
                  <Select.Content>
                    {AUM_OUT_TYPE_OPTIONS.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
              <div className='flex flex-col gap-1'>
                <FieldLabel required>Center</FieldLabel>
                <Select.Root
                  value={center}
                  onValueChange={handleCenterChange}
                  disabled={sourceLocation.isLoadingCenters}
                  size='medium'
                >
                  <Select.Trigger
                    className={cn(
                      sourceLocation.isLoadingCenters && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <Select.Value
                      placeholder={
                        sourceLocation.isLoadingCenters ? 'Loading centers...' : 'Select center'
                      }
                    />
                  </Select.Trigger>
                  <Select.Content>
                    {sourceLocation.centers.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
              <div className='flex flex-col gap-1'>
                <FieldLabel required>Floor</FieldLabel>
                <Select.Root
                  value={floor}
                  onValueChange={handleFloorChange}
                  disabled={!center || sourceLocation.isLoadingFloors}
                  size='medium'
                >
                  <Select.Trigger
                    className={cn(
                      (!center || sourceLocation.isLoadingFloors) &&
                        'cursor-not-allowed opacity-60',
                    )}
                  >
                    <Select.Value
                      placeholder={
                        !center
                          ? 'Select center first'
                          : sourceLocation.isLoadingFloors
                            ? 'Loading floors...'
                            : 'Select floor'
                      }
                    />
                  </Select.Trigger>
                  <Select.Content>
                    {sourceLocation.floors.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
              <div className='flex flex-col gap-1'>
                <FieldLabel required>Area</FieldLabel>
                <Select.Root
                  value={area}
                  onValueChange={setArea}
                  disabled={!floor || sourceLocation.isLoadingAreas}
                  size='medium'
                >
                  <Select.Trigger
                    className={cn(
                      (!floor || sourceLocation.isLoadingAreas) && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <Select.Value
                      placeholder={
                        !floor
                          ? 'Select floor first'
                          : sourceLocation.isLoadingAreas
                            ? 'Loading areas...'
                            : sourceLocation.areasLoadError || 'Select area'
                      }
                    />
                  </Select.Trigger>
                  <Select.Content>
                    {sourceLocation.areas.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                {sourceLocation.areasLoadError ? (
                  <p className='text-label-xs text-error-base'>{sourceLocation.areasLoadError}</p>
                ) : null}
              </div>
              {isTransfer ? (
                <>
                  <div className='flex flex-col gap-1'>
                    <FieldLabel required>Destination center</FieldLabel>
                    <Select.Root
                      value={destinationCenter}
                      onValueChange={handleDestinationCenterChange}
                      disabled={destinationLocation.isLoadingCenters}
                      size='medium'
                    >
                      <Select.Trigger
                        className={cn(
                          destinationLocation.isLoadingCenters && 'cursor-not-allowed opacity-60',
                        )}
                      >
                        <Select.Value
                          placeholder={
                            destinationLocation.isLoadingCenters
                              ? 'Loading centers...'
                              : 'Select center'
                          }
                        />
                      </Select.Trigger>
                      <Select.Content>
                        {destinationLocation.centers
                          .filter((option) => option.value !== center)
                          .map((option) => (
                            <Select.Item key={option.value} value={option.value}>
                              {option.label}
                            </Select.Item>
                          ))}
                      </Select.Content>
                    </Select.Root>
                  </div>
                  <div className='flex flex-col gap-1'>
                    <FieldLabel required>Destination floor</FieldLabel>
                    <Select.Root
                      value={destinationFloor}
                      onValueChange={handleDestinationFloorChange}
                      disabled={!destinationCenter || destinationLocation.isLoadingFloors}
                      size='medium'
                    >
                      <Select.Trigger
                        className={cn(
                          (!destinationCenter || destinationLocation.isLoadingFloors) &&
                            'cursor-not-allowed opacity-60',
                        )}
                      >
                        <Select.Value
                          placeholder={
                            !destinationCenter
                              ? 'Select center first'
                              : destinationLocation.isLoadingFloors
                                ? 'Loading floors...'
                                : 'Select floor'
                          }
                        />
                      </Select.Trigger>
                      <Select.Content>
                        {destinationLocation.floors.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </div>
                  <div className='flex flex-col gap-1'>
                    <FieldLabel required>Destination area</FieldLabel>
                    <Select.Root
                      value={destinationArea}
                      onValueChange={setDestinationArea}
                      disabled={!destinationFloor || destinationLocation.isLoadingAreas}
                      size='medium'
                    >
                      <Select.Trigger
                        className={cn(
                          (!destinationFloor || destinationLocation.isLoadingAreas) &&
                            'cursor-not-allowed opacity-60',
                        )}
                      >
                        <Select.Value
                          placeholder={
                            !destinationFloor
                              ? 'Select floor first'
                              : destinationLocation.isLoadingAreas
                                ? 'Loading areas...'
                                : destinationLocation.areasLoadError || 'Select area'
                          }
                        />
                      </Select.Trigger>
                      <Select.Content>
                        {destinationLocation.areas.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                    {destinationLocation.areasLoadError ? (
                      <p className='text-label-xs text-error-base'>
                        {destinationLocation.areasLoadError}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </section>
        </Modal.Body>

        <Modal.Footer className='flex shrink-0 items-center justify-end gap-2 border-t border-stroke-soft-200 px-8 py-4'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            variant='primary'
            onClick={handleContinue}
            disabled={!canContinue || isSaving}
          >
            {isSaving ? 'Creating...' : 'Add'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
