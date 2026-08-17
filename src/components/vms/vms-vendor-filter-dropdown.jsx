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
import { fetchSupervisorListThunk, fetchVendorTypeListThunk } from '@/redux/vmsSlice';
import { VENDOR_FILTER_TABS, VISITOR_STATUS_OPTIONS } from '@/components/vms/constants';

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const VmsVendorFilterDropdown = React.forwardRef(
  (
    { setFilterCount, open, onOpenChange: _onOpenChange, onFiltersChange, appliedFilters = {} },
    ref,
  ) => {
    const dispatch = useDispatch();
    const centerAccess = useSelector(selectCenterAccess);
    const supervisorListData = useSelector(
      (state) => state.vms.supervisorList?.data?.message?.results,
    );
    const supervisorListStatus = useSelector((state) => state.vms.supervisorList?.status);
    const vendorTypeListData = useSelector((state) => state.vms.vendorTypeList?.data?.data);
    const vendorTypeListStatus = useSelector((state) => state.vms.vendorTypeList?.status);

    const [activeTab, setActiveTab] = useState('center');
    const [localFilters, setLocalFilters] = useState({
      center: ensureArray(appliedFilters.center),
      vendor_type: ensureArray(appliedFilters.vendor_type),
      assigned_supervisor: ensureArray(appliedFilters.assigned_supervisor),
      status: ensureArray(appliedFilters.status),
    });
    const [searchText, setSearchText] = useState('');
    const popoverRef = useRef(null);

    useEffect(() => {
      setFilterCount(
        localFilters.center.length +
          localFilters.vendor_type.length +
          localFilters.assigned_supervisor.length +
          localFilters.status.length,
      );
    }, [
      localFilters.center.length,
      localFilters.vendor_type.length,
      localFilters.assigned_supervisor.length,
      localFilters.status.length,
      setFilterCount,
    ]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    useEffect(() => {
      if (centerAccess.status === 'idle') {
        dispatch(fetchCenterAccess());
      }
    }, [centerAccess.status, dispatch]);

    useEffect(() => {
      if (!open) return;
      if (supervisorListStatus === 'idle' || !Array.isArray(supervisorListData)) {
        dispatch(fetchSupervisorListThunk());
      }
      if (vendorTypeListStatus === 'idle' || !Array.isArray(vendorTypeListData)) {
        dispatch(fetchVendorTypeListThunk());
      }
    }, [
      open,
      dispatch,
      supervisorListStatus,
      vendorTypeListStatus,
      supervisorListData,
      vendorTypeListData,
    ]);

    useEffect(() => {
      setLocalFilters({
        center: ensureArray(appliedFilters.center),
        vendor_type: ensureArray(appliedFilters.vendor_type),
        assigned_supervisor: ensureArray(appliedFilters.assigned_supervisor),
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

    const buildOptionsFromValues = (values, tabKey) => {
      if (tabKey === 'status') {
        let options = [...VISITOR_STATUS_OPTIONS];
        if (searchText.trim()) {
          const searchLower = searchText.toLowerCase().trim();
          options = options.filter(
            (opt) =>
              opt.label.toLowerCase().includes(searchLower) ||
              opt.value.toLowerCase().includes(searchLower),
          );
        }
        return options;
      }

      const uniq = [...new Set(ensureArray(values))];
      let options = uniq.map((v) => ({ value: v, label: v }));
      if (searchText.trim()) {
        const lower = searchText.toLowerCase().trim();
        options = options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(lower) || opt.value.toLowerCase().includes(lower),
        );
      }
      return options;
    };

    const vendorTypeOptions = useMemo(() => {
      let options = (vendorTypeListData || []).map((item) => ({
        value: item.name,
        label: item.name,
      }));
      if (searchText.trim()) {
        const lower = searchText.toLowerCase().trim();
        options = options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(lower) || opt.value.toLowerCase().includes(lower),
        );
      }
      return options;
    }, [vendorTypeListData, searchText]);

    const supervisorOptions = useMemo(() => {
      let options = (supervisorListData || []).map((sup) => ({
        value: sup.name,
        label: sup.employee_name || sup.name,
      }));
      if (searchText.trim()) {
        const lower = searchText.toLowerCase().trim();
        options = options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(lower) || opt.value.toLowerCase().includes(lower),
        );
      }
      return options;
    }, [supervisorListData, searchText]);

    const currentOptions = useMemo(() => {
      switch (activeTab) {
        case 'center':
          return centerOptions;
        case 'vendor_type':
          return vendorTypeOptions;
        case 'assigned_supervisor':
          return supervisorOptions;
        case 'status':
          return buildOptionsFromValues(localFilters.status, 'status');
        default:
          return [];
      }
    }, [activeTab, centerOptions, localFilters, searchText, vendorTypeOptions, supervisorOptions]);

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
        vendor_type: [],
        assigned_supervisor: [],
        status: [],
      });
      setSearchText('');
    }, []);

    const handleApply = useCallback(() => {
      const filtersArray = [];

      if (localFilters.center.length > 0) {
        filtersArray.push([
          'center',
          localFilters.center.length === 1 ? '=' : 'in',
          localFilters.center.length === 1 ? localFilters.center[0] : localFilters.center,
        ]);
      }
      if (localFilters.vendor_type.length > 0) {
        filtersArray.push([
          'vendor_type',
          localFilters.vendor_type.length === 1 ? '=' : 'in',
          localFilters.vendor_type.length === 1
            ? localFilters.vendor_type[0]
            : localFilters.vendor_type,
        ]);
      }
      if (localFilters.assigned_supervisor.length > 0) {
        filtersArray.push([
          'assigned_supervisor',
          localFilters.assigned_supervisor.length === 1 ? '=' : 'in',
          localFilters.assigned_supervisor.length === 1
            ? localFilters.assigned_supervisor[0]
            : localFilters.assigned_supervisor,
        ]);
      }
      if (localFilters.status.length > 0) {
        filtersArray.push([
          'status',
          localFilters.status.length === 1 ? '=' : 'in',
          localFilters.status.length === 1 ? localFilters.status[0] : localFilters.status,
        ]);
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
        : activeTab === 'vendor_type'
          ? 'No vendor types found'
          : activeTab === 'assigned_supervisor'
            ? 'No supervisors found'
            : 'No status options found';

    const isLoading =
      (activeTab === 'center' && centerAccess.status === 'loading') ||
      (activeTab === 'assigned_supervisor' && supervisorListStatus === 'pending') ||
      (activeTab === 'vendor_type' && vendorTypeListStatus === 'pending');

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
                {VENDOR_FILTER_TABS.map((tab) => {
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

VmsVendorFilterDropdown.displayName = 'VmsVendorFilterDropdown';

export default VmsVendorFilterDropdown;
