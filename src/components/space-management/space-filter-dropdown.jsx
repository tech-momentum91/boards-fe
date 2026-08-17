import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowRightSLine } from 'react-icons/ri';
import apiClient from '@/api/axios';
import { getStatusOptions } from '@/api/dynamic-status';
import {
  STATUS_OPTIONS,
  SPACE_TYPE_OPTIONS,
  PARKING_TYPE_FILTER_OPTIONS,
  ASSIGNING_TYPE_FILTER_OPTIONS,
  buildSpaceListApiFiltersFromApplied,
} from '@/components/space-management/constants';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import * as Slider from '@/components/ui/slider';
import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const SpaceFilterDropdown = React.forwardRef(
  (
    {
      setFilterCount,
      open,
      onOpenChange: _onOpenChange,
      onFiltersChange,
      appliedFilters = {},
      allowedTabs = null,
      isParkingView = false,
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const centerAccess = useSelector(selectCenterAccess);
    const [activeTab, setActiveTab] = useState('center');
    const [localFilters, setLocalFilters] = useState({
      center: ensureArray(appliedFilters.center),
      client: ensureArray(appliedFilters.client),
      status: ensureArray(appliedFilters.status),
      spaceType: ensureArray(appliedFilters.spaceType),
      availableSeats: appliedFilters.availableSeats || '',
      zone: ensureArray(appliedFilters.zone),
      parkingType: ensureArray(appliedFilters.parkingType),
      assigningType: ensureArray(appliedFilters.assigningType),
    });
    const [statusOptions, setStatusOptions] = useState([]);
    const [spaceTypeOptions, setSpaceTypeOptions] = useState([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [clientSuggestions, setClientSuggestions] = useState([]);
    const [searchText, setSearchText] = useState('');
    const popoverRef = useRef(null);

    // Get zone options from centerAccess data
    const zoneOptions = useMemo(() => {
      if (!Array.isArray(centerAccess.data)) return [];
      const zones = new Set();
      centerAccess.data.forEach((center) => {
        if (center.zone) {
          zones.add(center.zone);
        }
      });
      const zonesList = [...zones].map((zone) => ({
        value: zone,
        label: zone,
      }));

      return zonesList.sort((a, b) => a.label.localeCompare(b.label));
    }, [centerAccess.data]);

    useEffect(() => {
      setFilterCount(
        localFilters.center.length +
          localFilters.client.length +
          localFilters.status.length +
          localFilters.spaceType.length +
          (localFilters.availableSeats ? 1 : 0) +
          localFilters.zone.length +
          (isParkingView ? localFilters.parkingType.length + localFilters.assigningType.length : 0),
      );
    }, [
      localFilters.center.length,
      localFilters.client.length,
      localFilters.status.length,
      localFilters.spaceType.length,
      localFilters.availableSeats,
      localFilters.zone.length,
      localFilters.parkingType.length,
      localFilters.assigningType.length,
      isParkingView,
    ]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    const defaultTabs = [
      { value: 'center', label: 'Center' },
      { value: 'client', label: 'Client' },
      { value: 'status', label: 'Status' },
      { value: 'spaceType', label: 'Space Type' },
      { value: 'availableSeats', label: 'Available Seats' },
      { value: 'zone', label: 'Zone' },
    ];

    const layoutTabs = [
      { value: 'client', label: 'Client' },
      { value: 'spaceType', label: 'Space Type' },
      { value: 'status', label: 'Status' },
    ];

    const verticalTabs = useMemo(() => {
      if (Array.isArray(allowedTabs)) {
        return allowedTabs
          .map((t) => {
            if (t === 'client') return { value: 'client', label: 'Client' };
            if (t === 'spaceType') return { value: 'spaceType', label: 'Space Type' };
            if (t === 'status') return { value: 'status', label: 'Status' };
            if (t === 'center') return { value: 'center', label: 'Center' };
            if (t === 'availableSeats')
              return { value: 'availableSeats', label: 'Available Seats' };
            if (t === 'zone') return { value: 'zone', label: 'Zone' };
            if (t === 'parkingType') return { value: 'parkingType', label: 'Parking Type' };
            if (t === 'assigningType') return { value: 'assigningType', label: 'Assignment Type' };
            return null;
          })
          .filter(Boolean);
      }

      if (isParkingView) {
        return [
          ...defaultTabs,
          { value: 'parkingType', label: 'Parking Type' },
          { value: 'assigningType', label: 'Assignment Type' },
        ];
      }

      return defaultTabs;
    }, [allowedTabs, isParkingView]);

    // When popover opens, default to first allowed tab (e.g., client for layout)
    useEffect(() => {
      if (open && Array.isArray(verticalTabs) && verticalTabs.length > 0) {
        setActiveTab(verticalTabs[0].value);
        setSearchText('');
      }
    }, [open, verticalTabs]);

    useEffect(() => {
      const isParkingOnlyTab = activeTab === 'parkingType' || activeTab === 'assigningType';
      if (!isParkingView && isParkingOnlyTab) {
        setActiveTab(verticalTabs[0]?.value || 'center');
      }
    }, [isParkingView, activeTab, verticalTabs]);

    // Fetch center access on mount
    useEffect(() => {
      if (centerAccess.status === 'idle') {
        dispatch(fetchCenterAccess());
      }
    }, [centerAccess.status, dispatch]);

    // Fetch status and space type options
    useEffect(() => {
      const fetchFilterOptions = async () => {
        setIsLoadingOptions(true);
        try {
          // Fetch dynamic status options (active only) for Space.status
          const options = await getStatusOptions({ doctype: 'Space', field: 'status' });
          setStatusOptions(
            options.map((o) => ({ value: o.value, label: o.label })).filter((s) => s.value),
          );

          // Fetch space type options (inventory_type)
          // Keep using constants for now (space types are static)
          setSpaceTypeOptions(SPACE_TYPE_OPTIONS);
        } catch {
          // Error fetching filter options - keep empty (API-only statuses)
          setStatusOptions([]);
          setSpaceTypeOptions(SPACE_TYPE_OPTIONS);
        } finally {
          setIsLoadingOptions(false);
        }
      };

      if (open) {
        fetchFilterOptions();
      }
    }, [open]);

    // Update local filters when appliedFilters change
    useEffect(() => {
      setLocalFilters({
        center: ensureArray(appliedFilters.center),
        client: ensureArray(appliedFilters.client),
        status: ensureArray(appliedFilters.status),
        spaceType: ensureArray(appliedFilters.spaceType),
        availableSeats: appliedFilters.availableSeats || '',
        zone: ensureArray(appliedFilters.zone),
        parkingType: ensureArray(appliedFilters.parkingType),
        assigningType: ensureArray(appliedFilters.assigningType),
      });
    }, [appliedFilters]);

    // Debounced client search
    const clientSearchTimer = useRef(null);
    useEffect(() => {
      if (activeTab !== 'client') return undefined;

      const keyword = String(searchText || '').trim();

      setIsLoadingClients(true);
      if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
      clientSearchTimer.current = setTimeout(async () => {
        try {
          const form = new FormData();
          form.append('page', '1');
          form.append('limit_page_length', '50');
          form.append('order_by', 'creation desc');
          form.append('filters', '');
          form.append('keyword', keyword);

          const resp = await apiClient.post('/method/devx.overrides.client.client_list_view', form);
          const msg = resp?.data?.message || {};
          const raw = msg?.results || msg?.data || [];
          const results = Array.isArray(raw) ? raw : [];

          const transformed = results
            .map((item) => {
              const id = String(item.name || item.customer_id || '').trim();
              const label =
                item.client_name ||
                item.customer_name ||
                item.custom_display_name ||
                String(item.client_name || item.customer_name || item.name || '').trim();
              return { value: id, label: label || id };
            })
            .filter((r) => r.value);

          setClientSuggestions(transformed);
        } catch {
          setClientSuggestions([]);
        } finally {
          setIsLoadingClients(false);
        }
      }, 350);

      return () => {
        if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
      };
    }, [searchText, activeTab, open]);

    // Get center options from centerAccess
    const centerOptions = useMemo(() => {
      if (!Array.isArray(centerAccess.data)) return [];
      const centers = centerAccess.data.map((c) => ({
        value: c.name || c.center_name,
        label: c.center_name || c.name || c.name,
      }));
      return centers;
    }, [centerAccess.data]);

    // Current tab options with search filtering (similar to clients filter dropdown)
    const currentOptions = useMemo(() => {
      let options = [];

      switch (activeTab) {
        case 'center':
          options = centerOptions;
          break;
        case 'client': {
          const selected = localFilters.client || [];
          const byValue = new Map(clientSuggestions.map((option) => [option.value, option]));
          selected.forEach((value) => {
            if (!byValue.has(value)) {
              byValue.set(value, { value, label: value });
            }
          });
          options = [...byValue.values()];
          break;
        }
        case 'status':
          options = statusOptions;
          break;
        case 'spaceType':
          options = spaceTypeOptions;
          break;
        case 'zone':
          options = zoneOptions;
          break;
        case 'parkingType':
          options = PARKING_TYPE_FILTER_OPTIONS;
          break;
        case 'assigningType':
          options = ASSIGNING_TYPE_FILTER_OPTIONS;
          break;
        default:
          options = [];
      }

      if (activeTab !== 'client' && searchText.trim()) {
        const lowerSearch = searchText.toLowerCase().trim();
        return options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(lowerSearch) ||
            opt.value.toLowerCase().includes(lowerSearch),
        );
      }

      return options;
    }, [
      activeTab,
      centerOptions,
      statusOptions,
      spaceTypeOptions,
      zoneOptions,
      searchText,
      clientSuggestions,
      localFilters.client,
    ]);

    const buildFiltersArray = useCallback(() => {
      return buildSpaceListApiFiltersFromApplied(localFilters, centerAccess.data);
    }, [localFilters, centerAccess.data]);

    const handleFilterChange = (key, value) => {
      setLocalFilters((previous) => ({ ...previous, [key]: value }));
      // Do NOT call API here - only update local state
    };

    const handleClear = () => {
      const clearedFilters = {
        center: [],
        client: [],
        status: [],
        spaceType: [],
        availableSeats: '',
        zone: [],
        parkingType: [],
        assigningType: [],
      };
      setLocalFilters(clearedFilters);
      setSearchText('');
      // Do NOT call API here - only update local state
      // API will be called when popover closes
    };

    // Generic toggle handler (like clients filter dropdown)
    const handleToggle = useCallback(
      (value) => {
        setLocalFilters((previous) => {
          if (!(activeTab in previous)) return previous;

          const currentList = Array.isArray(previous[activeTab]) ? previous[activeTab] : [];
          const isSelected = currentList.includes(value);
          const newValues = isSelected
            ? currentList.filter((item) => item !== value)
            : [...currentList, value];

          return {
            ...previous,
            [activeTab]: newValues,
          };
        });
      },
      [activeTab],
    );

    // Handle when popover closes (blur/interact outside)
    // Only call API when popover closes, not on filter changes
    const handlePopoverClose = useCallback(() => {
      const filtersArray = buildFiltersArray();
      // Call the filter change callback with the current filter state
      // This will trigger the API call in the parent component
      onFiltersChange?.(filtersArray, localFilters);
    }, [localFilters, onFiltersChange, buildFiltersArray]);

    // Track previous open state to detect when popover closes
    const previousOpenRef = useRef(open);
    useEffect(() => {
      // When popover closes (was open, now closed), trigger filter change
      if (previousOpenRef.current && !open) {
        handlePopoverClose();
      }
      previousOpenRef.current = open;
    }, [open, handlePopoverClose]);

    // Expose handleClose method via ref
    useImperativeHandle(ref, () => ({
      handleClose: handlePopoverClose,
    }));

    if (!open) return null;

    return (
      <Filter.Root
        ref={popoverRef}
        onInteractOutside={handlePopoverClose}
        onEscapeKeyDown={handlePopoverClose}
      >
        <Filter.Header title='FILTERS' onClear={handleClear} />
        <Filter.Body>
          <Filter.Sidebar width='180px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='p-2 border-r-0'>
                {verticalTabs.map((item) => {
                  const { value } = item;
                  const isArrayFilter =
                    value === 'center' ||
                    value === 'client' ||
                    value === 'status' ||
                    value === 'spaceType' ||
                    value === 'zone' ||
                    value === 'parkingType' ||
                    value === 'assigningType';

                  const selectedCount = isArrayFilter
                    ? Array.isArray(localFilters[value])
                      ? localFilters[value].length
                      : 0
                    : 0;

                  const hasAvailableSeats =
                    value === 'availableSeats' && Number(localFilters.availableSeats) > 0;

                  const showCount = isArrayFilter ? selectedCount > 0 : hasAvailableSeats;
                  const countValue = isArrayFilter ? selectedCount : hasAvailableSeats ? 1 : 0;

                  return (
                    <TabMenuVertical.Trigger
                      className='w-full flex items-center justify-between'
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                      {showCount ? (
                        <Badge.Root
                          size='medium'
                          variant='filled'
                          className='shrink-0 rounded-full bg-black'
                        >
                          {countValue}
                        </Badge.Root>
                      ) : (
                        <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                      )}
                    </TabMenuVertical.Trigger>
                  );
                })}
              </TabMenuVertical.List>
            </TabMenuVertical.Root>
          </Filter.Sidebar>

          <Filter.Content width='300px'>
            {activeTab === 'availableSeats' ? (
              <div className='flex flex-col gap-4 p-4'>
                <div className='flex flex-col gap-4'>
                  <label className='paragraph-small text-(--color-text-sub-500)'>
                    Available Seats
                  </label>
                  <div className='flex flex-col gap-3 px-2'>
                    <span className='w-full label-large flex gap-1 items-center justify-center  text-text-main-900'>
                      {localFilters.availableSeats || 0}{' '}
                      <span className='label-medium text-text-soft-400'>Seats</span>
                    </span>
                    <Slider.Root
                      value={[
                        localFilters.availableSeats ? Number(localFilters.availableSeats) : 0,
                      ]}
                      onValueChange={(values) => {
                        const newValue = values[0]?.toString() || '';
                        handleFilterChange('availableSeats', newValue);
                      }}
                      min={0}
                      max={500}
                      step={1}
                      className='w-full'
                    >
                      <Slider.Thumb />
                    </Slider.Root>
                    <div className='flex items-center justify-between text-paragraph-xs text-text-sub-500'>
                      <span className='paragraph-small text-(--color-text-sub-500)'>0</span>

                      <span className='paragraph-small text-(--color-text-sub-500)'>500</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'client' ? (
              <div className='flex overflow-y-scroll flex-col gap-3 p-4'>
                <Filter.List
                  options={currentOptions}
                  selectedValues={localFilters.client || []}
                  onToggle={handleToggle}
                  searchValue={searchText}
                  onSearchChange={setSearchText}
                  isLoading={isLoadingClients}
                  emptyMessage='No clients found'
                />
              </div>
            ) : (
              <Filter.List
                options={currentOptions}
                selectedValues={localFilters[activeTab] || []}
                onToggle={handleToggle}
                searchValue={searchText}
                onSearchChange={setSearchText}
                isLoading={
                  activeTab === 'center'
                    ? centerAccess.status === 'loading'
                    : isLoadingOptions && (activeTab === 'status' || activeTab === 'spaceType')
                }
                emptyMessage={
                  activeTab === 'center'
                    ? 'No centers found'
                    : activeTab === 'client'
                      ? 'No clients found'
                      : activeTab === 'status'
                        ? 'No status options found'
                        : activeTab === 'parkingType'
                          ? 'No parking type options found'
                          : activeTab === 'assigningType'
                            ? 'No assignment type options found'
                            : 'No options found'
                }
              />
            )}
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

SpaceFilterDropdown.displayName = 'SpaceFilterDropdown';

export default SpaceFilterDropdown;
