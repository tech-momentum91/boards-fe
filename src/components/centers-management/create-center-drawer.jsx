import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { capitalizeEachWordFirstLetter, cn } from '@/lib/utils';
import { toHasParkingFlag } from '@/api/floorDetail';
import {
  RiBuildingLine,
  RiCloseLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiAddLine,
  RiUserLine,
  RiPriceTag3Line,
  RiRuler2Line,
  RiMapPinLine,
  RiGovernmentLine,
  RiMap2Line,
  RiCommunityLine,
  RiMailLine,
  RiHomeLine,
  RiErrorWarningFill,
  RiContactsBookLine,
  RiEditLine,
  RiInformationLine,
} from 'react-icons/ri';
import { State, City } from 'country-state-city';
import { LoadScript, Autocomplete } from '@react-google-maps/api';

import * as Drawer from '@/components/ui/drawer';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as LinkButton from '@/components/ui/link-button';
import * as Label from '@/components/ui/label';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Table from '@/components/ui/table';
import * as Switch from '@/components/ui/switch';
import * as Textarea from '@/components/ui/textarea';
import * as Tooltip from '@/components/ui/tooltip';
import * as Hint from '@/components/ui/hint';
import * as Tag from '@/components/ui/tag';
import ErrorText from '@/components/ui/error-text';
import AddressMap from '@/components/ui/address-map';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { createCenterSchema } from '@/schemas/center-schemas';
import { useDispatch, useSelector } from 'react-redux';
import { createCenterThunk, getCenterListThunk, fetchCenterAccess } from '@/redux/centerSlice';
import apiClient from '@/api';
import { getStatusOptions } from '@/api/dynamic-status';
import { StatusColorPill } from '@/components/ui/status-color-pill';

// Helper to get state name from ISO code
const PARKING_TYPES = ['Non Stackable', 'Dual Stackable', 'Triple Stackable'];
const VEHICLE_TYPES = ['Four Wheeler', 'Four Wheeler EV', 'Two Wheeler', 'Two Wheeler EV'];
const ASSIGNMENT_TYPES = ['FCFS', 'Dedicated'];
const BLOCK_FLOOR_SEP = ' - ';

const formatBlockFloorLabel = (block, floor) => {
  const blockVal = String(block ?? '').trim();
  const floorVal = String(floor ?? '').trim();
  if (!blockVal || !floorVal) return floorVal || blockVal;
  return `${blockVal}${BLOCK_FLOOR_SEP}${floorVal}`;
};

const parseBlockFloorLabel = (label) => {
  const text = String(label ?? '').trim();
  const idx = text.indexOf(BLOCK_FLOOR_SEP);
  if (idx === -1) {
    return { block: '', floor: text };
  }
  return {
    block: text.slice(0, idx).trim(),
    floor: text.slice(idx + BLOCK_FLOOR_SEP.length).trim(),
  };
};

const buildParkingFloorOptions = (floorRows) => {
  const options = new Set();
  for (const row of floorRows || []) {
    if (toHasParkingFlag(row?.has_parking) !== 1) continue;
    const block = String(row?.block ?? '').trim();
    const floor = String(row?.floor ?? '').trim();
    if (!block || !floor) continue;
    options.add(formatBlockFloorLabel(block, floor));
  }
  return [...options].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
};

const ParkingSelectCell = ({ value, onChange, placeholder, options, disabled }) => (
  <Select.Root
    size='medium'
    variant='borderless'
    value={value || undefined}
    onValueChange={onChange}
    disabled={disabled}
  >
    <Select.Trigger className='w-full min-w-[100px] whitespace-nowrap' showArrow>
      <Select.Value placeholder={placeholder} />
    </Select.Trigger>
    <Select.Content className='min-w-[var(--radix-select-trigger-width)] w-max'>
      {(options || []).map((opt) => (
        <Select.Item key={opt} value={opt}>
          <span className='whitespace-nowrap'>{opt}</span>
        </Select.Item>
      ))}
    </Select.Content>
  </Select.Root>
);

const PerParkingRateInput = ({ value, onChange, readOnly }) => (
  <Input.Root variant='borderless' size='xsmall' className='w-full min-w-[80px] bg-transparent'>
    <Input.Wrapper>
      <Input.Input
        type='numeric'
        value={value ?? '0'}
        placeholder='0'
        min='0'
        readOnly={readOnly}
        onChange={(e) => {
          if (readOnly) return;
          const next = e.target.value;
          if (next === '' || (!Number.isNaN(next) && Number.parseFloat(next) >= 0)) {
            onChange(next);
          }
        }}
        className='text-paragraph-sm text-text-strong-950'
      />
    </Input.Wrapper>
  </Input.Root>
);

const emptyParkingRow = () => ({
  id: Date.now(),
  floor: '',
  vehicle_type: '',
  type: '',
  assigning_type: '',
  per_parking_rate: '0',
  parking_no: '',
});

const VISIBLE_PARKING_BADGE_COUNT = 2;

const parseParkingNumbers = (raw) =>
  String(raw || '')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

const toFloorDetailPayload = (row) => ({
  block: String(row?.block ?? '').trim(),
  floor: String(row?.floor ?? '').trim(),
  carpet_area: row?.carpet_area,
  floor_height: row?.floor_height,
  has_parking: toHasParkingFlag(row?.has_parking),
});

const toParkingDetailPayload = (row) => {
  const parking_numbers = parseParkingNumbers(row?.parking_no);
  const floorLabel = String(row?.floor ?? '').trim();
  const { block } = parseBlockFloorLabel(floorLabel);
  const assigningType = String(row?.assigning_type ?? '').trim();
  const rateRaw = String(row?.per_parking_rate ?? '').trim();
  const per_parking_rate = assigningType === 'FCFS' ? 0 : rateRaw === '' ? 0 : Number(rateRaw);
  return {
    block,
    floor: floorLabel,
    vehicle_type: String(row?.vehicle_type ?? '').trim(),
    parking_type: String(row?.type ?? '').trim(),
    type: String(row?.type ?? '').trim(),
    assigning_type: assigningType,
    per_parking_rate,
    expected_per_seat_rate: per_parking_rate,
    parking_no: parking_numbers.length > 0 ? JSON.stringify(parking_numbers) : '',
  };
};

const ParkingNumbersCell = ({ numbers }) => {
  const list = Array.isArray(numbers) ? numbers : [];
  if (list.length === 0) return <span className='text-text-soft-400'>—</span>;

  const shown = list.slice(0, VISIBLE_PARKING_BADGE_COUNT);
  const extra = list.slice(VISIBLE_PARKING_BADGE_COUNT);

  return (
    <div className='flex flex-nowrap items-center gap-2'>
      {shown.map((num, i) => (
        <Badge.Root
          key={`${String(num)}-${i}`}
          variant='lighter'
          color='gray'
          size='medium'
          className='shrink-0'
        >
          <span className='paragraph-small font-medium text-text-strong-950'>{num}</span>
        </Badge.Root>
      ))}
      {extra.length > 0 && (
        <Tooltip.Root delayDuration={200}>
          <Tooltip.Trigger asChild>
            <Badge.Root variant='lighter' color='gray' size='medium' className='shrink-0'>
              <span className='text-label-xs font-semibold text-text-strong-950'>
                +{extra.length}
              </span>
            </Badge.Root>
          </Tooltip.Trigger>
          <Tooltip.Content side='top' className='max-w-xs text-left' variant='light' size='small'>
            <div className='flex flex-col gap-1'>
              <span className='mb-1 text-paragraph-sm font-medium text-text-strong-950'>
                Additional parking numbers ({extra.length})
              </span>
              {extra.map((n, idx) => (
                <div key={idx} className='text-paragraph-sm text-text-sub-600'>
                  {n}
                </div>
              ))}
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      )}
    </div>
  );
};

