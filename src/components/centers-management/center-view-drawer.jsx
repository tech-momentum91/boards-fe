import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import AICenterModal from '@/components/AI/AICenterModal';
import { useForm, Controller } from 'react-hook-form';
import {
  RiBox3Line,
  RiBuildingLine,
  RiFile2Line,
  RiGroupLine,
  RiInformationLine,
  RiLayoutGridLine,
  RiMap2Line,
  RiMapPin2Line,
  RiPriceTag3Line,
  RiRuler2Line,
  RiTableAltLine,
  RiToolsLine,
  RiUser2Line,
  RiGovernmentLine,
  RiCommunityLine,
  RiMailLine,
  RiPencilLine,
  RiCloseLine,
  RiCheckLine,
  RiErrorWarningFill,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiAddLine,
} from 'react-icons/ri';
import { State, City } from 'country-state-city';
import AddressMap from '@/components/ui/address-map';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Tag from '@/components/ui/tag';
import * as Badge from '@/components/ui/badge';
import * as Input from '@/components/ui/input';
import * as Textarea from '@/components/ui/textarea';
import * as Select from '@/components/ui/select';
import * as Hint from '@/components/ui/hint';
import ErrorText from '@/components/ui/error-text';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as LinkButton from '@/components/ui/link-button';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import CenterViewFloor from './center-view-content/center-view-floor';
import CenterViewLandlord from './center-view-content/center-view-landlord';
import CenterViewTeamAssociated from './center-view-content/center-view-team-associateed';
import CenterViewComplianceDocument from './center-view-content/center-view-compliance-document';
import CenterViewSpace from './center-view-content/center-view-space';
import CenterViewDrawerSkeleton from './center-view-drawer-skeleton';
import { useDispatch, useSelector } from 'react-redux';
import { getCenterDetailsThunk, updateCenterThunk } from '@/redux/centerSlice';
import apiClient from '@/api/axios';
import { hasModulePermission } from '@/utils/user-role-utils';
import { getStatusOptions } from '@/api/dynamic-status';
import { StatusColorPill } from '@/components/ui/status-color-pill';

