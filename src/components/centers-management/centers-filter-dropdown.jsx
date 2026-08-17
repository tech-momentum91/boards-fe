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
import { State, City } from 'country-state-city';
import apiClient from '@/api/axios';
import { getStatusOptions } from '@/api/dynamic-status';
import { showErrorToast } from '@/utils/error-utils';

import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import * as Slider from '@/components/ui/slider';
import * as Input from '@/components/ui/input';
import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';

// Helper to get state ISO code from state name
const getStateIsoCode = (stateName) => {
  if (!stateName) return '';
  const states = State.getStatesOfCountry('IN');
  const state = states.find((s) => s.name === stateName);
  return state?.isoCode || '';
};

const CentersFilterDropdown = React.forwardRef(
  (
    { setFilterCount, open, onOpenChange: _onOpenChange, onFiltersChange, appliedFilters = {} },
    ref,
  ) => {
    const dispatch = useDispatch();
    const centerAccess = useSelector(selectCenterAccess);
    const centerListData = useSelector((state) => state.center.centerListData);

    const [activeTab, setActiveTab] = useState('zone');
    const [localFilters, setLocalFilters] = useState({
      zone: Array.isArray(appliedFilters.zone)
        ? appliedFilters.zone
        : appliedFilters.zone
          ? [appliedFilters.zone]
          : [],
      state: Array.isArray(appliedFilters.state)
        ? appliedFilters.state
        : appliedFilters.state
          ? [appliedFilters.state]
          : [],
      city: Array.isArray(appliedFilters.city)
        ? appliedFilters.city
        : appliedFilters.city
          ? [appliedFilters.city]
          : [],
      status: Array.isArray(appliedFilters.status)
        ? appliedFilters.status
        : appliedFilters.status
          ? [appliedFilters.status]
          : [],
      micro_market: Array.isArray(appliedFilters.micro_market)
        ? appliedFilters.micro_market
        : appliedFilters.micro_market
          ? [appliedFilters.micro_market]
          : [],
      // carpet_area:
      //   appliedFilters.carpet_area !== undefined && appliedFilters.carpet_area !== null
      //     ? Number(appliedFilters.carpet_area)
      //     : null,
    });
    const [searchText, setSearchText] = useState('');
    const popoverRef = useRef(null);

    // const maxCarpetArea = useMemo(() => {
    //   let max = 0;
    //   const processCenters = (centers) => {
    //     if (Array.isArray(centers)) {
    //       centers.forEach((center) => {
    //         const area = Number.parseFloat(center.carpet_area);
    //         if (!Number.isNaN(area) && area > max) {
    //           max = area;
    //         }
    //       });
    //     }
    //   };
    //   processCenters(centerAccess.data);
    //   processCenters(centerListData.data);
    //   return max > 0 ? Math.ceil(max) : 100000;
    // }, [centerAccess.data, centerListData.data]);

    useEffect(() => {
      setFilterCount(
        localFilters.zone.length +
          localFilters.state.length +
          localFilters.city.length +
          localFilters.status.length +
          localFilters.micro_market.length,
        // (localFilters.carpet_area && localFilters.carpet_area < maxCarpetArea ? 1 : 0),
      );
    }, [
      localFilters.zone.length,
      localFilters.state.length,
      localFilters.city.length,
      localFilters.status.length,
      localFilters.micro_market.length,
      // localFilters.carpet_area,
      // maxCarpetArea,
    ]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    const verticalTabs = [
      {
        value: 'zone',
        label: 'Zone',
      },
      {
        value: 'state',
        label: 'State',
      },
      {
        value: 'city',
        label: 'City',
      },
      {
        value: 'status',
        label: 'Status',
      },
      {
        value: 'micro_market',
        label: 'Micro Market',
      },
      // {
      //   value: 'carpet_area',
      //   label: 'Carpet Area',
      // },
    ];

    // Fetch center access on mount
    useEffect(() => {
      if (centerAccess.status === 'idle') {
        dispatch(fetchCenterAccess());
      }
    }, [centerAccess.status, dispatch]);

    // Update local filters when appliedFilters change
    useEffect(() => {
      setLocalFilters({
        zone: Array.isArray(appliedFilters.zone)
          ? appliedFilters.zone
          : appliedFilters.zone
            ? [appliedFilters.zone]
            : [],
        state: Array.isArray(appliedFilters.state)
          ? appliedFilters.state
          : appliedFilters.state
            ? [appliedFilters.state]
            : [],
        city: Array.isArray(appliedFilters.city)
          ? appliedFilters.city
          : appliedFilters.city
            ? [appliedFilters.city]
            : [],
        status: Array.isArray(appliedFilters.status)
          ? appliedFilters.status
          : appliedFilters.status
            ? [appliedFilters.status]
            : [],
        micro_market: Array.isArray(appliedFilters.micro_market)
          ? appliedFilters.micro_market
          : appliedFilters.micro_market
            ? [appliedFilters.micro_market]
            : [],
        // carpet_area:
        //   appliedFilters.carpet_area !== undefined && appliedFilters.carpet_area !== null
        //     ? Number(appliedFilters.carpet_area)
        //     : null,
      });
    }, [appliedFilters]);

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

    // Get all state options using country-state-city library
    const stateOptions = useMemo(() => {
      const allIndianStates = State.getStatesOfCountry('IN');
      const states = allIndianStates
        .map((stateItem) => ({
          value: stateItem.name,
          label: stateItem.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      return states;
    }, []);

    // Get filtered city options based on selected state
    const cityOptions = useMemo(() => {
      if (!localFilters.state || localFilters.state.length === 0) return [];

      // Get cities for all selected states
      const allCities = new Set();
      localFilters.state.forEach((stateName) => {
        const stateIsoCode = getStateIsoCode(stateName);
        if (stateIsoCode) {
          const cities = City.getCitiesOfState('IN', stateIsoCode);
          cities.forEach((city) => {
            allCities.add(city.name);
          });
        }
      });

      const citiesList = [...allCities].map((city) => ({
        value: city,
        label: city,
      }));

      return citiesList.sort((a, b) => a.label.localeCompare(b.label));
    }, [localFilters.state]);

    // Status options
    const [statusOptions, setStatusOptions] = useState([]);

    useEffect(() => {
      const fetchStatuses = async () => {
        try {
          const opts = await getStatusOptions({ doctype: 'Center', field: 'status' });
          setStatusOptions(opts.map((o) => ({ value: o.value, label: o.label, order: o.order })));
        } catch (error) {
          setStatusOptions([]);
          // do not spam toast on filter open; only log in dev if needed
          if (process.env.NODE_ENV === 'development') {
            showErrorToast(error, { defaultMessage: 'Unable to load center statuses.' });
          }
        }
      };

      if (open) fetchStatuses();
    }, [open]);

    // Get micro market options from centerAccess data and centerListData as fallback
    const microMarketOptions = useMemo(() => {
      const markets = new Set();

      // Try centerAccess data first
      if (Array.isArray(centerAccess.data)) {
        centerAccess.data.forEach((center) => {
          if (center.micro_market) {
            markets.add(center.micro_market);
          }
        });
      }

      // Supplement with centerListData.data if needed
      if (Array.isArray(centerListData.data)) {
        centerListData.data.forEach((center) => {
          if (center.micro_market) {
            markets.add(center.micro_market);
          }
        });
      }

      const marketsList = [...markets].map((market) => ({
        value: market,
        label: market,
      }));

      return marketsList.sort((a, b) => a.label.localeCompare(b.label));
    }, [centerAccess.data, centerListData.data]);

    // const carpetAreaOption = useMemo(() => {
    //   const carpetAreas = new Set();
    //   if (Array.isArray(centerAccess.data)) {
    //     centerAccess.data.forEach((center) => {
    //       if (center.carpet_area) {
    //         carpetAreas.add(center.carpet_area);
    //       }
    //     });
    //   }
    //   if (Array.isArray(centerListData.data)) {
    //     centerListData.data.forEach((center) => {
    //       if (center.carpet_area) {
    //         carpetAreas.add(center.carpet_area);
    //       }
    //     });
    //   }
    //   const carpetAreasList = [...carpetAreas].map((carpetArea) => ({
    //     value: carpetArea,
    //     label: carpetArea,
    //   }));
    //   return carpetAreasList.sort((a, b) => a.label.localeCompare(b.label));
    // }, [centerAccess.data, centerListData.data]);

    const currentOptions = useMemo(() => {
      let options = [];

      switch (activeTab) {
        case 'zone':
          options = zoneOptions;
          break;
        case 'state':
          options = stateOptions;
          break;
        case 'city':
          options = localFilters.state && localFilters.state.length > 0 ? cityOptions : [];
          break;
        case 'status':
          options = statusOptions;
          break;
        case 'micro_market':
          options = microMarketOptions;
          break;
        // case 'carpet_area':
        //   options = carpetAreaOption;
        //   break;
        default:
          options = [];
      }

      if (searchText.trim()) {
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
      zoneOptions,
      stateOptions,
      cityOptions,
      statusOptions,
      microMarketOptions,
      // carpetAreaOption,
      localFilters.state,
      searchText,
      centerListData.data,
    ]);

    // Helper function to build filters array from filter object
    const buildFiltersArrayForFilters = (filters) => {
      const filtersArray = [];
      // Add zone filters
      if (Array.isArray(filters.zone) && filters.zone.length > 0) {
        if (filters.zone.length === 1) {
          filtersArray.push(['zone', '=', filters.zone[0]]);
        } else {
          filtersArray.push(['zone', 'in', filters.zone]);
        }
      }
      // Add state filters
      if (Array.isArray(filters.state) && filters.state.length > 0) {
        if (filters.state.length === 1) {
          filtersArray.push(['state', '=', filters.state[0]]);
        } else {
          filtersArray.push(['state', 'in', filters.state]);
        }
      }
      // Add city filters
      if (Array.isArray(filters.city) && filters.city.length > 0) {
        if (filters.city.length === 1) {
          filtersArray.push(['city', '=', filters.city[0]]);
        } else {
          filtersArray.push(['city', 'in', filters.city]);
        }
      }
      // Add status filters
      if (Array.isArray(filters.status) && filters.status.length > 0) {
        if (filters.status.length === 1) {
          filtersArray.push(['status', '=', filters.status[0]]);
        } else {
          filtersArray.push(['status', 'in', filters.status]);
        }
      }
      // Add micro market filters
      if (Array.isArray(filters.micro_market) && filters.micro_market.length > 0) {
        if (filters.micro_market.length === 1) {
          filtersArray.push(['micro_market', '=', filters.micro_market[0]]);
        } else {
          filtersArray.push(['micro_market', 'in', filters.micro_market]);
        }
      }
      // Add carpet area filters
      // if (filters.carpet_area !== undefined && filters.carpet_area !== null) {
      //   filtersArray.push(['carpet_area', '<=', Number(filters.carpet_area)]);
      // }
      return filtersArray;
    };

    // Helper function to build filters array from current localFilters
    const buildFiltersArray = useCallback(() => {
      return buildFiltersArrayForFilters(localFilters);
    }, [localFilters]);

    const handleZoneToggle = (zoneValue) => {
      setLocalFilters((previous) => {
        const currentZones = Array.isArray(previous.zone) ? previous.zone : [];
        const isSelected = currentZones.includes(zoneValue);
        return {
          ...previous,
          zone: isSelected
            ? currentZones.filter((z) => z !== zoneValue)
            : [...currentZones, zoneValue],
        };
      });
    };

    const handleStateToggle = (stateValue) => {
      setLocalFilters((previous) => {
        const currentStates = Array.isArray(previous.state) ? previous.state : [];
        const isSelected = currentStates.includes(stateValue);
        const newStates = isSelected
          ? currentStates.filter((s) => s !== stateValue)
          : [...currentStates, stateValue];

        // Clear city when state changes
        return {
          ...previous,
          state: newStates,
          city: [], // Clear city when state changes
        };
      });
    };

    const handleCityToggle = (cityValue) => {
      setLocalFilters((previous) => {
        const currentCities = Array.isArray(previous.city) ? previous.city : [];
        const isSelected = currentCities.includes(cityValue);
        return {
          ...previous,
          city: isSelected
            ? currentCities.filter((c) => c !== cityValue)
            : [...currentCities, cityValue],
        };
      });
    };

    const handleStatusToggle = (statusValue) => {
      setLocalFilters((previous) => {
        const currentStatus = Array.isArray(previous.status) ? previous.status : [];
        const isSelected = currentStatus.includes(statusValue);
        return {
          ...previous,
          status: isSelected
            ? currentStatus.filter((s) => s !== statusValue)
            : [...currentStatus, statusValue],
        };
      });
    };

    const handleMicroMarketToggle = (marketValue) => {
      setLocalFilters((previous) => {
        const currentMarkets = Array.isArray(previous.micro_market) ? previous.micro_market : [];
        const isSelected = currentMarkets.includes(marketValue);
        return {
          ...previous,
          micro_market: isSelected
            ? currentMarkets.filter((m) => m !== marketValue)
            : [...currentMarkets, marketValue],
        };
      });
    };

    // const handleCarpetAreaChange = (value) => {
    //   setLocalFilters((previous) => ({
    //     ...previous,
    //     carpet_area: value,
    //   }));
    // };

    const handleClear = () => {
      const clearedFilters = {
        zone: [],
        state: [],
        city: [],
        status: [],
        micro_market: [],
        // carpet_area: null,
      };
      setLocalFilters(clearedFilters);
      setSearchText('');
    };

    const handlePopoverClose = useCallback(() => {
      const filtersArray = buildFiltersArray();
      onFiltersChange?.(filtersArray, localFilters);
    }, [localFilters, onFiltersChange, buildFiltersArray]);

    const previousOpenRef = useRef(open);
    useEffect(() => {
      if (previousOpenRef.current && !open) {
        handlePopoverClose();
      }
      previousOpenRef.current = open;
    }, [open, handlePopoverClose]);

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
                  const selectedZoneCount =
                    item.value === 'zone' && Array.isArray(localFilters.zone)
                      ? localFilters.zone.length
                      : 0;
                  const showZoneCount = item.value === 'zone' && selectedZoneCount > 0;

                  const selectedStateCount =
                    item.value === 'state' && Array.isArray(localFilters.state)
                      ? localFilters.state.length
                      : 0;
                  const showStateCount = item.value === 'state' && selectedStateCount > 0;

                  const selectedCityCount =
                    item.value === 'city' && Array.isArray(localFilters.city)
                      ? localFilters.city.length
                      : 0;
                  const showCityCount = item.value === 'city' && selectedCityCount > 0;

                  const selectedStatusCount =
                    item.value === 'status' && Array.isArray(localFilters.status)
                      ? localFilters.status.length
                      : 0;
                  const showStatusCount = item.value === 'status' && selectedStatusCount > 0;

                  const selectedMicroMarketCount =
                    item.value === 'micro_market' && Array.isArray(localFilters.micro_market)
                      ? localFilters.micro_market.length
                      : 0;
                  const showMicroMarketCount =
                    item.value === 'micro_market' && selectedMicroMarketCount > 0;

                  // const showCarpetAreaCount =
                  //   item.value === 'carpet_area' &&
                  //   localFilters.carpet_area !== null &&
                  //   localFilters.carpet_area < maxCarpetArea;

                  const showCount =
                    showZoneCount ||
                    showStateCount ||
                    showCityCount ||
                    showStatusCount ||
                    showMicroMarketCount;
                  // showCarpetAreaCount;
                  const countValue = showZoneCount
                    ? selectedZoneCount
                    : showStateCount
                      ? selectedStateCount
                      : showCityCount
                        ? selectedCityCount
                        : showStatusCount
                          ? selectedStatusCount
                          : showMicroMarketCount
                            ? selectedMicroMarketCount
                            : 1;
                  // : showCarpetAreaCount
                  //   ? 1
                  //   : 0;

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
            {/* {activeTab === 'carpet_area' ? (
              <div className='flex flex-col gap-6 p-4 h-full'>
                <div className='flex flex-col gap-2'>
                  <span className='text-label-sm text-text-sub-600'>Carpet Area (sq. ft.)</span>
                  <div className='flex items-center gap-2'>
                    <Input.Root size='small' className='w-24'>
                      <Input.Wrapper>
                        <Input.Input
                          type='number'
                          value={
                            localFilters.carpet_area === null
                              ? maxCarpetArea
                              : localFilters.carpet_area
                          }
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Number(e.target.value);
                            handleCarpetAreaChange(val);
                          }}
                          max={maxCarpetArea}
                          min={0}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                    <span className='text-paragraph-sm text-text-sub-600'>sq. ft.</span>
                  </div>
                </div>

                {/* <div className='flex flex-col gap-4 px-1'>
                  <Slider.Root
                    value={[
                      localFilters.carpet_area === null ? maxCarpetArea : localFilters.carpet_area,
                    ]}
                    onValueChange={([val]) => handleCarpetAreaChange(val)}
                    max={maxCarpetArea}
                    step={1}
                  >
                    <Slider.Thumb />
                  </Slider.Root>
                  <div className='flex items-center justify-between text-paragraph-xs text-text-soft-400'>
                    <span>0</span>
                    <span>{maxCarpetArea.toLocaleString()}</span>
                  </div>
                </div> */}
            {/* </div> */}
            {/* ) : (  */}
            <Filter.List
              options={currentOptions}
              selectedValues={localFilters[activeTab] || []}
              onToggle={
                activeTab === 'zone'
                  ? handleZoneToggle
                  : activeTab === 'state'
                    ? handleStateToggle
                    : activeTab === 'city'
                      ? handleCityToggle
                      : activeTab === 'status'
                        ? handleStatusToggle
                        : activeTab === 'micro_market'
                          ? handleMicroMarketToggle
                          : () => {}
              }
              searchValue={searchText}
              onSearchChange={setSearchText}
              virtualized
              isLoading={
                (activeTab === 'zone' || activeTab === 'micro_market') &&
                centerAccess.status === 'loading'
              }
              emptyMessage={
                activeTab === 'city' && (!localFilters.state || localFilters.state.length === 0)
                  ? 'Please select a state first'
                  : activeTab === 'zone'
                    ? 'No zones found'
                    : activeTab === 'state'
                      ? 'No states found'
                      : activeTab === 'city'
                        ? 'No cities found'
                        : activeTab === 'status'
                          ? 'No status options found'
                          : activeTab === 'micro_market'
                            ? 'No micro market options found'
                            : 'No options found'
              }
            />
            {/* )} */}
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

CentersFilterDropdown.displayName = 'CentersFilterDropdown';

export default CentersFilterDropdown;
