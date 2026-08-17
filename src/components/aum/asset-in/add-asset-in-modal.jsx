import * as React from 'react';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiArrowDownSLine,
  RiArrowLeftDownLine,
  RiArrowUpSLine,
  RiSearch2Line,
  RiStackLine,
} from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { fetchAssetInFloorLayout, selectAssetInFloorLayout } from '@/redux/aumAssetInSlice';
import {
  fetchAumOptions,
  fetchAumCenterFloors,
  fetchAumSpacesForFloor,
  selectAumFloors,
  selectAumOptions,
  selectAumSpaces,
} from '@/redux/aumOptionsSlice';
import AssetInFloorLayoutPicker from '@/components/aum/asset-in/asset-in-floor-layout-picker';

export default function AddAssetInModal({ isOpen, onOpenChange, onSave, isSaving = false }) {
  const dispatch = useDispatch();
  const { centers, status: optionsStatus } = useSelector(selectAumOptions);
  const { byCenter: floorsByCenter, status: floorsStatus } = useSelector(selectAumFloors);
  const {
    byFloorKey: spacesByFloorKey,
    status: spacesStatus,
    error: spacesError,
  } = useSelector(selectAumSpaces);
  const {
    data: floorLayoutData,
    status: layoutStatus,
    error: layoutError,
  } = useSelector(selectAssetInFloorLayout);

  const [center, setCenter] = useState('');
  const [floor, setFloor] = useState('');
  const [area, setArea] = useState('');

  const [areasLoadError, setAreasLoadError] = useState('');

  const [isAreaMapOpen, setIsAreaMapOpen] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);

  const [layoutLoadError, setLayoutLoadError] = useState('');

  const floorKey = center && floor ? `${center}::${floor}` : '';
  const availableFloors = center ? (floorsByCenter[center] ?? []) : [];
  const availableAreas = floorKey ? (spacesByFloorKey[floorKey] ?? []) : [];
  const isLoadingOptions = optionsStatus === 'loading';
  const isLoadingFloors = floorsStatus === 'loading';
  const isLoadingAreas = spacesStatus === 'loading';
  const isLoadingLayout = layoutStatus === 'loading';
  const layoutImageUrl =
    floorLayoutData?.key === floorKey ? floorLayoutData.data?.layout_image_url || '' : '';
  const layoutSpaces = floorLayoutData?.key === floorKey ? floorLayoutData.data?.spaces || [] : [];

  useEffect(() => {
    if (!isOpen) {
      setCenter('');
      setFloor('');
      setArea('');
      setIsAreaMapOpen(false);
      setAreaSearch('');
      setAreaDropdownOpen(false);
      setLayoutLoadError('');
      setAreasLoadError('');
      return;
    }

    dispatch(fetchAumOptions());
  }, [dispatch, isOpen]);

  useEffect(() => {
    if (!center) return;
    dispatch(fetchAumCenterFloors(center));
  }, [dispatch, center]);

  useEffect(() => {
    if (!center || !floor) return;
    setAreasLoadError('');
    dispatch(fetchAumSpacesForFloor({ center, block_floor_id: floor }));
  }, [dispatch, center, floor]);

  useEffect(() => {
    if (spacesStatus === 'failed' && spacesError) {
      setAreasLoadError(spacesError);
    }
  }, [spacesStatus, spacesError]);

  useEffect(() => {
    if (!isAreaMapOpen || !center || !floor) return;
    setLayoutLoadError('');
    dispatch(fetchAssetInFloorLayout({ center, block_floor_id: floor }));
  }, [dispatch, isAreaMapOpen, center, floor]);

  useEffect(() => {
    if (layoutStatus === 'failed' && layoutError) {
      setLayoutLoadError(layoutError);
    }
  }, [layoutStatus, layoutError]);

  const filteredAreas = availableAreas.filter((a) =>
    a.label.toLowerCase().includes(areaSearch.toLowerCase()),
  );

  const selectedCenterLabel = centers.find((c) => c.value === center)?.label || '';
  const selectedFloorLabel = availableFloors.find((f) => f.value === floor)?.label || '';
  const selectedAreaLabel = availableAreas.find((a) => a.value === area)?.label || '';

  const handleCenterChange = (value) => {
    setCenter(value);
    setFloor('');
    setArea('');
    setAreaSearch('');
    setIsAreaMapOpen(false);
    setAreaDropdownOpen(false);
  };

  const handleFloorChange = (value) => {
    setFloor(value);
    setArea('');
    setAreaSearch('');
    setIsAreaMapOpen(false);
    setAreaDropdownOpen(false);
  };

  const handleAreaSelect = (areaValue) => {
    setArea(areaValue);
    setAreaDropdownOpen(false);
    setIsAreaMapOpen(false);
  };

  const handleAreaPopoverOpenChange = (open) => {
    if (!center || !floor) return;
    if (!open) {
      setAreaDropdownOpen(false);
      setIsAreaMapOpen(false);
      setAreaSearch('');
      return;
    }
    if (!isAreaMapOpen) {
      setAreaDropdownOpen(true);
    }
  };

  const handleToggleLayout = () => {
    if (!center || !floor) return;
    setIsAreaMapOpen(true);
    setAreaDropdownOpen(false);
  };

  const isAreaFieldActive = areaDropdownOpen || isAreaMapOpen;
  const isAreaPopoverOpen = areaDropdownOpen || isAreaMapOpen;

  const handleAdd = () => {
    if (!center || !floor || !area || isSaving) return;
    onSave({
      center,
      centerLabel: selectedCenterLabel,
      floor,
      floorLabel: selectedFloorLabel,
      area,
      areaLabel: selectedAreaLabel,
    });
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[440px] rounded-[20px]'>
        <Modal.Header className='py-5 px-8 gap-4'>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-white-0 ring-1 ring-inset ring-stroke-soft-200'>
              <RiArrowLeftDownLine className='size-5 text-text-sub-600' />
            </div>
            <div className='flex-1 space-y-1'>
              <Modal.Title className='text-title-sm font-semibold text-text-strong-950'>
                Add New Asset
              </Modal.Title>
              <Modal.Description className='paragraph-small text-text-sub-500'>
                Enter below details to create new asset entry.
              </Modal.Description>
            </div>
          </div>
        </Modal.Header>

        <Modal.Body className='px-8 py-6 max-h-[70vh] overflow-y-auto'>
          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <Label.Root className='text-label-sm font-medium text-text-strong-950'>
                Center <Label.Asterisk />
              </Label.Root>
              <Select.Root
                value={center}
                onValueChange={handleCenterChange}
                disabled={isLoadingOptions}
              >
                <Select.Trigger
                  disabled={isLoadingOptions}
                  className={cn(
                    'w-full h-10 px-3 rounded-lg border border-stroke-soft-200 bg-bg-white-0',
                    isLoadingOptions && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <Select.Value
                    placeholder={isLoadingOptions ? 'Loading centers...' : 'Select center'}
                  />
                </Select.Trigger>
                <Select.Content>
                  {centers.map((c) => (
                    <Select.Item key={c.value} value={c.value}>
                      {c.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>

            <div className='flex flex-col gap-2'>
              <Label.Root className='text-label-sm font-medium text-text-strong-950'>
                Floor <Label.Asterisk />
              </Label.Root>
              <Select.Root
                value={floor}
                onValueChange={handleFloorChange}
                disabled={!center || isLoadingFloors}
              >
                <Select.Trigger
                  disabled={!center || isLoadingFloors}
                  className={cn(
                    'w-full h-10 px-3 rounded-lg border border-stroke-soft-200 bg-bg-white-0',
                    (!center || isLoadingFloors) && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <Select.Value
                    placeholder={
                      !center
                        ? 'Select center first'
                        : isLoadingFloors
                          ? 'Loading floors...'
                          : 'Select floor'
                    }
                  />
                </Select.Trigger>
                <Select.Content>
                  {availableFloors.map((f) => (
                    <Select.Item key={f.value} value={f.value}>
                      {f.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>

            <div className='flex flex-col gap-2'>
              <Label.Root className='text-label-sm font-medium text-text-strong-950'>
                Area <Label.Asterisk />
              </Label.Root>
              <Popover.Root open={isAreaPopoverOpen} onOpenChange={handleAreaPopoverOpenChange}>
                <Popover.Anchor asChild>
                  <button
                    type='button'
                    disabled={!center || !floor}
                    onClick={() => {
                      if (!center || !floor) return;
                      if (isAreaMapOpen) {
                        setIsAreaMapOpen(false);
                        return;
                      }
                      setAreaDropdownOpen((open) => !open);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between h-10 px-3 rounded-lg border border-stroke-soft-200 bg-bg-white-0 text-paragraph-sm text-text-strong-950 text-left outline-none focus:ring-1 focus:ring-primary-base shadow-regular-xs',
                      (!center || !floor) && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <span className={cn(!area && 'text-text-soft-400 opacity-70')}>
                      {!center
                        ? 'Select center first'
                        : !floor
                          ? 'Select floor first'
                          : selectedAreaLabel || 'Select'}
                    </span>
                    {isAreaFieldActive ? (
                      <RiArrowUpSLine className='size-5 shrink-0 text-text-soft-400' />
                    ) : (
                      <RiArrowDownSLine className='size-5 shrink-0 text-text-soft-400' />
                    )}
                  </button>
                </Popover.Anchor>

                <Popover.Content
                  align='start'
                  sideOffset={8}
                  showArrow={false}
                  unstyled
                  className='z-[10000] border-0 bg-transparent p-0 shadow-none ring-0'
                >
                  {isAreaMapOpen ? (
                    <AssetInFloorLayoutPicker
                      floorLabel={selectedFloorLabel}
                      layoutImageUrl={layoutImageUrl}
                      spaces={layoutSpaces}
                      selectedArea={area}
                      onSelectArea={handleAreaSelect}
                      isLoading={isLoadingLayout}
                      loadError={layoutLoadError}
                    />
                  ) : (
                    <div className='w-[min(549px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-stroke-soft-200 bg-bg-white-0 pb-2 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'>
                      <div className='flex items-center gap-1.5 border-b border-stroke-soft-200 p-2'>
                        <div className='flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-1.5 pl-2 pr-1.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
                          <RiSearch2Line className='size-5 shrink-0 text-text-soft-400' />
                          <input
                            type='text'
                            placeholder='Search...'
                            value={areaSearch}
                            onChange={(e) => setAreaSearch(e.target.value)}
                            className='min-w-0 flex-1 bg-transparent text-paragraph-sm text-text-strong-950 outline-none placeholder:text-text-soft-400'
                          />
                        </div>
                        <button
                          type='button'
                          onClick={handleToggleLayout}
                          disabled={!center || !floor}
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-lg border border-stroke-soft-200 bg-bg-white-0 text-text-sub-600 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] transition-colors hover:bg-bg-weak-50',
                            (!center || !floor) && 'cursor-not-allowed opacity-60',
                          )}
                          title='Open floor layout'
                        >
                          <RiStackLine className='size-5' />
                        </button>
                      </div>
                      <div className='max-h-[160px] overflow-y-auto px-2 pt-2'>
                        {isLoadingAreas ? (
                          <p className='text-center text-label-sm text-text-sub-500 py-3'>
                            Loading areas...
                          </p>
                        ) : areasLoadError ? (
                          <p className='text-center text-label-sm text-error-base py-3 px-2'>
                            {areasLoadError}
                          </p>
                        ) : filteredAreas.length === 0 ? (
                          <p className='text-center text-label-sm text-text-sub-500 py-3'>
                            No areas found
                          </p>
                        ) : (
                          <div className='flex flex-col gap-1'>
                            {filteredAreas.map((a) => (
                              <button
                                key={a.value}
                                type='button'
                                onClick={() => handleAreaSelect(a.value)}
                                className={cn(
                                  'w-full text-left rounded-lg px-2 py-2 text-paragraph-sm text-text-strong-950 transition-colors hover:bg-bg-weak-50',
                                  area === a.value && 'bg-bg-weak-100 font-medium',
                                )}
                              >
                                {a.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Popover.Content>
              </Popover.Root>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className='px-8 py-6 gap-3'>
          <Modal.Close asChild>
            <Button.Root variant='neutral' className='w-full' mode='stroke' size='small'>
              Cancel
            </Button.Root>
          </Modal.Close>
          <Button.Root
            onClick={handleAdd}
            variant='primary'
            className='w-full bg-primary-base hover:bg-primary-dark text-white border-0'
            mode='filled'
            size='small'
            disabled={!center || !floor || !area || isSaving}
          >
            {isSaving ? 'Saving...' : 'Add'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
