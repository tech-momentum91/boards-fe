import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  RiRuler2Line,
  RiPriceTag3Line,
  RiMap2Line,
  RiMapPin2Line,
  RiGovernmentLine,
  RiCommunityLine,
  RiMailLine,
  RiToolsLine,
  RiPencilLine,
  RiCloseLine,
  RiCheckLine,
  RiAddLine,
  RiErrorWarningFill,
  RiArrowDownSLine,
  RiSearchLine,
  RiContactsBook2Line,
} from 'react-icons/ri';
import { State, City } from 'country-state-city';
import { Autocomplete } from '@react-google-maps/api';
import AddressMap from '@/components/ui/address-map';
import * as Button from '@/components/ui/button';
import * as Tag from '@/components/ui/tag';
import { StatusColorPill } from '@/components/ui/status-color-pill';
import * as Input from '@/components/ui/input';
import * as Textarea from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as LinkButton from '@/components/ui/link-button';
import * as Switch from '@/components/ui/switch';
import * as Label from '@/components/ui/label';
import * as Popover from '@/components/ui/popover';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import ContactCards from '@/components/ui/contact-cards';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTeamForCenterThunk,
  getCenterDetailsThunk,
  updateCenterThunk,
} from '@/redux/centerSlice';
import { updateTeamMemberThunk } from '@/redux/teamManagementSlice';
import { CenterWorkingHoursSection } from '@/components/centers-management/center-working-hours-section';
import { safeWorkingHoursSummaryText } from '@/utils/center-working-hours-helpers';
import apiClient from '@/api/axios';
import { hasModulePermission } from '@/utils/user-role-utils';
import { getStatusOptions } from '@/api/dynamic-status';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { cn } from '@/utils/cn';

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

function buildDisplayAddressFromPlace(place) {
  if (!place) return '';
  const name = place.name?.trim();
  const formatted = place.formatted_address?.trim();
  if (formatted && name) {
    const f = formatted.toLowerCase();
    const n = name.toLowerCase();
    if (f.includes(n)) return formatted;
    return `${name}, ${formatted}`;
  }
  return formatted || name || '';
}

function serializePlaceForBackend(place) {
  if (!place?.geometry?.location) return null;
  const loc = place.geometry.location;
  const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
  const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
  if (lat == null || lng == null) return null;
  return {
    place_id: place.place_id ?? null,
    lat,
    lng,
    name: place.name ?? null,
    formatted_address: place.formatted_address ?? null,
  };
}

function getCoordinatesFromAddressPlace(raw) {
  const p = parseAddressPlace(raw);
  if (p?.lat == null || p?.lng == null) return null;
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

const CENTER_DETAIL_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Upcoming', label: 'Upcoming' },
];

const CENTER_DETAIL_ZONE_OPTIONS = [
  { value: 'Zone 1', label: 'Zone 1' },
  { value: 'Zone 2', label: 'Zone 2' },
  { value: 'Zone 3', label: 'Zone 3' },
  { value: 'Zone 4', label: 'Zone 4' },
  { value: 'Zone 5', label: 'Zone 5' },
  { value: 'Zone 6', label: 'Zone 6' },
];

// Helper to get state ISO code from state name
const getStateIsoCode = (stateName) => {
  if (!stateName) return '';
  const states = State.getStatesOfCountry('IN');
  const state = states.find((s) => s.name === stateName);
  return state?.isoCode || '';
};

const normalizeStatus = (statusValue) => (statusValue ? String(statusValue).trim() : '');

// DetailGrid component (same as space detail page)
const DetailGrid = ({ items = [] }) => {
  return (
    <div className='grid flex-1 grid-cols-2 gap-x-12 gap-y-4.5'>
      {items.map((item) => (
        <div key={item.label} className='flex flex-col gap-1'>
          <div className='text-paragraph-sm opacity-72 text-text-sub-500'>{item.label}</div>
          <div className='text-paragraph-sm text-text-strong-950'>
            <EditableFieldWrapper editable={item.editable ?? false} iconClassName='mr-2'>
              {item.value ?? '--'}
            </EditableFieldWrapper>
          </div>
        </div>
      ))}
    </div>
  );
};

