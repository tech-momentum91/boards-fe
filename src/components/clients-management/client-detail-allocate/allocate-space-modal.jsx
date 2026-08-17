import React, { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  RiTimeLine,
  RiMoneyDollarCircleLine,
  RiBox3Line,
  RiErrorWarningFill,
  RiBuildingLine,
  RiPriceTag3Line,
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from 'react-icons/ri';
import { PiChair, PiChairDuotone } from 'react-icons/pi';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Checkbox from '@/components/ui/checkbox';
import * as Label from '@/components/ui/label';
import * as Hint from '@/components/ui/hint';
import * as LinkButton from '@/components/ui/link-button';
import * as Textarea from '@/components/ui/textarea';
import { Datepicker } from '@/components/ui/datepicker';
import * as Tooltip from '@/components/ui/tooltip';
import * as Badge from '@/components/ui/badge';
import { createSpaceAllocationThunk } from '@/redux/clientDetailSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import apiClient from '@/api/axios';
import {
  SPACE_TYPE_OPTIONS,
  COWORKING_SPACE_TYPE_OPTIONS,
  DEFAULT_SPACE_TYPE,
  SPACE_TYPE,
  COWORKING_SPACE_TYPE,
  requiresSeatSelection,
  shouldShowSpaceSelection,
} from '@/components/clients-management/constants';
import {
  coworkingInventoryTypesForApiFilter,
  isCoworkingDeskSeatSelectionType,
} from '@/utils/layout-coworking-inventory-type';
import {
  buildAssignSubSpacesFromDeskSelection,
  flattenSubSpacesToDeskOptions,
  isDeskOptionUnavailable,
} from '@/utils/coworking-desk-options';

/** Parking labels shown as badges in Select Parkings trigger before +N. */
const CLIENT_ALLOCATE_PARKING_VISIBLE_BADGES = 4;
const PARKING_VEHICLE_TYPES = ['Four Wheeler', 'Four Wheeler EV', 'Two Wheeler', 'Two Wheeler EV'];
const PARKING_ASSIGNING_TYPES = ['FCFS', 'Dedicated'];

const allocationSchema = z
  .object({
    center: z.string().min(1, 'Center is required'),
    space_type: z.string().min(1, 'Space type is required'),
    coworking_space_type: z.string().optional(),
    space_id: z.string().optional(),
    parking_type: z.string().optional(),
    vehicle_type: z.string().optional(),
    parking_floor: z.string().optional(),
    assigning_type: z.string().optional(),
    parking_spaces: z.array(z.string()).optional(),
    from_date: z.string().min(1, 'Start date is required'),
    to_date: z.string().min(1, 'End date is required'),
    // Pure Rental (read-only in Allocate Space; set from selected space)
    total_carpet_sft: z
      .union([z.number().min(0, 'Agreement carpet area must be 0 or greater'), z.string()])
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
    expected_carpet_rate: z
      .union([z.number().min(0, 'Expected carpet rate must be 0 or greater'), z.string()])
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
    credit_per_seat: z
      .union([z.number().min(0, 'Credit per seat must be 0 or greater'), z.string()])
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
    expected_per_seat_rate: z
      .union([z.number().min(0, 'Rate must be 0 or greater'), z.string()])
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
    total_rate: z
      .union([z.number().min(0, 'Total rate must be 0 or greater'), z.string()])
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
    number_of_seats: z
      .union([z.number().min(1, 'Number of seats is required'), z.string()])
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
  })
  .superRefine((data, context) => {
    const normalizedSpaceType = String(data.space_type || '')
      .trim()
      .toLowerCase();
    const isParkingType = normalizedSpaceType.includes('parking');

    // Dates are required for all space types
    if (!(data.from_date && data.to_date)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start date and End date are required',
        path: ['from_date'],
      });
    }

    if (isParkingType) {
      if (!data.parking_type) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Parking Type is required',
          path: ['parking_type'],
        });
      }
      if (!data.vehicle_type) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vehicle Type is required',
          path: ['vehicle_type'],
        });
      }
      if (!data.parking_floor) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Floor is required',
          path: ['parking_floor'],
        });
      }
      if (!data.assigning_type) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Assignment Type is required',
          path: ['assigning_type'],
        });
      }
      if (!data.space_id) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Space is required',
          path: ['space_id'],
        });
      }
      if (!Array.isArray(data.parking_spaces) || data.parking_spaces.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please select at least one parking',
          path: ['parking_spaces'],
        });
      }
    } else if (!data.space_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Space is required',
        path: ['space_id'],
      });
    }
  });

