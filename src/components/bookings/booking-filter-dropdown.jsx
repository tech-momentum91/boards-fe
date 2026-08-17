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

import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';

import { fetchClients, fetchCenters } from '@/redux/bookingSlice';
import { fetchResourceTypes, selectResourceTypesData } from '@/redux/commonSlice';

const TAB_CONFIG = [
  { id: 'client', label: 'Client', filterKey: 'clients' },
  { id: 'center', label: 'Center', filterKey: 'centers' },
  { id: 'resourceType', label: 'Resource Type', filterKey: 'resourceTypes' },
];

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const BookingFilterDropdown = React.forwardRef(
  (
    { setFilterCount, open, onOpenChange: _onOpenChange, onFiltersChange, appliedFilters = {} },
    ref,
  ) => {
    const dispatch = useDispatch();
    const { shared } = useSelector((state) => state.booking);
    const { clients, centers } = shared;
    const resourceTypes = useSelector(selectResourceTypesData) || [];

    const [activeTab, setActiveTab] = useState('client');
    const [searchText, setSearchText] = useState('');
    const [filters, setFilters] = useState({
      clients: [],
      centers: [],
      resourceTypes: [],
    });

    const popoverRef = useRef(null);
    const previousOpenRef = useRef(open);

    const loadData = useCallback(
      (resource, action) => {
        if (
          (resource.status === 'idle' || !resource.data || resource.data.length === 0) &&
          !resource.isLoading
        ) {
          dispatch(action());
        }
      },
      [dispatch],
    );

    useEffect(() => {
      loadData(clients, fetchClients);
      loadData(centers, fetchCenters);
      loadData(resourceTypes, fetchResourceTypes);
    }, [clients.status, centers.status, resourceTypes.status, loadData]);

    useEffect(() => {
      setFilters({
        clients: ensureArray(appliedFilters.clients),
        centers: ensureArray(appliedFilters.centers || appliedFilters.center),
        resourceTypes: ensureArray(appliedFilters.resourceTypes),
      });
    }, [appliedFilters]);

    useEffect(() => {
      const count = filters.clients.length + filters.centers.length + filters.resourceTypes.length;
      setFilterCount?.(count);
    }, [
      filters.clients.length,
      filters.centers.length,
      filters.resourceTypes.length,
      setFilterCount,
    ]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    const buildFiltersArray = useCallback(() => {
      const filtersArray = [];
      const map = {
        centers: 'center',
        clients: 'client',
        resourceTypes: 'resource_type',
      };

      Object.entries(filters).forEach(([key, values]) => {
        if (values && values.length > 0) {
          const apiField = map[key];
          if (values.length === 1) {
            filtersArray.push([apiField, '=', values[0]]);
          } else {
            filtersArray.push([apiField, 'in', values]);
          }
        }
      });
      return filtersArray;
    }, [filters]);

    const buildFiltersObject = useCallback(() => {
      return {
        center: filters.centers.length > 0 ? [...filters.centers] : null,
        clients: filters.clients,
        resourceTypes: filters.resourceTypes,
      };
    }, [filters]);

    const handlePopoverClose = useCallback(() => {
      const filtersArray = buildFiltersArray();
      const filtersObject = buildFiltersObject();
      onFiltersChange?.(filtersArray, filtersObject);
    }, [buildFiltersArray, buildFiltersObject, onFiltersChange]);

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
      const activeConfig = TAB_CONFIG.find((t) => t.id === activeTab);
      if (!activeConfig) return options;

      const searchTerm = searchText.toLowerCase().trim();

      if (activeTab === 'client') {
        if (Array.isArray(clients.data) && clients.data.length > 0) {
          options = clients.data.map((item) => ({
            value: item.value || item.id || item.name || '',
            label:
              item.label || item.name || item.clientName || item.customer_name || item.id || '',
          }));
        }
      } else if (activeTab === 'center') {
        if (Array.isArray(centers.data) && centers.data.length > 0) {
          options = centers.data.map((item) => ({
            value: item.value || item.id || item.name || '',
            label: item.label || item.name || item.center_name || item.id || '',
          }));
        }
      } else if (activeTab === 'resourceType') {
        const resourceTypesData = resourceTypes || [];
        options = resourceTypesData.map((item) => ({
          value: item.value || item.id || item.name || '',
          label: item.label || item.name || item.id || '',
        }));
      }

      options = options.filter((item) => item.label && item.value);
      options.sort((a, b) => a.label.localeCompare(b.label));

      if (searchTerm) {
        return options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(searchTerm) ||
            opt.value.toLowerCase().includes(searchTerm),
        );
      }

      return options;
    }, [activeTab, clients.data, centers.data, resourceTypes.data, searchText]);

    const handleToggle = useCallback(
      (value) => {
        const activeConfig = TAB_CONFIG.find((t) => t.id === activeTab);
        if (!activeConfig) return;

        setFilters((previous) => {
          const currentList = previous[activeConfig.filterKey] || [];
          const isSelected = currentList.includes(value);
          const newValues = isSelected
            ? currentList.filter((item) => item !== value)
            : [...currentList, value];

          return {
            ...previous,
            [activeConfig.filterKey]: newValues,
          };
        });
      },
      [activeTab],
    );

    const handleClear = () => {
      setFilters({
        clients: [],
        centers: [],
        resourceTypes: [],
      });
      setSearchText('');
    };

    if (!open) return null;

    const activeConfig = TAB_CONFIG.find((t) => t.id === activeTab);
    const selectedValues = activeConfig ? filters[activeConfig.filterKey] || [] : [];
    const isLoading =
      (activeTab === 'client' && clients.isLoading) ||
      (activeTab === 'center' && centers.isLoading) ||
      (activeTab === 'resourceType' && resourceTypes.isLoading);

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
                {TAB_CONFIG.map((tab) => {
                  const count = filters[tab.filterKey]?.length || 0;
                  return (
                    <TabMenuVertical.Trigger
                      className='w-full flex items-center justify-between'
                      key={tab.id}
                      value={tab.id}
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
              selectedValues={selectedValues}
              onToggle={handleToggle}
              searchValue={searchText}
              onSearchChange={setSearchText}
              virtualized
              isLoading={isLoading}
              emptyMessage={
                activeConfig ? `No ${activeConfig.label.toLowerCase()}s found` : 'No results found'
              }
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

BookingFilterDropdown.displayName = 'BookingFilterDropdown';

BookingFilterDropdown.propTypes = {
  setFilterCount: PropTypes.func,
  open: PropTypes.bool,
  onOpenChange: PropTypes.func,
  onFiltersChange: PropTypes.func,
  appliedFilters: PropTypes.object,
};

export default BookingFilterDropdown;
