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
import { fetchClientOpexCategories } from '@/redux/opexSlice';

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const verticalTabs = [
  { value: 'center', label: 'Center' },
  { value: 'category', label: 'Category' },
  { value: 'subCategory', label: 'Sub-category' },
];

const VendorFilterDropdown = React.forwardRef(
  (
    {
      setFilterCount,
      open,
      onOpenChange: _onOpenChange,
      onFiltersChange,
      appliedFilters = {},
      categoryOptions = [],
      centerOptions = [],
      isLoadingOptions = false,
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const { rows: subCategoryRows, isLoading: subCatLoading } = useSelector(
      (state) => state.opex.clientCategories,
    );

    const [activeTab, setActiveTab] = useState('center');
    const [localFilters, setLocalFilters] = useState({
      category: ensureArray(appliedFilters.category),
      subCategory: ensureArray(appliedFilters.subCategory),
      center: ensureArray(appliedFilters.center),
    });
    const [searchText, setSearchText] = useState('');
    const popoverRef = useRef(null);

    const subCategoryOptions = useMemo(
      () => (subCategoryRows || []).map((item) => ({ value: item.name, label: item.category })),
      [subCategoryRows],
    );

    // Fetch sub-categories whenever selected categories change
    useEffect(() => {
      if (localFilters.category.length > 0) {
        dispatch(
          fetchClientOpexCategories({
            filters: { category: localFilters.category },
            pageSize: 999,
          }),
        );
      }
    }, [localFilters.category, dispatch]);

    useEffect(() => {
      setFilterCount(
        localFilters.category.length + localFilters.subCategory.length + localFilters.center.length,
      );
    }, [
      localFilters.category.length,
      localFilters.subCategory.length,
      localFilters.center.length,
      setFilterCount,
    ]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    useEffect(() => {
      setLocalFilters({
        category: ensureArray(appliedFilters.category),
        subCategory: ensureArray(appliedFilters.subCategory),
        center: ensureArray(appliedFilters.center),
      });
    }, [appliedFilters]);

    const currentOptions = useMemo(() => {
      let options = [];
      switch (activeTab) {
        case 'category':
          options = categoryOptions;
          break;
        case 'subCategory':
          options = localFilters.category.length > 0 ? subCategoryOptions : [];
          break;
        case 'center':
          options = centerOptions;
          break;
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
      searchText,
      categoryOptions,
      subCategoryOptions,
      centerOptions,
      localFilters.category,
    ]);

    const isCurrentTabLoading =
      activeTab === 'category' || activeTab === 'center'
        ? isLoadingOptions
        : activeTab === 'subCategory'
          ? subCatLoading
          : false;

    const emptyMessage =
      activeTab === 'category'
        ? 'No categories found'
        : activeTab === 'subCategory'
          ? localFilters.category.length === 0
            ? 'Select a category first'
            : 'No sub-categories found'
          : 'No centers found';

    const handleClear = () => {
      setLocalFilters({ category: [], subCategory: [], center: [] });
      setSearchText('');
    };

    const handleToggle = useCallback(
      (value) => {
        setLocalFilters((previous) => {
          if (!(activeTab in previous)) return previous;
          const currentList = Array.isArray(previous[activeTab]) ? previous[activeTab] : [];
          const isSelected = currentList.includes(value);
          const newValues = isSelected
            ? currentList.filter((item) => item !== value)
            : [...currentList, value];

          // If unchecking a category, clear sub-categories that no longer apply
          if (activeTab === 'category' && isSelected) {
            return { ...previous, [activeTab]: newValues, subCategory: [] };
          }

          return { ...previous, [activeTab]: newValues };
        });
      },
      [activeTab],
    );

    const handlePopoverClose = useCallback(() => {
      onFiltersChange?.(localFilters);
    }, [localFilters, onFiltersChange]);

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
                  const selectedCount = Array.isArray(localFilters[item.value])
                    ? localFilters[item.value].length
                    : 0;
                  return (
                    <TabMenuVertical.Trigger
                      className='w-full flex items-center justify-between'
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                      {selectedCount > 0 ? (
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
              selectedValues={localFilters[activeTab] || []}
              onToggle={handleToggle}
              searchValue={searchText}
              onSearchChange={setSearchText}
              isLoading={isCurrentTabLoading}
              emptyMessage={emptyMessage}
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

VendorFilterDropdown.displayName = 'VendorFilterDropdown';

export default VendorFilterDropdown;
