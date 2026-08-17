import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import apiClient from '@/api/axios';
import { STATUS_OPTIONS, SPACE_TYPE_OPTIONS } from '@/components/space-management/constants';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import * as Slider from '@/components/ui/slider';
import * as Input from '@/components/ui/input';

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const SpaceCenterFilterDropdown = React.forwardRef(
  (
    {
      setFilterCount,
      open,
      onFiltersChange,
      appliedFilters = {},
      centerId,
      floorOptions,
      maxSeats,
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState('floor');
    const [localFilters, setLocalFilters] = useState({
      floor: ensureArray(appliedFilters.floor),
      spaceType: ensureArray(appliedFilters.spaceType),
      status: ensureArray(appliedFilters.status),
      seats: appliedFilters.seats || 0,
    });
    const [statusOptions, setStatusOptions] = useState(STATUS_OPTIONS);
    const [spaceTypeOptions, setSpaceTypeOptions] = useState(SPACE_TYPE_OPTIONS);
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);
    const [searchText, setSearchText] = useState('');
    const popoverRef = useRef(null);

    const verticalTabs = [
      { value: 'floor', label: 'Floor' },
      { value: 'spaceType', label: 'Space Type' },
      { value: 'status', label: 'Status' },
      { value: 'seats', label: 'Seats' },
    ];

    useEffect(() => {
      setFilterCount(
        localFilters.floor.length +
          localFilters.spaceType.length +
          localFilters.status.length +
          (localFilters.seats > 0 ? 1 : 0),
      );
    }, [
      localFilters.floor.length,
      localFilters.spaceType.length,
      localFilters.status.length,
      localFilters.seats,
    ]);

    useEffect(() => {
      const fetchFilterOptions = async () => {
        setIsLoadingOptions(true);
        try {
          const response = await apiClient.get('/method/frappe.desk.form.load.getdoc', {
            params: { doctype: 'Space', name: 'new' },
          });
          const statusField = response?.data?.docs?.[0]?.fields?.find(
            (f) => f.fieldname === 'status',
          );
          if (statusField?.options) {
            setStatusOptions(
              statusField.options
                .split('\n')
                .map((opt) => ({ value: opt.trim(), label: opt.trim() })),
            );
          }
          const spaceTypeField = response?.data?.docs?.[0]?.fields?.find(
            (f) => f.fieldname === 'inventory_type',
          );
          if (spaceTypeField?.options) {
            setSpaceTypeOptions(
              spaceTypeField.options
                .split('\n')
                .map((opt) => ({ value: opt.trim(), label: opt.trim() })),
            );
          }
        } catch (error) {
          console.error('Error fetching filter options:', error);
        } finally {
          setIsLoadingOptions(false);
        }
      };

      if (open) fetchFilterOptions();
    }, [open]);

    useEffect(() => {
      setLocalFilters({
        floor: ensureArray(appliedFilters.floor),
        spaceType: ensureArray(appliedFilters.spaceType),
        status: ensureArray(appliedFilters.status),
        seats: appliedFilters.seats || 0,
      });
    }, [appliedFilters]);

    const currentOptions = useMemo(() => {
      let options = [];
      switch (activeTab) {
        case 'floor':
          options = floorOptions || [];
          break;
        case 'status':
          options = statusOptions;
          break;
        case 'spaceType':
          options = spaceTypeOptions;
          break;
        default:
          options = [];
      }
      if (searchText.trim()) {
        const lowerSearch = searchText.toLowerCase().trim();
        return options.filter((opt) => opt.label.toLowerCase().includes(lowerSearch));
      }
      return options;
    }, [activeTab, floorOptions, statusOptions, spaceTypeOptions, searchText]);

    const handleToggle = useCallback(
      (value) => {
        setLocalFilters((previous) => {
          const currentList = Array.isArray(previous[activeTab]) ? previous[activeTab] : [];
          const isSelected = currentList.includes(value);
          const newValues = isSelected
            ? currentList.filter((item) => item !== value)
            : [...currentList, value];
          return { ...previous, [activeTab]: newValues };
        });
      },
      [activeTab],
    );

    // const handleFilterChange = (key, value) => {
    //   setLocalFilters((previous) => ({ ...previous, [key]: value }));
    // };

    const handleClear = () => {
      setLocalFilters({
        floor: [],
        spaceType: [],
        status: [],
        seats: 0,
      });
    };

    const handlePopoverClose = useCallback(() => {
      onFiltersChange?.(localFilters);
    }, [localFilters, onFiltersChange]);

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
                  const count = Array.isArray(localFilters[item.value])
                    ? localFilters[item.value].length
                    : localFilters[item.value]
                      ? 1
                      : 0;
                  return (
                    <TabMenuVertical.Trigger
                      className='w-full flex items-center justify-between'
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
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
            {activeTab === 'seats' ? (
              <div className='flex flex-col gap-4 p-4'>
                <label className='paragraph-small text-text-sub-500'>Available Seats</label>
                <div className='flex flex-col gap-3 px-2 text-center'>
                  <span className='label-large text-text-main-900'>
                    {localFilters.seats}{' '}
                    <span className='label-medium text-text-soft-400'>Seats</span>
                  </span>
                  <Slider.Root
                    value={[localFilters.seats]}
                    onValueChange={(v) => setLocalFilters((prev) => ({ ...prev, seats: v[0] }))}
                    min={0}
                    max={maxSeats}
                    step={1}
                  >
                    <Slider.Thumb />
                  </Slider.Root>
                  <div className='flex justify-between text-paragraph-xs text-text-sub-500'>
                    <span>0</span>
                    <span>{maxSeats}</span>
                  </div>
                </div>
              </div>
            ) : (
              <Filter.List
                options={currentOptions}
                selectedValues={localFilters[activeTab] || []}
                onToggle={handleToggle}
                searchValue={searchText}
                onSearchChange={setSearchText}
                isLoading={isLoadingOptions}
              />
            )}
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

SpaceCenterFilterDropdown.displayName = 'SpaceCenterFilterDropdown';

export default SpaceCenterFilterDropdown;
