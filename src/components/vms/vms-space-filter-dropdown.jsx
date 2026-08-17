import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSourceListThunk } from '@/redux/vmsSlice';
import { TYPE_OF_SPACE_OPTIONS, TYPE_OF_STATUS_OPTIONS } from '@/pages/vms/vms-constant';
import { SPACE_FILTER_TABS } from '@/components/vms/constants';
import { RiArrowRightSLine, RiSearchLine } from 'react-icons/ri';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import * as Input from '@/components/ui/input';
import * as Checkbox from '@/components/ui/checkbox';

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const PARTNER_CHANNEL_PARENT = 'channel_partner';
const PARTNER_CHANNEL_CHILDREN = ['digital', 'ipc', 'dpc'];

const togglePartnerTypeValues = (currentValues, value) => {
  const current = new Set(ensureArray(currentValues));
  const has = current.has(value);

  if (value === 'direct') {
    if (has) current.delete('direct');
    else current.add('direct');
    return [...current];
  }

  if (value === PARTNER_CHANNEL_PARENT) {
    if (has) {
      current.delete(PARTNER_CHANNEL_PARENT);
      PARTNER_CHANNEL_CHILDREN.forEach((child) => current.delete(child));
    } else {
      current.add(PARTNER_CHANNEL_PARENT);
      PARTNER_CHANNEL_CHILDREN.forEach((child) => current.add(child));
    }
    return [...current];
  }

  if (PARTNER_CHANNEL_CHILDREN.includes(value)) {
    if (has) {
      current.delete(value);
      const hasAnyChildLeft = PARTNER_CHANNEL_CHILDREN.some((child) => current.has(child));
      if (!hasAnyChildLeft) {
        current.delete(PARTNER_CHANNEL_PARENT);
      }
    } else {
      current.add(value);
      current.add(PARTNER_CHANNEL_PARENT);
    }
  }

  return [...current];
};

