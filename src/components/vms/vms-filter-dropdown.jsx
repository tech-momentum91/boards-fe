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
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';
import { getClientListThunk } from '@/redux/vmsSlice';
import { VISITOR_FILTER_TABS } from '@/components/vms/constants';
import { getStatusOptions } from '@/api/dynamic-status';

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const VmsFilterDropdown = React.forwardRef(
  (
    { setFilterCount, open, onOpenChange: _onOpenChange, onFiltersChange, appliedFilters = {} },
    ref,
  ) => {
    const dispatch = useDispatch();
    const centerAccess = useSelector(selectCenterAccess);

    const [activeTab, setActiveTab] = useState('center');
    const [localFilters, setLocalFilters] = useState({
      center: ensureArray(appliedFilters.center),
      host_company: ensureArray(appliedFilters.host_company),
      status: ensureArray(appliedFilters.status),
    });
    const [searchText, setSearchText] = useState('');
    const popoverRef = useRef(null);

    const clientList = useSelector((state) => state.vms.clientList);

    const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]);

    useEffect(() => {
      if (!open) return;
      let cancelled = false;
      const fetchLatest = async () => {
        try {
          const opts = await getStatusOptions({ doctype: 'Visitor Entry', field: 'status' });
          if (!cancelled) setDynamicStatusOptions(Array.isArray(opts) ? opts : []);
        } catch {
          if (!cancelled) setDynamicStatusOptions([]);
        }
      };

      fetchLatest();

      return () => {
        cancelled = true;
      };
    }, [open]);
    // console.log('clientList', clientList);

    useEffect(() => {
      setFilterCount(
        localFilters.center.length + localFilters.host_company.length + localFilters.status.length,
      );
    }, [
      localFilters.center.length,
      localFilters.host_company.length,
      localFilters.status.length,
      setFilterCount,
    ]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    // Fetch centers on mount
    useEffect(() => {
      if (centerAccess.status === 'idle') {
        dispatch(fetchCenterAccess());
      }
      dispatch(getClientListThunk());
    }, [centerAccess.status, dispatch]);

    // Sync with appliedFilters from parent
    useEffect(() => {
      setLocalFilters({
        center: ensureArray(appliedFilters.center),
        host_company: ensureArray(appliedFilters.host_company),
        status: ensureArray(appliedFilters.status),
      });
    }, [appliedFilters]);

    const centerOptions = useMemo(() => {
      if (!Array.isArray(centerAccess.data)) return [];
      let centers = centerAccess.data.map((c) => ({
        value: c.name || c.center_code || '',
        label: c.center_name || c.name || 'Unnamed Center',
      }));

      if (searchText.trim() && activeTab === 'center') {
        const searchLower = searchText.toLowerCase().trim();
        centers = centers.filter(
          (center) =>
            center.label.toLowerCase().includes(searchLower) ||
            center.value.toLowerCase().includes(searchLower),
        );
      }

      return centers;
    }, [centerAccess.data, searchText, activeTab]);

    const hostCompanyOptions = useMemo(() => {
      // Free-text search-only list built from current data is not available here,
      // so we treat host_company as simple string chips with search filter.
      const uniqueHosts = ensureArray(appliedFilters.host_company);
      let options = clientList?.data?.data?.map((v) => ({ value: v.name, label: v.customer_name }));

      if (searchText.trim() && activeTab === 'host_company') {
        const searchLower = searchText.toLowerCase().trim();
        options = options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(searchLower) ||
            opt.value.toLowerCase().includes(searchLower),
        );
      }

      return options;
    }, [appliedFilters.host_company, searchText, activeTab]);

    const statusOptions = useMemo(() => {
      let options = [...(dynamicStatusOptions || [])];

      if (searchText.trim() && activeTab === 'status') {
        const searchLower = searchText.toLowerCase().trim();
        options = options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(searchLower) ||
            opt.value.toLowerCase().includes(searchLower),
        );
      }

      return options;
    }, [searchText, activeTab, dynamicStatusOptions]);

    const currentOptions = useMemo(() => {
      switch (activeTab) {
        case 'center':
          return centerOptions;
        case 'host_company':
          return hostCompanyOptions;
        case 'status':
          return statusOptions;
        default:
          return [];
      }
    }, [activeTab, centerOptions, hostCompanyOptions, statusOptions]);

    const handleToggle = useCallback(
      (value) => {
        setLocalFilters((prev) => {
          const currentList = Array.isArray(prev[activeTab]) ? prev[activeTab] : [];
          const isSelected = currentList.includes(value);
          const newValues = isSelected
            ? currentList.filter((item) => item !== value)
            : [...currentList, value];

          return { ...prev, [activeTab]: newValues };
        });
      },
      [activeTab],
    );

    const handleClear = useCallback(() => {
      setLocalFilters({
        center: [],
        host_company: [],
        status: [],
      });
      setSearchText('');
    }, []);

    const handleApply = useCallback(() => {
      const filtersArray = [];

      if (localFilters.center.length > 0) {
        if (localFilters.center.length === 1) {
          filtersArray.push(['center', '=', localFilters.center[0]]);
        } else {
          filtersArray.push(['center', 'in', localFilters.center]);
        }
      }

      if (localFilters.host_company.length > 0) {
        if (localFilters.host_company.length === 1) {
          filtersArray.push(['host_company_name', '=', localFilters.host_company[0]]);
        } else {
          filtersArray.push(['host_company_name', 'in', localFilters.host_company]);
        }
      }

      if (localFilters.status.length > 0) {
        if (localFilters.status.length === 1) {
          filtersArray.push(['status', '=', localFilters.status[0]]);
        } else {
          filtersArray.push(['status', 'in', localFilters.status]);
        }
      }

      onFiltersChange?.(filtersArray, localFilters);
      _onOpenChange?.(false);
    }, [localFilters, onFiltersChange, _onOpenChange]);

    const handlePopoverClose = useCallback(() => {
      handleApply();
    }, [handleApply]);

    useImperativeHandle(ref, () => ({
      handleClose: () => {
        handleApply();
      },
    }));

    if (!open) return null;

    const selectedValues = localFilters[activeTab] || [];

    const emptyMessage =
      activeTab === 'center'
        ? 'No centers found'
        : activeTab === 'host_company'
          ? 'No host company options'
          : 'No status options found';

    const isLoading = activeTab === 'center' && centerAccess.status === 'loading';

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
                {VISITOR_FILTER_TABS.map((tab) => {
                  const selectedCount = localFilters[tab.value]?.length || 0;
                  const showCount = selectedCount > 0;

                  return (
                    <TabMenuVertical.Trigger
                      className='w-full flex items-center justify-between'
                      key={tab.value}
                      value={tab.value}
                    >
                      {tab.label}
                      {showCount ? (
                        <Badge.Root
                          size='medium'
                          variant='filled'
                          className='shrink-0 rounded-full bg-black'
                        >
                          {selectedCount}
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
              selectedValues={selectedValues}
              onToggle={handleToggle}
              searchValue={searchText}
              onSearchChange={setSearchText}
              isLoading={isLoading}
              emptyMessage={emptyMessage}
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

VmsFilterDropdown.displayName = 'VmsFilterDropdown';

export default VmsFilterDropdown;
