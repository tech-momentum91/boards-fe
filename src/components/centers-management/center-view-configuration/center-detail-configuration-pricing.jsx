import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Table from '@/components/ui/table';
import * as Select from '@/components/ui/select';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { useColumnConfig } from '@/hooks/use-column-config';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import {
  RiAddLine,
  RiSearchLine,
  RiLayoutColumnLine,
  RiDeleteBinLine,
  RiPencilLine,
  RiCheckLine,
  RiCloseLine,
  RiArrowUpSFill,
  RiArrowDownSFill,
  RiExpandUpDownFill,
  RiArrowRightSLine,
} from 'react-icons/ri';
import { showSuccessToast, showErrorToast, extractErrorMessage } from '@/utils/error-utils';
import { getCenterPricing, saveCenterPricing } from '@/utils/center-configuration-storage';
import { fetchCenterPricingConfigApi, saveCenterPricingConfigApi } from '@/api/centerConfiguration';

export const PRODUCT_TYPE_OPTIONS = [
  'Managed Office',
  'Co-Working Space',
  'Resource',
  'Pure Rental',
];

export const SUB_TYPE_MAP = {
  'Managed Office': ['FITTED OUT', 'BARE SHELL', 'WARM SHELL', 'CUSTOMIZED'],
  'Co-Working Space': [
    'PRIVATE CABIN',
    'DEDICATED DESK',
    'FLEXI DESK',
    'MANAGER CABIN',
    'MEETING ROOM',
  ],
  Resource: ['CABINS', 'MEETING ROOM', 'EVENT SPACE', 'WORKSTATION', 'CONFERENCE ROOM'],
  'Pure Rental': ['FURNISHED', 'UNFURNISHED', 'SEMI-FURNISHED'],
};

const ALL_SUB_TYPES = [...new Set(Object.values(SUB_TYPE_MAP).flat())];

const DEFAULT_PRICING_COLUMNS = [
  { id: 'productType', label: 'Type of Product/Space', visible: true, enableHiding: false },
  { id: 'subType', label: 'Sub Type', visible: true, enableHiding: true },
  { id: 'pricePerSeat', label: 'Price/Seat', visible: true, enableHiding: true },
  { id: 'pricePerSqFt', label: 'Price/Sq.ft.', visible: true, enableHiding: true },
  { id: 'creditPerSeat', label: 'Credit/Seat', visible: true, enableHiding: true },
];

const DEFAULT_PRICING_FILTERS = Object.freeze({ productType: [], subType: [] });

const generateUniqueId = (prefix = 'row') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const normalizePricingRowsWithIds = (rawRows, existingRows = []) => {
  if (!Array.isArray(rawRows)) return [];
  const existingMap = new Map();
  (existingRows || []).forEach((r) => {
    if (r && r.id) {
      const key = `${(r.productType || '').toLowerCase().trim()}::${(r.subType || '').toLowerCase().trim()}`;
      if (key) existingMap.set(key, r.id);
    }
  });

  return rawRows.map((row, idx) => {
    if (!row || typeof row !== 'object') return row;
    const key = `${(row.productType || '').toLowerCase().trim()}::${(row.subType || '').toLowerCase().trim()}`;
    const id =
      row.id ??
      row.name ??
      (key ? existingMap.get(key) : undefined) ??
      generateUniqueId(`pricing_${idx}`);
    return {
      ...row,
      id,
    };
  });
};