const CenterDetailBasicDetails = ({ centerDetails: centerDetailData, onCityStatusChange }) => {
  const dispatch = useDispatch();
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const canWrite = hasModulePermission(userSideBarPerm, 'Center', 'write');
  const canRead = hasModulePermission(userSideBarPerm, 'Center', 'read');

  const [amenities, setAmenities] = useState([]);
  const [showRestOfAmenities, setShowRestOfAmenities] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressValue, setAddressValue] = useState(centerDetailData?.address || '');
  const [amenitiesInput, setAmenitiesInput] = useState(false);
  const [amenitiesInputValue, setAmenitiesInputValue] = useState('');
  const [removedAmenities, setRemovedAmenities] = useState([]);
  const [showMap, setShowMap] = useState(centerDetailData?.show_map ?? true);
  const autocompleteRef = useRef(null);
  const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]);
  const [isLoadingDynamicStatuses, setIsLoadingDynamicStatuses] = useState(false);
  /** AddressMap calls onAddressChange then onCoordinatesChange with same coords; avoid duplicate saves. */
  const mapAddressCoordsHandledRef = useRef(false);
  /** Tracks whether city is required (city was cleared or is missing). */
  const [cityRequired, setCityRequired] = useState(() => !centerDetailData?.city?.trim());

  // Use original data pattern like space detail page
  const original = centerDetailData?._original || centerDetailData || {};
  const [localChanges, setLocalChanges] = useState({});

  useEffect(() => {
    // Reset local edits when center changes
    setLocalChanges({});
    setAddressValue(centerDetailData?.address || '');
    setShowMap(centerDetailData?.show_map ?? true);
    setCityRequired(!centerDetailData?.city?.trim());
  }, [centerDetailData?.name, centerDetailData?.show_map, centerDetailData?.city]);

  // Notify parent when city-required status changes
  useEffect(() => {
    onCityStatusChange?.(cityRequired);
  }, [cityRequired, onCityStatusChange]);

  const getFieldValue = useCallback(
    (fieldName) => {
      const localValue = localChanges?.[fieldName];
      if (localValue !== undefined && localValue !== null) return localValue;
      return original?.[fieldName] ?? '';
    },
    [localChanges, original],
  );

  const docWorkingHoursSummary = useMemo(
    () => safeWorkingHoursSummaryText(getFieldValue('working_hours')),
    [getFieldValue],
  );

  const setLocalChange = useCallback((fieldName, value) => {
    setLocalChanges((previous) => ({ ...previous, [fieldName]: value }));
  }, []);

  // Handle center field change (similar to handleSpaceFieldChange)
  const handleCenterFieldChange = useCallback(
    async (fieldName, value) => {
      if (!centerDetailData?.name) return;

      // Prevent saving empty city — city is mandatory
      if (fieldName === 'city' && !value?.trim?.()) {
        showErrorToast('City is required. Please select a city.');
        return;
      }

      const currentValue = original?.[fieldName];
      const currentNormalized = String(currentValue ?? '');
      const newNormalized = String(value ?? '');

      // Only update if value actually changed
      if (currentNormalized === newNormalized) return;

      // Optimistic local update
      setLocalChange(fieldName, value);

      try {
        // Map field names to API field names
        const fieldMap = {
          carpet_area: 'carpet_area',
          status: 'status',
          zone: 'zone',
          state: 'state',
          city: 'city',
          micro_market: 'micro_market',
          pin_code: 'pin_code',
          address: 'address',
        };

        const apiFieldName = fieldMap[fieldName] || fieldName;
        const payload = {
          [apiFieldName]: value,
        };

        const updateResult = await dispatch(
          updateCenterThunk({ center_id: centerDetailData.name, payload }),
        );

        if (updateResult.type === 'center/updateCenter/rejected') {
          // Revert on error
          setLocalChange(fieldName, null);
          showErrorToast(updateResult.payload, {
            defaultMessage: 'Failed to update center. Please try again.',
          });
          return;
        }

        // If city is now being saved, clear the cityRequired warning after a successful save
        if (fieldName === 'city' && value?.trim?.()) {
          setCityRequired(false);
        }

        // Refetch center details for latest values
        await dispatch(getCenterDetailsThunk(centerDetailData.name));

        // Clear local override so UI reflects canonical backend value
        setLocalChanges((previous) => {
          const next = { ...previous };
          delete next[fieldName];
          return next;
        });
      } catch (error) {
        console.error('Failed to update center:', error);
        setLocalChange(fieldName, null);
        showErrorToast(error?.payload || error, {
          defaultMessage: 'Failed to update center. Please try again.',
        });
      }
    },
    [centerDetailData, original, localChanges, dispatch],
  );

  /** Save address + Google Places metadata in one request (exact pin + full display line). */
  const handleCenterAddressAndPlaceUpdate = useCallback(
    async (addressStr, addressPlaceObj) => {
      if (!centerDetailData?.name) return;

      const curAddr = String(original?.address ?? '');
      const curPlace = parseAddressPlace(original?.address_place);
      const nextAddr = String(addressStr ?? '');
      const nextPlace = addressPlaceObj;

      const addrSame = curAddr === nextAddr;
      let placeSame = false;
      if (nextPlace == null && curPlace == null) placeSame = true;
      else if (nextPlace && curPlace) {
        placeSame =
          Number(curPlace.lat) === Number(nextPlace.lat) &&
          Number(curPlace.lng) === Number(nextPlace.lng) &&
          (curPlace.place_id || '') === (nextPlace.place_id || '');
      }

      if (addrSame && placeSame) return;

      setLocalChange('address', addressStr);
      setLocalChange('address_place', nextPlace);

      try {
        const updateResult = await dispatch(
          updateCenterThunk({
            center_id: centerDetailData.name,
            payload: { address: addressStr, address_place: nextPlace },
          }),
        );

        if (updateResult.type === 'center/updateCenter/rejected') {
          setLocalChange('address', null);
          setLocalChange('address_place', null);
          showErrorToast(updateResult.payload, {
            defaultMessage: 'Failed to update center. Please try again.',
          });
          return;
        }

        await dispatch(getCenterDetailsThunk(centerDetailData.name));

        setLocalChanges((previous) => {
          const next = { ...previous };
          delete next.address;
          delete next.address_place;
          return next;
        });
      } catch (error) {
        console.error('Failed to update center:', error);
        setLocalChange('address', null);
        setLocalChange('address_place', null);
        showErrorToast(error?.payload || error, {
          defaultMessage: 'Failed to update center. Please try again.',
        });
      }
    },
    [centerDetailData?.name, original, dispatch],
  );

  const fetchAmenities = useCallback(async (selectedAmenityNames = []) => {
    try {
      const response = await apiClient.get('/resource/Amenities?limit=100');

      if (response.data) {
        const amenitiesWithSelection = (response.data.data || response.data || []).map(
          (amenity) => ({
            name: amenity.name,
            selected: selectedAmenityNames.includes(amenity.name),
          }),
        );
        setAmenities(amenitiesWithSelection);
      }
    } catch {
      // Handle error silently
    }
  }, []);

  useEffect(() => {
    if (centerDetailData) {
      const selectedAmenityNames =
        centerDetailData?.amenity_details?.map((item) => item.amenity) || [];
      fetchAmenities(selectedAmenityNames);
      setAddressValue(centerDetailData?.address || '');
    }
  }, [centerDetailData, fetchAmenities]);

  // Fetch dynamic status options for Center.status (active only)
  useEffect(() => {
    const fetchStatuses = async () => {
      setIsLoadingDynamicStatuses(true);
      try {
        const opts = await getStatusOptions({ doctype: 'Center', field: 'status' });
        setDynamicStatusOptions(opts);
      } catch {
        setDynamicStatusOptions([]);
      } finally {
        setIsLoadingDynamicStatuses(false);
      }
    };
    fetchStatuses();
  }, []);

  const handleClose = () => {
    setRemovedAmenities([]);
    setShowRestOfAmenities(false);
    // Reset amenities selection
    const selectedAmenityNames =
      centerDetailData?.amenity_details?.map((item) => item.amenity) || [];
    fetchAmenities(selectedAmenityNames);
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

        const selectedAmenityNames =
          centerDetailData?.amenity_details?.map((item) => item.amenity) || [];
        fetchAmenities(selectedAmenityNames);
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

  // Get all state options from country-state-city library
  const allStateOptions = useMemo(() => {
    const indianStates = State.getStatesOfCountry('IN');
    return indianStates
      .map((stateItem) => ({
        value: stateItem.name,
        label: stateItem.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const [centerTeamMembers, setCenterTeamMembers] = useState([]);
  const [centerTeamMembersLoading, setCenterTeamMembersLoading] = useState(false);
  const [spocDropdownOpen, setSpocDropdownOpen] = useState(false);
  const [spocSearch, setSpocSearch] = useState('');
  const [spocDraftIds, setSpocDraftIds] = useState(null);

  const loadCenterTeamMembers = useCallback(async () => {
    const centerId = centerDetailData?.name;
    if (!centerId) {
      setCenterTeamMembers([]);
      return;
    }
    setCenterTeamMembersLoading(true);
    try {
      const response = await dispatch(
        fetchTeamForCenterThunk({
          center: centerId,
          keyword: '',
          page: 1,
          limit_page_length: 500,
        }),
      ).unwrap();
      const message = response?.message ?? response;
      const rows = Array.isArray(message?.results) ? message.results : [];
      setCenterTeamMembers(rows);
    } catch {
      setCenterTeamMembers([]);
    } finally {
      setCenterTeamMembersLoading(false);
    }
  }, [centerDetailData?.name, dispatch]);

  useEffect(() => {
    void loadCenterTeamMembers();
  }, [loadCenterTeamMembers]);

  useEffect(() => {
    setSpocDraftIds(null);
    setSpocSearch('');
    setSpocDropdownOpen(false);
  }, [centerDetailData?.name]);

  useEffect(() => {
    if (!spocDropdownOpen) setSpocSearch('');
  }, [spocDropdownOpen]);

  /** Dropdown options from center_team_members (same source as Center > Teams tab). */
  const allSpocOptions = useMemo(() => {
    return centerTeamMembers
      .filter((row) => row.associated_team_row)
      .map((row) => ({
        value: String(row.associated_team_row),
        label: row.name || String(row.team_member_id),
        teamMemberId: String(row.team_member_id),
        role: row.role_type || row.role || '',
        email: row.email || '',
        mobile_no: row.mobile_no || row.cell_number || '',
        spoc: Number(row.spoc) === 1,
        raw: row,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [centerTeamMembers]);

  const selectedSpocIdsFromServer = useMemo(
    () => allSpocOptions.filter((option) => option.spoc).map((option) => option.value),
    [allSpocOptions],
  );

  const selectedSpocIds = useMemo(() => {
    const base = spocDraftIds ?? selectedSpocIdsFromServer;
    return [...new Set((base || []).map(String))];
  }, [spocDraftIds, selectedSpocIdsFromServer]);

  const selectedSpocLabel = useMemo(() => {
    if (selectedSpocIds.length === 0) return '';
    const selectedNames = selectedSpocIds
      .map((id) => allSpocOptions.find((option) => option.value === id)?.label)
      .filter(Boolean);
    if (selectedNames.length === 0) return '';
    if (selectedNames.length === 1) return selectedNames[0];
    return `${selectedNames.length} selected`;
  }, [allSpocOptions, selectedSpocIds]);

  const filteredSpocOptions = useMemo(() => {
    const keyword = spocSearch.trim().toLowerCase();
    if (!keyword) return allSpocOptions;
    return allSpocOptions.filter((option) => option.label.toLowerCase().includes(keyword));
  }, [allSpocOptions, spocSearch]);

  const persistCenterSpocs = useCallback(
    async (ids) => {
      if (!centerDetailData?.name || !canWrite) return;

      const wantSpoc = new Set((ids || []).map(String));
      if (allSpocOptions.length === 0) {
        showErrorToast('No team members linked to this center.');
        setSpocDraftIds(null);
        return;
      }

      try {
        for (const option of allSpocOptions) {
          const shouldBeSpoc = wantSpoc.has(option.value);
          if (shouldBeSpoc === option.spoc) continue;
          await dispatch(
            updateTeamMemberThunk({
              center_team_associated_row: option.value,
              center: centerDetailData.name,
              is_spoc: shouldBeSpoc ? 1 : 0,
            }),
          ).unwrap();
        }
        await dispatch(getCenterDetailsThunk(centerDetailData.name));
        await loadCenterTeamMembers();
        setSpocDraftIds(null);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update Center SPOC.' });
        await loadCenterTeamMembers();
        setSpocDraftIds(null);
      }
    },
    [allSpocOptions, canWrite, centerDetailData?.name, dispatch, loadCenterTeamMembers],
  );

  const debouncedPersistCenterSpocs = useDebouncedCallback(persistCenterSpocs, 600);

  const toggleSpocOption = useCallback(
    (id) => {
      if (!canWrite) return;
      const current = new Set((spocDraftIds ?? selectedSpocIdsFromServer).map(String));
      if (current.has(id)) current.delete(id);
      else current.add(id);
      const next = [...current];
      setSpocDraftIds(next);
      debouncedPersistCenterSpocs(next);
    },
    [canWrite, debouncedPersistCenterSpocs, selectedSpocIdsFromServer, spocDraftIds],
  );

  const centerSpocContacts = useMemo(() => {
    const selected = new Set(selectedSpocIds);
    return allSpocOptions
      .filter((option) => selected.has(option.value))
      .map((option) => ({
        name: option.label,
        email: option.email,
        mobile_no: option.mobile_no,
        is_spoc: true,
        originalContact: { center_team_associated_row: option.value },
      }));
  }, [allSpocOptions, selectedSpocIds]);

  const handleRemoveCenterSpocContact = useCallback(
    (contact) => {
      const rowId =
        contact?.originalContact?.center_team_associated_row ??
        contact?.originalContact?.associated_team_row;
      if (!rowId || !canWrite) return;
      const id = String(rowId);
      const current = (spocDraftIds ?? selectedSpocIdsFromServer).map(String);
      const next = current.filter((rowName) => rowName !== id);
      setSpocDraftIds(next);
      debouncedPersistCenterSpocs(next);
    },
    [canWrite, debouncedPersistCenterSpocs, selectedSpocIdsFromServer, spocDraftIds],
  );

  // Get all city options filtered by selected state
  const currentState = getFieldValue('state');
  const cityOptions = useMemo(() => {
    if (!currentState) return [];

    const stateIsoCode = getStateIsoCode(currentState);
    if (!stateIsoCode) return [];

    const citiesInState = City.getCitiesOfState('IN', stateIsoCode);

    return citiesInState
      .map((city) => ({
        value: city.name,
        label: city.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [currentState]);

  // Handle removing already selected amenity
  const handleRemoveSelectedAmenity = useCallback((amenityName) => {
    setRemovedAmenities((previous) => {
      if (previous.includes(amenityName)) {
        return previous.filter((name) => name !== amenityName);
      }
      return [...previous, amenityName];
    });
  }, []);

  // Toggle amenity selection
  const handleToggleAmenitySelection = useCallback((amenityName) => {
    setAmenities((previousAmenities) =>
      previousAmenities.map((amenity) =>
        amenity.name === amenityName ? { ...amenity, selected: !amenity.selected } : amenity,
      ),
    );
  }, []);

  // Update center with amenities
  const handleUpdateCenterWithAmenities = useCallback(async () => {
    if (!centerDetailData?.name) return;

    try {
      const selectedAmenityNames =
        centerDetailData?.amenity_details?.map((item) => item.amenity) || [];
      const selectedFromRest = amenities
        .filter((item) => item.selected && !selectedAmenityNames.includes(item.name))
        .map((item) => item.name);
      const remainingSelected = selectedAmenityNames.filter(
        (name) => !removedAmenities.includes(name),
      );
      const allSelectedAmenities = [...remainingSelected, ...selectedFromRest];

      if (allSelectedAmenities.length === 0) {
        showErrorToast('Please select at least one amenity');
        return;
      }

      const amenity_details = allSelectedAmenities.map((am) => ({
        amenity: am,
      }));

      const payload = {
        amenity_details,
      };

      await dispatch(updateCenterThunk({ center_id: centerDetailData.name, payload })).unwrap();
      await dispatch(getCenterDetailsThunk(centerDetailData.name)).unwrap();
      setRemovedAmenities([]);
      setShowRestOfAmenities(false);
    } catch (error) {
      console.error('Failed to update center:', error);
      showErrorToast(error, { defaultMessage: 'Failed to update amenities. Please try again.' });
    }
  }, [centerDetailData, amenities, removedAmenities, dispatch]);

  // Get the list of selected amenity names from centerDetailData
  const selectedAmenityNames = useMemo(
    () => centerDetailData?.amenity_details?.map((item) => item.amenity) || [],
    [centerDetailData?.amenity_details],
  );
  // Filter amenities to only include those not already selected
  const restOfAmenities = amenities.filter((item) => !selectedAmenityNames.includes(item.name));

  // Build DetailGrid items
  const detailGridItems = useMemo(() => {
    const statusValue = normalizeStatus(getFieldValue('status'));
    const selected = dynamicStatusOptions.find((o) => o.value === statusValue);
    const pillColor =
      selected?.color || centerDetailData?.status_color || centerDetailData?.statusColor || null;

    return [
      {
        label: 'Center code',
        value: canRead ? (
          <span>{centerDetailData?.name || '--'}</span>
        ) : (
          <span>{centerDetailData?.name || '--'}</span>
        ),
        editable: false,
      },
      {
        label: 'Status',
        value: canWrite ? (
          <SearchableSelect
            variant='borderless'
            size='xsmall'
            showArrow={false}
            value={statusValue || ''}
            onValueChange={(value) => handleCenterFieldChange('status', value)}
            disabled={isLoadingDynamicStatuses || dynamicStatusOptions.length === 0}
            options={dynamicStatusOptions}
            placeholder='Select'
            searchPlaceholder='Search...'
            noResultsMessage='No Status Options'
            triggerClassName='w-full -ml-2'
            renderTrigger={() =>
              statusValue ? (
                <StatusColorPill
                  value={selected?.label ?? statusValue}
                  color={pillColor}
                  className='max-w-full text-nowrap'
                />
              ) : (
                <span className='text-label-sm text-text-sub-400'>Select</span>
              )
            }
            renderOptionLabel={(opt) => (
              <StatusColorPill value={opt.label} color={opt.color} className='max-w-full' />
            )}
          />
        ) : (
          <StatusColorPill
            value={statusValue || '—'}
            color={pillColor}
            className='max-w-full text-nowrap'
          />
        ),
        editable: canWrite,
      },
      {
        label: 'Carpet Area',
        value: canWrite ? (
          <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
            <Input.Wrapper>
              <Input.Input
                value={getFieldValue('carpet_area') || ''}
                placeholder='Enter carpet area'
                onChange={(e) => {
                  const { value } = e.target;
                  // Allow digits, decimal point, and comma
                  let cleanedValue = value.replaceAll(/[^\d,.]/g, '');
                  // Ensure only one decimal point
                  const parts = cleanedValue.split('.');
                  if (parts.length > 2) {
                    cleanedValue = `${parts[0]}.${parts.slice(1).join('')}`;
                  }
                  setLocalChange('carpet_area', cleanedValue);
                }}
                onBlur={(e) => {
                  const { value } = e.target;
                  // Allow digits, decimal point, and comma
                  let cleanedValue = value.replaceAll(/[^\d,.]/g, '');
                  // Ensure only one decimal point
                  const parts = cleanedValue.split('.');
                  if (parts.length > 2) {
                    cleanedValue = `${parts[0]}.${parts.slice(1).join('')}`;
                  }
                  handleCenterFieldChange('carpet_area', cleanedValue);
                }}
                className='text-label-sm text-text-main-900'
              />
              <Input.Affix className='mr-7'>sq.ft</Input.Affix>
            </Input.Wrapper>
          </Input.Root>
        ) : (
          <span>
            {getFieldValue('carpet_area') ? `${getFieldValue('carpet_area')} sq.ft` : '--'}
          </span>
        ),
        editable: canWrite,
      },
      {
        label: 'Zone',
        value: canWrite ? (
          <SearchableSelect
            variant='borderless'
            size='xsmall'
            showArrow={false}
            value={getFieldValue('zone') || ''}
            onValueChange={(value) => handleCenterFieldChange('zone', value)}
            options={CENTER_DETAIL_ZONE_OPTIONS}
            placeholder='Select Zone'
            searchPlaceholder='Search...'
            noResultsMessage='No zones found'
            triggerClassName='w-full -ml-2'
          />
        ) : (
          <span>{getFieldValue('zone') || '--'}</span>
        ),
        editable: canWrite,
      },
      {
        label: 'State',
        value: canWrite ? (
          <SearchableSelect
            variant='borderless'
            size='xsmall'
            showArrow={false}
            value={getFieldValue('state') || ''}
            onValueChange={(value) => {
              // Clear city locally when state changes, but don't save empty city to backend
              setLocalChange('city', '');
              setCityRequired(true);
              handleCenterFieldChange('state', value);
              showErrorToast('City is required. Please select a city for the updated state.');
            }}
            options={allStateOptions}
            placeholder='Select State'
            searchPlaceholder='Search...'
            noResultsMessage='No states found'
            triggerClassName='w-full -ml-2'
          />
        ) : (
          <span>{getFieldValue('state') || '--'}</span>
        ),
        editable: canWrite,
      },
      {
        label: 'City',
        value: canWrite ? (
          <div className='flex flex-col gap-1'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              showArrow={false}
              value={getFieldValue('city') || ''}
              onValueChange={(value) => handleCenterFieldChange('city', value)}
              options={cityOptions}
              placeholder='Select City'
              searchPlaceholder='Search...'
              noResultsMessage='No cities found'
              disabled={!getFieldValue('state')}
              hasError={cityRequired && !getFieldValue('city')}
              triggerClassName={cn(
                'w-full -ml-2',
                cityRequired && !getFieldValue('city') && 'ring-1 ring-red-500 rounded-lg',
              )}
            />
            {cityRequired && !getFieldValue('city') && (
              <span className='text-red-500 text-xs flex items-center gap-1'>
                <RiErrorWarningFill size={12} />
                City is required
              </span>
            )}
          </div>
        ) : (
          <span>{getFieldValue('city') || '--'}</span>
        ),
        editable: canWrite,
      },
      {
        label: 'Micro Market',
        value: canWrite ? (
          <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
            <Input.Wrapper>
              <Input.Input
                value={getFieldValue('micro_market') || ''}
                placeholder='Enter micro market'
                onChange={(e) => setLocalChange('micro_market', e.target.value)}
                onBlur={(e) => handleCenterFieldChange('micro_market', e.target.value.trim())}
                className='text-label-sm text-text-main-900'
              />
            </Input.Wrapper>
          </Input.Root>
        ) : (
          <span>{getFieldValue('micro_market') || '--'}</span>
        ),
        editable: canWrite,
      },
      {
        label: 'Pin Code',
        value: canWrite ? (
          <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
            <Input.Wrapper>
              <Input.Input
                value={getFieldValue('pin_code') || ''}
                placeholder='Enter pin code'
                onChange={(e) => setLocalChange('pin_code', e.target.value)}
                onBlur={(e) => handleCenterFieldChange('pin_code', e.target.value.trim())}
                className='text-label-sm text-text-main-900'
              />
            </Input.Wrapper>
          </Input.Root>
        ) : (
          <span>{getFieldValue('pin_code') || '--'}</span>
        ),
        editable: canWrite,
      },
      {
        label: 'Address',
        value:
          isEditingAddress && canWrite ? (
            <Autocomplete
              onLoad={(ref) => {
                autocompleteRef.current = ref;
              }}
              onPlaceChanged={() => {
                if (!autocompleteRef.current) return;
                const place = autocompleteRef.current.getPlace();
                if (!place?.geometry?.location) return;
                const snapshot = serializePlaceForBackend(place);
                const newAddress = buildDisplayAddressFromPlace(place);
                if (!newAddress || !snapshot) return;
                setAddressValue(newAddress);
                handleCenterAddressAndPlaceUpdate(newAddress, snapshot);
                setIsEditingAddress(false);
              }}
              options={{
                fields: ['formatted_address', 'geometry', 'name', 'place_id'],
              }}
            >
              <Input.Root size='medium' simple className='w-full'>
                <Input.Wrapper>
                  <Input.Input
                    placeholder='Enter address'
                    value={addressValue}
                    onChange={(e) => setAddressValue(e.target.value)}
                    autoFocus
                    autoComplete='off'
                  />
                </Input.Wrapper>
              </Input.Root>
            </Autocomplete>
          ) : (
            <div
              className={`w-full py-2 px-2 -ml-2 rounded-lg transition-colors ${canWrite ? 'cursor-pointer hover:bg-bg-weak-50' : ''}`}
              onClick={
                canWrite
                  ? () => {
                      setIsEditingAddress(true);
                      setAddressValue(getFieldValue('address') || '');
                    }
                  : undefined
              }
            >
              <span className=''>{getFieldValue('address') || ''}</span>
            </div>
          ),
        editable: canWrite && !isEditingAddress,
      },
      {
        label: 'Working Hours',
        value: (
          <CenterWorkingHoursSection
            centerName={centerDetailData?.name}
            todayWorkingHoursFromDetails={centerDetailData?.today_working_hours}
            docWorkingHoursSummary={docWorkingHoursSummary}
          />
        ),
        editable: false,
      },
    ];
  }, [
    canWrite,
    getFieldValue,
    handleCenterFieldChange,
    handleCenterAddressAndPlaceUpdate,
    allStateOptions,
    cityOptions,
    cityRequired,
    isEditingAddress,
    addressValue,
    original,
    centerDetailData,
    dynamicStatusOptions,
    isLoadingDynamicStatuses,
    centerDetailData?.name,
    centerDetailData?.today_working_hours,
    docWorkingHoursSummary,
  ]);

  return (
    <div className='flex h-full min-h-0 flex-col flex-1 gap-8 pb-8'>
      {/* Basic Details Grid */}
      <DetailGrid items={detailGridItems} />

      {/* Center SPOC */}
      <div className='flex flex-col gap-4 border-t border-stroke-soft-200 pt-4'>
        <div className='flex flex-col gap-2 sm:max-w-md'>
          <div className='flex items-center gap-2'>
            <RiContactsBook2Line size={20} className='shrink-0 text-text-soft-400' />
            <span className='text-label-md text-text-sub-500'>Center SPOC</span>
          </div>
          {canWrite ? (
            <Popover.Root open={spocDropdownOpen} onOpenChange={setSpocDropdownOpen}>
              <Popover.Trigger asChild>
                <button
                  type='button'
                  className={cn(
                    'group/trigger relative w-full min-w-0 cursor-pointer shrink-0',
                    'h-10 min-h-10 gap-2 rounded-10 pl-3 pr-2.5',
                    'flex items-center text-left',
                    'bg-bg-white-0 shadow-regular-xs outline-none ring-1 ring-inset ring-stroke-soft-200',
                    'text-paragraph-sm text-text-strong-950',
                    'transition duration-200 ease-out',
                    'hover:bg-bg-weak-50 hover:ring-transparent',
                    'focus:shadow-button-important-focus focus:outline-none focus:ring-primary-base',
                    'data-[state=open]:!shadow-button-important-focus data-[state=open]:ring-primary-base',
                  )}
                >
                  <span
                    className={cn('flex-1 truncate', !selectedSpocLabel && 'text-text-soft-400')}
                  >
                    {selectedSpocLabel || 'Select SPOC'}
                  </span>
                  <RiArrowDownSLine
                    className={cn(
                      'ml-auto size-5 shrink-0 text-text-soft-400 transition-transform duration-200 ease-out',
                      spocDropdownOpen && 'rotate-180 text-text-strong-950',
                    )}
                  />
                </button>
              </Popover.Trigger>

              <Popover.Content
                align='start'
                sideOffset={6}
                showArrow={false}
                className='flex w-(--radix-popper-anchor-width) min-w-[260px] flex-col gap-3 p-3'
              >
                <Input.Root size='small'>
                  <Input.Wrapper>
                    <Input.Icon>
                      <RiSearchLine />
                    </Input.Icon>
                    <Input.Input
                      placeholder='Search team members...'
                      value={spocSearch}
                      onChange={(event) => setSpocSearch(event.target.value)}
                    />
                  </Input.Wrapper>
                </Input.Root>

                <div className='flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1'>
                  {centerTeamMembersLoading ? (
                    <div className='py-6 text-center text-paragraph-sm text-text-sub-600'>
                      Loading team members...
                    </div>
                  ) : filteredSpocOptions.length === 0 ? (
                    <div className='py-6 text-center text-paragraph-sm text-text-sub-600'>
                      {spocSearch ? 'No team members match your search' : 'No team members linked'}
                    </div>
                  ) : (
                    filteredSpocOptions.map((option) => {
                      const isSelected = selectedSpocIds.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type='button'
                          onClick={() => toggleSpocOption(option.value)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left outline-none transition hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-primary-base',
                            isSelected && 'bg-bg-weak-100',
                          )}
                        >
                          <span
                            className={cn(
                              'flex-1 truncate text-paragraph-sm',
                              isSelected
                                ? 'font-medium text-text-strong-950'
                                : 'text-text-strong-950',
                            )}
                          >
                            {option.label}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </Popover.Content>
            </Popover.Root>
          ) : null}
        </div>

        <ContactCards
          showSectionHeader={false}
          withTopBorder={false}
          contacts={centerSpocContacts}
          onDeleteContact={canWrite ? handleRemoveCenterSpocContact : undefined}
          showActions={canWrite}
          emptyState={{
            title: 'No center SPOCs selected',
            description: canWrite
              ? 'Select team members from the dropdown above.'
              : 'No team members are marked as SPOC for this center.',
          }}
        />
      </div>

      {/* Map Section */}
      <div className='flex flex-col flex-1 gap-4'>
        <div className='flex  gap-2'>
          <div className='flex items-center gap-2'>
            <Switch.Root
              id='map-toggle'
              checked={showMap}
              onCheckedChange={async (checked) => {
                setShowMap(checked);
                // Save map visibility preference to backend
                if (centerDetailData?.name) {
                  try {
                    await dispatch(
                      updateCenterThunk({
                        center_id: centerDetailData.name,
                        payload: { show_map: checked },
                      }),
                    ).unwrap();
                    await dispatch(getCenterDetailsThunk(centerDetailData.name));
                  } catch (error) {
                    // Revert on error
                    setShowMap(!checked);
                    showErrorToast(error, {
                      defaultMessage: 'Failed to update map visibility. Please try again.',
                    });
                  }
                }
              }}
              disabled={!canWrite}
            />
          </div>
          <div className='flex items-center gap-2'>
            <Label.Root htmlFor='map-toggle' className='label-medium text-text-main-900'>
              Map
            </Label.Root>
          </div>
        </div>
        {showMap && (
          <div className='w-96 h-52 flex-1'>
            <AddressMap
              address={getFieldValue('address') || addressValue}
              coordinates={getCoordinatesFromAddressPlace(getFieldValue('address_place'))}
              onAddressChange={(newAddress, coords) => {
                setAddressValue(newAddress);
                if (!canWrite) return;
                if (coords) {
                  mapAddressCoordsHandledRef.current = true;
                  handleCenterAddressAndPlaceUpdate(newAddress, {
                    place_id: null,
                    name: null,
                    formatted_address: newAddress,
                    lat: coords.lat,
                    lng: coords.lng,
                  });
                } else {
                  mapAddressCoordsHandledRef.current = false;
                  handleCenterFieldChange('address', newAddress);
                }
              }}
              onCoordinatesChange={(coords) => {
                if (!canWrite || !coords) return;
                if (mapAddressCoordsHandledRef.current) {
                  mapAddressCoordsHandledRef.current = false;
                  return;
                }
                const addr = getFieldValue('address') || addressValue;
                handleCenterAddressAndPlaceUpdate(addr, {
                  place_id: null,
                  name: null,
                  formatted_address: addr,
                  lat: coords.lat,
                  lng: coords.lng,
                });
              }}
              disabled={!canWrite}
              showInput={false}
              defaultStreetView
            />
          </div>
        )}
      </div>

      {/* Amenities */}
      <div className='flex flex-col flex-1 gap-4 pb-12'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <RiToolsLine size={20} className='text-text-sub-500' />
            <span className='label-medium text-text-main-900'>Amenities</span>
          </div>

          {showRestOfAmenities && (
            <div className='flex items-center gap-2'>
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
                onClick={handleUpdateCenterWithAmenities}
              >
                <Button.Icon className='text-green-500' as={RiCheckLine} />
              </Button.Root>
            </div>
          )}
        </div>

        <div className='w-full items-center flex flex-row flex-wrap gap-2'>
          {/* Show selected amenities */}
          {centerDetailData?.amenity_details?.map((amenity) => {
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
                    ? () => handleRemoveSelectedAmenity(amenity.amenity)
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
            restOfAmenities.map((amenity) => (
              <Tag.Root
                className={`${canWrite ? 'cursor-pointer' : ''} ${
                  amenity.selected
                    ? 'ring-[var(--color-primary-light)] bg-[var(--color-primary-lighter)]'
                    : ''
                } paragraph-xsmall`}
                key={amenity.name}
                variant={amenity.selected ? 'filled' : 'stroke'}
                onClick={canWrite ? () => handleToggleAmenitySelection(amenity.name) : undefined}
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
                >
                  <Button.Icon className='text-red-500' as={RiCloseLine} />
                </Button.Root>

                <Button.Root
                  onClick={handleAddAmenity}
                  variant='neutral'
                  mode='stroke'
                  size='small'
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
      </div>
    </div>
  );
};

export default CenterDetailBasicDetails;
