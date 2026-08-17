import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowRightSLine } from 'react-icons/ri';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import {
  TICKET_FILTER_TABS,
  TICKET_FILTER_TAB_CONFIG,
  RESOLUTION_TIME_FILTER_OPTIONS,
  getDefaultTicketFilterLocalFilters,
  getCountableFilterKeys,
} from '@/components/ticket-management/constants';
import { isClient } from '@/constants/users-constants';
import {
  fetchTicketDropdownData,
  fetchSubCategories,
  selectTicketDropdownData,
  selectSubCategories,
} from '@/redux/ticketManagementSlice';
import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';
import { getStatusOptions } from '@/api/dynamic-status';

const normalizeFilterOptions = (options = []) =>
  options.map((opt) => ({
    value: typeof opt === 'object' ? opt.value : opt,
    label: typeof opt === 'object' ? opt.label : opt,
  }));

const uniqueOptionsByValue = (options = []) => {
  const seen = new Set();
  return options.filter((option) => {
    const key = String(option.value ?? '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const TicketFilterDropdown = React.forwardRef(
  (
    {
      open,
      onFiltersChange,
      appliedFilters = {},
      setFilterCount,
      activeStatusTab = 'all',
      lockedFilters = {},
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const dropdownData = useSelector(selectTicketDropdownData);
    const subCategories = useSelector(selectSubCategories);
    const centerAccess = useSelector(selectCenterAccess);
    const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
    const roleMap = userSideBarPerm?.data?.message?.role;
    const isClientUser = isClient(roleMap);

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

    const tabConfig = useMemo(() => {
      const isAllTypeTab = activeStatusTab === 'all';
      let tabs;

      if (isClientUser) {
        const baseTabs = [
          { value: TICKET_FILTER_TABS.CENTER, label: 'Center' },
          { value: TICKET_FILTER_TABS.ZONE, label: 'Zone' },
        ];
        if (isAllTypeTab) {
          baseTabs.push({ value: TICKET_FILTER_TABS.STATUS, label: 'Status' });
        }
        tabs = baseTabs;
      } else {
        tabs = isAllTypeTab
          ? TICKET_FILTER_TAB_CONFIG.filter((tab) => tab.value !== TICKET_FILTER_TABS.ASSIGNEE)
          : TICKET_FILTER_TAB_CONFIG.filter(
              (tab) =>
                tab.value !== TICKET_FILTER_TABS.TICKET_TYPE &&
                tab.value !== TICKET_FILTER_TABS.ASSIGNEE,
            );
      }

      // Hide tabs that are locked (e.g. Center when in center tab, Client when in client tab)
      const lockedKeys = Object.keys(lockedFilters).filter(
        (k) => lockedFilters[k] && Array.isArray(lockedFilters[k]) && lockedFilters[k].length > 0,
      );
      if (lockedKeys.length === 0) return tabs;
      return tabs.filter((tab) => !lockedKeys.includes(tab.value));
    }, [isClientUser, activeStatusTab, lockedFilters]);

    const [activeTab, setActiveTab] = useState(TICKET_FILTER_TABS.CENTER);
    const [searchText, setSearchText] = useState('');
    const [localFilters, setLocalFilters] = useState(() =>
      getDefaultTicketFilterLocalFilters(appliedFilters),
    );
    const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]);

    const popoverRef = useRef(null);
    const previousOpenRef = useRef(open);
    const previousOpenForTabRef = useRef(open);
    const lastPublishedFilterCountRef = useRef(null);
    /** Only sync localFilters from appliedFilters when dropdown opens; avoids overwriting in-progress selections when parent re-renders with a new appliedFilters reference (e.g. Redux list.filters). */
    const previousOpenForSyncRef = useRef(open);

    useEffect(() => {
      if (!open) {
        previousOpenForTabRef.current = false;
        return;
      }

      const justOpened = previousOpenForTabRef.current === false;
      previousOpenForTabRef.current = true;

      if (justOpened) {
        const firstTab = tabConfig[0]?.value ?? TICKET_FILTER_TABS.CENTER;
        setActiveTab(firstTab);
        return;
      }

      // Keep the current tab while selecting options; only switch if it was removed.
      setActiveTab((current) => {
        if (tabConfig.some((tab) => tab.value === current)) {
          return current;
        }
        return tabConfig[0]?.value ?? TICKET_FILTER_TABS.CENTER;
      });
    }, [open, tabConfig]);

    useEffect(() => {
      if (!open) return;
      if (dropdownData.status === 'idle') {
        dispatch(fetchTicketDropdownData());
      }
      if (centerAccess.status === 'idle') {
        dispatch(fetchCenterAccess());
      }
    }, [open, dispatch, dropdownData.status, centerAccess.status]);

    useEffect(() => {
      if (!open) return;
      let cancelled = false;
      (async () => {
        try {
          const opts = await getStatusOptions({ doctype: 'HD Ticket', field: 'status' });
          if (!cancelled) setDynamicStatusOptions(Array.isArray(opts) ? opts : []);
        } catch {
          if (!cancelled) setDynamicStatusOptions([]);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [open]);

    const statusFilterOptions = useMemo(() => {
      const data = dropdownData.data || {};
      const base = dynamicStatusOptions.length > 0 ? dynamicStatusOptions : data.statuses || [];
      const hasBreached = base.some((opt) => (opt?.value ?? opt) === 'Breached');
      if (!hasBreached) {
        return [...base, { label: 'Breached', value: 'Breached', color: 'red' }];
      }
      return base;
    }, [dynamicStatusOptions, dropdownData.data]);

    useEffect(() => {
      if (!open) {
        previousOpenForSyncRef.current = false;
        return;
      }
      const justOpened = previousOpenForSyncRef.current === false;
      previousOpenForSyncRef.current = true;
      if (!justOpened) return;
      const next = getDefaultTicketFilterLocalFilters(appliedFilters);
      // Preserve locked filters so they cannot be changed in the UI
      Object.keys(lockedFilters || {}).forEach((key) => {
        if (lockedFilters[key] && Array.isArray(lockedFilters[key])) {
          next[key] = lockedFilters[key];
        }
      });
      setLocalFilters(next);
    }, [open, appliedFilters, lockedFilters]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    useEffect(() => {
      if (!open) {
        lastPublishedFilterCountRef.current = null;
        return;
      }

      const keys = getCountableFilterKeys(activeStatusTab === 'all');

      const count = keys.reduce((sum, key) => {
        const isLocked = Array.isArray(lockedFilters[key]) && lockedFilters[key].length > 0;
        if (isLocked) return sum;
        const values = localFilters[key];
        return sum + (Array.isArray(values) ? values.length : 0);
      }, 0);

      if (lastPublishedFilterCountRef.current !== count) {
        lastPublishedFilterCountRef.current = count;
        setFilterCount?.(count);
      }
    }, [open, localFilters, activeStatusTab, lockedFilters, setFilterCount]);

    useEffect(() => {
      if (!open) return;
      (localFilters.category || []).forEach((category) => {
        if (!category || subCategories.data[category]) return;
        dispatch(fetchSubCategories(category));
      });
    }, [open, dispatch, localFilters.category, subCategories.data]);

    const buildFiltersObject = useCallback(
      (source) => {
        const f = source ?? localFilters;
        const built = isClientUser
          ? {
              center: f.center,
              zone: f.zone,
              status: f.status,
              assignee: [],
              custom_ticket_type: [],
              client: [],
              priority: [],
              category: [],
              sub_category: [],
              sub_sub_category: [],
              severity: [],
              resolution_time: [],
              custom_requires_rm: false,
            }
          : {
              center: f.center,
              zone: f.zone,
              status: f.status,
              resolution_time: f.resolution_time,
              assignee: f.assignee,
              priority: f.priority,
              custom_ticket_type: f.custom_ticket_type,
              client: f.client,
              category: f.category,
              sub_category: f.sub_category,
              sub_sub_category: [],
              severity: f.severity,
              custom_requires_rm: false,
            };
        // Always merge locked filters so they cannot be removed
        Object.keys(lockedFilters || {}).forEach((key) => {
          if (lockedFilters[key] && Array.isArray(lockedFilters[key])) {
            built[key] = lockedFilters[key];
          }
        });
        return built;
      },
      [isClientUser, localFilters, lockedFilters],
    );

    const handlePopoverClose = useCallback(() => {
      const newFilters = buildFiltersObject();
      const appliedBuilt = buildFiltersObject(getDefaultTicketFilterLocalFilters(appliedFilters));
      if (JSON.stringify(newFilters) !== JSON.stringify(appliedBuilt)) {
        onFiltersChange?.(newFilters);
      }
    }, [buildFiltersObject, onFiltersChange, appliedFilters]);

    const handleClear = useCallback(() => {
      const base = getDefaultTicketFilterLocalFilters({});
      // Preserve locked filters when clearing
      Object.keys(lockedFilters || {}).forEach((key) => {
        if (lockedFilters[key] && Array.isArray(lockedFilters[key])) {
          base[key] = lockedFilters[key];
        }
      });
      setLocalFilters(base);
      setSearchText('');
      const firstTab = tabConfig[0]?.value ?? TICKET_FILTER_TABS.CENTER;
      setActiveTab(firstTab);
    }, [lockedFilters, tabConfig]);

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
      const data = dropdownData.data || {};
      const sortByLabel = (options) =>
        [...options].sort((a, b) => String(a.label).localeCompare(String(b.label)));

      let options = [];

      switch (activeTab) {
        case TICKET_FILTER_TABS.CENTER:
          options = data.centers || [];
          break;
        case TICKET_FILTER_TABS.ZONE:
          options = [...zoneOptions];
          break;
        case TICKET_FILTER_TABS.STATUS:
          options = statusFilterOptions;
          break;
        case TICKET_FILTER_TABS.RESOLUTION_TIME:
          options = RESOLUTION_TIME_FILTER_OPTIONS;
          break;
        case TICKET_FILTER_TABS.PRIORITY:
          options = data.priorities || [];
          break;
        case TICKET_FILTER_TABS.TICKET_TYPE:
          options = data.ticket_types?.length
            ? data.ticket_types
            : [
                { label: 'Client ticket', value: 'Client ticket' },
                { label: 'Internal ticket', value: 'Internal ticket' },
              ];
          break;
        case TICKET_FILTER_TABS.CLIENT:
          options = data.clients || data.customers || [];
          break;
        case TICKET_FILTER_TABS.CATEGORY:
          options = data.categories || [];
          break;
        case TICKET_FILTER_TABS.SUB_CATEGORY:
          options = uniqueOptionsByValue(
            (localFilters.category || []).flatMap((category) =>
              normalizeFilterOptions(subCategories.data[category] || []),
            ),
          );
          break;
        case TICKET_FILTER_TABS.SEVERITY:
          options = data.severities || [];
          break;
        default:
          options = [];
      }

      const normalized = sortByLabel(normalizeFilterOptions(options));

      if (!searchText.trim()) return normalized;
      const needle = searchText.toLowerCase().trim();
      return normalized.filter(
        (opt) =>
          String(opt.label).toLowerCase().includes(needle) ||
          String(opt.value).toLowerCase().includes(needle),
      );
    }, [
      activeTab,
      dropdownData.data,
      localFilters.category,
      searchText,
      subCategories.data,
      zoneOptions,
      statusFilterOptions,
    ]);

    const selectedValuesForTab = useMemo(() => {
      if (!localFilters[activeTab]) return [];
      return localFilters[activeTab];
    }, [activeTab, localFilters]);

    const handleToggle = useCallback(
      (value) => {
        setLocalFilters((previous) => {
          const current = previous[activeTab] || [];
          const isSelected = current.includes(value);
          const nextValues = isSelected ? current.filter((v) => v !== value) : [...current, value];

          const next = {
            ...previous,
            category: Array.isArray(previous.category) ? previous.category : [],
            sub_category: Array.isArray(previous.sub_category) ? previous.sub_category : [],
            sub_sub_category: [],
            [activeTab]: nextValues,
          };

          if (activeTab === TICKET_FILTER_TABS.CATEGORY) {
            const availableSubCategories = nextValues.flatMap((category) =>
              normalizeFilterOptions(subCategories.data[category] || []).map(
                (option) => option.value,
              ),
            );
            const hasLoadedRemainingCategoryOptions = nextValues.some(
              (category) => subCategories.data[category],
            );

            if (isSelected && hasLoadedRemainingCategoryOptions) {
              const availableSet = new Set(availableSubCategories);
              next.sub_category = next.sub_category.filter((subCategory) =>
                availableSet.has(subCategory),
              );
            }
          }
          return next;
        });
      },
      [activeTab, subCategories.data],
    );

    const isLoading = dropdownData.status === 'loading';

    const emptyMessage = 'Please select a Category first';

    if (!open) return null;

    return (
      <Filter.Root
        ref={popoverRef}
        onInteractOutside={handlePopoverClose}
        onEscapeKeyDown={handlePopoverClose}
        className='p-0'
      >
        <Filter.Header title='FILTERS' onClear={handleClear} />

        <Filter.Body>
          <Filter.Sidebar width='200px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='p-2 border-r-0'>
                {tabConfig.map((tab) => {
                  const count = localFilters[tab.value]?.length || 0;
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

          <Filter.Content width='340px'>
            <Filter.List
              options={currentOptions}
              selectedValues={selectedValuesForTab}
              onToggle={handleToggle}
              searchValue={searchText}
              onSearchChange={setSearchText}
              virtualized
              isLoading={isLoading}
              emptyMessage={emptyMessage}
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

TicketFilterDropdown.displayName = 'TicketFilterDropdown';

TicketFilterDropdown.propTypes = {
  open: PropTypes.bool,
  onFiltersChange: PropTypes.func,
  appliedFilters: PropTypes.object,
  setFilterCount: PropTypes.func,
  activeStatusTab: PropTypes.string,
  /** Locked filter keys and values (e.g. { center: [centerId] } or { client: [clientId] }). Locked tabs are hidden and cannot be removed. */
  lockedFilters: PropTypes.object,
};

export default TicketFilterDropdown;