const FloorHasParkingSwitch = ({ checked, disabled, onCheckedChange }) => (
  <Switch.Root
    checked={Boolean(checked)}
    disabled={disabled}
    className={cn(
      disabled &&
        Boolean(checked) &&
        '[&>div]:!bg-green-500 [&>div]:!ring-1 [&>div]:!ring-inset [&>div]:!ring-green-600/25',
    )}
    onCheckedChange={onCheckedChange}
  />
);

const getStateName = (isoCode) => {
  if (!isoCode) return '';
  const states = State.getStatesOfCountry('IN');
  const state = states.find((s) => s.isoCode === isoCode);
  return state?.name || isoCode;
};

const autoResizeTextarea = (event) => {
  const element = event.target;
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
};

// Address Autocomplete Component
const AddressAutocompleteInput = ({
  field,
  onValueChange,
  onPlaceResolved,
  placeholder,
  error,
  showHint,
  maxLength,
}) => {
  const autocompleteRef = useRef(null);

  const handlePlaceChanged = () => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    const loc = place?.geometry?.location;
    if (!loc) return;
    const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
    const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
    if (lat == null || lng == null) return;

    const name = place.name?.trim();
    const formatted = place.formatted_address?.trim();
    let addressValue = '';
    if (formatted && name) {
      addressValue = formatted.toLowerCase().includes(name.toLowerCase())
        ? formatted
        : `${name}, ${formatted}`;
    } else {
      addressValue = formatted || name || '';
    }
    if (!addressValue) return;

    field.onChange(addressValue);
    onValueChange(addressValue);
    onPlaceResolved?.({
      place_id: place.place_id ?? null,
      lat,
      lng,
      name: place.name ?? null,
      formatted_address: place.formatted_address ?? null,
    });
  };

  return (
    <LoadScript googleMapsApiKey='AIzaSyBNvZ3jB6Wm8wiguDxkrlM3qwJRJJ655oY' libraries={['places']}>
      <div
        className='w-full'
        style={{ position: 'relative', zIndex: 1000 }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Autocomplete
          onLoad={(ref) => {
            autocompleteRef.current = ref;
          }}
          onPlaceChanged={handlePlaceChanged}
          options={{
            fields: ['formatted_address', 'geometry', 'name', 'place_id'],
          }}
        >
          <Input.Root variant='borderless' hasError={Boolean(error) || showHint} size='xsmall'>
            <Input.Wrapper>
              <Input.Input
                placeholder={placeholder}
                value={field.value || ''}
                maxLength={maxLength}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  onValueChange(e.target.value);
                }}
                autoComplete='off'
                onClick={(e) => e.stopPropagation()}
              />
            </Input.Wrapper>
          </Input.Root>
        </Autocomplete>
      </div>
    </LoadScript>
  );
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
  hintMessage,
  showHint,
  maxLength,
  onPlaceResolved,
}) => {
  // Get the selected option label for badge display
  const selectedOption = options?.find((opt) => opt.value === value);
  const selectedLabel = selectedOption?.label || value;

  return (
    <>
      <tr className={isLast ? '' : 'border-b border-stroke-soft-200 '}>
        <td className='w-[180px] min-h-8 pl-3 pr-0 py-0 border-r border-stroke-soft-200'>
          <div className='flex h-full w-[180px] items-center gap-2 min-h-8'>
            {Icon && <Icon className='size-5 text-neutral-500' />}
            <div className='flex items-center label-small text-text-main-900'>
              <span>{label}</span>
              {required && <span className='text-[var(--color-text-soft-400)]'>*</span>}
            </div>
          </div>
        </td>
        <td className='min-h-8 pl-1.5 pr-1 pb-1 pt-1 border-l border-stroke-soft-200'>
          <div className='flex flex-col items-start justify-center w-full'>
            {type === 'select' ? (
              <Controller
                name={fieldName}
                control={control}
                render={({ field }) => (
                  <Select.Root
                    variant='borderless'
                    value={field.value || value}
                    onValueChange={(newValue) => {
                      field.onChange(newValue);
                      onValueChange(newValue);
                    }}
                    size='xsmall'
                  >
                    <Select.Trigger className='w-full' hasError={Boolean(error)}>
                      {field.value && showBadge ? (
                        <div className='flex items-center gap-2'>
                          <StatusColorPill value={selectedLabel} color={selectedOption?.color} />
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
                )}
              />
            ) : type === 'autocomplete' ? (
              <Controller
                name={fieldName}
                control={control}
                render={({ field }) => (
                  <AddressAutocompleteInput
                    field={field}
                    onValueChange={onValueChange}
                    onPlaceResolved={onPlaceResolved}
                    placeholder={placeholder}
                    error={error}
                    showHint={showHint}
                    maxLength={maxLength}
                  />
                )}
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
                        value={field.value || value}
                        maxLength={maxLength}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          onValueChange(e.target.value);
                        }}
                      />
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

const CreateCenterDrawer = ({ open, onOpenChange, side = 'right' }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(createCenterSchema),
    defaultValues: {
      centerName: '',
      status: 'Active',
      carpet_area: '',
      city: '',
      state: '',
      zone: '',
      microMarket: '',
      pincode: '',
      address: '',
    },
  });

  const dispatch = useDispatch();
  const { createCenterDrawer } = useSelector((state) => state.center);

  const [amenitiesInput, setAmenitiesInput] = useState(false);
  const [amenitiesInputValue, setAmenitiesInputValue] = useState('');
  /** Google Places snapshot (place_id, lat, lng, …) for exact map pin; optional on create. */
  const [addressPlace, setAddressPlace] = useState(null);
  const [centerAmenities, setCenterAmenities] = useState([]);
  const [showCarpetAreaHint, setShowCarpetAreaHint] = useState(false);
  const [showPincodeHint, setShowPincodeHint] = useState(false);
  const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]);

  // Watch form values
  const centerName = watch('centerName');
  const status = watch('status');
  const city = watch('city');
  const state = watch('state');
  const zone = watch('zone');
  const microMarket = watch('microMarket');
  const pincode = watch('pincode');
  const carpetArea = watch('carpet_area');
  const address = watch('address');

  const [floorDetails, setFloorDetails] = useState([]);
  const [showEditingRow, setShowEditingRow] = useState(false); // Default to false - only show when Add button is clicked
  const [editingFloorId, setEditingFloorId] = useState(null); // Track which floor is being edited (null = new floor)
  const [editingFloor, setEditingFloor] = useState({
    id: Date.now(),
    block: '',
    floor: '',
    carpet_area: '',
    floor_height: '',
    has_parking: false,
  });
  const [parkingDetails, setParkingDetails] = useState([]);
  const [showParkingEditingRow, setShowParkingEditingRow] = useState(false);
  const [editingParkingId, setEditingParkingId] = useState(null);
  const [editingParking, setEditingParking] = useState(emptyParkingRow);

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

  const fetchAmenities = useCallback(async (selectedAmenityNames = []) => {
    try {
      const response = await apiClient.get('/resource/Amenities?limit_page_length=999');

      if (response.data) {
        // Map to add selected property for each amenity, preserving selections if provided
        const amenitiesWithSelection = (response.data.data || response.data || []).map(
          (amenity) => ({
            name: amenity.name,
            selected: selectedAmenityNames.includes(amenity.name),
          }),
        );
        setCenterAmenities(amenitiesWithSelection);
      }
    } catch {
      // Handle error silently or show toast notification
    }
  }, []);

  // Fetch amenities when drawer opens and reset form/hints
  useEffect(() => {
    if (open) {
      fetchAmenities();
    }
    reset();
    setShowCarpetAreaHint(false);
    setAddressPlace(null);
    setFloorDetails([]);
    setShowPincodeHint(false);
    setShowEditingRow(false); // Don't show table by default
    setEditingFloorId(null);
    setEditingFloor({
      id: Date.now(),
      block: '',
      floor: '',
      carpet_area: '',
      floor_height: '',
      has_parking: false,
    });
    setParkingDetails([]);
    setShowParkingEditingRow(false);
    setEditingParkingId(null);
    setEditingParking(emptyParkingRow());
  }, [open, fetchAmenities, reset]);

  const handleAddFloorDetail = () => {
    // If there's a complete editing floor (new floor being added), save it first
    if (
      showEditingRow &&
      !editingFloorId &&
      editingFloor.block.trim() &&
      editingFloor.floor.trim() &&
      editingFloor.carpet_area.trim() &&
      editingFloor.floor_height.trim()
    ) {
      // Check for duplicate before saving
      const blockValue = String(editingFloor.block || '').trim();
      const floorValue = String(editingFloor.floor || '').trim();

      const duplicateExists = floorDetails.some((floor) => {
        const floorBlock = String(floor.block || '')
          .trim()
          .toLowerCase();
        const floorFloor = String(floor.floor || '')
          .trim()
          .toLowerCase();

        return floorBlock === blockValue.toLowerCase() && floorFloor === floorValue.toLowerCase();
      });

      if (duplicateExists) {
        showErrorToast(
          `Block-Floor combination of ${editingFloor.block} and ${editingFloor.floor} already exist`,
        );
        return;
      }

      // Save the current floor
      setFloorDetails([...floorDetails, { ...editingFloor }]);
    }

    // Show the editing row and reset for new floor
    setShowEditingRow(true);
    setEditingFloorId(null);
    setEditingFloor({
      id: Date.now(),
      block: '',
      floor: '',
      carpet_area: '',
      floor_height: '',
      has_parking: false,
    });
  };

  const handleEditFloorDetail = (floorDetail) => {
    // Populate editing floor with floor data and set editing ID
    // The row will become editable in place
    setEditingFloorId(floorDetail.id);
    setEditingFloor({ ...floorDetail });
  };

  const handleSaveFloor = () => {
    // Validate all fields are filled
    if (
      !editingFloor.block.trim() ||
      !editingFloor.floor.trim() ||
      !editingFloor.carpet_area.trim() ||
      !editingFloor.floor_height.trim()
    ) {
      return;
    }

    // Check for duplicate floor (same block and floor combination)
    // Exclude the current floor being edited from duplicate check
    const blockValue = String(editingFloor.block || '').trim();
    const floorValue = String(editingFloor.floor || '').trim();

    const duplicateExists = floorDetails.some((floor) => {
      // Skip the floor being edited when checking for duplicates
      if (editingFloorId && floor.id === editingFloorId) {
        return false;
      }

      const floorBlock = String(floor.block || '')
        .trim()
        .toLowerCase();
      const floorFloor = String(floor.floor || '')
        .trim()
        .toLowerCase();

      return floorBlock === blockValue.toLowerCase() && floorFloor === floorValue.toLowerCase();
    });

    if (duplicateExists) {
      showErrorToast(
        `Block-Floor combination of ${editingFloor.block} and ${editingFloor.floor} already exist`,
      );
      return;
    }

    if (editingFloorId) {
      // Update existing floor
      setFloorDetails(
        floorDetails.map((floor) => (floor.id === editingFloorId ? { ...editingFloor } : floor)),
      );
    } else {
      // Add new floor
      setFloorDetails([...floorDetails, { ...editingFloor }]);
    }

    // Reset editing floor and hide editing row
    setEditingFloorId(null);
    setEditingFloor({
      id: Date.now(),
      block: '',
      floor: '',
      carpet_area: '',
      floor_height: '',
      has_parking: false,
    });
    setShowEditingRow(false);
  };

  const handleCancelFloor = () => {
    // Reset editing floor and hide editing row
    setEditingFloorId(null);
    setEditingFloor({
      id: Date.now(),
      block: '',
      floor: '',
      carpet_area: '',
      floor_height: '',
      has_parking: false,
    });
    setShowEditingRow(false);
  };

  const handleDeleteFloorDetail = (id) => {
    setFloorDetails(floorDetails.filter((f) => f.id !== id));
  };

  const handleEditingFloorChange = (field, value) => {
    // Allow numeric, decimal, and comma values for carpet_area and floor_height
    if (field === 'carpet_area' || field === 'floor_height') {
      // Allow digits, decimal point, comma, and empty string
      // Remove any characters that are not digits, decimal point, or comma
      let cleanedValue = value.replaceAll(/[^\d,.]/g, '');

      // Ensure only one decimal point
      const parts = cleanedValue.split('.');
      if (parts.length > 2) {
        cleanedValue = `${parts[0]}.${parts.slice(1).join('')}`;
      }

      setEditingFloor({ ...editingFloor, [field]: cleanedValue });
    } else {
      setEditingFloor({ ...editingFloor, [field]: value });
    }
  };

  // Check if all fields in editing floor are filled
  const isEditingFloorComplete =
    editingFloor.block.trim() &&
    editingFloor.floor.trim() &&
    editingFloor.carpet_area.trim() &&
    editingFloor.floor_height.trim();

  const parkingFloorOptions = useMemo(() => {
    const rows = [...floorDetails];
    if (
      showEditingRow &&
      !editingFloorId &&
      editingFloor.block.trim() &&
      editingFloor.floor.trim() &&
      toHasParkingFlag(editingFloor.has_parking) === 1
    ) {
      rows.push(editingFloor);
    }
    return buildParkingFloorOptions(rows);
  }, [floorDetails, showEditingRow, editingFloorId, editingFloor]);

  const handleAddParkingDetail = () => {
    if (parkingFloorOptions.length === 0) {
      showErrorToast('Add at least one floor for parking.');
      return;
    }
    if (
      showParkingEditingRow &&
      !editingParkingId &&
      editingParking.floor.trim() &&
      editingParking.vehicle_type.trim() &&
      editingParking.type.trim() &&
      editingParking.assigning_type.trim() &&
      editingParking.parking_no.trim()
    ) {
      setParkingDetails([...parkingDetails, { ...editingParking }]);
    }

    setShowParkingEditingRow(true);
    setEditingParkingId(null);
    setEditingParking(emptyParkingRow());
  };

  const handleEditParkingDetail = (parkingDetail) => {
    setEditingParkingId(parkingDetail.id);
    setEditingParking({ ...parkingDetail });
  };

  const handleSaveParking = () => {
    if (
      !editingParking.floor.trim() ||
      !editingParking.vehicle_type.trim() ||
      !editingParking.type.trim() ||
      !editingParking.assigning_type.trim() ||
      !editingParking.parking_no.trim()
    ) {
      return;
    }

    if (editingParkingId) {
      setParkingDetails(
        parkingDetails.map((parking) =>
          parking.id === editingParkingId ? { ...editingParking } : parking,
        ),
      );
    } else {
      setParkingDetails([...parkingDetails, { ...editingParking }]);
    }

    setEditingParkingId(null);
    setEditingParking(emptyParkingRow());
    setShowParkingEditingRow(false);
  };

  const handleCancelParking = () => {
    setEditingParkingId(null);
    setEditingParking(emptyParkingRow());
    setShowParkingEditingRow(false);
  };

  const handleDeleteParkingDetail = (id) => {
    setParkingDetails(parkingDetails.filter((parking) => parking.id !== id));
  };

  const handleEditingParkingChange = (field, value) => {
    setEditingParking((prev) => {
      if (field === 'assigning_type' && value === 'FCFS') {
        return { ...prev, assigning_type: value, per_parking_rate: '0' };
      }
      return { ...prev, [field]: value };
    });
  };

  const isEditingParkingComplete =
    editingParking.floor.trim() &&
    editingParking.vehicle_type.trim() &&
    editingParking.type.trim() &&
    editingParking.assigning_type.trim() &&
    editingParking.parking_no.trim();

  const parkingFloorForInfo =
    parseBlockFloorLabel(editingParking.floor).floor || editingParking.floor?.trim() || 'Floor';
  const parkingNumberInfoMessage = `Parking no. formate (${parkingFloorForInfo}-1,${parkingFloorForInfo}-2,${parkingFloorForInfo}-3...)`;

  const handleAmenityChange = (value) => {
    setCenterAmenities((previous) =>
      previous.map((item) => (item.name === value ? { ...item, selected: !item.selected } : item)),
    );
  };

  const handleRemoveAmenity = (value) => {
    setCenterAmenities((previous) =>
      previous.map((item) => (item.name === value ? { ...item, selected: false } : item)),
    );
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

        // Save currently selected amenities before refreshing
        const selectedAmenityNames = centerAmenities
          .filter((item) => item.selected)
          .map((item) => item.name);
        // Refresh amenities list while preserving selections
        fetchAmenities(selectedAmenityNames);
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.exception ||
        error?.message ||
        'Failed to add amenity. Please try again.';

      if (error.response.status === 409) {
        showErrorToast('Amenity already exists.');
        return;
      }

      showErrorToast(error, { defaultMessage: 'Failed to add amenity. Please try again.' });
    } finally {
      setAmenitiesInput(false);
      setAmenitiesInputValue('');
    }
  };

  const handleClear = () => {
    reset({
      centerName: '',
      status: 'Active',
      carpet_area: '',
      city: '',
      state: '',
      zone: '',
      microMarket: '',
      pincode: '',
      address: '',
    });
    setAddressPlace(null);
    setFloorDetails([]);
    setShowEditingRow(false); // Don't show table by default
    setEditingFloorId(null);
    setEditingFloor({
      id: Date.now(),
      block: '',
      floor: '',
      carpet_area: '',
      floor_height: '',
      has_parking: false,
    });
    setParkingDetails([]);
    setShowParkingEditingRow(false);
    setEditingParkingId(null);
    setEditingParking(emptyParkingRow());
    setShowCarpetAreaHint(false);
    setShowPincodeHint(false);
  };

  const onSubmit = async (data) => {
    const selectedAmenities = centerAmenities
      .filter((item) => item.selected)
      .map((item) => item.name);

    // Validate that at least one amenity is selected
    if (selectedAmenities.length === 0) {
      showErrorToast('Please select at least one amenity');
      return;
    }

    const amenity_details =
      selectedAmenities?.map((am) => ({
        amenity: am,
      })) || [];

    // Check if editingFloor has all fields filled and include it in payload if so
    const finalFloorDetails = [...floorDetails];
    if (
      editingFloor.block.trim() &&
      editingFloor.floor.trim() &&
      editingFloor.carpet_area.trim() &&
      editingFloor.floor_height.trim()
    ) {
      // Check for duplicate before adding (same block and floor combination)
      const blockValue = String(editingFloor.block || '').trim();
      const floorValue = String(editingFloor.floor || '').trim();

      const duplicateExists = floorDetails.some((floor) => {
        // Skip the floor being edited when checking for duplicates
        if (editingFloorId && floor.id === editingFloorId) {
          return false;
        }

        const floorBlock = String(floor.block || '')
          .trim()
          .toLowerCase();
        const floorFloor = String(floor.floor || '')
          .trim()
          .toLowerCase();

        return floorBlock === blockValue.toLowerCase() && floorFloor === floorValue.toLowerCase();
      });

      if (duplicateExists) {
        showErrorToast(
          `Block-Floor combination of ${editingFloor.block} and ${editingFloor.floor} already exist`,
        );
        return;
      }

      finalFloorDetails.push({ ...editingFloor });
    }
    const newName = capitalizeEachWordFirstLetter(data.centerName);

    const finalParkingDetails = [...parkingDetails];
    if (
      editingParking.floor.trim() &&
      editingParking.vehicle_type.trim() &&
      editingParking.type.trim() &&
      editingParking.assigning_type.trim() &&
      editingParking.parking_no.trim()
    ) {
      finalParkingDetails.push({ ...editingParking });
    }

    const payload = {
      center_name: newName,
      status: data.status,
      carpet_area: data.carpet_area,
      city: data.city,
      state: getStateName(data.state),
      zone: data.zone,
      micro_market: data.microMarket,
      pin_code: data.pincode,
      address: data.address,
      amenity_details,
      floor_details: finalFloorDetails.map(toFloorDetailPayload),
      parking_details: finalParkingDetails.map(toParkingDetailPayload),
    };
    if (addressPlace) {
      payload.address_place = addressPlace;
    }

    try {
      const response = await dispatch(createCenterThunk(payload)).unwrap();

      const res2 = dispatch(fetchCenterAccess({ silent: true })).unwrap();
      // Refresh the centers list to show the newly created center
      const res1 = await dispatch(getCenterListThunk({ keyword: '', filters: [] })).unwrap();

      showSuccessToast('Center created successfully.');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to create center. Please try again.' });
    }

    // Reset all form fields
    handleClear();
    onOpenChange?.(false);
  };

  const handleCreate = handleSubmit(onSubmit);

  const handleSaveAsDraft = () => {
    showSuccessToast('Center saved as draft successfully.');
    // Don't reset fields when saving as draft
    onOpenChange?.(false);
  };

  // Basic Information configurations
  const basicInfoConfigs = [
    {
      id: 'centerName',
      fieldName: 'centerName',
      label: 'Center Name',
      value: centerName,
      Icon: RiUserLine,
      onValueChange: (value) => {
        setValue('centerName', value);
      },
      type: 'input',
      placeholder: 'Enter center name',
      options: [
        { value: 'downtown-center', label: 'Downtown Center' },
        { value: 'business-park-center', label: 'Business Park Center' },
        { value: 'tech-hub-center', label: 'Tech Hub Center' },
        { value: 'corporate-plaza', label: 'Corporate Plaza' },
        { value: 'innovation-tower', label: 'Innovation Tower' },
      ],
      required: true,
    },
    {
      id: 'status',
      fieldName: 'status',
      label: 'Status',
      value: status,
      Icon: RiPriceTag3Line,
      onValueChange: (value) => {
        setValue('status', value);
      },
      type: 'select',
      options:
        dynamicStatusOptions.length > 0
          ? dynamicStatusOptions
          : [{ value: status || 'Active', label: status || 'Active' }],
      required: true,
      showBadge: true,
    },
    {
      id: 'carpet_area',
      fieldName: 'carpet_area',
      label: 'Carpet Area (sq.ft)',
      value: carpetArea,
      Icon: RiRuler2Line,
      onValueChange: (value) => {
        // Check if input contains non-numeric characters
        const hasNonNumeric = /\D/.test(value);
        setShowCarpetAreaHint(hasNonNumeric);

        // Only allow numeric characters
        const numericValue = value.replaceAll(/\D/g, '');
        setValue('carpet_area', numericValue);
      },
      type: 'input',
      placeholder: 'Enter carpet area',
      required: true,
      hintMessage: 'Only numeric values are allowed',
      showHint: showCarpetAreaHint,
    },
  ];

  // Get all state options from country-state-city library - sorted alphabetically
  const allStateOptions = useMemo(() => {
    const indianStates = State.getStatesOfCountry('IN');
    return indianStates
      .map((state) => ({
        value: state.isoCode,
        label: state.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Get all city options filtered by selected state - sorted alphabetically
  const cityOptions = useMemo(() => {
    if (!state) return [];

    const cities = City.getCitiesOfState('IN', state);
    return cities
      .map((city) => ({
        value: city.name,
        label: city.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [state]);

  // Handle zone change - no clearing of state or city
  const handleZoneChange = (value) => {
    setValue('zone', value);
  };

  // Handle state change - clear city
  const handleStateChange = (value) => {
    setValue('state', value);
    // Clear city when state changes
    setValue('city', '');
  };

  // Location Details configurations
  const locationDetailsConfigs = [
    {
      id: 'zone',
      fieldName: 'zone',
      label: 'Zone',
      value: zone,
      Icon: RiPriceTag3Line,
      onValueChange: handleZoneChange,
      type: 'select',
      options: [
        { value: 'Zone 1', label: 'Zone 1' },
        { value: 'Zone 2', label: 'Zone 2' },
        { value: 'Zone 3', label: 'Zone 3' },
        { value: 'Zone 4', label: 'Zone 4' },
        { value: 'Zone 5', label: 'Zone 5' },
        { value: 'Zone 6', label: 'Zone 6' },
      ],
      required: true,
    },
    {
      id: 'state',
      fieldName: 'state',
      label: 'State',
      value: state,
      Icon: RiPriceTag3Line,
      onValueChange: handleStateChange,
      type: 'select',
      options: allStateOptions,
      required: true,
    },
    {
      id: 'city',
      fieldName: 'city',
      label: 'City',
      value: city,
      Icon: RiPriceTag3Line,
      onValueChange: (value) => {
        setValue('city', value);
      },
      type: 'select',
      options: cityOptions,
      required: true,
    },
    {
      id: 'microMarket',
      fieldName: 'microMarket',
      label: 'Micro Market',
      value: microMarket,
      Icon: RiPriceTag3Line,
      onValueChange: (value) => {
        setValue('microMarket', value);
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
      Icon: RiPriceTag3Line,
      onValueChange: (value) => {
        // Check if input contains non-numeric characters
        const hasNonNumeric = /\D/.test(value);
        setShowPincodeHint(hasNonNumeric);

        // Only allow numeric characters and limit to 6 digits
        const numericValue = value.replaceAll(/\D/g, '').slice(0, 6);
        setValue('pincode', numericValue);
      },
      type: 'input',
      placeholder: 'Enter pin code',
      required: true,
      maxLength: 6,
      hintMessage: 'Only numeric values are allowed',
      showHint: showPincodeHint,
    },
    {
      id: 'address',
      fieldName: 'address',
      label: 'Address',
      value: address,
      Icon: RiMapPinLine,
      onValueChange: (value) => {
        setValue('address', value);
      },
      onPlaceResolved: (snapshot) => setAddressPlace(snapshot),
      type: 'autocomplete',
      placeholder: 'Enter address',
      required: true,
    },
  ];

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content side={side} className='max-w-[605px]'>
        <Drawer.Header className='sticky top-0 z-10 bg-white'>
          <div className='px-6 py-5 flex gap-4 items-center justify-between'>
            <div className='p-2.5 rounded-full text-[var(--color-text-sub-500)] border border-stroke-soft-200'>
              <RiBuildingLine size={24} />
            </div>
            <div className='flex flex-col gap-1'>
              <Drawer.Title className='label-large text-[var(--color-text-main-900)]'>
                Create New Center
              </Drawer.Title>
              <p className='paragraph-small text-text-sub-500'>Enter below center details</p>
            </div>
          </div>
        </Drawer.Header>

        <Drawer.Body className=' w-full flex flex-col overflow-y-auto'>
          <div className='w-full px-8 pt-5 border-b border-stroke-soft-200 pb-6 flex flex-col items-start justify-start gap-3'>
            <span className='text-[var(--color-text-sub-500)] label-medium'>Basic Information</span>
            <div className='w-full border border-stroke-soft-200 rounded-lg overflow-hidden'>
              <table className='w-full border-collapse'>
                <tbody>
                  {basicInfoConfigs.map((config, index) => (
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
                      isLast={index === basicInfoConfigs.length - 1}
                      error={errors[config.fieldName]}
                      fieldName={config.fieldName}
                      control={control}
                      hintMessage={config.hintMessage}
                      showHint={config.showHint}
                      maxLength={config.maxLength}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className='w-full flex flex-col items-start justify-start px-8 pt-5 pb-6 border-b border-stroke-soft-200 gap-3'>
            <div className='w-full flex items-center justify-between'>
              <span className='text-[var(--color-text-sub-500)] gap-[6px] label-medium'>
                Floor Details{' '}
                <span className='text-[var(--color-text-soft-400)] paragraph-small' />{' '}
              </span>
              <LinkButton.Root
                type='button'
                variant='primary'
                size='small'
                onClick={handleAddFloorDetail}
              >
                <LinkButton.Icon as={RiAddLine} />
                Add New Floor
              </LinkButton.Root>
            </div>

            {/* Only show table when there are floor details or when editing row is shown */}
            {(showEditingRow || floorDetails.length > 0) && (
              <div className='w-full rounded-lg overflow-hidden'>
                <Table.Root>
                  <Table.Header>
                    <Table.Row className='bg-bg-weak-50'>
                      <Table.Head className='px-4 py-3 text-left label-small text-text-sub-600 font-medium'>
                        Block
                      </Table.Head>
                      <Table.Head className='px-4 py-3 text-left label-small text-text-sub-600 font-medium'>
                        Floor
                      </Table.Head>
                      <Table.Head className='px-4 py-3 text-left label-small text-text-sub-600 font-medium'>
                        Carpet Area
                      </Table.Head>
                      <Table.Head className='px-4 py-3 text-left label-small text-text-sub-600 font-medium'>
                        Floor Height(ft)
                      </Table.Head>
                      <Table.Head className='px-4 py-3 text-left label-small text-text-sub-600 font-medium'>
                        Has Parking
                      </Table.Head>
                      <Table.Head className='px-4 py-3 text-left label-small text-text-sub-600 font-medium w-[80px]'>
                        {/* Actions column */}
                      </Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {/* Saved floor rows */}
                    {floorDetails.map((floorDetail) => {
                      const isEditing = editingFloorId === floorDetail.id;
                      return (
                        <Table.Row
                          key={floorDetail.id}
                          className='border-b  border-stroke-soft-200'
                        >
                          <Table.Cell variant='compact' className='group-hover/row:bg-white py-3'>
                            {isEditing ? (
                              <Input.Root
                                variant='borderless'
                                size='xsmall'
                                className='bg-transparent'
                              >
                                <Input.Wrapper>
                                  <Input.Input
                                    placeholder='Block'
                                    value={editingFloor.block}
                                    onChange={(e) =>
                                      handleEditingFloorChange('block', e.target.value)
                                    }
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            ) : (
                              <span className='paragraph-small text-text-main-900'>
                                {floorDetail.block}
                              </span>
                            )}
                          </Table.Cell>
                          <Table.Cell
                            variant='compact'
                            className='group-hover/row:bg-white px-4 py-3'
                          >
                            {isEditing ? (
                              <Input.Root
                                variant='borderless'
                                size='xsmall'
                                className='bg-transparent'
                              >
                                <Input.Wrapper>
                                  <Input.Input
                                    placeholder='Floor'
                                    value={editingFloor.floor}
                                    onChange={(e) =>
                                      handleEditingFloorChange('floor', e.target.value)
                                    }
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            ) : (
                              <span className='paragraph-small text-text-main-900'>
                                {floorDetail.floor}
                              </span>
                            )}
                          </Table.Cell>
                          <Table.Cell
                            variant='compact'
                            className='group-hover/row:bg-white px-4 py-3'
                          >
                            {isEditing ? (
                              <Input.Root
                                variant='borderless'
                                size='xsmall'
                                className='bg-transparent'
                              >
                                <Input.Wrapper>
                                  <Input.Input
                                    placeholder='Carpet area'
                                    value={editingFloor.carpet_area}
                                    onChange={(e) =>
                                      handleEditingFloorChange('carpet_area', e.target.value)
                                    }
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            ) : (
                              <span className='paragraph-small text-text-main-900'>
                                {floorDetail.carpet_area}
                              </span>
                            )}
                          </Table.Cell>
                          <Table.Cell
                            variant='compact'
                            className='group-hover/row:bg-white px-4 py-3'
                          >
                            {isEditing ? (
                              <Input.Root
                                variant='borderless'
                                size='xsmall'
                                className='bg-transparent'
                              >
                                <Input.Wrapper>
                                  <Input.Input
                                    placeholder='Floor height'
                                    value={editingFloor.floor_height}
                                    onChange={(e) =>
                                      handleEditingFloorChange('floor_height', e.target.value)
                                    }
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            ) : (
                              <span className='paragraph-small text-text-main-900'>
                                {floorDetail.floor_height}
                              </span>
                            )}
                          </Table.Cell>
                          <Table.Cell
                            variant='compact'
                            className='group-hover/row:bg-white px-4 py-3'
                          >
                            <FloorHasParkingSwitch
                              checked={
                                isEditing ? editingFloor.has_parking : floorDetail.has_parking
                              }
                              disabled={!isEditing}
                              onCheckedChange={(checked) =>
                                handleEditingFloorChange('has_parking', checked)
                              }
                            />
                          </Table.Cell>
                          <Table.Cell
                            variant='compact'
                            className='group-hover/row:bg-white px-4 py-3'
                          >
                            {isEditing ? (
                              <div className='flex items-center gap-2'>
                                <Button.Root
                                  type='button'
                                  variant='neutral'
                                  mode='stroke'
                                  size='xsmall'
                                  onClick={handleCancelFloor}
                                  className='text-text-sub-500 hover:text-error-base'
                                  aria-label='Cancel'
                                >
                                  <Button.Icon as={RiCloseLine} size={18} />
                                </Button.Root>
                                <Button.Root
                                  type='button'
                                  variant='neutral'
                                  mode='borderless'
                                  size='xsmall'
                                  onClick={handleSaveFloor}
                                  disabled={!isEditingFloorComplete}
                                  className={
                                    isEditingFloorComplete
                                      ? 'text-success-base hover:bg-success-lighter'
                                      : ''
                                  }
                                  aria-label='Save floor'
                                >
                                  <Button.Icon as={RiCheckLine} size={18} />
                                </Button.Root>
                              </div>
                            ) : (
                              <div className='flex items-center gap-2'>
                                <Button.Root
                                  type='button'
                                  variant='neutral'
                                  mode='borderless'
                                  size='xsmall'
                                  onClick={() => handleEditFloorDetail(floorDetail)}
                                  className='text-text-sub-500 hover:text-primary-base'
                                  aria-label='Edit floor'
                                >
                                  <Button.Icon as={RiEditLine} size={18} />
                                </Button.Root>
                                <Button.Root
                                  type='button'
                                  variant='neutral'
                                  mode='borderless'
                                  size='xsmall'
                                  onClick={() => handleDeleteFloorDetail(floorDetail.id)}
                                  className='text-text-sub-500 hover:text-error-base'
                                  aria-label='Delete floor'
                                >
                                  <Button.Icon as={RiDeleteBinLine} size={18} />
                                </Button.Root>
                              </div>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}

                    {/* Editing row - only show when adding a new floor (editingFloorId is null) */}
                    {showEditingRow && !editingFloorId && (
                      <Table.Row key={editingFloor.id}>
                        <Table.Cell variant='compact' className='p-2'>
                          <Input.Root
                            size='xsmall'
                            variant='borderless'
                            className='bg-transparent'
                            noRing={true}
                          >
                            <Input.Wrapper>
                              <Input.Input
                                placeholder='Block'
                                value={editingFloor.block}
                                onChange={(e) => handleEditingFloorChange('block', e.target.value)}
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        </Table.Cell>
                        <Table.Cell variant='compact' className='p-2'>
                          <Input.Root
                            size='xsmall'
                            variant='borderless'
                            className='bg-transparent'
                            noRing={true}
                          >
                            <Input.Wrapper>
                              <Input.Input
                                placeholder='Floor'
                                value={editingFloor.floor}
                                onChange={(e) => handleEditingFloorChange('floor', e.target.value)}
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        </Table.Cell>
                        <Table.Cell variant='compact' className='p-2'>
                          <Input.Root
                            size='xsmall'
                            variant='borderless'
                            className='bg-transparent'
                            noRing={true}
                          >
                            <Input.Wrapper>
                              <Input.Input
                                placeholder='Carpet area'
                                value={editingFloor.carpet_area}
                                onChange={(e) =>
                                  handleEditingFloorChange('carpet_area', e.target.value)
                                }
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        </Table.Cell>
                        <Table.Cell variant='compact' className='p-2'>
                          <Input.Root
                            size='xsmall'
                            variant='borderless'
                            className='bg-transparent'
                            noRing={true}
                          >
                            <Input.Wrapper>
                              <Input.Input
                                placeholder='Floor height'
                                value={editingFloor.floor_height}
                                onChange={(e) =>
                                  handleEditingFloorChange('floor_height', e.target.value)
                                }
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        </Table.Cell>
                        <Table.Cell variant='compact' className='p-2'>
                          <FloorHasParkingSwitch
                            checked={editingFloor.has_parking}
                            onCheckedChange={(checked) =>
                              handleEditingFloorChange('has_parking', checked)
                            }
                          />
                        </Table.Cell>
                        <Table.Cell variant='compact' className='p-2 pr-4'>
                          <div className='flex justify-end items-center gap-2'>
                            <Button.Root
                              type='button'
                              variant='neutral'
                              mode='borderless'
                              size='xsmall'
                              onClick={handleCancelFloor}
                              className='text-text-sub-500 hover:text-error-base'
                              aria-label='Delete / discard new floor row'
                              title='Discard this row'
                            >
                              <Button.Icon as={RiDeleteBinLine} size={18} />
                            </Button.Root>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Table.Body>
                </Table.Root>
              </div>
            )}
          </div>

          <div className='w-full flex flex-col items-start justify-start px-8 pt-5 pb-6 border-b border-stroke-soft-200 gap-3'>
            <div className='w-full flex items-center justify-between'>
              <span className='text-[var(--color-text-sub-500)] gap-[6px] label-medium'>
                Parking Details{' '}
                <span className='text-[var(--color-text-soft-400)] paragraph-small' />{' '}
              </span>
              <LinkButton.Root
                type='button'
                variant='primary'
                size='small'
                onClick={handleAddParkingDetail}
              >
                <LinkButton.Icon as={RiAddLine} />
                Add Parking
              </LinkButton.Root>
            </div>

            {(showParkingEditingRow || parkingDetails.length > 0) && (
              <div className='w-full overflow-x-auto rounded-lg'>
                <Table.Root>
                  <Table.Header>
                    <Table.Row className='bg-bg-weak-50'>
                      <Table.Head className='whitespace-nowrap px-4 py-3 text-left label-small text-text-sub-600 font-medium'>
                        Floor
                      </Table.Head>
                      <Table.Head className='whitespace-nowrap px-4 py-3 text-left label-small text-text-sub-600 font-medium'>
                        Vehicle Type
                      </Table.Head>
                      <Table.Head className='whitespace-nowrap px-4 py-3 text-left label-small text-text-sub-600 font-medium'>
                        Parking Type
                      </Table.Head>
                      <Table.Head className='whitespace-nowrap px-4 py-3 text-left label-small text-text-sub-600 font-medium'>
                        Assignment Type
                      </Table.Head>
                      <Table.Head className='whitespace-nowrap px-4 py-3 text-left label-small text-text-sub-600 font-medium'>
                        Per Parking Rate
                      </Table.Head>
                      <Table.Head className='whitespace-nowrap px-4 py-3 text-left label-small text-text-sub-600 font-medium'>
                        <div className='inline-flex items-center gap-1 whitespace-nowrap'>
                          <span>Parking no.</span>
                          <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                              <button
                                type='button'
                                className='inline-flex items-center justify-center'
                                aria-label='Parking number format info'
                              >
                                <RiInformationLine className='size-4 text-text-sub-500' />
                              </button>
                            </Tooltip.Trigger>
                            <Tooltip.Content side='top' align='center' size='small' variant='dark'>
                              {parkingNumberInfoMessage}
                            </Tooltip.Content>
                          </Tooltip.Root>
                        </div>
                      </Table.Head>
                      <Table.Head className='px-4 py-3 text-left label-small text-text-sub-600 font-medium w-[80px]'>
                        {/* Actions column */}
                      </Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {parkingDetails.map((parkingDetail) => {
                      const isEditing = editingParkingId === parkingDetail.id;
                      const row = isEditing ? editingParking : parkingDetail;
                      return (
                        <Table.Row
                          key={parkingDetail.id}
                          className='border-b  border-stroke-soft-200'
                        >
                          <Table.Cell
                            variant='compact'
                            className='group-hover/row:bg-white px-4 py-3'
                          >
                            {isEditing ? (
                              <ParkingSelectCell
                                value={row.floor}
                                onChange={(v) => handleEditingParkingChange('floor', v)}
                                placeholder='Floor'
                                options={parkingFloorOptions}
                              />
                            ) : (
                              <span className='paragraph-small text-text-main-900'>
                                {parkingDetail.floor || '—'}
                              </span>
                            )}
                          </Table.Cell>
                          <Table.Cell
                            variant='compact'
                            className='group-hover/row:bg-white px-4 py-3'
                          >
                            {isEditing ? (
                              <ParkingSelectCell
                                value={row.vehicle_type}
                                onChange={(v) => handleEditingParkingChange('vehicle_type', v)}
                                placeholder='Vehicle Type'
                                options={VEHICLE_TYPES}
                              />
                            ) : (
                              <span className='paragraph-small text-text-main-900'>
                                {parkingDetail.vehicle_type || '—'}
                              </span>
                            )}
                          </Table.Cell>
                          <Table.Cell
                            variant='compact'
                            className='group-hover/row:bg-white px-4 py-3'
                          >
                            {isEditing ? (
                              <ParkingSelectCell
                                value={row.type}
                                onChange={(v) => handleEditingParkingChange('type', v)}
                                placeholder='Parking Type'
                                options={PARKING_TYPES}
                              />
                            ) : (
                              <span className='paragraph-small text-text-main-900'>
                                {parkingDetail.type || '—'}
                              </span>
                            )}
                          </Table.Cell>
                          <Table.Cell
                            variant='compact'
                            className='group-hover/row:bg-white px-4 py-3'
                          >
                            {isEditing ? (
                              <ParkingSelectCell
                                value={row.assigning_type}
                                onChange={(v) => handleEditingParkingChange('assigning_type', v)}
                                placeholder='Assignment Type'
                                options={ASSIGNMENT_TYPES}
                              />
                            ) : (
                              <span className='paragraph-small text-text-main-900'>
                                {parkingDetail.assigning_type || '—'}
                              </span>
                            )}
                          </Table.Cell>
                          <Table.Cell
                            variant='compact'
                            className='group-hover/row:bg-white px-4 py-3'
                          >
                            {isEditing ? (
                              <PerParkingRateInput
                                value={
                                  row.assigning_type === 'FCFS'
                                    ? '0'
                                    : (row.per_parking_rate ?? '0')
                                }
                                readOnly={row.assigning_type === 'FCFS'}
                                onChange={(v) => handleEditingParkingChange('per_parking_rate', v)}
                              />
                            ) : (
                              <span className='paragraph-small text-text-main-900'>
                                {parkingDetail.assigning_type === 'FCFS'
                                  ? '0'
                                  : parkingDetail.per_parking_rate !== undefined &&
                                      parkingDetail.per_parking_rate !== null &&
                                      parkingDetail.per_parking_rate !== ''
                                    ? Number(parkingDetail.per_parking_rate).toLocaleString('en-IN')
                                    : '0'}
                              </span>
                            )}
                          </Table.Cell>
                          <Table.Cell
                            variant='compact'
                            className='group-hover/row:bg-white min-w-[200px] whitespace-nowrap px-4 py-3'
                          >
                            {isEditing ? (
                              <Textarea.Root
                                simple
                                variant='borderless'
                                size='xsmall'
                                placeholder='Parking no.'
                                value={editingParking.parking_no}
                                disabled={!editingParking.floor.trim()}
                                rows={1}
                                className='min-h-[32px] overflow-hidden bg-transparent'
                                onFocus={() => {
                                  if (!editingParking.floor.trim()) {
                                    showErrorToast('Please select floor first.');
                                  }
                                }}
                                onInput={autoResizeTextarea}
                                onChange={(e) =>
                                  handleEditingParkingChange('parking_no', e.target.value)
                                }
                              />
                            ) : (
                              <ParkingNumbersCell
                                numbers={parseParkingNumbers(parkingDetail.parking_no)}
                              />
                            )}
                          </Table.Cell>
                          <Table.Cell
                            variant='compact'
                            className='group-hover/row:bg-white px-4 py-3'
                          >
                            {isEditing ? (
                              <div className='flex items-center gap-2'>
                                <Button.Root
                                  type='button'
                                  variant='neutral'
                                  mode='stroke'
                                  size='xsmall'
                                  onClick={handleCancelParking}
                                  className='text-text-sub-500 hover:text-error-base'
                                  aria-label='Cancel'
                                >
                                  <Button.Icon as={RiCloseLine} size={18} />
                                </Button.Root>
                                <Button.Root
                                  type='button'
                                  variant='neutral'
                                  mode='borderless'
                                  size='xsmall'
                                  onClick={handleSaveParking}
                                  disabled={!isEditingParkingComplete}
                                  className={
                                    isEditingParkingComplete
                                      ? 'text-success-base hover:bg-success-lighter'
                                      : ''
                                  }
                                  aria-label='Save parking'
                                >
                                  <Button.Icon as={RiCheckLine} size={18} />
                                </Button.Root>
                              </div>
                            ) : (
                              <div className='flex items-center gap-2'>
                                <Button.Root
                                  type='button'
                                  variant='neutral'
                                  mode='borderless'
                                  size='xsmall'
                                  onClick={() => handleEditParkingDetail(parkingDetail)}
                                  className='text-text-sub-500 hover:text-primary-base'
                                  aria-label='Edit parking'
                                >
                                  <Button.Icon as={RiEditLine} size={18} />
                                </Button.Root>
                                <Button.Root
                                  type='button'
                                  variant='neutral'
                                  mode='borderless'
                                  size='xsmall'
                                  onClick={() => handleDeleteParkingDetail(parkingDetail.id)}
                                  className='text-text-sub-500 hover:text-error-base'
                                  aria-label='Delete parking'
                                >
                                  <Button.Icon as={RiDeleteBinLine} size={18} />
                                </Button.Root>
                              </div>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}

                    {showParkingEditingRow && !editingParkingId && (
                      <Table.Row key={editingParking.id}>
                        <Table.Cell variant='compact' className='p-2'>
                          <ParkingSelectCell
                            value={editingParking.floor}
                            onChange={(v) => handleEditingParkingChange('floor', v)}
                            placeholder='Floor'
                            options={parkingFloorOptions}
                          />
                        </Table.Cell>
                        <Table.Cell variant='compact' className='p-2'>
                          <ParkingSelectCell
                            value={editingParking.vehicle_type}
                            onChange={(v) => handleEditingParkingChange('vehicle_type', v)}
                            placeholder='Vehicle Type'
                            options={VEHICLE_TYPES}
                          />
                        </Table.Cell>
                        <Table.Cell variant='compact' className='p-2'>
                          <ParkingSelectCell
                            value={editingParking.type}
                            onChange={(v) => handleEditingParkingChange('type', v)}
                            placeholder='Parking Type'
                            options={PARKING_TYPES}
                          />
                        </Table.Cell>
                        <Table.Cell variant='compact' className='p-2'>
                          <ParkingSelectCell
                            value={editingParking.assigning_type}
                            onChange={(v) => handleEditingParkingChange('assigning_type', v)}
                            placeholder='Assignment Type'
                            options={ASSIGNMENT_TYPES}
                          />
                        </Table.Cell>
                        <Table.Cell variant='compact' className='p-2'>
                          <PerParkingRateInput
                            value={
                              editingParking.assigning_type === 'FCFS'
                                ? '0'
                                : (editingParking.per_parking_rate ?? '0')
                            }
                            readOnly={editingParking.assigning_type === 'FCFS'}
                            onChange={(v) => handleEditingParkingChange('per_parking_rate', v)}
                          />
                        </Table.Cell>
                        <Table.Cell variant='compact' className='p-2'>
                          <Textarea.Root
                            simple
                            size='xsmall'
                            variant='borderless'
                            placeholder='Parking no.'
                            value={editingParking.parking_no}
                            disabled={!editingParking.floor.trim()}
                            rows={1}
                            className='min-h-[32px] overflow-hidden bg-transparent'
                            onFocus={() => {
                              if (!editingParking.floor.trim()) {
                                showErrorToast('Please select floor first.');
                              }
                            }}
                            onInput={autoResizeTextarea}
                            onChange={(e) =>
                              handleEditingParkingChange('parking_no', e.target.value)
                            }
                          />
                        </Table.Cell>
                        <Table.Cell variant='compact' className='p-2 pr-4'>
                          <div className='flex justify-end items-center gap-2'>
                            <Button.Root
                              type='button'
                              variant='neutral'
                              mode='borderless'
                              size='xsmall'
                              onClick={handleCancelParking}
                              className='text-text-sub-500 hover:text-error-base'
                              aria-label='Delete / discard new parking row'
                              title='Discard this row'
                            >
                              <Button.Icon as={RiDeleteBinLine} size={18} />
                            </Button.Root>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Table.Body>
                </Table.Root>
              </div>
            )}
          </div>

          <div className='w-full flex flex-col items-start justify-start px-8 pt-3 pb-6 border-b border-stroke-soft-200 gap-3'>
            <span className='text-[var(--color-text-sub-500)] label-medium'>Amenities</span>
            <div className='w-full flex gap-[8px] flex-wrap'>
              {centerAmenities.map((amenity) => (
                <Tag.Root
                  onClick={() => handleAmenityChange(amenity.name)}
                  className={`cursor-pointer ${amenity.selected ? 'hover:bg-[var(--color-primary-lighter)] hover:text-[var(--color-primary-darker)] bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' : ''} paragraph-xsmall`}
                  key={amenity.name}
                  variant='stroke'
                >
                  {amenity.name}
                  {/* {amenity.selected && (
                    <Tag.DismissButton
                      className={`${amenity.selected ? '!important:text-[var(--color-primary-darker)]' : ''}`}
                      onClick={() => handleRemoveAmenity(amenity.name)}
                    />
                  )} */}
                </Tag.Root>
              ))}
            </div>
            {amenitiesInput ? (
              <div className='w-full flex items-center gap-4'>
                <Input.Root className='w-[80%]'>
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
                  onClick={() => setAmenitiesInput(false)}
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

          <div className='w-full flex flex-col pt-5  pb-4 items-start px-8 justify-start gap-3'>
            <span className='text-[var(--color-text-sub-500)] label-medium'>Location Details</span>
            <div className='w-full border border-stroke-soft-200 rounded-lg overflow-hidden'>
              <table className='w-full border-collapse'>
                <tbody>
                  {locationDetailsConfigs.map((config, index) => (
                    <BasicInfoRow
                      key={config.id}
                      label={config.label}
                      value={config.value}
                      Icon={config.Icon}
                      onValueChange={config.onValueChange}
                      onPlaceResolved={config.onPlaceResolved}
                      type={config.type}
                      options={config.options}
                      placeholder={config.placeholder}
                      required={config.required}
                      isLast={index === locationDetailsConfigs.length - 1}
                      error={errors[config.fieldName]}
                      fieldName={config.fieldName}
                      control={control}
                      hintMessage={config.hintMessage}
                      showHint={config.showHint}
                      maxLength={config.maxLength}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className='w-full flex flex-col px-8 border-b border-stroke-soft-200 pb-6 items-start justify-start gap-3'>
            <span className='text-[var(--color-text-sub-500)] label-medium'>Location Map</span>
            <AddressMap
              address={address}
              coordinates={
                addressPlace != null && addressPlace.lat != null && addressPlace.lng != null
                  ? { lat: Number(addressPlace.lat), lng: Number(addressPlace.lng) }
                  : null
              }
              onAddressChange={(newAddress, coords) => {
                setValue('address', newAddress);
                if (coords) {
                  setAddressPlace((prev) => ({
                    ...prev,
                    place_id: null,
                    lat: coords.lat,
                    lng: coords.lng,
                    formatted_address: newAddress,
                  }));
                }
              }}
              onCoordinatesChange={() => {}}
              showInput={false}
            />
          </div>
        </Drawer.Body>

        <Drawer.Footer className='sticky border-t border-stroke-soft-200 bottom-0 z-10 bg-white'>
          <div className='flex items-center justify-between gap-3 p-6 '>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='w-full sm:w-auto'
              onClick={handleClear}
            >
              Clear
            </Button.Root>
            {/* <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              className='w-full sm:w-auto'
              onClick={handleSaveAsDraft}
            >
              Save as Draft
            </Button.Root> */}
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              disabled={createCenterDrawer.isLoading}
              className='w-full sm:w-auto'
              onClick={handleCreate}
            >
              {createCenterDrawer.isLoading ? 'Creating' : 'Create'}
            </Button.Root>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CreateCenterDrawer;