function parseAddressPlace(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function getCoordinatesFromAddressPlace(raw) {
  const p = parseAddressPlace(raw);
  if (p?.lat == null || p?.lng == null) return null;
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

// Helper to get state ISO code from state name
const getStateIsoCode = (stateName) => {
  if (!stateName) return '';
  const states = State.getStatesOfCountry('IN');
  const state = states.find((s) => s.name === stateName);
  return state?.isoCode || '';
};

// Helper to get state name from ISO code
const getStateName = (isoCode) => {
  if (!isoCode) return '';
  const states = State.getStatesOfCountry('IN');
  const state = states.find((s) => s.isoCode === isoCode);
  return state?.name || isoCode;
};

// Normalize status to capitalized format (Active, Inactive, Upcoming)
const normalizeStatus = (statusValue) => {
  if (!statusValue) return 'Active';
  const lower = statusValue.toLowerCase();
  if (lower === 'active') return 'Active';
  if (lower === 'inactive') return 'Inactive';
  if (lower === 'upcoming') return 'Upcoming';
  return statusValue; // Return as-is if doesn't match
};

// Table row component for basic information
const BasicInfoRow = ({
  label,
  value,
  onValueChange,
  type = 'input',
  options,
  placeholder,
  Icon,
  isLast = false,
  required = false,
  showBadge = false,
  error,
  fieldName,
  control,
  affix,
  disabled = false,
  hintMessage,
  showHint,
}) => {
  // Get the selected option label for badge display
  const selectedOption = options?.find((opt) => opt.value === value);
  const selectedLabel = selectedOption?.label || value;

  return (
    <>
      <tr className={isLast ? '' : 'border-b border-stroke-soft-200 '}>
        <td className='w-[140px] h-[40px] pl-3 pr-0 py-0 border-r border-stroke-soft-200'>
          <div className='flex h-8 w-[180px] items-center gap-2'>
            {Icon && <Icon className='size-5 text-neutral-500' />}
            <div className='flex items-center gap-1 label-small text-text-main-900'>
              <span>{label}</span>
              {required && <span className='text-[var(--color-text-soft-400)]'>*</span>}
            </div>
          </div>
        </td>
        <td className='h-8 pl-1.5 pr-1 pb-1 pt-1 border-l border-stroke-soft-200'>
          <div className='flex flex-col items-start justify-center w-full'>
            {disabled ? (
              <span className='paragraph-small text-text-main-900'>
                {type === 'select' && showBadge ? (
                  <StatusColorPill value={selectedLabel} color={selectedOption?.color} />
                ) : (
                  `${value || '--'}${affix ? ` ${affix}` : ''}`
                )}
              </span>
            ) : type === 'select' ? (
              <Controller
                name={fieldName}
                control={control}
                render={({ field }) => {
                  // Get value from field or prop, but treat empty strings as no value
                  const fieldValue = field.value;
                  const propertyValue = value;
                  const selectValue =
                    fieldValue && fieldValue.trim() !== ''
                      ? fieldValue
                      : propertyValue && propertyValue.trim() !== ''
                        ? propertyValue
                        : '';
                  // Check if value exists and is not empty
                  const hasValue = selectValue && selectValue.trim() !== '';
                  const displayValue = hasValue ? selectValue : undefined;
                  const selectedInTrigger = options?.find((opt) => opt.value === selectValue);
                  return (
                    <Select.Root
                      variant='borderless'
                      value={displayValue}
                      onValueChange={(newValue) => {
                        field.onChange(newValue);
                        onValueChange(newValue);
                      }}
                      size='xsmall'
                    >
                      <Select.Trigger className='w-full' hasError={Boolean(error) || showHint}>
                        {hasValue && showBadge ? (
                          <div className='flex items-center gap-2'>
                            <StatusColorPill
                              value={selectedInTrigger?.label || selectedLabel}
                              color={selectedInTrigger?.color}
                            />
                          </div>
                        ) : (
                          <Select.Value placeholder='Select' />
                        )}
                      </Select.Trigger>
                      <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                        {options.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  );
                }}
              />
            ) : (
              <Controller
                name={fieldName}
                control={control}
                render={({ field }) => (
                  <Input.Root
                    variant='borderless'
                    hasError={Boolean(error) || showHint}
                    size='xsmall'
                  >
                    <Input.Wrapper>
                      <Input.Input
                        placeholder={placeholder}
                        value={field.value || value || ''}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          onValueChange(e.target.value);
                        }}
                      />
                      {affix && <Input.Affix>{affix}</Input.Affix>}
                    </Input.Wrapper>
                  </Input.Root>
                )}
              />
            )}
            {showHint && hintMessage && (
              <Hint.Root hasError className='w-full mt-1'>
                <Hint.Icon as={RiErrorWarningFill} />
                {hintMessage}
              </Hint.Root>
            )}
            {error && <ErrorText className='w-full mt-1'>{error.message}</ErrorText>}
          </div>
        </td>
      </tr>
    </>
  );
};

const CommonLeftCard = ({
  amenities,
  centerDetailData,
  centerName,
  onToggleAmenitySelection,
  onResetRestOfAmenities,
  onUpdateCenter,
  onRemoveSelectedAmenity,
  removedAmenities = [],
  fetchAmenities,
}) => {
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const canWrite = hasModulePermission(userSideBarPerm, 'Center', 'write');
  const [showRestOfAmenities, setShowRestOfAmenities] = useState(false);
  const [isEditingCenterName, setIsEditingCenterName] = useState(false);
  const [centerNameValue, setCenterNameValue] = useState(
    centerName || centerDetailData?.center_name || '',
  );
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressValue, setAddressValue] = useState(centerDetailData?.address || '');
  const [amenitiesInput, setAmenitiesInput] = useState(false);
  const [amenitiesInputValue, setAmenitiesInputValue] = useState('');

  const handleClose = () => {
    onResetRestOfAmenities?.();
    setShowRestOfAmenities(false);
  };

  const handleAddAmenity = async () => {
    if (!amenitiesInputValue.trim()) {
      showErrorToast('Please enter an amenity name.');
      return;
    }

    try {
      const response = await apiClient.post('/resource/Amenities?limit_page_length=999', {
        amenity_name: amenitiesInputValue,
      });

      if (response.exception) {
        showErrorToast('Amenity already exists.');
        return;
      }

      if (response.data) {
        showSuccessToast('Amenity added successfully.');

        // Get currently selected amenities before refreshing
        const selectedAmenityNames =
          centerDetailData?.amenity_details?.map((item) => item.amenity) || [];
        // Refresh amenities list while preserving selections
        if (fetchAmenities) {
          fetchAmenities(selectedAmenityNames);
        }
        // Reset input
        setAmenitiesInputValue('');
        setAmenitiesInput(false);
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.exception ||
        error?.message ||
        'Failed to add amenity. Please try again.';

      if (error.response?.status === 409) {
        showErrorToast('Amenity already exists.');
        return;
      }

      showErrorToast(error, { defaultMessage: 'Failed to add amenity. Please try again.' });
    }
  };

  useEffect(() => {
    setCenterNameValue(centerName || centerDetailData?.center_name || '');
  }, [centerName, centerDetailData?.center_name]);

  const {
    control,
    formState: { errors },
    setValue,
  } = useForm({
    defaultValues: {
      carpet_area: centerDetailData?.carpet_area || '',
      status: centerDetailData?.status || 'Active',
      zone: centerDetailData?.zone || '',
      city: centerDetailData?.city || '',
      state: centerDetailData?.state || '',
      microMarket: centerDetailData?.micro_market || '',
      pincode: centerDetailData?.pin_code || '',
    },
  });

  // Local state for form values
  const [carpetArea, setCarpetArea] = useState(centerDetailData?.carpet_area || '');
  const [status, setStatus] = useState(normalizeStatus(centerDetailData?.status) || 'Active');
  const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]);
  const [zone, setZone] = useState(centerDetailData?.zone || '');
  const [city, setCity] = useState(centerDetailData?.city || '');
  const [state, setState] = useState(centerDetailData?.state || '');
  const [microMarket, setMicroMarket] = useState(centerDetailData?.micro_market || '');
  const [pincode, setPincode] = useState(centerDetailData?.pin_code || '');

  // Sync form values when centerDetailData changes
  useEffect(() => {
    if (centerDetailData) {
      setCarpetArea(centerDetailData?.carpet_area || '');
      setStatus(normalizeStatus(centerDetailData?.status) || 'Active');
      setZone(centerDetailData?.zone || '');
      setCity(centerDetailData?.city || '');
      setState(centerDetailData?.state || '');
      setMicroMarket(centerDetailData?.micro_market || '');
      setPincode(centerDetailData?.pin_code || '');
      setAddressValue(centerDetailData?.address || '');

      setValue('carpet_area', centerDetailData?.carpet_area || '');
      setValue('status', normalizeStatus(centerDetailData?.status) || 'Active');
      setValue('zone', centerDetailData?.zone || '');
      setValue('city', centerDetailData?.city || '');
      setValue('state', centerDetailData?.state || '');
      setValue('microMarket', centerDetailData?.micro_market || '');
      setValue('pincode', centerDetailData?.pin_code || '');
    }
  }, [centerDetailData, setValue]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opts = await getStatusOptions({ doctype: 'Center', field: 'status' });
        if (!cancelled) {
          setDynamicStatusOptions(
            (Array.isArray(opts) ? opts : []).map((o) => ({
              value: o.value,
              label: o.label || o.value,
              color: o.color,
            })),
          );
        }
      } catch {
        if (!cancelled) setDynamicStatusOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Get all state options from country-state-city library - sorted alphabetically
  const allStateOptions = useMemo(() => {
    const indianStates = State.getStatesOfCountry('IN');
    return indianStates
      .map((stateItem) => ({
        value: stateItem.name,
        label: stateItem.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Get all city options filtered by selected state - sorted alphabetically
  const cityOptions = useMemo(() => {
    if (!state) return [];

    // Get state ISO code from state name
    const stateIsoCode = getStateIsoCode(state);
    if (!stateIsoCode) return [];

    // Get cities for the selected state
    const citiesInState = City.getCitiesOfState('IN', stateIsoCode);

    return citiesInState
      .map((city) => ({
        value: city.name,
        label: city.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [state]);

  // Handle zone change - no clearing of state or city
  const handleZoneChange = (value) => {
    setZone(value);
    setValue('zone', value);
    onUpdateCenter?.({ zone: value });
  };

  // Handle state change - clear city
  const handleStateChange = (value) => {
    setState(value);
    setValue('state', value);
    // Clear city when state changes
    setCity('');
    setValue('city', '');
    // Update parent/backend about the city change (cleared) and state change
    onUpdateCenter?.({ state: value, city: '' });
  };

  const centerDetailsConfigs = [
    {
      id: 'carpet_area',
      fieldName: 'carpet_area',
      label: 'Carpet Area',
      value: carpetArea,
      Icon: RiRuler2Line,
      onValueChange: (value) => {
        // Only allow numeric values for carpet_area
        // Check if input contains non-numeric characters
        const hasNonNumeric = /\D/.test(value);

        // Show toast error if non-numeric characters are detected
        if (hasNonNumeric) {
          showErrorToast('Carpet area only accepts numeric values.');
        }

        // Remove all non-numeric characters
        const numericValue = value.replaceAll(/\D/g, '');

        setCarpetArea(numericValue);
        setValue('carpet_area', numericValue);
        onUpdateCenter?.({ carpet_area: numericValue });
      },
      type: 'input',
      placeholder: 'Enter carpet area',
      required: false,
      affix: 'sq.ft',
    },
    {
      id: 'status',
      fieldName: 'status',
      label: 'Status',
      value: status,
      Icon: RiPriceTag3Line,
      onValueChange: (value) => {
        setStatus(value);
        setValue('status', value);
        onUpdateCenter?.({ status: value });
      },
      type: 'select',
      options:
        dynamicStatusOptions.length > 0
          ? dynamicStatusOptions
          : [{ value: status || 'Active', label: status || 'Active' }],
      required: false,
      showBadge: true,
    },
    {
      id: 'zone',
      fieldName: 'zone',
      label: 'Zone',
      value: zone,
      Icon: RiMap2Line,
      onValueChange: handleZoneChange,
      type: 'select',
      options: [
        { value: 'Zone 1', label: 'Zone 1' },
        { value: 'Zone 2', label: 'Zone 2' },
        { value: 'Zone 3', label: 'Zone 3' },
        { value: 'Zone 4', label: 'Zone 4' },
      ],
      required: false,
    },
    {
      id: 'state',
      fieldName: 'state',
      label: 'State',
      value: state,
      Icon: RiGovernmentLine,
      onValueChange: handleStateChange,
      type: 'select',
      options: allStateOptions,
      required: false,
    },
    {
      id: 'city',
      fieldName: 'city',
      label: 'City',
      value: city,
      Icon: RiMapPin2Line,
      onValueChange: (value) => {
        setCity(value);
        setValue('city', value);
        // Pass state along with city to ensure correct state is saved if previous update was skipped
        onUpdateCenter?.({ city: value, state });
      },
      type: 'select',
      options: cityOptions,
      required: false,
    },
    {
      id: 'microMarket',
      fieldName: 'microMarket',
      label: 'Micro Market',
      value: microMarket,
      Icon: RiCommunityLine,
      onValueChange: (value) => {
        setMicroMarket(value);
        setValue('microMarket', value);
        onUpdateCenter?.({ micro_market: value });
      },
      type: 'input',
      placeholder: 'Enter micro market',
      required: false,
    },
    {
      id: 'pincode',
      fieldName: 'pincode',
      label: 'Pin Code',
      value: pincode,
      Icon: RiMailLine,
      onValueChange: (value) => {
        setPincode(value);
        setValue('pincode', value);
        onUpdateCenter?.({ pin_code: value });
      },
      type: 'input',
      placeholder: 'Enter pin code',
      required: false,
    },
  ];

  return (
    <div className='w-[420px] flex-shrink-0 h-full px-6 py-5  border-r border-stroke-soft-200 flex flex-col  overflow-y-auto items-start justify-start'>
      <div className='w-full flex items-center justify-between gap-2'>
        {isEditingCenterName && canWrite ? (
          <Input.Root size='small' className='w-full'>
            <Input.Wrapper>
              <Input.Input
                type='text'
                placeholder='Enter center name'
                value={centerNameValue}
                onChange={(e) => setCenterNameValue(e.target.value)}
                onBlur={() => {
                  setIsEditingCenterName(false);
                  const trimmed = centerNameValue?.trim();
                  if (trimmed && trimmed !== centerName) {
                    onUpdateCenter?.({ center_name: trimmed });
                  }
                }}
                autoFocus
              />
            </Input.Wrapper>
          </Input.Root>
        ) : (
          <>
            <span className='title-h5 text-[var(--color-text-main-900)]'>
              {centerNameValue || centerName || 'Center'}
            </span>
            {canWrite && (
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className='h-7 w-7'
                onClick={() => {
                  setIsEditingCenterName(true);
                  setCenterNameValue(centerNameValue || centerName || '');
                }}
              >
                <Button.Icon className='text-text-sub-500' as={RiPencilLine} />
              </Button.Root>
            )}
          </>
        )}
      </div>

      <div className='w-full border border-stroke-soft-200 mt-4 mb-6 rounded-lg'>
        <table className='w-full border-collapse table-fixed'>
          <tbody>
            {centerDetailsConfigs.map((config, index) => (
              <BasicInfoRow
                key={config.id}
                label={config.label}
                value={config.value}
                Icon={config.Icon}
                onValueChange={config.onValueChange}
                type={config.type}
                options={config.options}
                placeholder={config.placeholder}
                required={config.required}
                showBadge={config.showBadge}
                isLast={index === centerDetailsConfigs.length - 1}
                error={errors[config.fieldName]}
                fieldName={config.fieldName}
                control={control}
                affix={config.affix}
                disabled={!canWrite}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* <div className='w-full flex flex-col'>

      </div> */}

      {/*Amenities */}
      <div className='w-full label-small flex items-center   justify-between gap-2 text-[var(--color-text-sub-500)]'>
        <div className='w-full pb-3 gap-2 flex items-center'>
          <RiToolsLine size={20} />
          <span className='label-medium'>Amenities</span>
        </div>

        {showRestOfAmenities && (
          <div className='w-full flex  items-center justify-end pb-3 gap-2'>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='xsmall'
              className='h-7 w-7'
              onClick={handleClose}
            >
              <Button.Icon className='text-red-500' as={RiCloseLine} />
            </Button.Root>

            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              className='h-7 w-7'
              onClick={() => {
                onUpdateCenter?.({});
                setShowRestOfAmenities(false);
              }}
            >
              <Button.Icon className='text-green-500' as={RiCheckLine} />
            </Button.Root>
          </div>
        )}
      </div>

      <div className='w-full items-center  flex flex-row flex-wrap gap-2'>
        {/* Show selected amenities from centerDetailData - editable when in edit mode */}
        {centerDetailData?.amenity_details
          ?.filter((amenity) => {
            // When in edit mode, hide removed amenities visually (they'll be removed on save)
            if (showRestOfAmenities) {
              // In edit mode, we can show all but mark removed ones differently, or hide them
              // For now, show all and let user click to remove
              return true;
            }
            return true; // Always show in view mode
          })
          .map((amenity) => {
            const isRemoved = showRestOfAmenities && removedAmenities.includes(amenity.amenity);
            return (
              <Tag.Root
                key={amenity.amenity}
                variant='filled'
                className={`${showRestOfAmenities && canWrite ? 'cursor-pointer' : ''} ${
                  isRemoved
                    ? 'ring-stroke-soft-200'
                    : 'ring-[var(--color-primary-light)] bg-[var(--color-primary-lighter)]'
                }`}
                onClick={
                  showRestOfAmenities && canWrite
                    ? () => onRemoveSelectedAmenity?.(amenity.amenity)
                    : undefined
                }
              >
                {amenity.amenity.charAt(0).toUpperCase() +
                  amenity.amenity.slice(1).replaceAll('-', ' ')}
              </Tag.Root>
            );
          })}

        {/* Show rest of amenities when toggled */}
        {showRestOfAmenities &&
          amenities.map((amenity) => (
            <Tag.Root
              className={`${canWrite ? 'cursor-pointer' : ''} ${
                amenity.selected
                  ? 'ring-[var(--color-primary-light)] bg-[var(--color-primary-lighter)]'
                  : ''
              } paragraph-xsmall`}
              key={amenity.name}
              variant={amenity.selected ? 'filled' : 'stroke'}
              onClick={canWrite ? () => onToggleAmenitySelection?.(amenity.name) : undefined}
            >
              {amenity.name.charAt(0).toUpperCase() + amenity.name.slice(1).replaceAll('-', ' ')}
            </Tag.Root>
          ))}

        {!showRestOfAmenities && canWrite && (
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className='h-7 w-7'
            onClick={() => setShowRestOfAmenities(!showRestOfAmenities)}
          >
            <Button.Icon className='text-text-sub-500' as={RiPencilLine} />
          </Button.Root>
        )}
      </div>

      {showRestOfAmenities && canWrite && (
        <div className='w-full mt-2'>
          {amenitiesInput ? (
            <div className='w-full flex items-center gap-4'>
              <Input.Root className='flex-1'>
                <Input.Wrapper>
                  <Input.Input
                    placeholder='Enter amenity'
                    value={amenitiesInputValue}
                    onChange={(e) => setAmenitiesInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddAmenity();
                      }
                    }}
                  />
                </Input.Wrapper>
              </Input.Root>

              <Button.Root
                onClick={() => {
                  setAmenitiesInput(false);
                  setAmenitiesInputValue('');
                }}
                variant='neutral'
                mode='stroke'
                size='small'
                className=''
              >
                <Button.Icon className='text-red-500' as={RiCloseLine} />
              </Button.Root>

              <Button.Root
                onClick={handleAddAmenity}
                variant='neutral'
                mode='stroke'
                size='small'
                className=''
              >
                <Button.Icon className='text-green-500' as={RiCheckLine} />
              </Button.Root>
            </div>
          ) : (
            <LinkButton.Root
              onClick={() => setAmenitiesInput(true)}
              variant='primary'
              size='small'
              className='w-full label-xsmall items-start justify-start'
            >
              <LinkButton.Icon as={RiAddLine} />
              Add New Amenity
            </LinkButton.Root>
          )}
        </div>
      )}

      <div className='label-small flex items-center pt-6 justify-between gap-1 text-[var(--color-text-sub-500)]'>
        <div className='flex items-center pb-3 gap-2 items-center'>
          <RiMapPin2Line size={20} />
          <span className='label-medium'>Address</span>
        </div>
      </div>

      {isEditingAddress && canWrite ? (
        <Textarea.Root
          size='medium'
          simple
          className='w-full mb-6 min-h-[80px]'
          placeholder='Enter address'
          value={addressValue}
          onChange={(e) => setAddressValue(e.target.value)}
          onBlur={() => {
            setIsEditingAddress(false);
            if (addressValue !== centerDetailData?.address) {
              onUpdateCenter?.({ address: addressValue, address_place: null });
            }
          }}
          autoFocus
          rows={3}
          style={{ minHeight: '80px', height: 'auto' }}
        />
      ) : (
        <div className='w-full flex  items-center justify-between gap-2 pb-6'>
          <span className='paragraph-small break-all text-[var(--color-text-main-900)]'>
            {centerDetailData?.address || 'No address'}
          </span>
          {!isEditingAddress && canWrite && (
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='xsmall'
              className='h-7 w-7'
              onClick={() => {
                setIsEditingAddress(true);
                setAddressValue(centerDetailData?.address || '');
              }}
            >
              <Button.Icon className='text-text-sub-500' as={RiPencilLine} />
            </Button.Root>
          )}
        </div>
      )}

      <div className='w-full'>
        <AddressMap
          address={addressValue}
          coordinates={getCoordinatesFromAddressPlace(centerDetailData?.address_place)}
          onAddressChange={(newAddress, coords) => {
            setAddressValue(newAddress);
            if (!canWrite) return;
            if (coords) {
              const prev = parseAddressPlace(centerDetailData?.address_place);
              onUpdateCenter?.({
                address: newAddress,
                address_place: {
                  ...prev,
                  place_id: null,
                  lat: coords.lat,
                  lng: coords.lng,
                  formatted_address: newAddress,
                },
              });
            } else {
              onUpdateCenter?.({ address: newAddress });
            }
          }}
          onCoordinatesChange={() => {}}
          disabled={!canWrite}
          showInput={false}
        />
      </div>
    </div>
  );
};

const RightCard = ({ centerId }) => {
  const [activeTab, setActiveTab] = useState('space');
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const canReadLandlord = hasModulePermission(userSideBarPerm, 'Landlord', 'read');

  const tabOptions = useMemo(() => {
    const allTabs = [
      { value: 'space', label: 'Spaces', Icon: RiBox3Line },
      { value: 'compliance-documents', label: 'Documents ', Icon: RiFile2Line },
      { value: 'team-associated', label: 'Team ', Icon: RiGroupLine },
      { value: 'landlord-details', label: 'Landlord', Icon: RiUser2Line },
      { value: 'floors', label: 'Floors', Icon: RiLayoutGridLine },
    ];
    // Filter out landlord-details tab if user doesn't have read permission
    return canReadLandlord ? allTabs : allTabs.filter((tab) => tab.value !== 'landlord-details');
  }, [canReadLandlord]);

  // If activeTab is 'landlord-details' but user doesn't have permission, switch to first available tab
  useEffect(() => {
    if (activeTab === 'landlord-details' && !canReadLandlord) {
      setActiveTab(tabOptions[0]?.value || 'space');
    }
  }, [activeTab, canReadLandlord, tabOptions]);

  return (
    <div className='w-full flex-1 overflow-auto h-full gap-4  flex flex-col items-start justify-start'>
      <TabMenuHorizontal.Root
        className='w-full h-full flex flex-col'
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabMenuHorizontal.List wrapperClassName='w-full flex-shrink-0'>
          {tabOptions.map((tab) => (
            <TabMenuHorizontal.Trigger
              key={tab.value}
              value={tab.value}
              className='paragraph-large ml-4 text-[var(--color-text-sub-500)]  data-[state=active]:text-[var(--color-text-main-900)]'
            >
              <span className='group-data-[state=active]/tab-item:text-[var(--color-primary-base)]'>
                {<tab.Icon size={20} />}
              </span>
              <span className='label-small'>{tab.label}</span>
            </TabMenuHorizontal.Trigger>
          ))}
        </TabMenuHorizontal.List>
        <TabMenuHorizontal.Content className='w-full h-full overflow-y-auto' value={activeTab}>
          {activeTab === 'floors' && <CenterViewFloor />}
          {activeTab === 'landlord-details' && canReadLandlord && <CenterViewLandlord />}
          {activeTab === 'team-associated' && <CenterViewTeamAssociated centerId={centerId} />}
          {activeTab === 'compliance-documents' && <CenterViewComplianceDocument />}
          {activeTab === 'space' && <CenterViewSpace />}
        </TabMenuHorizontal.Content>
      </TabMenuHorizontal.Root>
    </div>
  );
};

const CenterViewDrawer = ({ open, onOpenChange, center, side = 'right' }) => {
  const [activeTab, setActiveTab] = useState('about-center');
  const [showAI, setShowAI] = useState(false);
  const dispatch = useDispatch();

  const [amenities, setAmenities] = useState([]);

  const fetchAmenities = useCallback(async (selectedAmenityNames = []) => {
    try {
      const response = await apiClient.get('/resource/Amenities?limit=100');

      if (response.data) {
        // Map to add selected property for each amenity, preserving selections if provided
        const amenitiesWithSelection = (response.data.data || response.data || []).map(
          (amenity) => ({
            name: amenity.name,
            selected: selectedAmenityNames.includes(amenity.name),
          }),
        );
        setAmenities(amenitiesWithSelection);
      }
    } catch {
      // Handle error silently or show toast notification
    }
  }, []);

  const {
    data: centerDetails,
    isLoading,
    error,
  } = useSelector((state) => state.center.centerDetails);

  // Prefer the latest name from `centerDetails`, fall back to the prop
  const centerName = centerDetails?.center_name || center?.center_name;

  // Get the list of selected amenity names from centerDetails
  const selectedAmenityNames = useMemo(
    () => centerDetails?.amenity_details?.map((item) => item.amenity) || [],
    [centerDetails?.amenity_details],
  );
  // Filter amenities to only include those not already selected
  const restOfAmenities = amenities.filter((item) => !selectedAmenityNames.includes(item.name));

  // Track removed amenities (already selected ones that user wants to remove)
  const [removedAmenities, setRemovedAmenities] = useState([]);

  // Reset removed amenities when drawer closes or centerDetails changes
  useEffect(() => {
    if (!open) {
      setRemovedAmenities([]);
    }
  }, [open]);

  // Handle removing already selected amenity
  const handleRemoveSelectedAmenity = useCallback((amenityName) => {
    setRemovedAmenities((previous) => {
      if (previous.includes(amenityName)) {
        // If already in removed list, remove it (user changed mind)
        return previous.filter((name) => name !== amenityName);
      }
      // Add to removed list
      return [...previous, amenityName];
    });
  }, []);

  // Update center API call
  const handleUpdateCenter = useCallback(
    async (updatedFields) => {
      if (!centerDetails?.name) return;

      try {
        // Get currently selected amenities from rest of amenities
        const selectedFromRest = amenities
          .filter((item) => item.selected && !selectedAmenityNames.includes(item.name))
          .map((item) => item.name);

        // Get remaining selected amenities (original - removed + newly selected)
        const remainingSelected = selectedAmenityNames.filter(
          (name) => !removedAmenities.includes(name),
        );
        const allSelectedAmenities = [...remainingSelected, ...selectedFromRest];

        if (
          updatedFields &&
          Object.keys(updatedFields).length === 0 &&
          allSelectedAmenities.length === 0
        ) {
          showErrorToast('Please select at least one amenity');
          return;
        }

        const amenity_details = allSelectedAmenities.map((am) => ({
          amenity: am,
        }));

        const payload = {
          center_name: updatedFields?.center_name ?? centerDetails?.center_name,
          status: updatedFields?.status ?? centerDetails?.status,
          carpet_area: updatedFields?.carpet_area ?? centerDetails?.carpet_area,
          city: updatedFields?.city ?? centerDetails?.city,
          state: updatedFields?.state ?? centerDetails?.state,
          zone: updatedFields?.zone ?? centerDetails?.zone,
          micro_market: updatedFields?.micro_market ?? centerDetails?.micro_market,
          pin_code: updatedFields?.pin_code ?? centerDetails?.pin_code,
          address: updatedFields?.address ?? centerDetails?.address,
          address_place:
            updatedFields && Object.prototype.hasOwnProperty.call(updatedFields, 'address_place')
              ? updatedFields.address_place
              : centerDetails?.address_place,
          amenity_details,
          floor_details: updatedFields?.floor_details ?? (centerDetails?.floor_details || []),
        };

        // If city is not selected (empty), do not call update API
        if (!payload.city) return;

        await dispatch(updateCenterThunk({ center_id: centerDetails.name, payload })).unwrap();
        // Refresh center details to see latest changes
        await dispatch(getCenterDetailsThunk(centerDetails.name)).unwrap();
        // Reset removed amenities after successful update
        setRemovedAmenities([]);
      } catch (error) {
        console.error('Failed to update center:', error);
        showErrorToast(error, { defaultMessage: 'Failed to update center. Please try again.' });
      }
    },
    [centerDetails, amenities, selectedAmenityNames, removedAmenities, centerName, dispatch],
  );

  // Toggle amenity selection
  const handleToggleAmenitySelection = useCallback((amenityName) => {
    setAmenities((previousAmenities) =>
      previousAmenities.map((amenity) =>
        amenity.name === amenityName ? { ...amenity, selected: !amenity.selected } : amenity,
      ),
    );
  }, []);

  // Reset selected state for rest of amenities and removed amenities
  const handleResetRestOfAmenities = useCallback(() => {
    setAmenities((previousAmenities) =>
      previousAmenities.map((amenity) => {
        // Only reset if it's not in the selected amenities from centerDetails
        if (!selectedAmenityNames.includes(amenity.name)) {
          return { ...amenity, selected: false };
        }
        return amenity;
      }),
    );
    setRemovedAmenities([]);
  }, [selectedAmenityNames]);

  useEffect(() => {
    if (open) {
      const apiCall = async () => {
        const response = await dispatch(getCenterDetailsThunk(center?.name)).unwrap();
      };
      apiCall();
      fetchAmenities();
    }
  }, [open, dispatch, center?.name]);

  // Construct address from available fields if address is not directly available
  const address =
    centerDetails?.address ||
    center?.address ||
    [
      centerDetails?.micro_market || center?.micro_market,
      centerDetails?.city || center?.city,
      centerDetails?.state || center?.state,
    ]
      .filter(Boolean)
      .join(', ') ||
    'Address not available';

  // Show skeleton while loading
  if (isLoading && !centerDetails) {
    return <CenterViewDrawerSkeleton open={open} onOpenChange={onOpenChange} side={side} />;
  }

  return (
    <>
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Content side={side} className='max-w-[1200px]'>
          <Drawer.Header className='sticky top-0 z-10 bg-white' showCloseButton={false}>
            <div className='flex items-center p-3 justify-between w-full gap-2'>
              <button className='ai-trigger-btn' onClick={() => setShowAI(true)}>
                <Sparkles size={14} />
                Ask AI
              </button>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                onClick={() => onOpenChange(false)}
                className='shrink-0'
              >
                <Button.Icon as={RiCloseLine} className='shrink-0' />
              </Button.Root>
            </div>
          </Drawer.Header>

          <Drawer.Body className=' w-full min-h-0 '>
            <div className='w-full h-full flex'>
              <CommonLeftCard
                amenities={restOfAmenities}
                centerDetailData={centerDetails}
                centerName={centerName}
                onToggleAmenitySelection={handleToggleAmenitySelection}
                onResetRestOfAmenities={handleResetRestOfAmenities}
                onUpdateCenter={handleUpdateCenter}
                onRemoveSelectedAmenity={handleRemoveSelectedAmenity}
                removedAmenities={removedAmenities}
                fetchAmenities={fetchAmenities}
              />
              <RightCard centerId={center?.name || centerDetails?.name} />
            </div>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>

      {showAI && (
        <AICenterModal
          centerId={center?.name || centerDetails?.name}
          centerName={centerName}
          onClose={() => setShowAI(false)}
        />
      )}
    </>
  );
};

export default CenterViewDrawer;