const AllocateSpaceModal = ({ open, onOpenChange, clientId, onSuccess, isLoading = false }) => {
  const dispatch = useDispatch();
  const [spaces, setSpaces] = useState([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [centers, setCenters] = useState([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [spaceSearch, setSpaceSearch] = useState('');
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [subSpaces, setSubSpaces] = useState([]);
  const [loadingSubSpaces, setLoadingSubSpaces] = useState(false);
  const [notes, setNotes] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(allocationSchema),
    defaultValues: {
      center: '',
      space_type: DEFAULT_SPACE_TYPE,
      coworking_space_type: '',
      space_id: '',
      parking_type: '',
      vehicle_type: '',
      parking_floor: '',
      assigning_type: '',
      parking_spaces: [],
      from_date: '',
      to_date: '',
      total_carpet_sft: '',
      expected_carpet_rate: '',
      credit_per_seat: '',
      expected_per_seat_rate: '',
      total_rate: '',
      number_of_seats: '',
      notes: '',
    },
  });

  const center = watch('center');
  const spaceType = watch('space_type');
  const isPureRentalType = spaceType === SPACE_TYPE.PURE_RENTAL;
  const isParkingType = String(spaceType || '')
    .trim()
    .toLowerCase()
    .includes('parking');
  const coworkingSpaceType = watch('coworking_space_type');
  const parkingType = watch('parking_type');
  const vehicleType = watch('vehicle_type');
  const parkingFloor = watch('parking_floor');
  const assigningType = watch('assigning_type');
  const selectedParkingSpaces = watch('parking_spaces') || [];
  const spaceId = watch('space_id');
  const creditPerSeat = watch('credit_per_seat');
  const expectedPerSeatRate = watch('expected_per_seat_rate');
  const numberOfSeats = watch('number_of_seats');

  // Fetch centers on mount
  useEffect(() => {
    const fetchCenters = async () => {
      setLoadingCenters(true);
      try {
        const response = await apiClient.get(
          '/method/devx.client_management.api.client.get_client_centers',
          {
            params: {
              client_id: clientId,
            },
          },
        );
        const centersList = response.data?.message || [];
        setCenters(centersList);
      } catch (error) {
        console.error('Error fetching centers:', error);
        setCenters([]);
      } finally {
        setLoadingCenters(false);
      }
    };

    if (open) {
      fetchCenters();
    }
  }, [open]);

  // Fetch spaces when center, space type or coworking space type changes
  useEffect(() => {
    const fetchSpaces = async () => {
      if (!spaceType || !center) {
        setSpaces([]);
        setSelectedSpace(null);
        setValue('space_id', '');
        return;
      }

      setLoadingSpaces(true);
      try {
        const filters = [
          ['inventory_type', '=', isParkingType ? 'Parking' : spaceType],
          ['center', '=', center],
        ];
        if (isParkingType) {
          filters.push(['status', '=', 'Available']);
        }
        if (isParkingType && parkingType) {
          filters.push(['parking_type', '=', parkingType]);
        }
        if (isParkingType && vehicleType) {
          filters.push(['vehicle_type', '=', vehicleType]);
        }
        if (spaceType === SPACE_TYPE.COWORKING_SPACE && coworkingSpaceType) {
          const coworkingTypes = coworkingInventoryTypesForApiFilter(coworkingSpaceType);
          if (coworkingTypes.length === 1) {
            filters.push(['coworking_inventory_type', '=', coworkingTypes[0]]);
          } else if (coworkingTypes.length > 1) {
            filters.push(['coworking_inventory_type', 'in', coworkingTypes]);
          }
        }
        if (spaceType === SPACE_TYPE.RESOURCE) {
          filters.push(['bookable', '=', 'No']);
        }

        const fields = ['*'];

        const response = await apiClient.get('/resource/Space', {
          params: {
            fields: JSON.stringify(fields),
            filters: JSON.stringify(filters),
            limit_page_length: 100,
          },
        });

        let spaceList = [];
        if (Array.isArray(response.data)) {
          spaceList = response.data;
        } else if (Array.isArray(response.data?.data)) {
          spaceList = response.data.data;
        }

        setSpaces(spaceList);
      } catch (error) {
        console.error('Error fetching spaces:', error);
        setSpaces([]);
      } finally {
        setLoadingSpaces(false);
      }
    };

    fetchSpaces();
  }, [center, spaceType, coworkingSpaceType, isParkingType, parkingType, vehicleType, setValue]);

  // Fetch space details when space is selected
  useEffect(() => {
    const fetchSubSpaces = async (spaceIdToFetch) => {
      setLoadingSubSpaces(true);
      try {
        const response = await apiClient.get(
          '/method/devx.seat_inventory.doctype.assign_space.assign_space.get_sub_spaces',
          {
            params: {
              space_id: spaceIdToFetch,
            },
          },
        );
        const responseData = response.data?.message || response.data;
        const subSpacesList = responseData?.sub_spaces || [];
        setSubSpaces(subSpacesList);
      } catch (error) {
        console.error('Error fetching sub spaces:', error);
        setSubSpaces([]);
      } finally {
        setLoadingSubSpaces(false);
      }
    };

    const fetchSpaceDetails = async () => {
      if (!spaceId) {
        setSelectedSpace(null);
        setValue('total_carpet_sft', '');
        setValue('expected_carpet_rate', '');
        return;
      }

      try {
        const fields = [
          'name',
          'inventory_name',
          'inventory_type',
          'coworking_inventory_type',
          'center',
          'center_name',
          'floor',
          'no_of_seats',
          'total_seats',
          'total_carpet_sft',
          'expected_carpet_rate',
          'expected_per_seat_cost',
          'expected_per_seat_rate',
          'credit_per_seat',
          'status',
          'sub_space',
          'desk_details',
        ];

        // Add resource-specific fields when space type is Resource
        if (spaceType === SPACE_TYPE.RESOURCE) {
          fields.push('resource_type', 'pax', 'credit_per_hour');
        }

        const response = await apiClient.get(`/resource/Space/${spaceId}`, {
          params: {
            fields: JSON.stringify(fields),
          },
        });
        const spaceData = response.data?.data || response.data;
        setSelectedSpace(spaceData);

        // Set default values from space
        const expectedRate =
          spaceData.expected_per_seat_rate ??
          spaceData.expected_per_seat_cost ??
          spaceData.per_parking_rate;
        if (expectedRate !== undefined && expectedRate !== null && expectedRate !== '') {
          setValue('expected_per_seat_rate', expectedRate);
        }
        if (spaceData.credit_per_seat) {
          setValue('credit_per_seat', spaceData.credit_per_seat);
        }
        if (spaceData.available_seats) {
          setValue('number_of_seats', spaceData.available_seats);
        }
        if (spaceType === SPACE_TYPE.RESOURCE && spaceData.total_seats) {
          setValue('number_of_seats', spaceData.total_seats);
        }
        if (spaceData.total_carpet_sft !== undefined && spaceData.total_carpet_sft !== null) {
          setValue('total_carpet_sft', spaceData.total_carpet_sft);
        }
        if (
          spaceData.expected_carpet_rate !== undefined &&
          spaceData.expected_carpet_rate !== null
        ) {
          setValue('expected_carpet_rate', spaceData.expected_carpet_rate);
        }

        // Fetch sub spaces for Dedicated Desk and Hot Desk (incl. legacy Flexi Desk)
        if (
          spaceType === SPACE_TYPE.COWORKING_SPACE &&
          isCoworkingDeskSeatSelectionType(spaceData.coworking_inventory_type)
        ) {
          fetchSubSpaces(spaceId);
        } else {
          setSubSpaces([]);
        }
      } catch (error) {
        console.error('Error fetching space details:', error);
        setSelectedSpace(null);
        setSubSpaces([]);
        setValue('total_carpet_sft', '');
        setValue('expected_carpet_rate', '');
      }
    };

    fetchSpaceDetails();
  }, [spaceId, spaceType, setValue]);

  // Calculate total rate
  useEffect(() => {
    if (!expectedPerSeatRate) {
      setValue('total_rate', '');
      return;
    }
    let seats = 0;
    if (isParkingType) {
      seats = selectedParkingSpaces.length;
    } else if (numberOfSeats) {
      seats = numberOfSeats;
    } else if (selectedSpace?.total_seats && spaceType === SPACE_TYPE.MANAGED_OFFICE) {
      seats = selectedSpace.total_seats;
    }
    if (seats) {
      const total = Number(expectedPerSeatRate) * Number(seats);
      setValue('total_rate', total);
    } else {
      setValue('total_rate', '');
    }
  }, [
    expectedPerSeatRate,
    numberOfSeats,
    selectedSpace,
    spaceType,
    isParkingType,
    selectedParkingSpaces.length,
    setValue,
  ]);

  // Filter spaces by business rules and search
  const filteredSpaces = useMemo(() => {
    // First apply business logic filters
    let filtered = spaces.filter((space) => {
      // Condition 0: Pure Rental - do not show occupied spaces
      if (spaceType === SPACE_TYPE.PURE_RENTAL && space.status === 'Occupied') {
        return false;
      }
      // Condition 1: Managed Office - only show if status is "Available"
      if (spaceType === SPACE_TYPE.MANAGED_OFFICE && space.status !== 'Available') {
        return false;
      }

      // Condition 2: Co-Working Space with Private Cabin or Manager Cabin - only show if status is "Available"
      if (
        spaceType === SPACE_TYPE.COWORKING_SPACE &&
        (coworkingSpaceType === COWORKING_SPACE_TYPE.PRIVATE_CABIN ||
          coworkingSpaceType === COWORKING_SPACE_TYPE.MANAGER_CABIN) &&
        space.status !== 'Available'
      ) {
        return false;
      }

      // Condition 3: Co-Working Space with Dedicated Desk or Hot Desk - only show if available_seats > 0
      if (
        spaceType === SPACE_TYPE.COWORKING_SPACE &&
        (coworkingSpaceType === COWORKING_SPACE_TYPE.DEDICATED_DESK ||
          coworkingSpaceType === COWORKING_SPACE_TYPE.HOT_DESK)
      ) {
        const availableSeats = space.available_seats ?? 0;
        if (availableSeats <= 0) {
          return false;
        }
      }

      return true;
    });

    // Then apply search filter if there's a search term
    if (spaceSearch.trim()) {
      const searchLower = spaceSearch.toLowerCase();
      filtered = filtered.filter(
        (space) =>
          space.inventory_name?.toLowerCase().includes(searchLower) ||
          space.name?.toLowerCase().includes(searchLower) ||
          space.center_name?.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [spaces, spaceSearch, spaceType, coworkingSpaceType]);

  const parkingFloorOptions = useMemo(() => {
    if (!isParkingType) return [];
    const uniq = new Map();
    (filteredSpaces || []).forEach((space) => {
      const floor = String(space?.floor || '').trim();
      if (!floor) return;
      if (!uniq.has(floor)) uniq.set(floor, { value: floor, label: floor });
    });
    return [...uniq.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredSpaces, isParkingType]);

  const filteredParkingSpacesByFloor = useMemo(() => {
    if (!isParkingType || !parkingFloor) return [];
    return (filteredSpaces || []).filter((space) => {
      if (String(space?.floor || '').trim() !== parkingFloor) return false;
      if (assigningType && String(space?.assigning_type || '') !== assigningType) return false;
      return true;
    });
  }, [filteredSpaces, isParkingType, parkingFloor, assigningType]);

  const parkingSubSpaces = useMemo(() => {
    if (!isParkingType) return [];
    const list = selectedSpace?.desk_details || [];
    return Array.isArray(list) ? list : [];
  }, [isParkingType, selectedSpace]);

  const parkingSelectionDisplayLabels = useMemo(() => {
    return (selectedParkingSpaces || []).map((value) => {
      const sub = parkingSubSpaces.find((s, idx) => {
        const subSpaceId = s.desk_id || s.name || String(idx);
        const parkingNoValue = s.parking_no || subSpaceId;
        return parkingNoValue === value;
      });
      return sub ? String(sub.parking_no || sub.desk_id || value) : String(value);
    });
  }, [selectedParkingSpaces, parkingSubSpaces]);

  // For Parking flow: auto-select the single space for chosen floor
  useEffect(() => {
    if (!isParkingType) return;
    if (!parkingType || !vehicleType || !parkingFloor || !assigningType) {
      setValue('space_id', '');
      setValue('parking_spaces', []);
      return;
    }

    if (filteredParkingSpacesByFloor.length === 1) {
      const onlySpaceId = filteredParkingSpacesByFloor[0]?.name || '';
      setValue('space_id', onlySpaceId, { shouldValidate: true });
    } else {
      // If backend returns none/multiple, keep unselected to avoid wrong allocation
      setValue('space_id', '', { shouldValidate: true });
      setValue('parking_spaces', [], { shouldValidate: true });
    }
  }, [
    isParkingType,
    parkingType,
    vehicleType,
    parkingFloor,
    assigningType,
    filteredParkingSpacesByFloor,
    setValue,
  ]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      reset();
      setSelectedSpace(null);
      setSpaceSearch('');
      setShowSeatSelection(false);
      setSelectedSeats([]);
      setSpaces([]);
      setSubSpaces([]);
      setNotes('');
    }
  }, [open, reset]);

  // Clear selected seats if number_of_seats is reduced below current selection
  useEffect(() => {
    if (numberOfSeats && selectedSeats.length > numberOfSeats) {
      setSelectedSeats((previous) => previous.slice(0, numberOfSeats));
    }
  }, [numberOfSeats]);

  const coworkingDeskOptions = useMemo(() => {
    if (
      spaceType !== SPACE_TYPE.COWORKING_SPACE ||
      !isCoworkingDeskSeatSelectionType(coworkingSpaceType)
    ) {
      return [];
    }
    return flattenSubSpacesToDeskOptions(subSpaces);
  }, [subSpaces, spaceType, coworkingSpaceType]);

  // Get all enabled seats - use API response for Dedicated Desk and Hot Desk
  const enabledSeats = useMemo(() => {
    if (coworkingDeskOptions.length > 0) return coworkingDeskOptions;
    // For other space types, use sub_space from selectedSpace
    if (!selectedSpace?.sub_space) return [];
    return selectedSpace.sub_space.filter((subSpace) => subSpace.active === 1);
  }, [coworkingDeskOptions, selectedSpace]);

  const onSubmit = async (data) => {
    if (!clientId) {
      showErrorToast('Client ID is required');
      return;
    }

    if (!data.center) {
      showErrorToast('Center is required');
      return;
    }

    // Validate dates
    if (!data.from_date || !data.to_date) {
      showErrorToast('Start date and End date are required');
      return;
    }

    try {
      const assignedSeats =
        selectedSeats.length > 0
          ? selectedSeats.length
          : data.total_seats || selectedSpace?.total_seats || 1;

      const allocationData = {
        customer: clientId,
        space_id: data.space_id,
        center: data.center,
        status: isParkingType ? 'Occupied' : 'Locked',
        assigned_seats: Number(assignedSeats),
        start_date: data.from_date,
        end_date: data.to_date,
        // For Pure Rental: send Total Carpet Rate in expected_per_seat_rate
        expected_per_seat_rate: isPureRentalType
          ? data.expected_carpet_rate
            ? Number(data.expected_carpet_rate)
            : 0
          : data.expected_per_seat_rate
            ? Number(data.expected_per_seat_rate)
            : 0,
        ...(isPureRentalType ? {} : { total_rate: data.total_rate ? Number(data.total_rate) : 0 }),
        credit_per_seat:
          isPureRentalType || isParkingType
            ? 0
            : data.credit_per_seat
              ? Number(data.credit_per_seat)
              : 0,
      };

      // For Pure Rental: send carpet fields in payload
      if (isPureRentalType) {
        allocationData.total_carpet_area = data.total_carpet_sft
          ? Number(data.total_carpet_sft)
          : 0;
      }

      // Add notes field (optional, empty for now)
      allocationData.notes = notes || '';

      if (isParkingType) {
        const selectedParkingNos = (data.parking_spaces || []).filter(Boolean);
        allocationData.assign_sub_spaces = selectedParkingNos.map((parkingNo) => ({
          sub_space_id: parkingNo,
        }));
        allocationData.parking_no = selectedParkingNos;
        allocationData.assigned_seats = Number(selectedParkingNos.length);
      }

      // Include selected sub_space IDs if seats were selected
      // New format: assign_sub_spaces array with objects containing sub_space_id
      if (selectedSeats.length > 0) {
        allocationData.assign_sub_spaces = buildAssignSubSpacesFromDeskSelection(
          selectedSeats,
          enabledSeats,
        );
      }

      const result = await dispatch(createSpaceAllocationThunk(allocationData));

      if (createSpaceAllocationThunk.rejected.match(result)) {
        showErrorToast(result.payload, {
          defaultMessage: 'Failed to allocate space. Please try again.',
        });
        return;
      }

      showSuccessToast('Space allocated successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      showErrorToast(error.message || 'Failed to allocate space');
    }
  };

  const handleChooseSeats = async (e) => {
    e.preventDefault();
    // Validate form before showing seat selection
    const isValid = await new Promise((resolve) => {
      handleSubmit(
        () => resolve(true),
        () => resolve(false),
      )();
    });
    if (isValid) {
      setShowSeatSelection(true);
    }
  };

  const handleSeatToggle = (subSpaceId) => {
    setSelectedSeats((prev) => {
      if (prev.includes(subSpaceId)) {
        return prev.filter((id) => id !== subSpaceId);
      }
      // Check if we've reached the limit based on number_of_seats
      const assignedSeatsCount = numberOfSeats || 0;
      if (assignedSeatsCount > 0 && prev.length >= assignedSeatsCount) {
        showErrorToast(`You can only select ${assignedSeatsCount} seat(s)`);
        return prev;
      }
      return [...prev, subSpaceId];
    });
  };

  const handleConfirmSeats = () => {
    if (selectedSeats.length === 0) {
      showErrorToast('Please select at least one seat');
      return;
    }
    setValue('number_of_seats', selectedSeats.length);
    handleSubmit(onSubmit)();
  };

  const totalCredits = useMemo(() => {
    if (!creditPerSeat) return 0;
    let seats = 0;
    if (numberOfSeats) {
      seats = numberOfSeats;
    } else if (selectedSpace?.total_seats && spaceType === SPACE_TYPE.MANAGED_OFFICE) {
      seats = selectedSpace.total_seats;
    }
    if (seats) {
      return Number(creditPerSeat) * Number(seats);
    }
    return 0;
  }, [creditPerSeat, numberOfSeats, selectedSpace, spaceType]);

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className={`flex flex-col max-h-[90dvh] ${showSeatSelection ? 'max-w-[612px] min-w-[612px]' : 'max-w-[480px]'}`}
      >
        <Modal.Header
          icon={showSeatSelection ? PiChair : RiBox3Line}
          title={
            showSeatSelection
              ? selectedSpace?.inventory_name || 'Regional Preferences'
              : 'Allocate Space'
          }
          description={
            showSeatSelection
              ? `${selectedSeats.length}/${numberOfSeats || selectedSpace?.total_seats || 0} seats selected`
              : 'Select below details to allocate space'
          }
          className='shrink-0'
        />

        {showSeatSelection ? (
          <Modal.Body className='flex flex-col gap-0 p-0 overflow-y-auto flex-1 min-h-0'>
            {/* Seat Selection Grid */}
            <div className='relative p-5'>
              {/* Main seat grid container */}
              <div className='relative'>
                {/* Seat Grid - CSS Grid with 10 columns */}
                {loadingSubSpaces ? (
                  <div className='text-center text-paragraph-sm text-text-sub-500 py-8'>
                    Loading seats...
                  </div>
                ) : enabledSeats.length > 0 ? (
                  <div className='flex flex-wrap gap-2'>
                    {enabledSeats.map((seatOption) => {
                      const seatValue =
                        seatOption.value || seatOption.sub_space_id || seatOption.name;
                      const isSelected = selectedSeats.includes(seatValue);
                      const usesDeskOptions = Boolean(seatOption.value && seatOption.sequence);
                      const isSeatUnavailable = usesDeskOptions
                        ? isDeskOptionUnavailable(seatOption)
                        : seatOption.occupied === 1 ||
                          seatOption.requested === 1 ||
                          seatOption.active === 0 ||
                          Number(seatOption.locked) === 1;
                      const seatNumber = usesDeskOptions
                        ? String(seatOption.sequence)
                        : String(seatValue || '')
                            .split('-')
                            .pop() || '';

                      return (
                        <button
                          key={seatValue}
                          type='button'
                          onClick={() => !isSeatUnavailable && handleSeatToggle(seatValue)}
                          disabled={isSeatUnavailable}
                          className={`flex flex-col items-center justify-center gap-1 rounded-md border transition-colors pt-3 pb-2 shrink-0 w-[50px] ${
                            isSelected
                              ? 'bg-success-lighter border-success-base text-text-sub-500'
                              : isSeatUnavailable
                                ? 'bg-neutral-200 border-stroke-soft-200 text-text-sub-500 cursor-not-allowed'
                                : 'bg-bg-white-0 border-stroke-soft-200 text-text-sub-500 hover:border-success-base hover:bg-success-lighter'
                          }`}
                        >
                          <PiChairDuotone
                            className={`shrink-0 ${
                              isSelected ? 'text-success-base' : 'text-text-soft-400'
                            }`}
                            size={16}
                          />
                          <span className='text-label-sm text-text-sub-500'>{seatNumber}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className='text-center text-paragraph-sm text-text-sub-500 py-8'>
                    No seats available for this space
                  </div>
                )}
              </div>
            </div>
          </Modal.Body>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col flex-1 min-h-0'>
            <Modal.Body className='flex flex-col gap-6 overflow-y-auto flex-1 min-h-0'>
              <div className='flex flex-col gap-4'>
                {/* Center */}
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Center
                    <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='center'
                    control={control}
                    render={({ field }) => (
                      <Select.Root
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setValue('space_type', DEFAULT_SPACE_TYPE);
                          setValue('coworking_space_type', '');
                          setValue('space_id', '');
                        }}
                        hasError={Boolean(errors.center)}
                        size='xsmall'
                        disabled={loadingCenters}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder='Select' />
                        </Select.Trigger>
                        <Select.Content>
                          {centers.length > 0 ? (
                            centers.map((centerOption) => (
                              <Select.Item key={centerOption.value} value={centerOption.value}>
                                {centerOption.label}
                              </Select.Item>
                            ))
                          ) : (
                            <div className='px-3 py-2 text-paragraph-sm text-text-sub-500'>
                              {loadingCenters ? 'Loading centers...' : 'No centers available'}
                            </div>
                          )}
                        </Select.Content>
                      </Select.Root>
                    )}
                  />
                  {errors.center && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningFill} />
                      {errors.center.message}
                    </Hint.Root>
                  )}
                </div>

                {/* Space Type */}
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Space Type
                    <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='space_type'
                    control={control}
                    render={({ field }) => (
                      <Select.Root
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setValue('coworking_space_type', '');
                          setValue('space_id', '');
                          setValue('parking_type', '');
                          setValue('vehicle_type', '');
                          setValue('parking_floor', '');
                          setValue('assigning_type', '');
                          setValue('parking_spaces', []);
                        }}
                        disabled={!center}
                        hasError={Boolean(errors.space_type)}
                        size='xsmall'
                      >
                        <Select.Trigger>
                          <Select.Value placeholder='Select' />
                        </Select.Trigger>
                        <Select.Content>
                          {SPACE_TYPE_OPTIONS.map((option) => (
                            <Select.Item key={option.value} value={option.value}>
                              {option.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    )}
                  />
                  {errors.space_type && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningFill} />
                      {errors.space_type.message}
                    </Hint.Root>
                  )}
                </div>

                {/* Co-Working Space Type */}
                {spaceType === SPACE_TYPE.COWORKING_SPACE && (
                  <div className='flex flex-col gap-1'>
                    <Label.Root>
                      Co-Working Space Type
                      <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='coworking_space_type'
                      control={control}
                      render={({ field }) => (
                        <Select.Root
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setValue('space_id', '');
                          }}
                          hasError={Boolean(errors.coworking_space_type)}
                          size='xsmall'
                        >
                          <Select.Trigger>
                            <Select.Value placeholder='Select' />
                          </Select.Trigger>
                          <Select.Content>
                            {COWORKING_SPACE_TYPE_OPTIONS.map((option) => (
                              <Select.Item key={option.value} value={option.value}>
                                {option.label}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      )}
                    />
                    {errors.coworking_space_type && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningFill} />
                        {errors.coworking_space_type.message}
                      </Hint.Root>
                    )}
                  </div>
                )}

                {/* Parking Type */}
                {isParkingType && (
                  <div className='flex flex-col gap-1'>
                    <Label.Root>
                      Parking Type
                      <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='parking_type'
                      control={control}
                      render={({ field }) => (
                        <Select.Root
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setValue('vehicle_type', '');
                            setValue('parking_floor', '');
                            setValue('assigning_type', '');
                            setValue('space_id', '');
                            setValue('parking_spaces', []);
                          }}
                          hasError={Boolean(errors.parking_type)}
                          size='xsmall'
                        >
                          <Select.Trigger>
                            <Select.Value placeholder='Select' />
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value='Non Stackable'>Non Stackable</Select.Item>
                            <Select.Item value='Dual Stackable'>Dual Stackable</Select.Item>
                            <Select.Item value='Triple Stackable'>Triple Stackable</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      )}
                    />
                    {errors.parking_type && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningFill} />
                        {errors.parking_type.message}
                      </Hint.Root>
                    )}
                  </div>
                )}

                {isParkingType && (
                  <div className='flex flex-col gap-1'>
                    <Label.Root>
                      Vehicle Type
                      <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='vehicle_type'
                      control={control}
                      render={({ field }) => (
                        <Select.Root
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setValue('parking_floor', '');
                            setValue('assigning_type', '');
                            setValue('space_id', '');
                            setValue('parking_spaces', []);
                          }}
                          hasError={Boolean(errors.vehicle_type)}
                          size='xsmall'
                          disabled={!parkingType}
                        >
                          <Select.Trigger>
                            <Select.Value
                              placeholder={parkingType ? 'Select' : 'Select parking type first'}
                            />
                          </Select.Trigger>
                          <Select.Content>
                            {PARKING_VEHICLE_TYPES.map((type) => (
                              <Select.Item key={type} value={type}>
                                {type}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      )}
                    />
                    {errors.vehicle_type && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningFill} />
                        {errors.vehicle_type.message}
                      </Hint.Root>
                    )}
                  </div>
                )}

                {/* Parking Multi Select */}
                {isParkingType && (
                  <>
                    {/* Floor (single select) */}
                    <div className='flex flex-col gap-1'>
                      <Label.Root>
                        Floor
                        <Label.Asterisk />
                      </Label.Root>
                      <Controller
                        name='parking_floor'
                        control={control}
                        render={({ field }) => (
                          <Select.Root
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              setValue('assigning_type', '');
                              setValue('space_id', '');
                              setValue('parking_spaces', []);
                            }}
                            hasError={Boolean(errors.parking_floor)}
                            size='xsmall'
                            disabled={!parkingType || !vehicleType}
                          >
                            <Select.Trigger>
                              <Select.Value
                                placeholder={
                                  !parkingType
                                    ? 'Select parking type first'
                                    : !vehicleType
                                      ? 'Select vehicle type first'
                                      : 'Select'
                                }
                              />
                            </Select.Trigger>
                            <Select.Content>
                              {parkingFloorOptions.length > 0 ? (
                                parkingFloorOptions.map((opt) => (
                                  <Select.Item key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </Select.Item>
                                ))
                              ) : (
                                <div className='px-3 py-2 text-paragraph-sm text-text-sub-500'>
                                  {loadingSpaces ? 'Loading floors...' : 'No floors found'}
                                </div>
                              )}
                            </Select.Content>
                          </Select.Root>
                        )}
                      />
                      {errors.parking_floor && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiErrorWarningFill} />
                          {errors.parking_floor.message}
                        </Hint.Root>
                      )}
                    </div>

                    <div className='flex flex-col gap-1'>
                      <Label.Root>
                        Assignment Type
                        <Label.Asterisk />
                      </Label.Root>
                      <Controller
                        name='assigning_type'
                        control={control}
                        render={({ field }) => (
                          <Select.Root
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              setValue('space_id', '');
                              setValue('parking_spaces', []);
                            }}
                            hasError={Boolean(errors.assigning_type)}
                            size='xsmall'
                            disabled={!parkingFloor}
                          >
                            <Select.Trigger>
                              <Select.Value
                                placeholder={parkingFloor ? 'Select' : 'Select floor first'}
                              />
                            </Select.Trigger>
                            <Select.Content>
                              {PARKING_ASSIGNING_TYPES.map((type) => (
                                <Select.Item key={type} value={type}>
                                  {type}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        )}
                      />
                      {errors.assigning_type && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiErrorWarningFill} />
                          {errors.assigning_type.message}
                        </Hint.Root>
                      )}
                    </div>

                    {/* Select Parkings (multiselect from sub_space) */}
                    <div className='flex flex-col gap-1'>
                      <Label.Root>
                        Select Parking
                        <Label.Asterisk />
                      </Label.Root>
                      <Select.Root className='px-0'>
                        <Select.Trigger hasError={Boolean(errors.parking_spaces)}>
                          <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
                            {selectedParkingSpaces.length === 0 ? (
                              <span className='text-text-soft-400'>Select</span>
                            ) : (
                              <>
                                {parkingSelectionDisplayLabels
                                  .slice(0, CLIENT_ALLOCATE_PARKING_VISIBLE_BADGES)
                                  .map((lab, i) => (
                                    <Badge.Root
                                      key={`${String(lab)}-${i}`}
                                      variant='lighter'
                                      color='gray'
                                      size='medium'
                                    >
                                      <span className='paragraph-small block max-w-[100px] truncate font-medium text-text-strong-950'>
                                        {lab}
                                      </span>
                                    </Badge.Root>
                                  ))}
                                {parkingSelectionDisplayLabels.length >
                                CLIENT_ALLOCATE_PARKING_VISIBLE_BADGES ? (
                                  <Tooltip.Root>
                                    <Tooltip.Trigger asChild>
                                      <Badge.Root variant='lighter' color='gray' size='medium'>
                                        <span className='text-label-xs font-semibold text-text-strong-950'>
                                          +
                                          {parkingSelectionDisplayLabels.length -
                                            CLIENT_ALLOCATE_PARKING_VISIBLE_BADGES}
                                        </span>
                                      </Badge.Root>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content
                                      size='small'
                                      variant='light'
                                      side='top'
                                      className='max-w-xs'
                                    >
                                      <div className='flex flex-col gap-1'>
                                        <span className='mb-1 text-paragraph-sm font-medium text-text-strong-950'>
                                          Additional Parkings (
                                          {parkingSelectionDisplayLabels.length -
                                            CLIENT_ALLOCATE_PARKING_VISIBLE_BADGES}
                                          )
                                        </span>
                                        <div className='flex flex-col gap-1'>
                                          {parkingSelectionDisplayLabels
                                            .slice(CLIENT_ALLOCATE_PARKING_VISIBLE_BADGES)
                                            .map((lab, index) => (
                                              <div
                                                key={index}
                                                className='text-paragraph-sm text-text-sub-600'
                                              >
                                                {lab}
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    </Tooltip.Content>
                                  </Tooltip.Root>
                                ) : null}
                              </>
                            )}
                          </div>
                        </Select.Trigger>
                        <Select.Content>
                          {spaceId && parkingSubSpaces.length > 0 ? (
                            <div className='w-full flex flex-col gap-2 py-2'>
                              <span className='label-small flex items-center gap-2 p-2 rounded-md bg-bg-weak-100'>
                                <RiBuildingLine size={16} className='text-primary-base' />
                                {selectedSpace?.floor || parkingFloor || '--'}
                              </span>
                              {parkingSubSpaces.map((subSpace, idx) => {
                                const subSpaceId = subSpace.desk_id || subSpace.name || String(idx);
                                const parkingNoValue = subSpace.parking_no || subSpaceId;
                                const label = parkingNoValue;
                                const isSelected = selectedParkingSpaces.includes(parkingNoValue);
                                const isOccupied =
                                  subSpace.occupied === 1 ||
                                  String(subSpace.desk_status || '').toLowerCase() === 'occupied';
                                const isLocked = Number(subSpace.locked) === 1;
                                const isInactive = subSpace.active === 0;
                                const isDisabled =
                                  loadingSubSpaces || isOccupied || isInactive || isLocked;

                                return (
                                  <span
                                    key={subSpaceId}
                                    className={`flex items-center gap-2 pl-3 paragraph-small ${
                                      isDisabled
                                        ? 'cursor-not-allowed opacity-50'
                                        : 'cursor-pointer'
                                    }`}
                                  >
                                    <Checkbox.Root
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        const current = selectedParkingSpaces || [];
                                        const next = checked
                                          ? [...new Set([...current, parkingNoValue])]
                                          : current.filter((id) => id !== parkingNoValue);
                                        setValue('parking_spaces', next, { shouldValidate: true });
                                      }}
                                      disabled={isDisabled}
                                    />
                                    <span
                                      className={
                                        isOccupied || isInactive || isLocked
                                          ? 'text-text-sub-500'
                                          : ''
                                      }
                                    >
                                      {label}
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <div className='px-3 py-2 text-paragraph-sm text-text-sub-500'>
                              {!spaceId
                                ? 'Select space first'
                                : loadingSubSpaces
                                  ? 'Loading parkings...'
                                  : 'No parking found'}
                            </div>
                          )}
                        </Select.Content>
                      </Select.Root>
                      {errors.parking_spaces && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiErrorWarningFill} />
                          {errors.parking_spaces.message}
                        </Hint.Root>
                      )}
                    </div>
                  </>
                )}

                {/* Space/Resource Selection */}
                {shouldShowSpaceSelection(spaceType, coworkingSpaceType) && (
                  <div className='flex flex-col gap-1'>
                    <Label.Root>
                      {spaceType === SPACE_TYPE.RESOURCE ? 'Resource' : 'Space'}
                      <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='space_id'
                      control={control}
                      render={({ field }) => (
                        <Select.Root
                          value={field.value}
                          onValueChange={field.onChange}
                          hasError={Boolean(errors.space_id)}
                          size='xsmall'
                          disabled={loadingSpaces || !center}
                        >
                          <Select.Trigger>
                            {field.value ? (
                              <Select.Value>
                                {spaces.find((space) => space.name === field.value)
                                  ?.inventory_name ||
                                  spaces.find((space) => space.name === field.value)?.name}
                              </Select.Value>
                            ) : (
                              <Select.Value placeholder='Select' />
                            )}
                          </Select.Trigger>
                          <Select.Content>
                            {filteredSpaces.length > 0 ? (
                              filteredSpaces.map((space) => (
                                <Select.Item key={space.name} value={space.name}>
                                  <div className='flex flex-col gap-1'>
                                    <span className='text-paragraph-sm text-text-main-900'>
                                      {space.inventory_name || space.name}
                                    </span>
                                    <div className='flex flex-wrap items-center gap-2'>
                                      <div className='flex items-center gap-1.5'>
                                        <RiBuildingLine className='size-4 text-text-sub-500 shrink-0' />
                                        <span className='text-paragraph-xs text-text-sub-500'>
                                          {space.center_name || 'Unknown Center'}{' '}
                                          {space.center && (
                                            <span className='text-[11px] uppercase tracking-[0.22px] text-icon-soft-400'>
                                              ({space.center})
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                      <span className='size-1 rounded-full bg-icon-soft-400 shrink-0' />
                                      <div className='flex items-center gap-1.5'>
                                        <RiPriceTag3Line className='size-4 text-text-sub-500 shrink-0' />
                                        <span className='text-paragraph-xs text-text-sub-500'>
                                          Floor {space.floor || '--'}
                                        </span>
                                      </div>
                                      {spaceType === SPACE_TYPE.RESOURCE ? (
                                        <>
                                          {space.resource_type && (
                                            <>
                                              <span className='size-1 rounded-full bg-icon-soft-400 shrink-0' />
                                              <div className='flex items-center gap-1.5'>
                                                <RiPriceTag3Line className='size-4 text-text-sub-500 shrink-0' />
                                                <span className='text-paragraph-xs text-text-sub-500'>
                                                  {space.resource_type}
                                                </span>
                                              </div>
                                            </>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          <span className='size-1 rounded-full bg-icon-soft-400 shrink-0' />
                                          {spaceType !== SPACE_TYPE.PURE_RENTAL ? (
                                            <div className='flex items-center gap-1.5'>
                                              <PiChair className='size-4 text-text-sub-500 shrink-0' />
                                              <span className='text-paragraph-xs text-text-sub-500'>
                                                {space.available_seats || '--'} Seats
                                              </span>
                                            </div>
                                          ) : null}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </Select.Item>
                              ))
                            ) : (
                              <div className='px-3 py-2 text-paragraph-sm text-text-sub-500'>
                                {loadingSpaces
                                  ? 'Loading spaces...'
                                  : spaceSearch.trim()
                                    ? 'No spaces found matching your search'
                                    : center && spaceType
                                      ? `No ${spaceType === SPACE_TYPE.RESOURCE ? 'resources' : 'spaces'} available for the selected criteria`
                                      : 'Please select center and space type first'}
                              </div>
                            )}
                          </Select.Content>
                        </Select.Root>
                      )}
                    />
                    {selectedSpace && (
                      <div className='flex items-start gap-1 px-0 py-0.5'>
                        <span className='text-paragraph-xs text-text-sub-500'>
                          {selectedSpace.center_name || 'Unknown Center'} (
                          {selectedSpace.center || '--'}) •{' '}
                          {selectedSpace.floor
                            ? `${selectedSpace.floor}${(() => {
                                const floorNumber = Number(selectedSpace.floor);
                                if (floorNumber === 1) return 'st';
                                if (floorNumber === 2) return 'nd';
                                if (floorNumber === 3) return 'rd';
                                return 'th';
                              })()} Floor`
                            : 'Floor --'}
                          {spaceType === SPACE_TYPE.RESOURCE ? (
                            <>
                              {selectedSpace.resource_type && ` • ${selectedSpace.resource_type}`}
                            </>
                          ) : spaceType === SPACE_TYPE.PURE_RENTAL ? (
                            ''
                          ) : (
                            ` • ${selectedSpace.available_seats || 0} Seats Available`
                          )}
                        </span>
                      </div>
                    )}
                    {errors.space_id && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningFill} />
                        {errors.space_id.message}
                      </Hint.Root>
                    )}
                  </div>
                )}
              </div>

              {/* Lease Duration */}
              {spaceId && (
                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2'>
                    <RiTimeLine className='text-text-soft-400' />
                    <Label.Root className='text-label-md text-text-sub-500'>
                      Lease Duration
                    </Label.Root>
                  </div>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='flex flex-col gap-1'>
                      <Label.Root>
                        Start Date <Label.Asterisk />
                      </Label.Root>
                      <Controller
                        name='from_date'
                        control={control}
                        render={({ field }) => (
                          <Datepicker
                            value={field.value ? new Date(field.value) : undefined}
                            onChange={(date) => {
                              field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                            }}
                            placeholder='Select start date'
                            hasError={Boolean(errors.from_date)}
                            size='xsmall'
                            variant='default'
                          />
                        )}
                      />
                      {errors.from_date && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiErrorWarningFill} />
                          {errors.from_date.message}
                        </Hint.Root>
                      )}
                    </div>
                    <div className='flex flex-col gap-1'>
                      <Label.Root>
                        End Date <Label.Asterisk />
                      </Label.Root>
                      <Controller
                        name='to_date'
                        control={control}
                        render={({ field }) => (
                          <Datepicker
                            value={field.value ? new Date(field.value) : undefined}
                            onChange={(date) => {
                              field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                            }}
                            placeholder='Select end date'
                            hasError={Boolean(errors.to_date)}
                            size='xsmall'
                            variant='default'
                            min={watch('from_date') ? new Date(watch('from_date')) : undefined}
                          />
                        )}
                      />
                      {errors.to_date && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiErrorWarningFill} />
                          {errors.to_date.message}
                        </Hint.Root>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Carpet Details (Pure Rental) */}
              {spaceId && isPureRentalType && (
                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2'>
                    <RiPriceTag3Line className='text-text-soft-400' />
                    <Label.Root className='text-label-md text-text-sub-500'>
                      Carpet Details
                    </Label.Root>
                  </div>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='flex flex-col gap-1'>
                      <Label.Root>Agreement Carpet Area</Label.Root>
                      <Controller
                        name='total_carpet_sft'
                        control={control}
                        render={({ field }) => (
                          <Input.Root size='xsmall'>
                            <Input.Wrapper>
                              <Input.Input
                                type='text'
                                value={field.value ?? ''}
                                onChange={field.onChange}
                                placeholder='--'
                                readOnly
                              />
                              <Input.Affix>sq.ft.</Input.Affix>
                            </Input.Wrapper>
                          </Input.Root>
                        )}
                      />
                    </div>
                    <div className='flex flex-col gap-1'>
                      <Label.Root>Total Carpet Rate</Label.Root>
                      <Controller
                        name='expected_carpet_rate'
                        control={control}
                        render={({ field }) => (
                          <Input.Root size='xsmall'>
                            <Input.Wrapper>
                              <Input.Input
                                type='text'
                                value={field.value ?? ''}
                                onChange={field.onChange}
                                placeholder='--'
                                readOnly
                              />
                              <Input.Affix>₹</Input.Affix>
                            </Input.Wrapper>
                          </Input.Root>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}
              {/* Credit & Price Details */}
              {spaceId && !isPureRentalType && (
                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2'>
                    <RiMoneyDollarCircleLine className='text-text-soft-400' />
                    <Label.Root className='text-label-md text-text-sub-500'>
                      Credit & Price Details
                    </Label.Root>
                  </div>
                  <div className='flex flex-col gap-4'>
                    {/* For Hot Desk and Dedicated Desk: 4 fields layout */}
                    {requiresSeatSelection(spaceType, coworkingSpaceType) ? (
                      <>
                        <div className='grid grid-cols-2 gap-4'>
                          <div className='flex flex-col gap-1'>
                            <Label.Root>Assigned Seats</Label.Root>
                            <Controller
                              name='number_of_seats'
                              control={control}
                              render={({ field }) => (
                                <Input.Root
                                  size='xsmall'
                                  hasError={Boolean(errors.number_of_seats)}
                                >
                                  <Input.Wrapper>
                                    <Input.Input
                                      type='number'
                                      value={field.value || ''}
                                      onChange={(e) => {
                                        const value =
                                          e.target.value === '' ? '' : Number(e.target.value);
                                        const maxSeats = selectedSpace?.total_seats || 0;
                                        if (value > maxSeats) {
                                          showErrorToast(
                                            `Maximum ${maxSeats} seat(s) available for this space`,
                                          );
                                          field.onChange(maxSeats);
                                          return;
                                        }
                                        field.onChange(value);
                                        // Clear selected seats if the new value is less than current selections
                                        if (value < selectedSeats.length) {
                                          setSelectedSeats((prev) => prev.slice(0, value));
                                        }
                                      }}
                                      placeholder='0'
                                      min={0}
                                      max={selectedSpace?.total_seats || undefined}
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                              )}
                            />
                          </div>
                          {!isParkingType && (
                            <div className='flex flex-col gap-1'>
                              <Label.Root>Credit Per Seat</Label.Root>
                              <Controller
                                name='credit_per_seat'
                                control={control}
                                render={({ field }) => (
                                  <Input.Root
                                    size='xsmall'
                                    hasError={Boolean(errors.credit_per_seat)}
                                  >
                                    <Input.Wrapper>
                                      <Input.Input
                                        type='number'
                                        value={field.value || ''}
                                        onChange={(e) => {
                                          const value =
                                            e.target.value === '' ? '' : Number(e.target.value);
                                          field.onChange(value);
                                        }}
                                        placeholder='0'
                                      />
                                    </Input.Wrapper>
                                  </Input.Root>
                                )}
                              />
                              {totalCredits > 0 && (
                                <Hint.Root className='px-0 py-0.5'>
                                  <Hint.Icon as={RiErrorWarningFill} />
                                  <span>{totalCredits} Credits (total seat x credit)</span>
                                </Hint.Root>
                              )}
                            </div>
                          )}
                        </div>
                        <div className='grid grid-cols-2 gap-4'>
                          <div className='flex flex-col gap-1'>
                            <Label.Root>Expected Per Seat Rate (₹)</Label.Root>
                            <Controller
                              name='expected_per_seat_rate'
                              control={control}
                              render={({ field }) => (
                                <Input.Root
                                  size='xsmall'
                                  hasError={Boolean(errors.expected_per_seat_rate)}
                                >
                                  <Input.Wrapper>
                                    <Input.Input
                                      type='number'
                                      value={field.value || ''}
                                      onChange={(e) => {
                                        const value =
                                          e.target.value === '' ? '' : Number(e.target.value);
                                        field.onChange(value);
                                      }}
                                      placeholder='0'
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                              )}
                            />
                          </div>
                          <div className='flex flex-col gap-1'>
                            <Label.Root>Total Rate (₹)</Label.Root>
                            <Controller
                              name='total_rate'
                              control={control}
                              render={({ field }) => (
                                <Input.Root size='xsmall' hasError={Boolean(errors.total_rate)}>
                                  <Input.Wrapper>
                                    <Input.Input
                                      type='number'
                                      value={field.value || ''}
                                      onChange={(e) => {
                                        const value =
                                          e.target.value === '' ? '' : Number(e.target.value);
                                        field.onChange(value);
                                      }}
                                      placeholder='0'
                                      readOnly
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                              )}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      /* For Managed Office, Private Cabin, and Manager Cabin: 3 fields layout */
                      <>
                        <div className='grid grid-cols-2 gap-4'>
                          {!isParkingType && (
                            <div className='flex flex-col gap-1'>
                              <Label.Root>Credit Per Seat</Label.Root>
                              <Controller
                                name='credit_per_seat'
                                control={control}
                                render={({ field }) => (
                                  <Input.Root
                                    size='xsmall'
                                    hasError={Boolean(errors.credit_per_seat)}
                                  >
                                    <Input.Wrapper>
                                      <Input.Input
                                        type='number'
                                        value={field.value || ''}
                                        onChange={(e) => {
                                          const value =
                                            e.target.value === '' ? '' : Number(e.target.value);
                                          field.onChange(value);
                                        }}
                                        placeholder='0'
                                      />
                                    </Input.Wrapper>
                                  </Input.Root>
                                )}
                              />
                              {totalCredits > 0 && (
                                <Hint.Root className='px-0 py-0.5'>
                                  <Hint.Icon as={RiErrorWarningFill} />
                                  <span>{totalCredits} Credits (total seat x credit)</span>
                                </Hint.Root>
                              )}
                            </div>
                          )}
                          <div className='flex flex-col gap-1'>
                            <Label.Root>
                              {isParkingType
                                ? 'Expected Per Parking Rate (₹)'
                                : 'Expected Per Seat Rate (₹)'}
                            </Label.Root>
                            <Controller
                              name='expected_per_seat_rate'
                              control={control}
                              render={({ field }) => (
                                <Input.Root
                                  size='xsmall'
                                  hasError={Boolean(errors.expected_per_seat_rate)}
                                >
                                  <Input.Wrapper>
                                    <Input.Input
                                      type='number'
                                      value={field.value || ''}
                                      onChange={(e) => {
                                        const value =
                                          e.target.value === '' ? '' : Number(e.target.value);
                                        field.onChange(value);
                                      }}
                                      placeholder='0'
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                              )}
                            />
                          </div>
                          {isParkingType && (
                            <div className='flex flex-col gap-1'>
                              <Label.Root>Total Rate (₹)</Label.Root>
                              <Controller
                                name='total_rate'
                                control={control}
                                render={({ field }) => (
                                  <Input.Root size='xsmall' hasError={Boolean(errors.total_rate)}>
                                    <Input.Wrapper>
                                      <Input.Input
                                        type='number'
                                        value={field.value || ''}
                                        onChange={(e) => {
                                          const value =
                                            e.target.value === '' ? '' : Number(e.target.value);
                                          field.onChange(value);
                                        }}
                                        placeholder='0'
                                        readOnly
                                      />
                                    </Input.Wrapper>
                                  </Input.Root>
                                )}
                              />
                            </div>
                          )}
                        </div>
                        {!isParkingType && (
                          <div className='flex flex-col gap-1'>
                            <Label.Root>Total Rate (₹)</Label.Root>
                            <Controller
                              name='total_rate'
                              control={control}
                              render={({ field }) => (
                                <Input.Root size='xsmall' hasError={Boolean(errors.total_rate)}>
                                  <Input.Wrapper>
                                    <Input.Input
                                      type='number'
                                      value={field.value || ''}
                                      onChange={(e) => {
                                        const value =
                                          e.target.value === '' ? '' : Number(e.target.value);
                                        field.onChange(value);
                                      }}
                                      placeholder='0'
                                      readOnly
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                              )}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* Notes Field */}
              <div className='flex flex-col gap-2'>
                <Label.Root>Notes</Label.Root>
                <Textarea.Root
                  simple
                  placeholder='Type here...'
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  tabIndex={-1}
                />
              </div>
            </Modal.Body>

            <Modal.Footer className='shrink-0'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='ghost'
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button.Root>
              <Button.Root
                type={requiresSeatSelection(spaceType, coworkingSpaceType) ? 'button' : 'button'}
                variant='primary'
                onClick={
                  requiresSeatSelection(spaceType, coworkingSpaceType)
                    ? handleChooseSeats
                    : (e) => {
                        e.preventDefault();
                        handleSubmit(onSubmit, (errors) => {
                          if (errors && Object.keys(errors).length > 0) {
                            // Show first error
                            const firstError = Object.values(errors)[0];
                            if (firstError?.message) {
                              showErrorToast(firstError.message);
                            }
                          }
                        })();
                      }
                }
                disabled={isSubmitting}
                size='small'
              >
                <span>
                  {isSubmitting
                    ? 'Saving...'
                    : requiresSeatSelection(spaceType, coworkingSpaceType)
                      ? 'Choose Seats'
                      : 'Save'}
                </span>
                {requiresSeatSelection(spaceType, coworkingSpaceType) && (
                  <RiArrowRightSLine size={20} className='ml-2' />
                )}
              </Button.Root>
            </Modal.Footer>
          </form>
        )}

        {showSeatSelection && (
          <Modal.Footer className='relative shrink-0'>
            {/* Back Button */}
            <LinkButton.Root
              type='button'
              variant='gray'
              size='small'
              onClick={() => {
                setShowSeatSelection(false);
                setSelectedSeats([]);
              }}
              disabled={isSubmitting}
            >
              <LinkButton.Icon as={RiArrowLeftSLine} />
              Back
            </LinkButton.Root>

            {/* Legend - Center (Absolutely Positioned) */}
            <div className='flex items-center rounded-full gap-4 absolute left-1/2 -translate-x-1/2'>
              <div className='flex items-center gap-1.5'>
                <div className='rounded-full border w-3 h-3 bg-success-lighter border-success-base' />
                <span
                  className='font-medium text-text-sub-500'
                  style={{
                    fontSize: '12px',
                    lineHeight: '16px',
                  }}
                >
                  Selected
                </span>
              </div>
              <div className='flex items-center gap-1.5'>
                <div className='rounded-full border w-3 h-3 bg-bg-white-0 border-stroke-soft-200' />
                <span
                  className='font-medium text-text-sub-500'
                  style={{
                    fontSize: '12px',
                    lineHeight: '16px',
                  }}
                >
                  Available
                </span>
              </div>
              <div className='flex items-center gap-1.5'>
                <div className='rounded-full border w-3 h-3 bg-faded-lighter border-stroke-soft-200' />
                <span
                  className='font-medium text-text-sub-500'
                  style={{
                    fontSize: '12px',
                    lineHeight: '16px',
                  }}
                >
                  Occupied
                </span>
              </div>
            </div>

            {/* Action Buttons - Right */}
            <div className='flex items-center gap-3'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                onClick={() => {
                  setShowSeatSelection(false);
                  setSelectedSeats([]);
                  onOpenChange(false);
                }}
                disabled={isSubmitting}
                size='small'
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='button'
                variant='primary'
                onClick={handleConfirmSeats}
                disabled={isSubmitting || selectedSeats.length === 0}
                size='small'
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button.Root>
            </div>
          </Modal.Footer>
        )}
      </Modal.Content>
    </Modal.Root>
  );
};

export default AllocateSpaceModal;
