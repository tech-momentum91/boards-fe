import React, { useMemo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { format } from 'date-fns';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiBox3Line,
  RiBuildingLine,
  RiErrorWarningFill,
  RiInformationLine,
  RiMoneyDollarCircleLine,
  RiSearchLine,
  RiTimeLine,
} from 'react-icons/ri';
import { PiChair, PiChairDuotone } from 'react-icons/pi';

import apiClient from '@/api/axios';
import {
  postAssignClientDeskToSpace,
  postGetAssignSpaceDeselectLayout,
  postGetSpaceLayoutWithDesks,
  postSaveClientManagedOfficeAssignSpace,
} from '@/api/clientSpaceLayout';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as LinkButton from '@/components/ui/link-button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import * as Textarea from '@/components/ui/textarea';
import { Datepicker } from '@/components/ui/datepicker';
import * as Tooltip from '@/components/ui/tooltip';
import * as Badge from '@/components/ui/badge';
import { postSaveClientCoworkingAssignSpace } from '@/api/clientFloorLayout';
import {
  assignSpace,
  createParkingFcfsAssignments,
  fetchSpaceDetail,
  updateAssignedSpace,
} from '@/redux/spaceSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { requiresSeatSelection } from '@/components/clients-management/constants';
import { normalizeCoworkingInventoryType } from '@/utils/layout-coworking-inventory-type';
import { buildLayoutCoworkingAssignSpacePayload } from '@/utils/layout-coworker-sub-space-assign-payload';
import { buildManagedOfficeAssignSpacePayload } from '@/utils/layout-managed-office-assign-payload';
import { hasLayoutSpaceClientAssignment } from '@/utils/layout-annotation-space';
import {
  buildAssignSubSpacesFromDeskSelection,
  countAvailableDeskOptions,
  flattenSubSpacesToDeskOptions,
  getAssignSubSpaceDeskValues,
  getDeskOptionStatus,
  isDeskOptionUnavailable,
} from '@/utils/coworking-desk-options';
import {
  buildLayoutDeskAssignItems,
  buildLayoutDeskMetaMap,
  collectClientAssignedDeskIds,
  isLayoutDeskSelectable,
  mapAssignSpaceDeselectLayoutToPickerMessage,
} from '@/utils/space-layout-desk-picker-utils';
import SpaceAllocateLayoutDeskPicker from '@/components/space-management/space-allocate-layout-desk-picker';
import { findMatchingPricing } from '@/utils/center-configuration-storage';

/** Parking labels shown as badges in Select Parkings trigger before +N. */
const SPACE_ALLOCATE_PARKING_VISIBLE_BADGES = 2;
/** FCFS clients shown as badges in Clients trigger before +N. */
const FCFS_CLIENT_VISIBLE_TAGS = 4;

const formatRateFieldValue = (value) =>
  value === '' || value === null || value === undefined || Number.isNaN(Number(value))
    ? ''
    : String(value);

const formatLeaseDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? String(dateStr) : format(d, 'MMM dd, yyyy');
};

const getParkingOptionStatus = (option) => getDeskOptionStatus(option);

