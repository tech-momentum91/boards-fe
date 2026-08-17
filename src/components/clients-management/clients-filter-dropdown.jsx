import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowRightSLine } from 'react-icons/ri';
import { State, City } from 'country-state-city';

import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';

import apiClient from '@/api/axios';
import { useDebounce } from '@/hooks/use-debounce';
import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';
import { FILTER_TABS, FILTER_TAB_CONFIG } from '@/components/clients-management/constants';
import { ensureArray } from '@/utils/global-search-utils';

const getStateIsoCode = (stateName) => {
  if (!stateName) return '';
  const state = State.getStatesOfCountry('IN').find((s) => s.name === stateName);
  return state?.isoCode || '';
};

const ClientsFilterDropdown = React.forwardRef(
  (
    {
      setFilterCount,
      open,
      onOpenChange: _onOpenChange,
      onFiltersChange,
      appliedFilters = {},
      multiSelect = false,
      multiSelectTabs = [FILTER_TABS.CENTER],
      /** When set, sidebar only shows these tabs (e.g. `[FILTER_TABS.CENTER]` for event tasks). */
      allowedTabs = null,
      /**
       * When an array is passed (including `[]`), center options come from here and the Center API is not called.
       * Omit the prop to keep the default global center list fetch.
       */
      centerOptionsOverride,
      /**
       * Client/customer options `{ label, value }` for `FILTER_TABS.CLIENT` (parent-supplied list).
       */
      clientOptionsOverride,
      /**
       * When set (non-empty), replaces default center/state/city tab list — e.g. event tasks
       * (center + task status + task priority). Omit to use `FILTER_TAB_CONFIG`.
       */
      tabConfig = null,
      /** Options for `FILTER_TABS.TASK_STATUS` when that tab is shown. */
      taskStatusFilterOptions = null,
      /** Options for `FILTER_TABS.TASK_PRIORITY` when that tab is shown. */
      taskPriorityFilterOptions = null,
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const centerAccess = useSelector(selectCenterAccess);
    const [activeTab, setActiveTab] = useState(FILTER_TABS.CENTER);
    const [searchText, setSearchText] = useState('');
    const [filters, setFilters] = useState({
      center: [],
      zone: [],
      floor: [],
      state: [],
      city: [],
      status: [],
      client: [],
      task_status: [],
      task_priority: [],
    });
    const [centers, setCenters] = useState([]);
    const [isLoadingCenters, setIsLoadingCenters] = useState(false);
    const [floors, setFloors] = useState([]);

    const popoverRef = useRef(null);
    const previousOpenRef = useRef(open);
    const debouncedSearchText = useDebounce(searchText, 500);

    const useCustomTabs = Array.isArray(tabConfig) && tabConfig.length > 0;

    const visibleTabConfig = useMemo(() => {
      const base = useCustomTabs ? tabConfig : FILTER_TAB_CONFIG;
      if (Array.isArray(allowedTabs) && allowedTabs.length > 0) {
        return base.filter((t) => allowedTabs.includes(t.value));
      }
      return base;
    }, [allowedTabs, tabConfig, useCustomTabs]);

    useEffect(() => {
      if (!visibleTabConfig.some((t) => t.value === activeTab)) {
        setActiveTab(visibleTabConfig[0]?.value || FILTER_TABS.CENTER);
      }
    }, [visibleTabConfig, activeTab]);

    useEffect(() => {
      setFilters({
        center: ensureArray(appliedFilters.center),
        zone: ensureArray(appliedFilters.zone),
        floor: ensureArray(appliedFilters.floor),
        state: ensureArray(appliedFilters.state),
        city: ensureArray(appliedFilters.city),
        status: ensureArray(appliedFilters.status),
        client: ensureArray(appliedFilters.client),
        task_status: ensureArray(appliedFilters.task_status),
        task_priority: ensureArray(appliedFilters.task_priority),
      });
    }, [appliedFilters]);

    const zoneOptions = useMemo(() => {
      if (!Array.isArray(centerAccess.data)) return [];
      const zones = new Set();
      centerAccess.data.forEach((center) => {
        if (center.zone) {
          zones.add(center.zone);
        }
      });
      return [...zones]
        .map((zone) => ({ value: zone, label: zone }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }, [centerAccess.data]);

    useEffect(() => {
      if (centerAccess.status === 'idle') {
        dispatch(fetchCenterAccess());
      }
    }, [centerAccess.status, dispatch]);

    useEffect(() => {
      const count = visibleTabConfig.reduce(
        (acc, tab) => acc + (filters[tab.value]?.length || 0),
        0,
      );
      setFilterCount?.(count);
    }, [filters, visibleTabConfig, setFilterCount]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    const useStaticCenterOptions = Array.isArray(centerOptionsOverride);
    const useStaticClientOptions = Array.isArray(clientOptionsOverride);

    const centerSearchKeyword = activeTab === FILTER_TABS.CENTER ? debouncedSearchText.trim() : '';
    const selectedCenterIds = useMemo(
      () => (filters.center || []).map((id) => String(id).trim()).filter(Boolean),
      [filters.center],
    );

    // Single list_with_search_filters call; each center row includes floor_options.
    useEffect(() => {
      if (!open || useStaticCenterOptions) {
        return;
      }

      const fetchFilterOptions = async () => {
        setIsLoadingCenters(true);
        try {
          const formData = new FormData();
          formData.append('doctype', 'Center');
          formData.append('limit_page_length', '999');
          formData.append('page', '1');
          formData.append('order_by', 'creation desc');
          formData.append('include_floor_options', '1');

          if (selectedCenterIds.length > 0) {
            formData.append('floor_option_centers', JSON.stringify(selectedCenterIds));
          }

          if (centerSearchKeyword) {
            formData.append('keyword', centerSearchKeyword);
          }

          const response = await apiClient.post(
            '/method/devx.api.listview.list_with_search_filters',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
          );

          const responseData = response?.data?.message || response?.data || {};
          const results = responseData.results || responseData.data || responseData || [];
          const centerRows = Array.isArray(results) ? results : [];

          setCenters(centerRows);
          setFloors(
            centerRows.flatMap((center) => {
              const parent = String(center.name ?? '').trim();
              const centerName = String(center.center_name || center.name || '').trim();
              const floorOptions = Array.isArray(center.floor_options) ? center.floor_options : [];
              return floorOptions
                .map((row) => {
                  const floorLabel = String(
                    row.label ?? row.block_floor_id ?? row.value ?? '',
                  ).trim();
                  if (!floorLabel || floorLabel === '-') return null;
                  const centerId = String(row.parent ?? parent).trim();
                  return {
                    // Unique per center so identical floor labels don't collide in the list.
                    // API payload strips the center prefix back to the floor label.
                    value: centerId ? `${centerId}::${floorLabel}` : floorLabel,
                    label: centerName ? `${centerName} - ${floorLabel}` : floorLabel,
                    parent: centerId,
                  };
                })
                .filter(Boolean);
            }),
          );
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error fetching filter options:', error);
          setCenters([]);
          setFloors([]);
        } finally {
          setIsLoadingCenters(false);
        }
      };

      fetchFilterOptions();
    }, [open, centerSearchKeyword, selectedCenterIds, useStaticCenterOptions]);

    const isMultiSelectForTab = useCallback(
      (tab) => multiSelect || multiSelectTabs.includes(tab),
      [multiSelectTabs, multiSelect],
    );

    const buildFiltersObject = useCallback(() => {
      const out = {};
      for (const { value: key } of visibleTabConfig) {
        const arr = filters[key] || [];
        const multi = isMultiSelectForTab(key);
        if (key === FILTER_TABS.STATUS) {
          out.status = multi ? (arr.length > 0 ? arr : ['active']) : arr[0] || 'active';
        } else if (
          key === FILTER_TABS.CENTER ||
          key === FILTER_TABS.ZONE ||
          key === FILTER_TABS.FLOOR ||
          key === FILTER_TABS.CLIENT ||
          key === FILTER_TABS.STATE ||
          key === FILTER_TABS.CITY
        ) {
          out[key] = multi ? arr : arr[0] || '';
        } else if (key === FILTER_TABS.TASK_STATUS || key === FILTER_TABS.TASK_PRIORITY) {
          out[key] = multi ? arr : arr[0] || '';
        } else {
          out[key] = multi ? arr : arr[0] || '';
        }
      }
      // Client list keeps `status` on the filters object even when the Status tab is not in the sidebar.
      if (!useCustomTabs && !visibleTabConfig.some((t) => t.value === FILTER_TABS.STATUS)) {
        const arr = filters.status || [];
        out.status = isMultiSelectForTab(FILTER_TABS.STATUS)
          ? arr.length > 0
            ? arr
            : ['active']
          : arr[0] || 'active';
      }
      return out;
    }, [filters, isMultiSelectForTab, useCustomTabs, visibleTabConfig]);

    const handlePopoverClose = useCallback(() => {
      const filtersObject = buildFiltersObject();
      onFiltersChange?.(filtersObject);
    }, [buildFiltersObject, onFiltersChange]);

    useImperativeHandle(ref, () => ({
      handleClose: handlePopoverClose,
    }));

    useEffect(() => {
      if (previousOpenRef.current && !open) {
        handlePopoverClose();
      }
      previousOpenRef.current = open;
    }, [open, handlePopoverClose]);

    const currentOptions = useMemo(() => {
      let options = [];

      switch (activeTab) {
        case FILTER_TABS.CENTER:
          if (useStaticCenterOptions) {
            options = (centerOptionsOverride || []).map((o) => ({
              value: String(o.value ?? o.name ?? '').trim(),
              label: o.label != null ? String(o.label) : String(o.value ?? ''),
            }));
            options = options.filter((o) => o.value);
            if (searchText.trim()) {
              const needle = searchText.trim().toLowerCase();
              options = options.filter(
                (opt) =>
                  String(opt.label).toLowerCase().includes(needle) ||
                  String(opt.value).toLowerCase().includes(needle),
              );
            }
          } else if (Array.isArray(centers)) {
            options = centers.map((c) => ({
              value: c.name,
              label: c.center_name || c.name,
            }));
          }
          break;

        case FILTER_TABS.ZONE:
          options = [...zoneOptions];
          break;

        case FILTER_TABS.FLOOR: {
          const selectedCenters = (filters.center || []).filter(Boolean);
          options = floors.filter((floor) => {
            if (selectedCenters.length === 0) return true;
            return selectedCenters.includes(floor.parent);
          });
          if (searchText.trim()) {
            const needle = searchText.trim().toLowerCase();
            options = options.filter(
              (opt) =>
                String(opt.label).toLowerCase().includes(needle) ||
                String(opt.value).toLowerCase().includes(needle),
            );
          }
          break;
        }

        case FILTER_TABS.CLIENT:
          if (useStaticClientOptions) {
            options = (clientOptionsOverride || []).map((o) => ({
              value: String(o.value ?? '').trim(),
              label: o.label != null ? String(o.label) : String(o.value ?? ''),
            }));
            options = options.filter((o) => o.value);
            if (searchText.trim()) {
              const needle = searchText.trim().toLowerCase();
              options = options.filter(
                (opt) =>
                  String(opt.label).toLowerCase().includes(needle) ||
                  String(opt.value).toLowerCase().includes(needle),
              );
            }
          }
          break;

        case FILTER_TABS.STATE:
          options = State.getStatesOfCountry('IN').map((s) => ({
            value: s.name,
            label: s.name,
          }));
          break;

        case FILTER_TABS.CITY:
          if (filters.state.length > 0) {
            const allCities = new Set();
            filters.state.forEach((stateName) => {
              const iso = getStateIsoCode(stateName);
              if (iso) {
                City.getCitiesOfState('IN', iso).forEach((c) => allCities.add(c.name));
              }
            });
            options = [...allCities].map((c) => ({ value: c, label: c }));
          }
          break;

        case FILTER_TABS.STATUS:
          options = [
            { value: 'active', label: 'Active' },
            { value: 'exiting', label: 'Exiting' },
          ];
          break;

        case FILTER_TABS.TASK_STATUS:
          options = Array.isArray(taskStatusFilterOptions) ? [...taskStatusFilterOptions] : [];
          break;

        case FILTER_TABS.TASK_PRIORITY:
          options = Array.isArray(taskPriorityFilterOptions) ? [...taskPriorityFilterOptions] : [];
          break;

        default:
          options = [];
      }

      // Only sort non-center options (centers are already sorted by API)
      if (activeTab !== FILTER_TABS.CENTER) {
        options.sort((a, b) => a.label.localeCompare(b.label));
      }

      // Filter state/city/zone options by search text (center is filtered by API; floor above)
      if (
        (activeTab === FILTER_TABS.STATE ||
          activeTab === FILTER_TABS.CITY ||
          activeTab === FILTER_TABS.ZONE ||
          activeTab === FILTER_TABS.TASK_STATUS ||
          activeTab === FILTER_TABS.TASK_PRIORITY) &&
        searchText.trim()
      ) {
        const needle = searchText.trim().toLowerCase();
        options = options.filter(
          (opt) =>
            String(opt.label).toLowerCase().includes(needle) ||
            String(opt.value).toLowerCase().includes(needle),
        );
      }

      return options;
    }, [
      activeTab,
      centers,
      floors,
      filters.center,
      filters.state,
      searchText,
      useStaticCenterOptions,
      centerOptionsOverride,
      useStaticClientOptions,
      clientOptionsOverride,
      zoneOptions,
      taskStatusFilterOptions,
      taskPriorityFilterOptions,
    ]);

    const handleToggle = useCallback(
      (value) => {
        setFilters((previous) => {
          const currentList = previous[activeTab] || [];
          const isSelected = currentList.includes(value);
          const allowMulti = isMultiSelectForTab(activeTab);
          const newValues = isSelected
            ? currentList.filter((item) => item !== value)
            : allowMulti
              ? [...currentList, value]
              : [value];

          const changes = { [activeTab]: newValues };

          if (activeTab === FILTER_TABS.STATE) {
            changes.city = [];
          }
          // Keep floors that still belong to the selected centers; drop only orphans.
          if (activeTab === FILTER_TABS.CENTER && newValues.length > 0) {
            const previousFloors = previous.floor || [];
            changes.floor = previousFloors.filter((floorValue) => {
              const text = String(floorValue ?? '');
              const separatorIndex = text.indexOf('::');
              if (separatorIndex < 0) return true;
              const parent = text.slice(0, separatorIndex);
              return newValues.includes(parent);
            });
          }

          return { ...previous, ...changes };
        });
      },
      [activeTab, isMultiSelectForTab],
    );

    const handleClear = () => {
      setFilters({
        center: [],
        zone: [],
        floor: [],
        state: [],
        city: [],
        status: [],
        client: [],
        task_status: [],
        task_priority: [],
      });
      setSearchText('');
    };

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
                {visibleTabConfig.map((tab) => {
                  const count = filters[tab.value]?.length || 0;
                  return (
                    <TabMenuVertical.Trigger
                      className='w-full flex items-center justify-between'
                      key={tab.value}
                      value={tab.value}
                    >
                      {tab.label}
                      {count > 0 ? (
                        <Badge.Root
                          size='medium'
                          variant='filled'
                          className='shrink-0 rounded-full bg-black text-white'
                        >
                          {count}
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
            <Filter.List
              options={currentOptions}
              selectedValues={filters[activeTab] || []}
              onToggle={handleToggle}
              searchValue={searchText}
              onSearchChange={setSearchText}
              virtualized
              isLoading={
                !useStaticCenterOptions &&
                isLoadingCenters &&
                (activeTab === FILTER_TABS.CENTER || activeTab === FILTER_TABS.FLOOR)
              }
              emptyMessage={
                activeTab === FILTER_TABS.CITY && filters.state.length === 0
                  ? 'Please select a state first'
                  : activeTab === FILTER_TABS.CLIENT &&
                      useStaticClientOptions &&
                      (!clientOptionsOverride || clientOptionsOverride.length === 0)
                    ? 'No clients available'
                    : activeTab === FILTER_TABS.TASK_STATUS &&
                        (!taskStatusFilterOptions || taskStatusFilterOptions.length === 0)
                      ? 'No status options'
                      : activeTab === FILTER_TABS.TASK_PRIORITY &&
                          (!taskPriorityFilterOptions || taskPriorityFilterOptions.length === 0)
                        ? 'No priority options'
                        : `No ${activeTab.replaceAll('_', ' ')} found`
              }
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

ClientsFilterDropdown.displayName = 'ClientsFilterDropdown';

ClientsFilterDropdown.propTypes = {
  setFilterCount: PropTypes.func,
  open: PropTypes.bool,
  onOpenChange: PropTypes.func,
  onFiltersChange: PropTypes.func,
  appliedFilters: PropTypes.object,
  multiSelect: PropTypes.bool,
  multiSelectTabs: PropTypes.arrayOf(PropTypes.string),
  allowedTabs: PropTypes.arrayOf(PropTypes.string),
  centerOptionsOverride: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.node,
    }),
  ),
  clientOptionsOverride: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.node,
    }),
  ),
  tabConfig: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.node,
    }),
  ),
  taskStatusFilterOptions: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.node,
    }),
  ),
  taskPriorityFilterOptions: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.node,
    }),
  ),
};

export default ClientsFilterDropdown;