const CenterDetailConfigurationPricing = ({ centerId }) => {
  const [pricingRows, setPricingRows] = useState(() =>
    normalizePricingRowsWithIds(getCenterPricing(centerId)),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const requestIdRef = useRef(0);

  const pricingTableId = `center-detail-pricing-columns-${centerId || 'default'}`;
  const getPricingColumnConfig = useCallback(() => {
    try {
      const saved = localStorage.getItem(`column-config-${pricingTableId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      void error;
      return [];
    }
  }, [pricingTableId]);

  const savePricingColumnConfig = useCallback(
    (cols) => {
      try {
        localStorage.setItem(`column-config-${pricingTableId}`, JSON.stringify(cols));
      } catch (error) {
        void error;
      }
    },
    [pricingTableId],
  );

  const pricingColumnConfig = useColumnConfig(
    pricingTableId,
    DEFAULT_PRICING_COLUMNS,
    savePricingColumnConfig,
    getPricingColumnConfig,
  );

  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);

  const pricingFilterStorageKey = `center-detail-pricing-filters-${centerId || 'default'}`;
  const [persistedFilters, setFilters] = usePersistedFilters({
    storageKey: pricingFilterStorageKey,
    defaultFilters: DEFAULT_PRICING_FILTERS,
    persistTrimStringArrays: true,
  });

  const selectedProductTypes = useMemo(
    () => (Array.isArray(persistedFilters.productType) ? persistedFilters.productType : []),
    [persistedFilters.productType],
  );

  const selectedSubTypes = useMemo(
    () => (Array.isArray(persistedFilters.subType) ? persistedFilters.subType : []),
    [persistedFilters.subType],
  );

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterActiveTab, setFilterActiveTab] = useState('productType');
  const [filterSearch, setFilterSearch] = useState('');

  const loadPricingConfig = useCallback(async () => {
    if (!centerId) {
      setIsLoading(false);
      return;
    }
    const currentReqId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const data = await fetchCenterPricingConfigApi(centerId);
      if (currentReqId !== requestIdRef.current) return;
      const rows = normalizePricingRowsWithIds(data);
      setPricingRows(rows);
      saveCenterPricing(centerId, rows);
    } catch (error) {
      if (currentReqId !== requestIdRef.current) return;
      const message = extractErrorMessage(error, 'Failed to load Pricing configuration');
      showErrorToast(message);
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [centerId]);

  useEffect(() => {
    loadPricingConfig();
  }, [loadPricingConfig]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const [newProductType, setNewProductType] = useState('');
  const [newSubType, setNewSubType] = useState('');
  const [newPricePerSeat, setNewPricePerSeat] = useState('');
  const [newPricePerSqFt, setNewPricePerSqFt] = useState('');
  const [newCreditPerSeat, setNewCreditPerSeat] = useState('');

  const [editingRowId, setEditingRowId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const configuredCombosSet = useMemo(() => {
    return new Set(
      pricingRows
        .map(
          (r) =>
            `${(r.productType || '').trim().toLowerCase()}::${(r.subType || '').trim().toLowerCase()}`,
        )
        .filter(Boolean),
    );
  }, [pricingRows]);

  const getEditingConfiguredCombos = useCallback(
    (rowId) => {
      return new Set(
        pricingRows
          .filter((r) => r.id !== rowId)
          .map(
            (r) =>
              `${(r.productType || '').trim().toLowerCase()}::${(r.subType || '').trim().toLowerCase()}`,
          )
          .filter(Boolean),
      );
    },
    [pricingRows],
  );

  const availableSubTypesForNew = useMemo(() => {
    const baseSubTypes =
      newProductType && SUB_TYPE_MAP[newProductType] ? SUB_TYPE_MAP[newProductType] : ALL_SUB_TYPES;

    if (!newProductType) return baseSubTypes;

    const normProduct = newProductType.trim().toLowerCase();
    return baseSubTypes.filter(
      (st) => !configuredCombosSet.has(`${normProduct}::${st.trim().toLowerCase()}`),
    );
  }, [newProductType, configuredCombosSet]);

  const getAvailableSubTypesForEdit = useCallback(
    (rowId, productType) => {
      const baseSubTypes =
        productType && SUB_TYPE_MAP[productType] ? SUB_TYPE_MAP[productType] : ALL_SUB_TYPES;

      if (!productType) return baseSubTypes;

      const normProduct = productType.trim().toLowerCase();
      const excludedSet = getEditingConfiguredCombos(rowId);

      return baseSubTypes.filter(
        (st) => !excludedSet.has(`${normProduct}::${st.trim().toLowerCase()}`),
      );
    },
    [getEditingConfiguredCombos],
  );

  const handleNewProductTypeChange = (val) => {
    setNewProductType(val);
    const normProduct = val.trim().toLowerCase();
    const baseSubTypes = SUB_TYPE_MAP[val] || ALL_SUB_TYPES;
    const available = baseSubTypes.filter(
      (st) => !configuredCombosSet.has(`${normProduct}::${st.trim().toLowerCase()}`),
    );
    if (available.length > 0) {
      setNewSubType(available[0]);
    } else {
      setNewSubType('');
    }
  };

  const handleAddPricingRow = async () => {
    if (isSaving || isLoading) return;
    if (!newProductType) {
      showErrorToast('Please select a Type of Product/Space');
      return;
    }
    if (!newSubType) {
      showErrorToast('Please select a Sub Type');
      return;
    }

    const comboKey = `${newProductType.trim().toLowerCase()}::${newSubType.trim().toLowerCase()}`;
    if (configuredCombosSet.has(comboKey)) {
      showErrorToast(`Configuration for "${newProductType}" with "${newSubType}" already exists`);
      return;
    }

    const newRow = {
      id: generateUniqueId('pricing_new'),
      productType: newProductType.trim(),
      subType: newSubType.trim(),
      pricePerSeat: newPricePerSeat ? Number(newPricePerSeat) : 0,
      pricePerSqFt: newPricePerSqFt ? Number(newPricePerSqFt) : 0,
      creditPerSeat: newCreditPerSeat ? Number(newCreditPerSeat) : 0,
    };

    const targetRows = [...pricingRows, newRow];
    const currentReqId = ++requestIdRef.current;
    setIsSaving(true);
    try {
      const savedData = await saveCenterPricingConfigApi(centerId, targetRows);
      if (currentReqId !== requestIdRef.current) return;
      const rows = normalizePricingRowsWithIds(savedData, targetRows);
      setPricingRows(rows);
      saveCenterPricing(centerId, rows);
      showSuccessToast('New pricing added successfully');

      setNewProductType('');
      setNewSubType('');
      setNewPricePerSeat('');
      setNewPricePerSqFt('');
      setNewCreditPerSeat('');
    } catch (error) {
      if (currentReqId !== requestIdRef.current) return;
      const message = extractErrorMessage(error, 'Failed to add Pricing row');
      showErrorToast(message);
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsSaving(false);
      }
    }
  };

  const handleStartEdit = (row) => {
    if (isSaving || isLoading) return;
    setEditingRowId(row.id);
    setEditForm({ ...row });
  };

  const handleCancelEdit = () => {
    if (isSaving) return;
    setEditingRowId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (isSaving || isLoading || !editForm) return;
    const normProduct = (editForm.productType || '').trim().toLowerCase();
    const normSub = (editForm.subType || '').trim().toLowerCase();

    if (!normProduct) {
      showErrorToast('Please select a Type of Product/Space');
      return;
    }
    if (!normSub) {
      showErrorToast('Please select a Sub Type');
      return;
    }

    const excludedSet = getEditingConfiguredCombos(editForm.id);
    if (excludedSet.has(`${normProduct}::${normSub}`)) {
      showErrorToast(
        `Configuration for "${editForm.productType}" with "${editForm.subType}" already exists`,
      );
      return;
    }

    const updatedRow = {
      ...editForm,
      pricePerSeat: editForm.pricePerSeat ? Number(editForm.pricePerSeat) : 0,
      pricePerSqFt: editForm.pricePerSqFt ? Number(editForm.pricePerSqFt) : 0,
      creditPerSeat: editForm.creditPerSeat ? Number(editForm.creditPerSeat) : 0,
    };

    const targetRows = pricingRows.map((row) => (row.id === editForm.id ? updatedRow : row));
    const currentReqId = ++requestIdRef.current;
    setIsSaving(true);
    try {
      const savedData = await saveCenterPricingConfigApi(centerId, targetRows);
      if (currentReqId !== requestIdRef.current) return;
      const rows = normalizePricingRowsWithIds(savedData, targetRows);
      setPricingRows(rows);
      saveCenterPricing(centerId, rows);
      showSuccessToast('Pricing row updated');
      setEditingRowId(null);
      setEditForm(null);
    } catch (error) {
      if (currentReqId !== requestIdRef.current) return;
      const message = extractErrorMessage(error, 'Failed to update Pricing row');
      showErrorToast(message);
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsSaving(false);
      }
    }
  };

  const handleDeleteRow = async (id) => {
    if (isSaving || isLoading) return;
    const targetRows = pricingRows.filter((r) => r.id !== id);
    const currentReqId = ++requestIdRef.current;
    setIsSaving(true);
    try {
      const savedData = await saveCenterPricingConfigApi(centerId, targetRows);
      if (currentReqId !== requestIdRef.current) return;
      const rows = normalizePricingRowsWithIds(savedData, targetRows);
      setPricingRows(rows);
      saveCenterPricing(centerId, rows);
      showSuccessToast('Pricing row removed');
    } catch (error) {
      if (currentReqId !== requestIdRef.current) return;
      const message = extractErrorMessage(error, 'Failed to remove Pricing row');
      showErrorToast(message);
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsSaving(false);
      }
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const columnVisibilityMap = useMemo(() => {
    return pricingColumnConfig.columns.reduce((acc, col) => {
      acc[col.id] = col.visible !== false;
      return acc;
    }, {});
  }, [pricingColumnConfig.columns]);

  const availableFilterProductTypes = useMemo(() => {
    const set = new Set(PRODUCT_TYPE_OPTIONS);
    pricingRows.forEach((r) => {
      if (r.productType) set.add(r.productType);
    });
    return [...set];
  }, [pricingRows]);

  const availableFilterSubTypes = useMemo(() => {
    const set = new Set(ALL_SUB_TYPES);
    pricingRows.forEach((r) => {
      if (r.subType) set.add(r.subType);
    });
    return [...set];
  }, [pricingRows]);

  const currentFilterOptions = useMemo(() => {
    const rawOptions =
      filterActiveTab === 'productType' ? availableFilterProductTypes : availableFilterSubTypes;
    if (!filterSearch.trim()) return rawOptions;
    const q = filterSearch.toLowerCase();
    return rawOptions.filter((opt) => opt.toLowerCase().includes(q));
  }, [filterActiveTab, availableFilterProductTypes, availableFilterSubTypes, filterSearch]);

  const filterCount = selectedProductTypes.length + selectedSubTypes.length;

  const handleClearFilters = (e) => {
    e?.stopPropagation?.();
    setFilters(DEFAULT_PRICING_FILTERS);
    setFilterSearch('');
  };

  const handleToggleFilterOption = (val) => {
    if (filterActiveTab === 'productType') {
      const updated = selectedProductTypes.includes(val)
        ? selectedProductTypes.filter((item) => item !== val)
        : [...selectedProductTypes, val];
      setFilters((prev) => ({ ...prev, productType: updated }));
    } else {
      const updated = selectedSubTypes.includes(val)
        ? selectedSubTypes.filter((item) => item !== val)
        : [...selectedSubTypes, val];
      setFilters((prev) => ({ ...prev, subType: updated }));
    }
  };

  const filteredAndSortedRows = useMemo(() => {
    let list = [...pricingRows];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          (r.productType || '').toLowerCase().includes(term) ||
          (r.subType || '').toLowerCase().includes(term),
      );
    }

    if (selectedProductTypes.length > 0) {
      list = list.filter((r) => selectedProductTypes.includes(r.productType));
    }

    if (selectedSubTypes.length > 0) {
      list = list.filter((r) => selectedSubTypes.includes(r.subType));
    }

    if (sortField) {
      list.sort((a, b) => {
        const valA = Number(a[sortField]) || 0;
        const valB = Number(b[sortField]) || 0;
        if (sortDirection === 'asc') {
          return valA - valB;
        }
        return valB - valA;
      });
    }

    return list;
  }, [pricingRows, searchTerm, selectedProductTypes, selectedSubTypes, sortField, sortDirection]);

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return (
        <RiExpandUpDownFill className='size-4 text-text-sub-500 hover:text-text-strong-950 transition-colors' />
      );
    }
    if (sortDirection === 'asc') {
      return <RiArrowUpSFill className='size-4 text-text-strong-950' />;
    }
    return <RiArrowDownSFill className='size-4 text-text-strong-950' />;
  };

  const isBusy = isLoading || isSaving;

  return (
    <div className='w-full h-full flex flex-col gap-4 overflow-hidden'>
      {/* Top Toolbar */}
      <div className='w-full flex items-center justify-between gap-3 shrink-0'>
        <div className='w-[280px] min-w-[200px]'>
          <Input.Root size='xsmall'>
            <Input.Wrapper>
              <Input.Icon>
                <RiSearchLine />
              </Input.Icon>
              <Input.Input
                placeholder='Search by product type or sub type'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isBusy}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex items-center gap-2'>
          {/* Filter Popover */}
          <Popover.Root open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <Filter.TriggerButton
              filterCount={filterCount}
              onClear={handleClearFilters}
              tooltipContent='Filter'
              ariaLabel='Filter pricing configuration'
              size='xsmall'
              disabled={isBusy}
            />
            <Filter.Root>
              <Filter.Header title='FILTERS' onClear={handleClearFilters} />
              <Filter.Body>
                <Filter.Sidebar width='160px'>
                  <TabMenuVertical.Root value={filterActiveTab} onValueChange={setFilterActiveTab}>
                    <TabMenuVertical.List className='p-2 border-r-0'>
                      <TabMenuVertical.Trigger
                        className='w-full flex items-center justify-between'
                        value='productType'
                      >
                        <span>Product Type</span>
                        {selectedProductTypes.length > 0 ? (
                          <Badge.Root
                            size='medium'
                            variant='filled'
                            className='shrink-0 rounded-full bg-black text-white'
                          >
                            {selectedProductTypes.length}
                          </Badge.Root>
                        ) : (
                          <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                        )}
                      </TabMenuVertical.Trigger>
                      <TabMenuVertical.Trigger
                        className='w-full flex items-center justify-between'
                        value='subType'
                      >
                        <span>Sub Type</span>
                        {selectedSubTypes.length > 0 ? (
                          <Badge.Root
                            size='medium'
                            variant='filled'
                            className='shrink-0 rounded-full bg-black text-white'
                          >
                            {selectedSubTypes.length}
                          </Badge.Root>
                        ) : (
                          <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                        )}
                      </TabMenuVertical.Trigger>
                    </TabMenuVertical.List>
                  </TabMenuVertical.Root>
                </Filter.Sidebar>

                <Filter.Content width='260px'>
                  <Filter.List
                    options={currentFilterOptions}
                    selectedValues={
                      filterActiveTab === 'productType' ? selectedProductTypes : selectedSubTypes
                    }
                    onToggle={handleToggleFilterOption}
                    searchValue={filterSearch}
                    onSearchChange={setFilterSearch}
                    searchPlaceholder='Search options...'
                    emptyMessage='No options found'
                  />
                </Filter.Content>
              </Filter.Body>
            </Filter.Root>
          </Popover.Root>

          {/* Column Manager Dropdown */}
          <ColumnManagerDropdown
            open={isColumnManagerOpen}
            onOpenChange={setIsColumnManagerOpen}
            config={pricingColumnConfig}
            tooltipContent='Column Manager'
            footer={
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className='w-full justify-center'
                onClick={pricingColumnConfig.resetToDefault}
                disabled={isBusy}
              >
                Reset Columns
              </Button.Root>
            }
            trigger={
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                aria-label='Columns'
                disabled={isBusy}
              >
                <Button.Icon as={RiLayoutColumnLine} />
              </Button.Root>
            }
          />
        </div>
      </div>

      <div className='flex-1 w-full min-h-0 overflow-y-auto border border-stroke-soft-200 rounded-xl bg-bg-white-0'>
        <Table.Root>
          <Table.Header>
            <Table.Row className='border-b border-stroke-soft-200 bg-bg-weak-50'>
              {columnVisibilityMap.productType && (
                <Table.Head className='w-[250px] font-medium text-text-sub-500 py-3.5 px-4'>
                  Type of Product/Space
                </Table.Head>
              )}
              {columnVisibilityMap.subType && (
                <Table.Head className='w-[200px] font-medium text-text-sub-500 py-3.5 px-4'>
                  Sub Type
                </Table.Head>
              )}
              {columnVisibilityMap.pricePerSeat && (
                <Table.Head className='w-[160px] font-medium text-text-sub-500 py-3.5 px-4'>
                  <button
                    type='button'
                    onClick={() => handleSort('pricePerSeat')}
                    disabled={isBusy}
                    className='flex items-center gap-1.5 hover:text-text-strong-950 transition-colors disabled:opacity-50'
                  >
                    <span>Price/Seat</span>
                    {renderSortIcon('pricePerSeat')}
                  </button>
                </Table.Head>
              )}
              {columnVisibilityMap.pricePerSqFt && (
                <Table.Head className='w-[160px] font-medium text-text-sub-500 py-3.5 px-4'>
                  <button
                    type='button'
                    onClick={() => handleSort('pricePerSqFt')}
                    disabled={isBusy}
                    className='flex items-center gap-1.5 hover:text-text-strong-950 transition-colors disabled:opacity-50'
                  >
                    <span>Price/Sq.ft.</span>
                    {renderSortIcon('pricePerSqFt')}
                  </button>
                </Table.Head>
              )}
              {columnVisibilityMap.creditPerSeat && (
                <Table.Head className='w-[160px] font-medium text-text-sub-500 py-3.5 px-4'>
                  <button
                    type='button'
                    onClick={() => handleSort('creditPerSeat')}
                    disabled={isBusy}
                    className='flex items-center gap-1.5 hover:text-text-strong-950 transition-colors disabled:opacity-50'
                  >
                    <span>Credit/Seat</span>
                    {renderSortIcon('creditPerSeat')}
                  </button>
                </Table.Head>
              )}
              <Table.Head className='w-[80px] text-right py-3.5 px-4' />
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {filteredAndSortedRows.map((row) => {
              const isEditing = editingRowId === row.id;

              if (isEditing && editForm) {
                const availableSubTypes = getAvailableSubTypesForEdit(row.id, editForm.productType);

                return (
                  <Table.Row
                    key={row.id}
                    className='border-b border-stroke-soft-200 bg-bg-weak-50/50'
                  >
                    {columnVisibilityMap.productType && (
                      <Table.Cell className='py-3 px-4'>
                        <Select.Root
                          size='xsmall'
                          value={editForm.productType}
                          onValueChange={(val) => {
                            const subTypes = getAvailableSubTypesForEdit(row.id, val);
                            setEditForm((prev) => ({
                              ...prev,
                              productType: val,
                              subType: subTypes.length > 0 ? subTypes[0] : '',
                            }));
                          }}
                          disabled={isBusy}
                        >
                          <Select.Trigger className='w-full'>
                            <Select.Value placeholder='Select product type' />
                          </Select.Trigger>
                          <Select.Content>
                            {PRODUCT_TYPE_OPTIONS.map((opt) => (
                              <Select.Item key={opt} value={opt}>
                                {opt}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      </Table.Cell>
                    )}

                    {columnVisibilityMap.subType && (
                      <Table.Cell className='py-3 px-4'>
                        <Select.Root
                          size='xsmall'
                          value={editForm.subType}
                          onValueChange={(val) =>
                            setEditForm((prev) => ({ ...prev, subType: val }))
                          }
                          disabled={
                            isBusy || !editForm.productType || availableSubTypes.length === 0
                          }
                        >
                          <Select.Trigger className='w-full'>
                            <Select.Value placeholder='Select sub type' />
                          </Select.Trigger>
                          <Select.Content>
                            {availableSubTypes.map((st) => (
                              <Select.Item key={st} value={st}>
                                {st}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      </Table.Cell>
                    )}

                    {columnVisibilityMap.pricePerSeat && (
                      <Table.Cell className='py-3 px-4'>
                        <Input.Root size='xsmall'>
                          <Input.Wrapper>
                            <Input.Input
                              type='number'
                              value={editForm.pricePerSeat}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  pricePerSeat: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              disabled={isBusy}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </Table.Cell>
                    )}

                    {columnVisibilityMap.pricePerSqFt && (
                      <Table.Cell className='py-3 px-4'>
                        <Input.Root size='xsmall'>
                          <Input.Wrapper>
                            <Input.Input
                              type='number'
                              value={editForm.pricePerSqFt}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  pricePerSqFt: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              disabled={isBusy}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </Table.Cell>
                    )}

                    {columnVisibilityMap.creditPerSeat && (
                      <Table.Cell className='py-3 px-4'>
                        <Input.Root size='xsmall'>
                          <Input.Wrapper>
                            <Input.Input
                              type='number'
                              value={editForm.creditPerSeat}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  creditPerSeat: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              disabled={isBusy}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </Table.Cell>
                    )}

                    <Table.Cell className='py-3 px-4 text-right'>
                      <div className='flex items-center justify-end gap-1'>
                        <Button.Root
                          size='xsmall'
                          variant='primary'
                          onClick={handleSaveEdit}
                          aria-label='Save'
                          disabled={isBusy}
                        >
                          <Button.Icon as={RiCheckLine} />
                        </Button.Root>
                        <Button.Root
                          size='xsmall'
                          variant='neutral'
                          mode='stroke'
                          onClick={handleCancelEdit}
                          aria-label='Cancel'
                          disabled={isBusy}
                        >
                          <Button.Icon as={RiCloseLine} />
                        </Button.Root>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              }

              return (
                <Table.Row
                  key={row.id}
                  className='border-b border-stroke-soft-200 hover:bg-bg-weak-50 transition-colors group cursor-pointer'
                  onClick={(e) => {
                    if (!e.target.closest('button') && !isBusy) {
                      handleStartEdit(row);
                    }
                  }}
                >
                  {columnVisibilityMap.productType && (
                    <Table.Cell className='py-3.5 px-4 font-normal text-text-strong-950'>
                      {row.productType}
                    </Table.Cell>
                  )}
                  {columnVisibilityMap.subType && (
                    <Table.Cell className='py-3.5 px-4'>
                      <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase border border-stroke-soft-200 bg-bg-weak-50 text-text-sub-600'>
                        {row.subType}
                      </span>
                    </Table.Cell>
                  )}
                  {columnVisibilityMap.pricePerSeat && (
                    <Table.Cell className='py-3.5 px-4 text-text-strong-950 font-normal'>
                      ₹{row.pricePerSeat}
                    </Table.Cell>
                  )}
                  {columnVisibilityMap.pricePerSqFt && (
                    <Table.Cell className='py-3.5 px-4 text-text-strong-950 font-normal'>
                      ₹{row.pricePerSqFt}
                    </Table.Cell>
                  )}
                  {columnVisibilityMap.creditPerSeat && (
                    <Table.Cell className='py-3.5 px-4 text-text-strong-950 font-normal'>
                      {row.creditPerSeat}
                    </Table.Cell>
                  )}
                  <Table.Cell className='py-3.5 px-4 text-right'>
                    <div className='flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(row);
                        }}
                        disabled={isBusy}
                        className='p-1 text-text-sub-500 hover:text-text-strong-950 rounded transition-colors disabled:opacity-50'
                        aria-label='Edit pricing'
                      >
                        <RiPencilLine size={16} />
                      </button>
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRow(row.id);
                        }}
                        disabled={isBusy}
                        className='p-1 text-text-sub-500 hover:text-error-base rounded transition-colors disabled:opacity-50'
                        aria-label='Delete pricing'
                      >
                        <RiDeleteBinLine size={16} />
                      </button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              );
            })}

            <Table.Row className='border-b border-stroke-soft-200 bg-bg-white-0'>
              {columnVisibilityMap.productType && (
                <Table.Cell className='py-3 px-4'>
                  <Select.Root
                    size='xsmall'
                    value={newProductType}
                    onValueChange={handleNewProductTypeChange}
                    disabled={isBusy}
                  >
                    <Select.Trigger className='w-full text-text-soft-400'>
                      <Select.Value placeholder='Select' />
                    </Select.Trigger>
                    <Select.Content>
                      {PRODUCT_TYPE_OPTIONS.map((opt) => (
                        <Select.Item key={opt} value={opt}>
                          {opt}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Table.Cell>
              )}

              {columnVisibilityMap.subType && (
                <Table.Cell className='py-3 px-4'>
                  <Select.Root
                    size='xsmall'
                    value={newSubType}
                    onValueChange={setNewSubType}
                    disabled={isBusy || !newProductType || availableSubTypesForNew.length === 0}
                  >
                    <Select.Trigger className='w-full text-text-soft-400'>
                      <Select.Value placeholder='Select' />
                    </Select.Trigger>
                    <Select.Content>
                      {availableSubTypesForNew.map((st) => (
                        <Select.Item key={st} value={st}>
                          {st}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Table.Cell>
              )}

              {columnVisibilityMap.pricePerSeat && (
                <Table.Cell className='py-3 px-4'>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        type='number'
                        placeholder='Enter price per seat.'
                        value={newPricePerSeat}
                        onChange={(e) => setNewPricePerSeat(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddPricingRow();
                        }}
                        disabled={isBusy}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </Table.Cell>
              )}

              {columnVisibilityMap.pricePerSqFt && (
                <Table.Cell className='py-3 px-4'>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        type='number'
                        placeholder='Enter price per Sq.ft.'
                        value={newPricePerSqFt}
                        onChange={(e) => setNewPricePerSqFt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddPricingRow();
                        }}
                        disabled={isBusy}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </Table.Cell>
              )}

              {columnVisibilityMap.creditPerSeat && (
                <Table.Cell className='py-3 px-4'>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        type='number'
                        placeholder='Enter credit per seat.'
                        value={newCreditPerSeat}
                        onChange={(e) => setNewCreditPerSeat(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddPricingRow();
                        }}
                        disabled={isBusy}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </Table.Cell>
              )}

              <Table.Cell className='py-3 px-4 text-right' />
            </Table.Row>

            <Table.Row>
              <Table.Cell
                colSpan={pricingColumnConfig.columns.filter((c) => c.visible !== false).length + 1}
                className='py-3 px-4'
              >
                <button
                  type='button'
                  onClick={handleAddPricingRow}
                  disabled={isBusy}
                  className='inline-flex items-center gap-1.5 text-paragraph-sm font-medium text-text-sub-500 hover:text-text-strong-950 transition-colors disabled:opacity-50'
                >
                  <RiAddLine size={18} />
                  <span>{isSaving ? 'Saving...' : 'Add New Pricing'}</span>
                </button>
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </div>
    </div>
  );
};

export default CenterDetailConfigurationPricing;