const AllocatedSpaceModal = ({
  isReducingSeats,
  isOpen,
  onOpenChange,
  clientsList = [],
  spaceData,
  headerDescription,
  onAllocateSuccess,
  /** When set, client is pre-selected and the client dropdown is hidden. */
  lockedCustomerId,
  /** Layout allocation: use assigned seat count only; marker saved separately. */
  skipSeatSelection = false,
  /** Sub-space row for layout co-working assign API (Mark CoWorkers flow). */
  layoutSubSpaceId = '',
  /** Occupied assignment seat reduction: prefill form and PATCH on save after desk unselect. */
  seatReductionContext = null,
}) => {
  const dispatch = useDispatch();
  const assignSpaceLoading = useSelector((state) => state.space.assignSpace?.isLoading);
  const [isCoworkingLayoutAssignSaving, setIsCoworkingLayoutAssignSaving] = useState(false);
  const [isManagedOfficeAssignSaving, setIsManagedOfficeAssignSaving] = useState(false);
  const [isLayoutDeskAssignSaving, setIsLayoutDeskAssignSaving] = useState(false);
  const [isSeatReductionSaving, setIsSeatReductionSaving] = useState(false);
  const [layoutDeskPickerData, setLayoutDeskPickerData] = useState(null);
  const [loadingLayoutDesks, setLoadingLayoutDesks] = useState(false);
  const [savedLayoutDeskIds, setSavedLayoutDeskIds] = useState([]);
  const [layoutDesksSaved, setLayoutDesksSaved] = useState(false);

  const isSeatReductionMode = Boolean(seatReductionContext?.assignSpaceId);
  const originalAssignedSeats = Number(seatReductionContext?.originalAssignedSeats) || 0;
  const updatedAssignedSeats = Number(seatReductionContext?.updatedAssignedSeats) || 0;
  const seatsToUnselect = isSeatReductionMode
    ? Math.max(0, originalAssignedSeats - updatedAssignedSeats)
    : 0;
  const assignedDeskIds = useMemo(
    () =>
      isSeatReductionMode
        ? getAssignSubSpaceDeskValues(
            seatReductionContext?.assign_sub_spaces ?? seatReductionContext?.assignedDeskIds,
          )
        : [],
    [
      isSeatReductionMode,
      seatReductionContext?.assign_sub_spaces,
      seatReductionContext?.assignedDeskIds,
    ],
  );

  const spaceType = String(spaceData?.spaceType || '').trim();
  const coworkingSpaceType = normalizeCoworkingInventoryType(
    spaceData?.subSpaceType ?? spaceData?._original?.coworking_inventory_type ?? '',
  );
  const needsSeatSelection = requiresSeatSelection(spaceType, coworkingSpaceType);
  const isManagedOffice = spaceType === 'Managed Office';
  const isPureRental = spaceType === 'Pure Rental';
  const isCoworkingSpace = spaceType === 'Co-working Space';
  const isParkingType = spaceType.toLowerCase().includes('parking');
  const isResourceType = spaceType.toLowerCase().includes('resource');
  const isCabinLikeAllocate =
    isManagedOffice ||
    isResourceType ||
    coworkingSpaceType === 'Private Cabin' ||
    coworkingSpaceType === 'Manager Cabin';
  const assigningType = String(
    spaceData?.assigningType ?? spaceData?._original?.assigning_type ?? '',
  ).trim();
  const isFcfsParking = isParkingType && assigningType.toUpperCase() === 'FCFS';
  const useSeatPicker = needsSeatSelection && !skipSeatSelection;
  const useLayoutDeskDeselectPicker = isSeatReductionMode && useSeatPicker;
  const useLayoutDeskPicker = useSeatPicker && !isSeatReductionMode;
  const showLayoutDeskPicker = useLayoutDeskPicker || useLayoutDeskDeselectPicker;
  const useCoworkingLayoutAssignApi = skipSeatSelection && isCoworkingSpace;
  const isSaving = useCoworkingLayoutAssignApi
    ? isCoworkingLayoutAssignSaving
    : isManagedOffice
      ? isManagedOfficeAssignSaving
      : useLayoutDeskPicker
        ? isLayoutDeskAssignSaving
        : isSeatReductionMode
          ? isSeatReductionSaving
          : assignSpaceLoading;
  const shouldFetchSubSpaces = (useSeatPicker && !showLayoutDeskPicker) || isParkingType;
  const isOccupied = hasLayoutSpaceClientAssignment(spaceData, spaceData?.clients);
  const spaceAvailableSeatsRaw =
    spaceData?.available_seats ??
    spaceData?.availableSeats ??
    spaceData?._original?.available_seats;
  const hasSpaceAvailableSeats = spaceAvailableSeatsRaw != null && spaceAvailableSeatsRaw !== '';
  const layoutAvailableSeats = hasSpaceAvailableSeats ? Number(spaceAvailableSeatsRaw) : null;
  const layoutTotalSeats = Number(spaceData?.total_seats ?? spaceData?.totalSeats ?? 0);

  const [selectedClient, setSelectedClient] = useState(undefined);
  const [selectedClients, setSelectedClients] = useState([]);
  const [creditPerSeat, setCreditPerSeat] = useState(0);
  const [expectedPerSeatRate, setExpectedPerSeatRate] = useState(0);
  const [searchClient, setSearchClient] = useState('');
  const [assignedSeats, setAssignedSeats] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [allocatedSeats, setAllocatedSeats] = useState(0);
  const [subSpaces, setSubSpaces] = useState([]);
  const [loadingSubSpaces, setLoadingSubSpaces] = useState(false);

  const removedSeatCount = assignedDeskIds.length - selectedSeats.length;
  const isSeatReductionReady = isSeatReductionMode && removedSeatCount === seatsToUnselect;

  const lockedCustomerLabel = useMemo(() => {
    const id = String(lockedCustomerId || '').trim();
    if (!id) return '';
    const match = (clientsList || []).find((c) => String(c?.name || '').trim() === id);
    return match?.customer_name || match?.custom_legal_name || match?.name || id;
  }, [lockedCustomerId, clientsList]);

  const effectiveSelectedClient =
    String(lockedCustomerId || selectedClient || '').trim() || undefined;

  const hasSelectedClient = isFcfsParking
    ? selectedClients.length > 0
    : Boolean(effectiveSelectedClient);

  const clientOptions = useMemo(
    () =>
      (clientsList || []).map((client) => ({
        value: client.name,
        label: client.customer_name || client.custom_legal_name || client.name,
      })),
    [clientsList],
  );

  /** Max assignable seats: prefer Space `available_seats`; fallback to get_sub_spaces desk count. */
  const seatsAvailableCap = useMemo(() => {
    if (useCoworkingLayoutAssignApi) {
      return hasSpaceAvailableSeats && Number.isFinite(layoutAvailableSeats)
        ? Math.max(0, layoutAvailableSeats)
        : 0;
    }
    if (hasSpaceAvailableSeats && Number.isFinite(layoutAvailableSeats)) {
      return Math.max(0, layoutAvailableSeats);
    }
    return Math.max(0, Number(allocatedSeats) || 0);
  }, [allocatedSeats, layoutAvailableSeats, hasSpaceAvailableSeats, useCoworkingLayoutAssignApi]);

  const seatsAvailableHint = useMemo(() => {
    if (seatsAvailableCap <= 0) return 'No seats available';
    const total =
      Number.isFinite(layoutTotalSeats) && layoutTotalSeats > 0 ? layoutTotalSeats : null;
    if (total != null && total !== seatsAvailableCap) {
      return `${seatsAvailableCap} seat(s) available (${total} total on this space)`;
    }
    return `${seatsAvailableCap} seat(s) available`;
  }, [seatsAvailableCap, layoutTotalSeats]);

  const filteredClients = useMemo(() => {
    const q = String(searchClient || '')
      .trim()
      .toLowerCase();
    if (!q) return clientsList || [];
    return (clientsList || []).filter((c) =>
      String(c?.customer_name || c?.custom_legal_name || c?.name || '')
        .toLowerCase()
        .includes(q),
    );
  }, [clientsList, searchClient]);

  const coworkingSelectableDesks = useMemo(
    () => (useSeatPicker && !showLayoutDeskPicker ? flattenSubSpacesToDeskOptions(subSpaces) : []),
    [useSeatPicker, showLayoutDeskPicker, subSpaces],
  );

  const layoutDeskMetaMap = useMemo(
    () => (layoutDeskPickerData ? buildLayoutDeskMetaMap(layoutDeskPickerData) : new Map()),
    [layoutDeskPickerData],
  );

  const parkingSelectableOptions = useMemo(() => {
    if (!isParkingType) return [];
    const options = [];
    (subSpaces || []).forEach((subSpace, idx) => {
      const subSpaceId = String(subSpace?.sub_space_id || subSpace?.name || idx);
      const desks = Array.isArray(subSpace?.desks) ? subSpace.desks : [];
      if (desks.length > 0) {
        desks.forEach((desk, deskIdx) => {
          const deskId = String(desk?.desk_id || desk?.name || '').trim();
          if (!deskId) return;
          options.push({
            value: deskId,
            label: deskId,
            subSpaceId,
            status: getParkingOptionStatus(desk),
            locked: desk?.locked ?? subSpace?.locked,
            active: desk?.active ?? subSpace?.active,
            occupied: desk?.occupied ?? subSpace?.occupied,
            requested: desk?.requested ?? subSpace?.requested,
            is_requested: desk?.is_requested ?? subSpace?.is_requested,
            sortSeq: Number(desk?.sequence ?? desk?.seq ?? deskIdx + 1) || deskIdx + 1,
          });
        });
      } else {
        const parkingNoValue = String(subSpace?.parking_no || subSpaceId).trim();
        if (!parkingNoValue) return;
        options.push({
          value: parkingNoValue,
          label: parkingNoValue,
          subSpaceId,
          status: getParkingOptionStatus(subSpace),
          locked: subSpace?.locked,
          active: subSpace?.active,
          occupied: subSpace?.occupied,
          requested: subSpace?.requested,
          is_requested: subSpace?.is_requested,
          sortSeq: Number(subSpace?.seq || idx + 1) || idx + 1,
        });
      }
    });
    return options.sort((a, b) =>
      a.sortSeq === b.sortSeq ? a.label.localeCompare(b.label) : a.sortSeq - b.sortSeq,
    );
  }, [isParkingType, subSpaces]);

  const parkingSelectionDisplayLabels = useMemo(() => {
    if (!isParkingType) return [];
    return (selectedSeats || []).map((value) => {
      const selected = parkingSelectableOptions.find((opt) => opt.value === value);
      return selected ? selected.label : String(value);
    });
  }, [isParkingType, selectedSeats, parkingSelectableOptions]);

  const selectedParkingSubSpaceIds = useMemo(() => {
    if (!isParkingType) return [];
    const ids = new Set();
    (selectedSeats || []).forEach((seatValue) => {
      const selected = parkingSelectableOptions.find((opt) => opt.value === seatValue);
      if (selected?.subSpaceId) ids.add(selected.subSpaceId);
    });
    return [...ids];
  }, [isParkingType, selectedSeats, parkingSelectableOptions]);

  const parsedAssignedSeats = Number(assignedSeats || 0);

  const clientAssignedDeskIds = useMemo(
    () => collectClientAssignedDeskIds(layoutDeskPickerData),
    [layoutDeskPickerData],
  );

  const seatCountForPricing =
    isManagedOffice ||
    coworkingSpaceType === 'Private Cabin' ||
    coworkingSpaceType === 'Manager Cabin'
      ? Math.max(0, spaceData?.totalSeats || 0)
      : isPureRental
        ? 1
        : isParkingType
          ? selectedSeats.length
          : parsedAssignedSeats;
  const totalCredits =
    isManagedOffice ||
    coworkingSpaceType === 'Private Cabin' ||
    coworkingSpaceType === 'Manager Cabin'
      ? Math.max(0, spaceData?.totalSeats) * Math.max(0, creditPerSeat)
      : Math.max(0, seatCountForPricing) * Math.max(0, creditPerSeat);
  const totalRate =
    isManagedOffice ||
    coworkingSpaceType === 'Private Cabin' ||
    coworkingSpaceType === 'Manager Cabin'
      ? Math.max(0, spaceData?.totalSeats) * Math.max(0, expectedPerSeatRate)
      : Math.max(0, seatCountForPricing) * Math.max(0, expectedPerSeatRate);

  // Fetch sub_spaces using the new API endpoint (dedicated/flexi desk + parking list)
  useEffect(() => {
    const fetchSubSpaces = async () => {
      if (!isOpen || !shouldFetchSubSpaces || !spaceData?.id) {
        setSubSpaces([]);
        return;
      }

      setLoadingSubSpaces(true);
      try {
        const response = await apiClient.get(
          '/method/devx.seat_inventory.doctype.assign_space.assign_space.get_sub_spaces',
          { params: { space_id: spaceData.id } },
        );
        const subSpacesData = response.data?.message?.sub_spaces || [];
        const deskOptions = flattenSubSpacesToDeskOptions(subSpacesData);
        const fromApi =
          deskOptions.length > 0
            ? countAvailableDeskOptions(deskOptions)
            : Number(response.data?.message?.total_available_sub_spaces ?? 0) || 0;
        if (hasSpaceAvailableSeats && Number.isFinite(layoutAvailableSeats)) {
          setAllocatedSeats(Math.max(0, layoutAvailableSeats));
        } else {
          setAllocatedSeats(fromApi);
        }
        // Sort by seq to maintain order
        const sortedSubSpaces = [...subSpacesData].sort((a, b) => (a.seq || 0) - (b.seq || 0));
        setSubSpaces(sortedSubSpaces);
      } catch (error) {
        console.error('Error fetching sub_spaces:', error);
        setSubSpaces([]);
      } finally {
        setLoadingSubSpaces(false);
      }
    };

    fetchSubSpaces();
  }, [isOpen, shouldFetchSubSpaces, spaceData?.id, layoutAvailableSeats, hasSpaceAvailableSeats]);

  useEffect(() => {
    if (!isOpen || !isCoworkingSpace || useCoworkingLayoutAssignApi) return;
    if (hasSpaceAvailableSeats && Number.isFinite(layoutAvailableSeats)) {
      setAllocatedSeats(Math.max(0, layoutAvailableSeats));
    }
  }, [
    isOpen,
    isCoworkingSpace,
    layoutAvailableSeats,
    hasSpaceAvailableSeats,
    useCoworkingLayoutAssignApi,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    if (isSeatReductionMode) {
      setSelectedClient(
        String(seatReductionContext?.customerId || lockedCustomerId || '').trim() || undefined,
      );
      setSelectedClients([]);
      setSearchClient('');
      setAssignedSeats(String(updatedAssignedSeats));
      setStartDate(seatReductionContext?.startDate || '');
      setEndDate(seatReductionContext?.endDate || '');
      setNotes(seatReductionContext?.notes || '');
      setErrors({});
      setShowSeatSelection(false);
      setSelectedSeats([...assignedDeskIds]);
      setSavedLayoutDeskIds([]);
      setLayoutDesksSaved(false);
      setLayoutDeskPickerData(null);
      setLoadingLayoutDesks(false);
      setCreditPerSeat(Number(seatReductionContext?.creditPerSeat ?? 0));
      setExpectedPerSeatRate(Number(seatReductionContext?.expectedPerSeatRate ?? 0));
      return;
    }

    // Reset when opening, so every allocation starts clean.
    setSelectedClient(String(lockedCustomerId || '').trim() || undefined);
    setSelectedClients([]);
    setSearchClient('');
    setAssignedSeats('');
    setStartDate('');
    setEndDate('');
    setNotes('');
    setErrors({});
    setShowSeatSelection(false);
    setSelectedSeats([]);
    setSavedLayoutDeskIds([]);
    setLayoutDesksSaved(false);
    setSubSpaces([]);
    setLayoutDeskPickerData(null);
    setLoadingLayoutDesks(false);
    setCreditPerSeat(
      isParkingType || isPureRental
        ? 0
        : Number(
            spaceData?.creditPerSeat ??
              spaceData?.credit_per_seat ??
              spaceData?._original?.credit_per_seat ??
              0,
          ),
    );
    setExpectedPerSeatRate(
      isFcfsParking
        ? 0
        : Number(
            spaceData?.seatRate ??
              spaceData?.expected_per_seat_cost ??
              spaceData?.expected_per_seat_rate ??
              spaceData?._original?.expected_per_seat_rate ??
              0,
          ),
    );
  }, [
    isOpen,
    isFcfsParking,
    isParkingType,
    isPureRental,
    spaceData?.creditPerSeat,
    spaceData?.credit_per_seat,
    spaceData?.seatRate,
    spaceData?.expected_per_seat_cost,
    spaceData?.expected_per_seat_rate,
    lockedCustomerId,
    isSeatReductionMode,
    seatReductionContext,
    updatedAssignedSeats,
    assignedDeskIds,
  ]);

  useEffect(() => {
    if (!useLayoutDeskPicker || !layoutDesksSaved) return;
    if (savedLayoutDeskIds.length !== parsedAssignedSeats) {
      setLayoutDesksSaved(false);
      setSavedLayoutDeskIds([]);
    }
  }, [
    assignedSeats,
    layoutDesksSaved,
    parsedAssignedSeats,
    savedLayoutDeskIds.length,
    useLayoutDeskPicker,
  ]);

  useEffect(() => {
    if (!useLayoutDeskPicker) return;
    setLayoutDeskPickerData(null);
    setSavedLayoutDeskIds([]);
    setLayoutDesksSaved(false);
  }, [effectiveSelectedClient, useLayoutDeskPicker]);

  // Handle client selection change
  const handleClientChange = (value) => {
    setSelectedClient(value);
  };

  const isParkingOptionDisabled = (subSpace) => {
    if (subSpace.occupied === 1) return true;
    if (Number(subSpace.locked) === 1) return true;
    if (subSpace.active === 0) return true;
    if (subSpace.requested === 1 || subSpace.is_requested === 1) return true;
    const status = getParkingOptionStatus(subSpace);
    if (status.includes('occupied')) return true;
    if (status.includes('request')) return true;
    return false;
  };

  const validate = ({ requireLayoutDeskSelection = false } = {}) => {
    const next = {};

    if (isFcfsParking) {
      if (selectedClients.length === 0) next.customer = 'Select at least one client.';
    } else if (!effectiveSelectedClient) {
      next.customer = 'Client is required.';
    }

    // Start and end dates are required
    if (!startDate) {
      next.start_date = 'Start date is required.';
      showErrorToast('Start date is required.');
    }
    if (!endDate) {
      next.end_date = 'End date is required.';
      showErrorToast('End date is required.');
    } else if (startDate && new Date(endDate) < new Date(startDate)) {
      next.end_date = 'End date must be on/after start date.';
    }

    // Assigned seat count before sub-space picker; managed/cabin/resource/pure rental use different rules
    if (!showSeatSelection && !isPureRental && !isCabinLikeAllocate) {
      if (isParkingType) {
        if (selectedSeats.length === 0) {
          next.parking_spaces = 'Please select at least one parking.';
        }
      } else if (!assignedSeats || Number.isNaN(parsedAssignedSeats) || parsedAssignedSeats <= 0) {
        next.assigned_seats = 'Assigned seats must be greater than 0.';
      } else if (!isSeatReductionMode && parsedAssignedSeats > seatsAvailableCap) {
        next.assigned_seats = `You can only allocate up to ${seatsAvailableCap} seat(s). ${seatsAvailableHint}.`;
      }
    }
    if (useSeatPicker && showSeatSelection && selectedSeats.length === 0 && !isSeatReductionMode) {
      next.selected_seats = 'Please select at least one seat.';
    }
    if (
      requireLayoutDeskSelection &&
      useLayoutDeskPicker &&
      !showSeatSelection &&
      !isSeatReductionMode &&
      parsedAssignedSeats > 0
    ) {
      if (!layoutDesksSaved || savedLayoutDeskIds.length === 0) {
        next.selected_seats = 'Choose seats on the layout before submitting.';
      } else if (savedLayoutDeskIds.length !== parsedAssignedSeats) {
        next.selected_seats = `Select exactly ${parsedAssignedSeats} desk(s) on the layout (${savedLayoutDeskIds.length} saved).`;
        showErrorToast(next.selected_seats);
      }
    }
    if (
      requireLayoutDeskSelection &&
      useLayoutDeskDeselectPicker &&
      !showSeatSelection &&
      seatsToUnselect > 0
    ) {
      if (!layoutDesksSaved || savedLayoutDeskIds.length === 0) {
        next.selected_seats = 'Choose seats on the layout before submitting.';
      } else if (savedLayoutDeskIds.length !== updatedAssignedSeats) {
        next.selected_seats = `Keep exactly ${updatedAssignedSeats} desk(s) on the layout (${savedLayoutDeskIds.length} saved).`;
        showErrorToast(next.selected_seats);
      } else if (assignedDeskIds.length - savedLayoutDeskIds.length !== seatsToUnselect) {
        next.selected_seats = `Mark exactly ${seatsToUnselect} desk(s) for removal on the layout.`;
        showErrorToast(next.selected_seats);
      }
    }
    if (
      useSeatPicker &&
      !useLayoutDeskPicker &&
      showSeatSelection &&
      !isSeatReductionMode &&
      parsedAssignedSeats > 0 &&
      selectedSeats.length < parsedAssignedSeats
    ) {
      next.selected_seats = `You have selected ${selectedSeats.length} seat(s), but you entered ${parsedAssignedSeats} seat(s). Please select all ${parsedAssignedSeats} seat(s).`;
    }

    if (!spaceData?.id) next.space_id = 'Space is not loaded yet.';
    if (!spaceData?.centerId) next.center = 'Center is not loaded yet.';
    // Pure Rental spaces can have floor as null in backend response
    if (!isPureRental && !spaceData?.floor) next.floor = 'Floor is not loaded yet.';

    // Managed office / cabin-like / resource pull pricing from Space detail
    if (isCabinLikeAllocate) {
      if (
        !expectedPerSeatRate &&
        !(isManagedOffice && spaceData?.managed_office_type === 'Bare Shell')
      )
        next.expected_per_seat_rate = 'Expected per seat rate is missing for this space.';
      if (!creditPerSeat) next.credit_per_seat = 'Credit per seat is missing for this space.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const loadDeselectLayoutData = async () => {
    setLoadingLayoutDesks(true);
    try {
      const raw = await postGetAssignSpaceDeselectLayout({
        space_id: spaceData.id,
        assign_space_id: seatReductionContext.assignSpaceId,
        center_id: spaceData.centerId,
        floor: spaceData.floor,
      });
      const message = mapAssignSpaceDeselectLayoutToPickerMessage(raw);
      if (!message?.layout_image && !message?.layout_image_url) {
        showErrorToast('No layout is available for this space.');
        return null;
      }
      setLayoutDeskPickerData(message);
      return message;
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to load space layout. Please try again.' });
      return null;
    } finally {
      setLoadingLayoutDesks(false);
    }
  };

  const loadLayoutDeskPickerData = async () => {
    setLoadingLayoutDesks(true);
    try {
      const message = await postGetSpaceLayoutWithDesks({
        space_id: spaceData.id,
        center_id: spaceData.centerId,
        customer_id: effectiveSelectedClient,
        client_id: effectiveSelectedClient,
      });
      if (!message?.layout_image && !message?.layout_image_url) {
        showErrorToast('No layout is available for this space.');
        return null;
      }
      setLayoutDeskPickerData(message);
      return message;
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to load space layout. Please try again.' });
      return null;
    } finally {
      setLoadingLayoutDesks(false);
    }
  };

  const openLayoutDeskPicker = async (deskIdsToPrefill = []) => {
    setSelectedSeats([...deskIdsToPrefill]);
    if (layoutDeskPickerData) {
      setShowSeatSelection(true);
      return;
    }
    const message = await loadLayoutDeskPickerData();
    if (message) setShowSeatSelection(true);
  };

  const handleChooseSeats = async () => {
    if (!validate()) return;
    if (isSeatReductionMode) {
      setSelectedSeats(
        layoutDesksSaved && savedLayoutDeskIds.length > 0
          ? [...savedLayoutDeskIds]
          : [...assignedDeskIds],
      );
      const message = await loadDeselectLayoutData();
      if (message) setShowSeatSelection(true);
      return;
    }

    if (useLayoutDeskPicker) {
      await openLayoutDeskPicker(layoutDesksSaved ? savedLayoutDeskIds : []);
      return;
    }

    setShowSeatSelection(true);
  };

  const handleEditDeselectLayoutDesks = async () => {
    if (seatsToUnselect <= 0) {
      showErrorToast('Reduce the assigned seat count before editing desk selection.');
      return;
    }
    setSelectedSeats(
      savedLayoutDeskIds.length > 0 ? [...savedLayoutDeskIds] : [...assignedDeskIds],
    );
    const message = await loadDeselectLayoutData();
    if (message) setShowSeatSelection(true);
  };

  const handleEditLayoutDesks = async () => {
    if (parsedAssignedSeats <= 0) {
      showErrorToast('Enter the number of assigned seats before editing desk selection.');
      return;
    }
    await openLayoutDeskPicker(savedLayoutDeskIds);
  };

  const handleSeatToggle = (subSpaceId) => {
    if (isSeatReductionMode) {
      if (!assignedDeskIds.includes(subSpaceId)) return;
      setSelectedSeats((previous) => {
        if (previous.includes(subSpaceId)) {
          const currentRemoved = assignedDeskIds.length - previous.length;
          if (currentRemoved >= seatsToUnselect) {
            showErrorToast(`You can only unselect ${seatsToUnselect} seat(s).`);
            return previous;
          }
          return previous.filter((id) => id !== subSpaceId);
        }
        return [...previous, subSpaceId];
      });
      return;
    }

    const deskMeta = useLayoutDeskPicker ? layoutDeskMetaMap.get(subSpaceId) : null;
    if (useLayoutDeskPicker && deskMeta?.previouslyAssigned) {
      showErrorToast('This desk is already assigned to this client.');
      return;
    }
    if (useLayoutDeskPicker && deskMeta && !isLayoutDeskSelectable(deskMeta)) {
      showErrorToast('This desk is not available.');
      return;
    }

    setSelectedSeats((previous) => {
      if (previous.includes(subSpaceId)) {
        return previous.filter((id) => id !== subSpaceId);
      }
      const maxSeats = Number(assignedSeats || 0);
      if (maxSeats > 0 && previous.length >= maxSeats) {
        showErrorToast(`You can only select ${maxSeats} seat(s)`);
        return previous;
      }
      return [...previous, subSpaceId];
    });
  };
  const handleSave = async () => {
    if (
      !validate({
        requireLayoutDeskSelection: useLayoutDeskPicker || useLayoutDeskDeselectPicker,
      })
    ) {
      return;
    }

    if (isSeatReductionMode) {
      setIsSeatReductionSaving(true);
      try {
        const desksToKeep =
          useLayoutDeskDeselectPicker && layoutDesksSaved ? savedLayoutDeskIds : selectedSeats;
        const assignSubSpaces = layoutDeskPickerData
          ? buildLayoutDeskAssignItems(desksToKeep, layoutDeskMetaMap)
          : buildAssignSubSpacesFromDeskSelection(desksToKeep, coworkingSelectableDesks);

        const fields = {
          customer: effectiveSelectedClient,
          center: spaceData.centerId,
          floor: spaceData.floor,
          space_id: spaceData.id,
          assigned_seats: updatedAssignedSeats,
          start_date: startDate,
          end_date: endDate,
          expected_per_seat_rate: expectedPerSeatRate,
          credit_per_seat: creditPerSeat,
          total_rate: updatedAssignedSeats * expectedPerSeatRate,
          notes: notes || '',
          assign_sub_spaces: assignSubSpaces,
          status: 'Updated',
        };
        const result = await dispatch(
          updateAssignedSpace({
            assignSpaceId: seatReductionContext.assignSpaceId,
            fields,
          }),
        );
        if (updateAssignedSpace.rejected.match(result)) {
          throw result.payload || result.error;
        }
        showSuccessToast('Seats updated successfully.');
        onAllocateSuccess?.();
        onOpenChange(false);
        if (spaceData?.id) dispatch(fetchSpaceDetail(spaceData.id));
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update seats. Please try again.' });
      } finally {
        setIsSeatReductionSaving(false);
      }
      return;
    }

    const carpetRate = Number(
      spaceData?._original?.expected_carpet_rate ?? spaceData?.expected_carpet_rate ?? 0,
    );
    const carpetArea = Number(
      spaceData?._original?.agreement_carpet_area ??
        spaceData?._original?.total_carpet_sft ??
        spaceData?.agreement_carpet_area ??
        spaceData?.total_carpet_sft ??
        0,
    );

    const assignedSeatsCount = isCabinLikeAllocate
      ? Math.max(0, Number(spaceData?.totalSeats ?? spaceData?.total_seats ?? 0))
      : isPureRental
        ? 1
        : useSeatPicker && showSeatSelection
          ? selectedSeats.length
          : isParkingType
            ? selectedSeats.length
            : parsedAssignedSeats;

    const payload = {
      customer: effectiveSelectedClient,
      center: spaceData.centerId,
      floor: spaceData.floor,
      space_id: spaceData.id,
      assigned_seats: assignedSeatsCount,
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
      ...(isPureRental
        ? {
            expected_per_seat_rate: Number.isFinite(carpetRate) ? carpetRate : 0,
            credit_per_seat: 0,
            total_carpet_area: Number.isFinite(carpetArea) ? carpetArea : 0,
          }
        : {
            expected_per_seat_rate: expectedPerSeatRate,
            credit_per_seat: isParkingType ? 0 : creditPerSeat,
            total_rate:
              useSeatPicker && showSeatSelection ? assignedSeatsCount * creditPerSeat : totalRate,
          }),
      notes: notes || '',
    };

    payload.status = isParkingType ? 'Occupied' : 'Locked';

    // For dedicated/hot desk (with picker) and parking, include assign_sub_spaces
    if ((useSeatPicker || isParkingType) && selectedSeats.length > 0) {
      if (isParkingType) {
        payload.assign_sub_spaces = selectedParkingSubSpaceIds.map((subSpaceId) => ({
          sub_space_id: subSpaceId,
        }));
      } else {
        payload.assign_sub_spaces = buildAssignSubSpacesFromDeskSelection(
          selectedSeats,
          coworkingSelectableDesks,
        );
      }
    }
    if (isParkingType && selectedSeats.length > 0) {
      payload.parking_no = selectedSeats;
    }

    if (useCoworkingLayoutAssignApi) {
      setIsCoworkingLayoutAssignSaving(true);
      try {
        const assignBody = buildLayoutCoworkingAssignSpacePayload({
          customerId: effectiveSelectedClient,
          spaceId: spaceData.id,
          subSpaceId: layoutSubSpaceId,
          centerId: spaceData.centerId,
          floor: spaceData.floor,
          assignedSeats: assignedSeatsCount,
          startDate,
          endDate,
          expectedPerSeatRate,
          creditPerSeat,
          totalRate,
          notes,
        });
        await postSaveClientCoworkingAssignSpace(assignBody);
        showSuccessToast('Space allocated successfully.');
        onAllocateSuccess?.();
        onOpenChange(false);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to allocate space. Please try again.' });
      } finally {
        setIsCoworkingLayoutAssignSaving(false);
      }
      return;
    }

    if (isManagedOffice) {
      setIsManagedOfficeAssignSaving(true);
      try {
        const assignBody = buildManagedOfficeAssignSpacePayload({
          customerId: effectiveSelectedClient,
          spaceId: spaceData.id,
          centerId: spaceData.centerId,
          startDate,
          endDate,
          expectedPerSeatRate,
          creditPerSeat,
          totalRate,
          notes,
        });
        await postSaveClientManagedOfficeAssignSpace(assignBody);
        showSuccessToast('Space allocated successfully.');
        onAllocateSuccess?.();
        onOpenChange(false);
        if (spaceData?.id) dispatch(fetchSpaceDetail(spaceData.id));
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to allocate space. Please try again.' });
      } finally {
        setIsManagedOfficeAssignSaving(false);
      }
      return;
    }

    if (useLayoutDeskPicker) {
      if (savedLayoutDeskIds.length !== assignedSeatsCount) {
        showErrorToast(
          `Select exactly ${assignedSeatsCount} desk(s) on the layout before submitting.`,
        );
        return;
      }

      setIsLayoutDeskAssignSaving(true);
      try {
        await postAssignClientDeskToSpace({
          customer_id: effectiveSelectedClient,
          client_id: effectiveSelectedClient,
          space_id: spaceData.id,
          desk_ids: savedLayoutDeskIds,
          desks: buildLayoutDeskAssignItems(savedLayoutDeskIds, layoutDeskMetaMap),
          ...(spaceData.centerId ? { center_id: spaceData.centerId } : {}),
          start_date: startDate,
          end_date: endDate,
        });
        showSuccessToast('Space allocated successfully.');
        onAllocateSuccess?.();
        onOpenChange(false);
        if (spaceData?.id) dispatch(fetchSpaceDetail(spaceData.id));
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to allocate desks. Please try again.' });
      } finally {
        setIsLayoutDeskAssignSaving(false);
      }
      return;
    }

    try {
      if (isFcfsParking) {
        const fcfsPayload = {
          customers: selectedClients,
          center: spaceData.centerId,
          floor: spaceData.floor,
          space_id: spaceData.id,
          assigned_seats: assignedSeatsCount,
          start_date: startDate,
          end_date: endDate,
          expected_per_seat_rate: 0,
          total_rate: 0,
          notes: notes || '',
          status: 'Occupied',
          ...(selectedSeats.length > 0 && {
            assign_sub_spaces: selectedParkingSubSpaceIds.map((subSpaceId) => ({
              sub_space_id: subSpaceId,
            })),
            parking_no: selectedSeats,
          }),
        };
        await dispatch(createParkingFcfsAssignments(fcfsPayload)).unwrap();
      } else {
        await dispatch(assignSpace(payload)).unwrap();
      }
      showSuccessToast('Space allocated successfully.');
      onAllocateSuccess?.();
      onOpenChange(false);
      if (spaceData?.id) dispatch(fetchSpaceDetail(spaceData.id));
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to allocate space. Please try again.' });
    }
  };
  const handleConfirmSeats = async () => {
    if (isSeatReductionMode) {
      if (removedSeatCount !== seatsToUnselect) {
        showErrorToast(`Please unselect exactly ${seatsToUnselect} seat(s).`);
        return;
      }
      if (useLayoutDeskDeselectPicker) {
        setSavedLayoutDeskIds([...selectedSeats]);
        setLayoutDesksSaved(true);
        setErrors((previous) => {
          const next = { ...previous };
          delete next.selected_seats;
          return next;
        });
        setShowSeatSelection(false);
        showSuccessToast('Seat selection saved. Review the form and submit when ready.');
        return;
      }
      await handleSave();
      return;
    }

    if (useLayoutDeskPicker) {
      if (selectedSeats.length === 0) {
        showErrorToast('Please select at least one desk on the layout.');
        return;
      }

      if (parsedAssignedSeats > 0 && selectedSeats.length !== parsedAssignedSeats) {
        showErrorToast(
          `Select exactly ${parsedAssignedSeats} desk(s) on the layout (${selectedSeats.length} selected).`,
        );
        return;
      }

      setErrors((previous) => {
        const next = { ...previous };
        delete next.selected_seats;
        return next;
      });
      setSavedLayoutDeskIds([...selectedSeats]);
      setLayoutDesksSaved(true);
      setShowSeatSelection(false);
      showSuccessToast('Desk selection saved. Review the form and submit when ready.');
      return;
    }

    if (selectedSeats.length === 0) {
      setErrors({ selected_seats: 'Please select at least one seat.' });
      showErrorToast('Please select at least one seat.');
      return;
    }

    if (parsedAssignedSeats > 0 && selectedSeats.length < parsedAssignedSeats) {
      showErrorToast(
        `You have selected ${selectedSeats.length} seat(s), but you entered ${parsedAssignedSeats} seat(s). Please select all ${parsedAssignedSeats} seat(s) or update the number of seats.`,
      );
      return;
    }

    await handleSave();
  };

  const layoutDesksReady =
    useLayoutDeskPicker &&
    layoutDesksSaved &&
    parsedAssignedSeats > 0 &&
    savedLayoutDeskIds.length === parsedAssignedSeats;

  const deselectLayoutReady =
    useLayoutDeskDeselectPicker &&
    layoutDesksSaved &&
    updatedAssignedSeats > 0 &&
    savedLayoutDeskIds.length === updatedAssignedSeats &&
    assignedDeskIds.length - savedLayoutDeskIds.length === seatsToUnselect;

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content
        className={`flex flex-col max-h-[90vh] overflow-hidden ${
          showSeatSelection
            ? showLayoutDeskPicker
              ? 'max-w-[820px] min-w-[720px]'
              : 'max-w-[612px] min-w-[612px]'
            : 'max-w-[520px]'
        }`}
      >
        <Modal.Header
          title={
            isReducingSeats
              ? 'Space Reduction'
              : showSeatSelection
                ? showLayoutDeskPicker
                  ? layoutDeskPickerData?.space_name || spaceData?.spaceName || 'Select Desks'
                  : spaceData?.spaceName || 'Select Seats'
                : 'Allocate Client'
          }
          icon={showSeatSelection ? PiChair : RiBox3Line}
          description={
            showSeatSelection
              ? isSeatReductionMode
                ? useLayoutDeskDeselectPicker
                  ? `${selectedSeats.length}/${updatedAssignedSeats} seats kept · ${removedSeatCount}/${seatsToUnselect} marked for removal`
                  : `${selectedSeats.length}/${updatedAssignedSeats} seats selected · Unselect ${seatsToUnselect} seat(s) to continue`
                : useLayoutDeskPicker
                  ? [
                      'Use the Select tool, then click desks to mark them.',
                      clientAssignedDeskIds.length > 0
                        ? `${clientAssignedDeskIds.length} desk(s) already assigned to this client (shown in dark green)`
                        : null,
                      seatsAvailableCap > 0 ? seatsAvailableHint : null,
                      `${selectedSeats.length}/${parsedAssignedSeats || 0} new desks selected${
                        parsedAssignedSeats > 0 && selectedSeats.length < parsedAssignedSeats
                          ? ` (Select ${parsedAssignedSeats - selectedSeats.length} more)`
                          : ''
                      }`,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : [
                      seatsAvailableCap > 0 ? seatsAvailableHint : null,
                      `${selectedSeats.length}/${parsedAssignedSeats || 0} seats selected${
                        parsedAssignedSeats > 0 && selectedSeats.length < parsedAssignedSeats
                          ? ` (Select ${parsedAssignedSeats - selectedSeats.length} more)`
                          : ''
                      }`,
                    ]
                      .filter(Boolean)
                      .join(' · ')
              : isReducingSeats
                ? 'Unselect seats to reduce the space'
                : headerDescription || 'Select below details to allocate space.'
          }
          className='shrink-0'
        />

        {isOccupied && !isCoworkingSpace ? (
          <Modal.Body className='flex flex-col gap-0 p-5 overflow-y-auto flex-1 min-h-0'>
            <div className='flex items-center justify-center gap-2  rounded-xl bg-warning-light px-3 py-2 text-paragraph-sm text-text-sub-600'>
              <div className='flex-1 flex shrink-0'>
                <RiInformationLine className='mt-0.5 text-warning-base' size={20} />
              </div>
              This space is already allocated. Add additional spaces or detach the current client to
              reassign it.
            </div>
          </Modal.Body>
        ) : (
          <>
            {showSeatSelection ? (
              <Modal.Body className='flex flex-col gap-0 p-0 overflow-y-auto flex-1 min-h-0'>
                <div className='relative p-5'>
                  {showLayoutDeskPicker ? (
                    loadingLayoutDesks || !layoutDeskPickerData ? (
                      <div className='text-center text-paragraph-sm text-text-sub-500 py-8'>
                        Loading layout...
                      </div>
                    ) : (
                      <SpaceAllocateLayoutDeskPicker
                        layoutData={layoutDeskPickerData}
                        selectedDeskIds={selectedSeats}
                        assignedDeskIds={isSeatReductionMode ? assignedDeskIds : []}
                        mode={isSeatReductionMode ? 'deselect' : 'select'}
                        onDeskToggle={handleSeatToggle}
                        onDeskUnavailable={() => {
                          showErrorToast('This desk is not available.');
                        }}
                      />
                    )
                  ) : (
                    <div className='relative'>
                      {loadingSubSpaces ? (
                        <div className='text-center text-paragraph-sm text-text-sub-500 py-8'>
                          Loading seats...
                        </div>
                      ) : coworkingSelectableDesks.length > 0 ? (
                        <div className='flex flex-wrap gap-2'>
                          {coworkingSelectableDesks.map((deskOption) => {
                            const isSelected = selectedSeats.includes(deskOption.value);
                            const isReductionAssignedSeat =
                              isSeatReductionMode && assignedDeskIds.includes(deskOption.value);
                            const isSeatUnavailable = isSeatReductionMode
                              ? !isReductionAssignedSeat
                              : isDeskOptionUnavailable(deskOption);
                            const canSelectSeat = isSeatReductionMode
                              ? isReductionAssignedSeat
                              : !isSeatUnavailable;
                            const seatNumber = String(deskOption.sequence);

                            return (
                              <button
                                key={deskOption.value}
                                type='button'
                                onClick={() => canSelectSeat && handleSeatToggle(deskOption.value)}
                                disabled={isSeatUnavailable}
                                className={`flex flex-col items-center justify-center gap-1 rounded-md border transition-colors pt-3 pb-2 shrink-0 w-[50px] ${
                                  isSelected
                                    ? 'bg-success-lighter border-success-base text-text-sub-500'
                                    : isSeatUnavailable
                                      ? 'bg-faded-lighter border-stroke-soft-200 text-text-sub-500 cursor-not-allowed opacity-50'
                                      : canSelectSeat
                                        ? 'bg-bg-white-0 border-stroke-soft-200 text-text-sub-500 hover:border-success-base hover:bg-success-lighter cursor-pointer'
                                        : 'bg-bg-white-0 border-stroke-soft-200 text-text-sub-500'
                                }`}
                              >
                                <PiChairDuotone
                                  className={`shrink-0 ${
                                    isSelected
                                      ? 'text-success-base'
                                      : isSeatUnavailable
                                        ? 'text-text-soft-400'
                                        : 'text-text-sub-600'
                                  }`}
                                  size={16}
                                />
                                <span className='text-label-sm text-text-sub-500'>
                                  {seatNumber}
                                </span>
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
                  )}
                </div>
              </Modal.Body>
            ) : (
              <Modal.Body className='overflow-y-auto'>
                <div className='flex flex-col gap-6'>
                  {/* Configured Pricing Tag */}
                  {(() => {
                    const subType =
                      spaceData?.subSpaceType ||
                      spaceData?.managed_office_type ||
                      spaceData?.coworking_inventory_type ||
                      spaceData?._original?.coworking_inventory_type ||
                      '';
                    const configuredPricing = findMatchingPricing(
                      spaceData?.centerId,
                      spaceType,
                      subType,
                    );
                    if (!configuredPricing) return null;
                    return (
                      <div className='flex items-center justify-between gap-2 rounded-xl border border-stroke-soft-200 bg-bg-weak-50 px-3.5 py-2.5'>
                        <span className='text-paragraph-xs font-semibold uppercase tracking-wider text-text-sub-500'>
                          Configured Pricing Tag:
                        </span>
                        <div className='flex items-center gap-1.5 flex-wrap'>
                          {configuredPricing.pricePerSeat > 0 && (
                            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-information-lighter text-information-dark border border-information-light'>
                              ₹{configuredPricing.pricePerSeat}/seat
                            </span>
                          )}
                          {configuredPricing.pricePerSqFt > 0 && (
                            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-lighter text-success-dark border border-success-light'>
                              ₹{configuredPricing.pricePerSqFt}/sq.ft.
                            </span>
                          )}
                          {configuredPricing.creditPerSeat > 0 && (
                            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning-lighter text-warning-dark border border-warning-light'>
                              {configuredPricing.creditPerSeat} Credits/seat
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  {/* {isOccupied && (
                    <div className='flex items-start gap-2 rounded-xl bg-warning-light px-3 py-2 text-paragraph-xs text-text-sub-600'>
                      <RiInformationLine className='mt-0.5 size-4 text-warning-base' />
                      <div className='flex-1'>
                        This space is currently occupied by another client, but you can still
                        reserve it for the next client.
                      </div>
                    </div>
                  )} */}

                  {isCoworkingSpace && seatsAvailableCap > 0 && !isSeatReductionMode ? (
                    <div className='flex items-start gap-2 rounded-xl bg-success-lighter px-3 py-2 text-paragraph-xs text-text-sub-600'>
                      <RiInformationLine
                        className='mt-0.5 shrink-0 text-success-base'
                        size={16}
                        aria-hidden
                      />
                      <span>{seatsAvailableHint} on this co-working space.</span>
                    </div>
                  ) : null}

                  {lockedCustomerId ? (
                    <div className='flex flex-col gap-1'>
                      <Label.Root>Client</Label.Root>
                      <p className='text-paragraph-sm text-text-sub-600'>{lockedCustomerLabel}</p>
                    </div>
                  ) : (
                    <div className='flex flex-col gap-2'>
                      <Label.Root>
                        Client{isFcfsParking ? 's' : ''} <span className='text-error-base'>*</span>
                      </Label.Root>
                      {isFcfsParking ? (
                        <MultiSelect
                          options={clientOptions}
                          value={selectedClients}
                          onValueChange={setSelectedClients}
                          placeholder='Select clients'
                          hasError={Boolean(errors.customer)}
                          className='w-full'
                          maxDisplayItems={FCFS_CLIENT_VISIBLE_TAGS}
                          overflowTooltipLabel='Additional clients'
                        />
                      ) : (
                        <Select.Root
                          value={selectedClient}
                          onValueChange={handleClientChange}
                          hasError={Boolean(errors.customer)}
                        >
                          <Select.Trigger className='w-full'>
                            <Select.Value placeholder='Select client' />
                          </Select.Trigger>
                          <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                            <div className='px-2 py-2'>
                              <Input.Root size='small'>
                                <Input.Wrapper>
                                  <Input.Icon as={RiSearchLine} />
                                  <Input.Input
                                    placeholder='Search...'
                                    value={searchClient}
                                    onChange={(e) => setSearchClient(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            </div>
                            {filteredClients.length > 0 ? (
                              filteredClients.map((client) => (
                                <Select.Item key={client.name} value={client.name}>
                                  {client.customer_name || client.custom_legal_name || client.name}
                                </Select.Item>
                              ))
                            ) : (
                              <div className='px-3 py-2 text-paragraph-sm text-text-sub-500'>
                                No clients available
                              </div>
                            )}
                          </Select.Content>
                        </Select.Root>
                      )}
                      {errors.customer && (
                        <div className='text-paragraph-xs text-error-base'>{errors.customer}</div>
                      )}
                    </div>
                  )}

                  {hasSelectedClient && (
                    <>
                      <div className='flex flex-col gap-2.5'>
                        <div className='flex items-center gap-2 text-paragraph-md font-medium text-text-sub-500'>
                          <RiTimeLine className='text-text-sub-600' fill='#868C98' size={20} />
                          Lease Duration
                        </div>
                        <div className='grid grid-cols-2 gap-3'>
                          <div className='flex flex-col gap-1'>
                            <Label.Root>
                              Start Date <span className='text-error-base'>*</span>
                            </Label.Root>
                            {isSeatReductionMode ? (
                              <Input.Root hasError={Boolean(errors.start_date)}>
                                <Input.Wrapper>
                                  <Input.Input readOnly value={formatLeaseDateDisplay(startDate)} />
                                </Input.Wrapper>
                              </Input.Root>
                            ) : (
                              <Datepicker
                                value={startDate ? new Date(startDate) : undefined}
                                onChange={(date) => {
                                  setStartDate(date ? format(date, 'yyyy-MM-dd') : '');
                                }}
                                placeholder='Select start date'
                                hasError={Boolean(errors.start_date)}
                                size='medium'
                                variant='default'
                              />
                            )}
                            {errors.start_date && (
                              <div className='text-paragraph-xs text-error-base'>
                                {errors.start_date}
                              </div>
                            )}
                          </div>
                          <div className='flex flex-col gap-1'>
                            <Label.Root>
                              End Date <span className='text-error-base'>*</span>
                            </Label.Root>
                            {isSeatReductionMode ? (
                              <Input.Root hasError={Boolean(errors.end_date)}>
                                <Input.Wrapper>
                                  <Input.Input readOnly value={formatLeaseDateDisplay(endDate)} />
                                </Input.Wrapper>
                              </Input.Root>
                            ) : (
                              <Datepicker
                                value={endDate ? new Date(endDate) : undefined}
                                onChange={(date) => {
                                  setEndDate(date ? format(date, 'yyyy-MM-dd') : '');
                                }}
                                placeholder='Select end date'
                                hasError={Boolean(errors.end_date)}
                                size='medium'
                                variant='default'
                                min={startDate ? new Date(startDate) : undefined}
                              />
                            )}
                            {errors.end_date && (
                              <div className='text-paragraph-xs text-error-base'>
                                {errors.end_date}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className='flex flex-col gap-2'>
                        <div className='flex items-center gap-2 text-paragraph-md font-medium text-text-sub-500'>
                          <RiMoneyDollarCircleLine
                            className='text-text-sub-600'
                            fill='#868C98'
                            size={20}
                          />
                          {isPureRental ? 'Carpet Details' : 'Credit & Price Details'}
                        </div>

                        {isPureRental ? (
                          <div className='flex flex-col gap-2'>
                            <div className='grid grid-cols-2 gap-3'>
                              <div className='flex flex-col gap-2'>
                                <Label.Root>Agreement Carpet Area</Label.Root>
                                <Input.Root>
                                  <Input.Wrapper>
                                    <Input.Input
                                      value={String(
                                        Number(
                                          spaceData?._original?.agreement_carpet_area ??
                                            spaceData?._original?.total_carpet_sft ??
                                            spaceData?.agreement_carpet_area ??
                                            spaceData?.total_carpet_sft ??
                                            spaceData?.carpetArea ??
                                            0,
                                        ) || 0,
                                      )}
                                      readOnly
                                    />
                                    <Input.Affix>sq.ft.</Input.Affix>
                                  </Input.Wrapper>
                                </Input.Root>
                              </div>
                              <div className='flex flex-col gap-2'>
                                <Label.Root>Total Carpet Rate (₹)</Label.Root>
                                <Input.Root>
                                  <Input.Wrapper>
                                    <Input.Input
                                      value={String(
                                        Number(
                                          spaceData?._original?.expected_carpet_rate ??
                                            spaceData?.expected_carpet_rate ??
                                            spaceData?.carpetRate ??
                                            0,
                                        ) || 0,
                                      )}
                                      readOnly
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                              </div>
                            </div>
                          </div>
                        ) : isCabinLikeAllocate ? (
                          <div className='flex flex-col gap-2'>
                            <div className='grid grid-cols-2 gap-3'>
                              <div className='flex flex-col gap-2'>
                                <Label.Root>
                                  Credit Per Seat <span className='text-error-base'>*</span>
                                </Label.Root>
                                <Input.Root hasError={Boolean(errors.credit_per_seat)}>
                                  <Input.Wrapper>
                                    <Input.Input
                                      type='number'
                                      min='0'
                                      step='any'
                                      value={creditPerSeat || ''}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setCreditPerSeat(v === '' ? 0 : Number.parseFloat(v) || 0);
                                      }}
                                      placeholder='—'
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                                {errors.credit_per_seat && (
                                  <div className='text-paragraph-xs text-error-base'>
                                    {errors.credit_per_seat}
                                  </div>
                                )}
                              </div>
                              <div className='flex flex-col gap-2'>
                                <Label.Root>
                                  Expected Per Seat Rate (₹){' '}
                                  <span className='text-error-base'>*</span>
                                </Label.Root>
                                <Input.Root hasError={Boolean(errors.expected_per_seat_rate)}>
                                  <Input.Wrapper>
                                    <Input.Input
                                      type='number'
                                      min='0'
                                      step='any'
                                      value={expectedPerSeatRate || ''}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setExpectedPerSeatRate(
                                          v === '' ? 0 : Number.parseFloat(v) || 0,
                                        );
                                      }}
                                      placeholder='—'
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                                {errors.expected_per_seat_rate && (
                                  <div className='text-paragraph-xs text-error-base'>
                                    {errors.expected_per_seat_rate}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className='text-paragraph-xs text-text-sub-600'>
                              {totalCredits} Credits (total seats × credit per seat)
                            </span>
                            <div className='flex flex-col gap-2'>
                              <Label.Root>Total Rate (₹)</Label.Root>
                              <Input.Root>
                                <Input.Wrapper>
                                  <Input.Input
                                    value={Number.isFinite(totalRate) ? String(totalRate) : ''}
                                    readOnly
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            </div>
                          </div>
                        ) : isParkingType ? (
                          <div className='flex flex-col gap-2'>
                            <div className='grid grid-cols-2 gap-3'>
                              <div className='flex flex-col gap-2'>
                                <Label.Root>
                                  Select Parking <span className='text-error-base'>*</span>
                                </Label.Root>
                                <Select.Root className='px-0'>
                                  <Select.Trigger
                                    hasError={Boolean(errors.parking_spaces)}
                                    className='w-full'
                                  >
                                    <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
                                      {selectedSeats.length === 0 ? (
                                        <span className='text-text-soft-400'>Select</span>
                                      ) : (
                                        <>
                                          {parkingSelectionDisplayLabels
                                            .slice(0, SPACE_ALLOCATE_PARKING_VISIBLE_BADGES)
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
                                          SPACE_ALLOCATE_PARKING_VISIBLE_BADGES ? (
                                            <Tooltip.Root>
                                              <Tooltip.Trigger asChild>
                                                <Badge.Root
                                                  variant='lighter'
                                                  color='gray'
                                                  size='medium'
                                                >
                                                  <span className='text-label-xs font-semibold text-text-strong-950'>
                                                    +
                                                    {parkingSelectionDisplayLabels.length -
                                                      SPACE_ALLOCATE_PARKING_VISIBLE_BADGES}
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
                                                      SPACE_ALLOCATE_PARKING_VISIBLE_BADGES}
                                                    )
                                                  </span>
                                                  <div className='flex flex-col gap-1'>
                                                    {parkingSelectionDisplayLabels
                                                      .slice(SPACE_ALLOCATE_PARKING_VISIBLE_BADGES)
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
                                  <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                                    {spaceData?.id && parkingSelectableOptions.length > 0 ? (
                                      <div className='flex w-full flex-col gap-2 py-2'>
                                        <span className='label-small flex items-center gap-2 rounded-md bg-bg-weak-100 p-2'>
                                          <RiBuildingLine size={16} className='text-primary-base' />
                                          {spaceData?.floor || '--'}
                                        </span>
                                        {parkingSelectableOptions.map((parkingOption) => {
                                          const optionValue = parkingOption.value;
                                          const label = parkingOption.label;
                                          const isSelected = selectedSeats.includes(optionValue);
                                          const disabledOpt =
                                            loadingSubSpaces ||
                                            isParkingOptionDisabled(parkingOption);

                                          return (
                                            <span
                                              key={`${parkingOption.subSpaceId}-${optionValue}`}
                                              className={`paragraph-small flex items-center gap-2 pl-3 ${
                                                disabledOpt
                                                  ? 'cursor-not-allowed opacity-60'
                                                  : 'cursor-pointer'
                                              }`}
                                            >
                                              <Checkbox.Root
                                                checked={isSelected}
                                                onCheckedChange={(checked) => {
                                                  setSelectedSeats((current) => {
                                                    const list = current || [];
                                                    if (checked) {
                                                      return [...new Set([...list, optionValue])];
                                                    }
                                                    return list.filter((id) => id !== optionValue);
                                                  });
                                                }}
                                                disabled={disabledOpt}
                                              />
                                              <span
                                                className={disabledOpt ? 'text-text-sub-500' : ''}
                                              >
                                                {label}
                                              </span>
                                            </span>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className='px-3 py-2 text-paragraph-sm text-text-sub-500'>
                                        {!spaceData?.id
                                          ? 'Space not loaded'
                                          : loadingSubSpaces
                                            ? 'Loading parkings...'
                                            : 'No parking found'}
                                      </div>
                                    )}
                                  </Select.Content>
                                </Select.Root>
                                {errors.parking_spaces && (
                                  <div className='text-paragraph-xs text-error-base'>
                                    {errors.parking_spaces}
                                  </div>
                                )}
                              </div>
                              <div className='flex flex-col gap-2'>
                                <Label.Root>
                                  Expected Per Parking Rate (₹){' '}
                                  <span className='text-error-base'>*</span>
                                </Label.Root>
                                <Input.Root hasError={Boolean(errors.expected_per_seat_rate)}>
                                  <Input.Wrapper>
                                    <Input.Input
                                      type='number'
                                      min='0'
                                      step='any'
                                      value={
                                        isFcfsParking
                                          ? '0'
                                          : formatRateFieldValue(expectedPerSeatRate)
                                      }
                                      readOnly={isFcfsParking}
                                      onChange={(e) => {
                                        if (isFcfsParking) return;
                                        const v = e.target.value;
                                        setExpectedPerSeatRate(
                                          v === '' ? 0 : Number.parseFloat(v) || 0,
                                        );
                                      }}
                                      placeholder='0'
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                                {errors.expected_per_seat_rate && (
                                  <div className='text-paragraph-xs text-error-base'>
                                    {errors.expected_per_seat_rate}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className='flex flex-col gap-2'>
                              <Label.Root>Total Rate (₹)</Label.Root>
                              <Input.Root>
                                <Input.Wrapper>
                                  <Input.Input
                                    value={
                                      isFcfsParking
                                        ? '0'
                                        : Number.isFinite(totalRate)
                                          ? String(totalRate)
                                          : ''
                                    }
                                    readOnly
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className='grid grid-cols-2 gap-3'>
                              <div className='flex flex-col gap-2'>
                                <Label.Root>
                                  Assigned Seats <span className='text-error-base'>*</span>
                                </Label.Root>
                                <Input.Root hasError={Boolean(errors.assigned_seats)}>
                                  <Input.Wrapper>
                                    <Input.Input
                                      type='number'
                                      min='1'
                                      step='1'
                                      placeholder='Enter seats'
                                      value={assignedSeats}
                                      readOnly={isSeatReductionMode}
                                      onChange={(e) => {
                                        if (isSeatReductionMode) return;
                                        const { value } = e.target;
                                        setAssignedSeats(value);
                                        // Validate if seats exceed available seats
                                        const numberValue = Number(value);
                                        if (
                                          value &&
                                          !Number.isNaN(numberValue) &&
                                          numberValue > seatsAvailableCap
                                        ) {
                                          showErrorToast(
                                            `You can only allocate up to ${seatsAvailableCap} seat(s). ${seatsAvailableHint}.`,
                                          );
                                        }
                                      }}
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                                {errors.assigned_seats && (
                                  <div className='text-paragraph-xs text-error-base'>
                                    {errors.assigned_seats}
                                  </div>
                                )}
                                <div className='text-paragraph-xs text-text-sub-600 gap-1 flex items-center flex-row'>
                                  {isSeatReductionMode ? (
                                    <span className='text-red-500'>
                                      <RiErrorWarningFill aria-hidden />{' '}
                                    </span>
                                  ) : (
                                    <RiErrorWarningFill aria-hidden />
                                  )}
                                  {isSeatReductionMode ? (
                                    <span className='text-red-500'>
                                      {' '}
                                      {seatsToUnselect} seat(s) needs to be unselected.
                                    </span>
                                  ) : (
                                    seatsAvailableHint
                                  )}
                                </div>
                                {useLayoutDeskDeselectPicker &&
                                layoutDesksSaved &&
                                savedLayoutDeskIds.length > 0 ? (
                                  <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                                    <span className='text-paragraph-xs text-success-base'>
                                      {savedLayoutDeskIds.length}/{updatedAssignedSeats} desk(s)
                                      kept on layout ·{' '}
                                      {assignedDeskIds.length - savedLayoutDeskIds.length} marked
                                      for removal
                                    </span>
                                    <LinkButton.Root
                                      type='button'
                                      variant='primary'
                                      size='medium'
                                      onClick={handleEditDeselectLayoutDesks}
                                      disabled={loadingLayoutDesks || isSaving}
                                    >
                                      Edit seats
                                    </LinkButton.Root>
                                  </div>
                                ) : null}
                                {useLayoutDeskPicker &&
                                layoutDesksSaved &&
                                savedLayoutDeskIds.length > 0 ? (
                                  <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                                    <span className='text-paragraph-xs text-success-base'>
                                      {savedLayoutDeskIds.length}/{parsedAssignedSeats || 0} new
                                      desk(s) saved on layout
                                    </span>
                                    <LinkButton.Root
                                      type='button'
                                      variant='primary'
                                      size='medium'
                                      onClick={handleEditLayoutDesks}
                                      disabled={loadingLayoutDesks || isSaving}
                                    >
                                      Edit seats
                                    </LinkButton.Root>
                                  </div>
                                ) : null}
                                {errors.selected_seats ? (
                                  <div className='text-paragraph-xs text-error-base'>
                                    {errors.selected_seats}
                                  </div>
                                ) : null}
                              </div>
                              <div className='flex flex-col gap-2'>
                                <Label.Root>
                                  Credit Per Seat <span className='text-error-base'>*</span>
                                </Label.Root>
                                <Input.Root hasError={Boolean(errors.credit_per_seat)}>
                                  <Input.Wrapper>
                                    <Input.Input
                                      type='number'
                                      min='0'
                                      step='any'
                                      value={creditPerSeat || ''}
                                      readOnly={isSeatReductionMode}
                                      onChange={(e) => {
                                        if (isSeatReductionMode) return;
                                        const v = e.target.value;
                                        setCreditPerSeat(v === '' ? 0 : Number.parseFloat(v) || 0);
                                      }}
                                      placeholder='—'
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                                {errors.credit_per_seat && (
                                  <div className='text-paragraph-xs text-error-base'>
                                    {errors.credit_per_seat}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className='grid grid-cols-2 gap-3'>
                              <div className='flex flex-col gap-2'>
                                <Label.Root>
                                  Expected Per Seat Rate (₹){' '}
                                  <span className='text-error-base'>*</span>
                                </Label.Root>
                                <Input.Root hasError={Boolean(errors.expected_per_seat_rate)}>
                                  <Input.Wrapper>
                                    <Input.Input
                                      type='number'
                                      min='0'
                                      step='any'
                                      value={expectedPerSeatRate || ''}
                                      readOnly={isSeatReductionMode}
                                      onChange={(e) => {
                                        if (isSeatReductionMode) return;
                                        const v = e.target.value;
                                        setExpectedPerSeatRate(
                                          v === '' ? 0 : Number.parseFloat(v) || 0,
                                        );
                                      }}
                                      placeholder='—'
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                                {errors.expected_per_seat_rate && (
                                  <div className='text-paragraph-xs text-error-base'>
                                    {errors.expected_per_seat_rate}
                                  </div>
                                )}
                              </div>
                              <div className='flex flex-col gap-2'>
                                <Label.Root>Total Rate (₹)</Label.Root>
                                <Input.Root>
                                  <Input.Wrapper>
                                    <Input.Input
                                      value={
                                        Number.isFinite(
                                          isSeatReductionMode
                                            ? updatedAssignedSeats * expectedPerSeatRate
                                            : totalRate,
                                        )
                                          ? String(
                                              isSeatReductionMode
                                                ? updatedAssignedSeats * expectedPerSeatRate
                                                : totalRate,
                                            )
                                          : ''
                                      }
                                      readOnly
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className='flex flex-col gap-2'>
                        <Label.Root>Notes</Label.Root>
                        <Textarea.Root
                          simple
                          placeholder='Type here...'
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </Modal.Body>
            )}

            {showSeatSelection ? (
              <Modal.Footer className='relative shrink-0'>
                {/* Back Button */}
                <LinkButton.Root
                  type='button'
                  variant='gray'
                  size='medium'
                  onClick={() => {
                    setShowSeatSelection(false);
                    if (isSeatReductionMode) {
                      setSelectedSeats(
                        layoutDesksSaved && savedLayoutDeskIds.length > 0
                          ? [...savedLayoutDeskIds]
                          : [...assignedDeskIds],
                      );
                    } else if (useLayoutDeskPicker) {
                      setSelectedSeats([...savedLayoutDeskIds]);
                    } else {
                      setSelectedSeats([]);
                    }
                  }}
                  disabled={isSaving}
                >
                  <LinkButton.Icon as={RiArrowLeftSLine} />
                  Back
                </LinkButton.Root>

                {/* Legend - Center (Absolutely Positioned) */}
                <div className='flex items-center rounded-full gap-4 absolute left-1/2 -translate-x-1/2'>
                  {useLayoutDeskDeselectPicker ? (
                    <>
                      <div className='flex items-center gap-1.5'>
                        <div className='rounded-full border w-3 h-3 border-[var(--color-success-dark)] bg-[var(--color-success-light)]' />
                        <span
                          className='font-medium text-text-sub-500'
                          style={{ fontSize: '12px', lineHeight: '16px' }}
                        >
                          Keeping
                        </span>
                      </div>
                      <div className='flex items-center gap-1.5'>
                        <div className='rounded-full border w-3 h-3 bg-error-lighter border-error-base' />
                        <span
                          className='font-medium text-text-sub-500'
                          style={{ fontSize: '12px', lineHeight: '16px' }}
                        >
                          To remove
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
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
                      {useLayoutDeskPicker ? (
                        <div className='flex items-center gap-1.5'>
                          <div className='rounded-full border w-3 h-3 border-[var(--color-success-dark)] bg-[var(--color-success-light)]' />
                          <span
                            className='font-medium text-text-sub-500'
                            style={{
                              fontSize: '12px',
                              lineHeight: '16px',
                            }}
                          >
                            Previously assigned
                          </span>
                        </div>
                      ) : null}
                      <div className='flex items-center gap-1.5'>
                        <div className='rounded-full border w-3 h-3 bg-white-0 border-stroke-soft-200' />
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
                    </>
                  )}
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
                    disabled={isSaving}
                    size='small'
                  >
                    Cancel
                  </Button.Root>
                  <Button.Root
                    type='button'
                    variant='primary'
                    onClick={handleConfirmSeats}
                    disabled={
                      isSaving ||
                      (isSeatReductionMode
                        ? !isSeatReductionReady
                        : useLayoutDeskPicker
                          ? selectedSeats.length === 0 ||
                            (parsedAssignedSeats > 0 && selectedSeats.length < parsedAssignedSeats)
                          : selectedSeats.length === 0 ||
                            (parsedAssignedSeats > 0 && selectedSeats.length < parsedAssignedSeats))
                    }
                    size='small'
                  >
                    {isSaving
                      ? 'Saving...'
                      : useLayoutDeskDeselectPicker
                        ? 'Save selection'
                        : useLayoutDeskPicker
                          ? 'Save desks'
                          : 'Save'}
                  </Button.Root>
                </div>
              </Modal.Footer>
            ) : (
              <Modal.Footer className='flex items-center justify-end gap-2'>
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='small'
                  disabled={isSaving}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button.Root>
                <Button.Root
                  variant='primary'
                  mode='filled'
                  size='small'
                  disabled={
                    isSaving ||
                    loadingLayoutDesks ||
                    !startDate ||
                    !endDate ||
                    (useSeatPicker &&
                      !isSeatReductionMode &&
                      (assignedSeats <= 0 || assignedSeats > seatsAvailableCap)) ||
                    (isSeatReductionMode && updatedAssignedSeats <= 0)
                  }
                  onClick={
                    (useLayoutDeskPicker && layoutDesksReady) || deselectLayoutReady
                      ? handleSave
                      : useSeatPicker
                        ? handleChooseSeats
                        : handleSave
                  }
                >
                  <span>
                    {isSaving
                      ? 'Saving…'
                      : loadingLayoutDesks
                        ? 'Loading layout…'
                        : isReducingSeats
                          ? deselectLayoutReady
                            ? 'Submit'
                            : 'Unselect Seats'
                          : useLayoutDeskPicker && layoutDesksReady
                            ? 'Submit'
                            : useSeatPicker
                              ? 'Choose Seats'
                              : 'Save'}
                  </span>
                  {useSeatPicker &&
                  !layoutDesksReady &&
                  !deselectLayoutReady &&
                  !isSaving &&
                  !loadingLayoutDesks ? (
                    <RiArrowRightSLine size={20} className='ml-2' />
                  ) : null}
                </Button.Root>
              </Modal.Footer>
            )}
          </>
        )}
      </Modal.Content>
    </Modal.Root>
  );
};

export default AllocatedSpaceModal;