const VmsSpaceFilterDropdown = React.forwardRef(
  (
    { setFilterCount, open, onOpenChange: _onOpenChange, onFiltersChange, appliedFilters = {} },
    ref,
  ) => {
    const dispatch = useDispatch();
    const sourceListData = useSelector((state) => state.vms.sourceList?.data?.data);

    useEffect(() => {
      if (open) {
        dispatch(fetchSourceListThunk());
      }
    }, [open, dispatch]);

    const [activeTab, setActiveTab] = useState('type_of_space');
    const [localFilters, setLocalFilters] = useState({
      type_of_space: ensureArray(['Managed Space', 'Co-Working Space']),
      source_category: ensureArray(appliedFilters.source_category),
      sales_owner: ensureArray(appliedFilters.sales_owner),
      partner_type: ensureArray(appliedFilters.partner_type),
      status: ensureArray(appliedFilters.status),
    });
    const [searchText, setSearchText] = useState('');
    const popoverRef = useRef(null);

    useEffect(() => {
      setFilterCount(
        localFilters.type_of_space.length +
          localFilters.source_category.length +
          localFilters.sales_owner.length +
          localFilters.partner_type.length +
          localFilters.status.length,
      );
    }, [
      localFilters.type_of_space.length,
      localFilters.source_category.length,
      localFilters.sales_owner.length,
      localFilters.partner_type.length,
      localFilters.status.length,
      setFilterCount,
    ]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    useEffect(() => {
      setLocalFilters({
        type_of_space: ensureArray(appliedFilters.type_of_space),
        source_category: ensureArray(appliedFilters.source_category),
        sales_owner: ensureArray(appliedFilters.sales_owner),
        partner_type: ensureArray(appliedFilters.partner_type),
        status: ensureArray(appliedFilters.status),
      });
    }, [appliedFilters]);

    const buildOptionsFromValues = (values) => {
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

    const typeOfSpaceOptions = useMemo(() => {
      return TYPE_OF_SPACE_OPTIONS;
    }, []);

    const typeOfSourceOptions = useMemo(() => {
      let options = (sourceListData || []).map((source) => ({
        value: source.name,
        label: source.lead_source || source.name,
      }));
      if (!options.some((o) => o.value === 'Other')) {
        options.push({ value: 'Other', label: 'Other' });
      }
      if (searchText.trim()) {
        const lower = searchText.toLowerCase().trim();
        options = options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(lower) || opt.value.toLowerCase().includes(lower),
        );
      }
      return options;
    }, [sourceListData, searchText]);

    const typeOfPartnerTypeOptions = useMemo(() => {
      const allOptions = [
        { value: 'direct', label: 'Direct' },
        { value: 'channel_partner', label: 'Channel Partner' },
        { value: 'digital', label: '  - Digital' },
        { value: 'ipc', label: '  - IPC' },
        { value: 'dpc', label: '  - DPC' },
      ];
      if (!searchText.trim()) return allOptions;
      const lower = searchText.toLowerCase().trim();
      return allOptions.filter(
        (opt) => opt.label.toLowerCase().includes(lower) || opt.value.toLowerCase().includes(lower),
      );
    }, [searchText]);

    const typeOfStatusOptions = useMemo(() => {
      return TYPE_OF_STATUS_OPTIONS;
    }, []);

    const currentOptions = useMemo(() => {
      switch (activeTab) {
        case 'type_of_space':
          return typeOfSpaceOptions;
        case 'source_category':
          return typeOfSourceOptions;
        case 'sales_owner':
          return buildOptionsFromValues(localFilters.sales_owner);
        case 'partner_type':
          return typeOfPartnerTypeOptions;
        case 'status':
          return typeOfStatusOptions;
        default:
          return [];
      }
    }, [activeTab, localFilters, searchText, typeOfSourceOptions, typeOfPartnerTypeOptions]);

    const partnerSelection = useMemo(
      () => new Set(ensureArray(localFilters.partner_type)),
      [localFilters.partner_type],
    );

    const isPartnerOptionVisible = useCallback(
      (value, label) => {
        if (!searchText.trim()) return true;
        const lower = searchText.toLowerCase().trim();
        return (
          String(value).toLowerCase().includes(lower) || String(label).toLowerCase().includes(lower)
        );
      },
      [searchText],
    );

    const handleToggle = useCallback(
      (value) => {
        setLocalFilters((prev) => {
          if (activeTab === 'partner_type') {
            return {
              ...prev,
              partner_type: togglePartnerTypeValues(prev.partner_type, value),
            };
          }
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
        type_of_space: [],
        source_category: [],
        sales_owner: [],
        partner_type: [],
        status: [],
      });
      setSearchText('');
    }, []);

    const handleApply = useCallback(() => {
      const filtersArray = [];

      if (localFilters.type_of_space.length > 0) {
        filtersArray.push([
          'type_of_space',
          localFilters.type_of_space.length === 1 ? '=' : 'in',
          localFilters.type_of_space.length === 1
            ? localFilters.type_of_space[0]
            : localFilters.type_of_space,
        ]);
      }
      if (localFilters.source_category.length > 0) {
        filtersArray.push([
          'source_category',
          localFilters.source_category.length === 1 ? '=' : 'in',
          localFilters.source_category.length === 1
            ? localFilters.source_category[0]
            : localFilters.source_category,
        ]);
      }
      if (localFilters.sales_owner.length > 0) {
        filtersArray.push([
          'sales_owner',
          localFilters.sales_owner.length === 1 ? '=' : 'in',
          localFilters.sales_owner.length === 1
            ? localFilters.sales_owner[0]
            : localFilters.sales_owner,
        ]);
      }
      if (localFilters.partner_type.length > 0) {
        const selected = new Set(localFilters.partner_type);
        const selectedCpTypes = [];
        if (selected.has('digital')) selectedCpTypes.push('Digital');
        if (selected.has('ipc')) selectedCpTypes.push('IPC');
        if (selected.has('dpc')) selectedCpTypes.push('DPC');

        const spaceInquiryTypes = [];
        if (selected.has('direct')) {
          spaceInquiryTypes.push('Direct');
        }
        if (selected.has('channel_partner') || selectedCpTypes.length > 0) {
          spaceInquiryTypes.push('Channel Partner');
        }
        if (spaceInquiryTypes.length > 0) {
          filtersArray.push(['space_inquiry_type', 'in', spaceInquiryTypes]);
        }
        if (selectedCpTypes.length > 0 && !selected.has('direct')) {
          filtersArray.push(['cp_type', 'in', selectedCpTypes]);
        }
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
    const emptyMessage = 'No options found';

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
                {SPACE_FILTER_TABS.map((tab) => {
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
            {activeTab === 'partner_type' ? (
              <div className='flex h-full flex-col gap-2 p-2'>
                <Input.Root size='xsmall' className='shrink-0'>
                  <Input.Wrapper>
                    <Input.Icon>
                      <RiSearchLine />
                    </Input.Icon>
                    <Input.Input
                      placeholder='Search...'
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      autoFocus
                    />
                  </Input.Wrapper>
                </Input.Root>

                <div className='min-h-0 flex-1 overflow-y-auto'>
                  {isPartnerOptionVisible('direct', 'Direct') && (
                    <Filter.ListItem
                      value='direct'
                      label='Direct'
                      checked={partnerSelection.has('direct')}
                      onToggle={handleToggle}
                    />
                  )}

                  {(isPartnerOptionVisible('channel_partner', 'Channel Partner') ||
                    isPartnerOptionVisible('digital', 'Digital') ||
                    isPartnerOptionVisible('ipc', 'IPC') ||
                    isPartnerOptionVisible('dpc', 'DPC')) && (
                    <div className='mt-1'>
                      <div
                        className='mb-1 flex items-center gap-2 rounded-lg bg-bg-weak-50 px-2 py-2'
                        onClick={() => handleToggle('channel_partner')}
                        role='button'
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggle('channel_partner');
                          }
                        }}
                      >
                        <Checkbox.Root
                          checked={partnerSelection.has('channel_partner')}
                          onCheckedChange={() => handleToggle('channel_partner')}
                          onClick={(e) => e.stopPropagation()}
                          className='shrink-0'
                        />
                        <span className='label-small text-text-main-900'>Channel Partner</span>
                      </div>

                      <div className='pl-6'>
                        {isPartnerOptionVisible('digital', 'Digital') && (
                          <Filter.ListItem
                            value='digital'
                            label='Digital'
                            checked={partnerSelection.has('digital')}
                            onToggle={handleToggle}
                          />
                        )}
                        {isPartnerOptionVisible('ipc', 'IPC') && (
                          <Filter.ListItem
                            value='ipc'
                            label='IPC'
                            checked={partnerSelection.has('ipc')}
                            onToggle={handleToggle}
                          />
                        )}
                        {isPartnerOptionVisible('dpc', 'DPC') && (
                          <Filter.ListItem
                            value='dpc'
                            label='DPC'
                            checked={partnerSelection.has('dpc')}
                            onToggle={handleToggle}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Filter.List
                options={currentOptions}
                selectedValues={selectedValues}
                onToggle={handleToggle}
                searchValue={searchText}
                onSearchChange={setSearchText}
                isLoading={false}
                emptyMessage={emptyMessage}
              />
            )}
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

VmsSpaceFilterDropdown.displayName = 'VmsSpaceFilterDropdown';

export default VmsSpaceFilterDropdown;
