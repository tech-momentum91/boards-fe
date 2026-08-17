import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiArrowLeftLine,
  RiBuildingLine,
  RiSearchLine,
  RiUploadLine,
  RiAddLine,
  RiCheckLine,
  RiCloseLine,
  RiImageLine,
  RiBox3Line,
  RiHistoryLine,
  RiStackLine,
  RiUploadCloud2Line,
  RiDeleteBin6Line,
} from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Badge from '@/components/ui/badge';
import * as Modal from '@/components/ui/modal';
import * as Table from '@/components/ui/table';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as Checkbox from '@/components/ui/checkbox';
import * as CompactButton from '@/components/ui/compact-button';
import AssetProductSelect from '@/components/aum/asset-in/asset-product-select';
import AssetInActivityPanel from '@/components/aum/asset-in/asset-in-activity-panel';
import { useAumSearch } from '@/components/aum/use-aum-search';
import { formatAumDetailDateDisplay } from '@/components/aum/asset/asset-detail-helper';
import { vendorRcDateToIso, vendorRcIsoToDate } from '@/components/stocks/stocks-helper';
import { Datepicker } from '@/components/ui/datepicker';
import { mapAssetInMediaFromApi, mapAssetRowsToApiItems } from '@/api/assetIn';
import {
  fetchAssetInProducts,
  resolveAssetInItemGroupHierarchy,
  saveAssetIn,
  selectAssetInProducts,
} from '@/redux/aumAssetInSlice';
import { fetchAumActivity, selectAumActivity } from '@/redux/aumActivitySlice';
import { resolveFileUrl } from '@/lib/utils';
import { cn } from '@/utils/cn';
import { showErrorToast } from '@/utils/error-utils';

const DEFAULT_CATEGORY_GROUP = '';

function createEmptyAssetRow(inDate = '') {
  return {
    id: `row-${Date.now()}`,
    name: '',
    code: '-',
    brand: '',
    qty: '',
    rate: '',
    purchaseDate: inDate,
    availableForUseDate: inDate,
    bill: '',
    type: '',
    group: '',
    category: '',
    categoryGroup: DEFAULT_CATEGORY_GROUP,
    isNew: true,
  };
}

const BORDERLESS_INPUT =
  'w-full min-w-0 max-w-full truncate whitespace-nowrap border-0 bg-transparent px-0 py-0 text-paragraph-sm outline-none placeholder:text-text-soft-400';

const ASSET_TABLE_HEAD =
  'rounded-none first:rounded-none last:rounded-none !bg-bg-weak-100 !px-3 !py-2 h-9 align-middle font-medium text-text-soft-400';

const ASSET_COL = {
  name: 'w-[201px] min-w-[201px]',
  code: 'w-[142px] min-w-[142px]',
  brand: 'w-[142px] min-w-[142px]',
  qty: 'w-[87px] min-w-[87px]',
  rate: 'w-[143px] min-w-[143px]',
  purchaseDate: 'w-[150px] min-w-[150px]',
  availableForUseDate: 'w-[170px] min-w-[170px]',
  bill: 'w-[122px] min-w-[122px]',
  type: 'w-[161px] min-w-[161px]',
  group: 'w-[142px] min-w-[142px]',
  category: 'w-[142px] min-w-[142px]',
  categoryGroup: 'w-[142px] min-w-[142px]',
  actions: 'sticky right-0 z-10 w-16 min-w-[64px] max-w-[64px]',
};

const ASSET_TABLE_CELL =
  'rounded-none first:rounded-none last:rounded-none !h-12 !max-h-12 !py-0 !pl-3 !pr-3 align-middle whitespace-nowrap group-hover/row:!bg-bg-white-0';

const ASSET_TABLE_DATA_CELL = cn(ASSET_TABLE_CELL, 'max-w-0 overflow-hidden');

const ASSET_CELL_TEXT =
  'block min-w-0 truncate whitespace-nowrap text-paragraph-sm text-text-sub-500';

const ASSET_CELL_TEXT_STRONG =
  'block min-w-0 truncate whitespace-nowrap text-paragraph-sm font-medium text-text-strong-950';

const NAME_COLUMN_PADDING = '!pl-3 !pr-3';

const NAME_CELL_GRID =
  'grid w-full min-w-0 grid-cols-[20px_32px_minmax(0,1fr)] items-center gap-x-3';

const ASSET_NAME_HEAD = cn(ASSET_TABLE_HEAD, ASSET_COL.name, NAME_COLUMN_PADDING);

const ASSET_NAME_CELL = cn(ASSET_TABLE_DATA_CELL, ASSET_COL.name, NAME_COLUMN_PADDING);

const ASSET_TABLE_ACTIONS_HEAD = cn(
  ASSET_TABLE_HEAD,
  ASSET_COL.actions,
  'sticky right-0 z-20 w-16 min-w-[64px] max-w-[64px] shrink-0 !px-0 overflow-visible !bg-bg-weak-100',
);

const ASSET_TABLE_ACTIONS_CELL = cn(
  ASSET_TABLE_CELL,
  ASSET_COL.actions,
  'sticky right-0 z-20 w-16 min-w-[64px] max-w-[64px] shrink-0 !px-0 overflow-visible bg-bg-white-0 group-hover/row:!bg-bg-white-0',
);

const ASSET_TABLE_HEADER_ROW = 'bg-bg-weak-100 border-b border-stroke-soft-200';

const ASSET_TABLE_ROW = 'bg-bg-white-0 border-b border-stroke-soft-200';

const ASSET_TABLE_ADD_ROW = 'border-t border-stroke-soft-200 bg-bg-weak-100';

const ASSET_SELECT_WRAPPER = 'min-w-0 w-full overflow-hidden';

const ASSET_TABLE_SELECT_TRIGGER = cn(
  'h-8 min-h-8 min-w-0 w-full max-w-full rounded-lg bg-transparent px-1.5 py-0 text-paragraph-sm',
  '!border-0 !shadow-none !outline-none !ring-0',
  'before:!hidden',
  'hover:!bg-transparent hover:!shadow-none hover:!ring-0',
  'focus:!shadow-none focus:!outline-none focus:!ring-0',
  'data-[state=open]:!border-0 data-[state=open]:!shadow-none data-[state=open]:before:!hidden',
  'data-[state=open]:!ring-1 data-[state=open]:!ring-inset data-[state=open]:!ring-primary-base',
  'data-[placeholder]:text-text-soft-400 data-[placeholder]:opacity-100',
  'whitespace-nowrap',
  '[&>span:first-child]:block [&>span:first-child]:min-w-0 [&>span:first-child]:truncate [&>span:first-child]:whitespace-nowrap',
);

const BILL_OPTIONS = ['BILL-2025-0142', 'BILL-2025-0098', 'BILL-2025-0110', 'BILL-2025-0167'];
const ASSET_IN_BILL_FIELD_ENABLED = false;

const BRAND_OPTIONS = [
  'Featherlite',
  'Godrej Interio',
  'Haworth',
  'Durian',
  'Wipro Furniture',
  'Saint-Gobain',
  'Steelcase',
  'Herman Miller',
];

function AssetTableSelect({ value, onValueChange, options, placeholder = 'Select' }) {
  return (
    <div className={ASSET_SELECT_WRAPPER}>
      <Select.Root
        variant='borderless'
        size='small'
        value={value || undefined}
        onValueChange={onValueChange}
      >
        <Select.Trigger className={ASSET_TABLE_SELECT_TRIGGER}>
          <Select.Value placeholder={placeholder} />
        </Select.Trigger>
        <Select.Content>
          {options.map((option) => (
            <Select.Item key={option} value={option}>
              {option}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </div>
  );
}

function AssetTableDatepicker({ value, onChange, placeholder = 'Select date' }) {
  return (
    <div
      className={ASSET_SELECT_WRAPPER}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <Datepicker
        variant='borderless'
        size='small'
        value={vendorRcIsoToDate(value)}
        onChange={(date) => onChange(vendorRcDateToIso(date))}
        placeholder={placeholder}
        formatDate={(date) => formatAumDetailDateDisplay(vendorRcDateToIso(date))}
        className='h-8 min-h-8 min-w-0 w-full max-w-full px-1.5 text-paragraph-sm'
      />
    </div>
  );
}

function SortableColumnHeader({ label, sortKey, sortConfig, onSort }) {
  const isActive = sortConfig.key === sortKey;
  const sortState = isActive ? sortConfig.direction : undefined;

  return (
    <div className='flex items-center gap-0.5'>
      <span className='text-paragraph-sm font-medium text-text-soft-400 whitespace-nowrap'>
        {label}
      </span>
      <button
        type='button'
        className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}`}
      >
        {Table.getSortingIcon(sortState)}
      </button>
    </div>
  );
}

export default function AssetInDetailPage({
  transaction,
  onBack,
  onMarkAsCompleted,
  isCompleting = false,
}) {
  const dispatch = useDispatch();
  const { items: productsFromStore, status: productsStatus } = useSelector(selectAssetInProducts);
  const { items: activityFromStore, status: activityStatus } = useSelector(selectAumActivity);

  const isDraft = transaction.status === 'Draft';

  const [activeTab, setActiveTab] = useState('asset');
  const { searchValue, setSearchValue, debouncedSearch } = useAumSearch();
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const fileInputRef = useRef(null);

  // Table Rows State
  const [rows, setRows] = useState(transaction.assets || []);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [activityError, setActivityError] = useState(null);
  const skipAutoSaveRef = useRef(true);
  const autoSaveTimerRef = useRef(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const uploadedFilesRef = useRef([]);
  uploadedFilesRef.current = uploadedFiles;

  const apiMediaFiles = useMemo(
    () => mapAssetInMediaFromApi(transaction.images),
    [transaction.images],
  );

  const displayMediaFiles = useMemo(
    () => [...apiMediaFiles, ...uploadedFiles],
    [apiMediaFiles, uploadedFiles],
  );

  const loadActivity = useCallback(() => {
    const docName = transaction.id || transaction.serialNumber;
    if (!docName || !String(docName).startsWith('IN-')) {
      return Promise.resolve();
    }

    setActivityError(null);
    return dispatch(
      fetchAumActivity({
        entityDoctype: 'Asset In',
        entityId: docName,
      }),
    );
  }, [dispatch, transaction.id, transaction.serialNumber]);

  const activityHistory = activityFromStore;
  const isLoadingActivity = activityStatus === 'loading';
  const availableProducts = productsFromStore;
  const isLoadingProducts = productsStatus === 'loading';

  useEffect(() => {
    if (activeTab !== 'activity') return undefined;
    loadActivity();
    return undefined;
  }, [activeTab, loadActivity]);

  useEffect(() => {
    setRows(transaction.assets || []);
    setUploadedFiles([]);
    setSelectedRows(new Set());
    skipAutoSaveRef.current = true;
  }, [transaction.id]);

  useEffect(() => {
    if (!isDraft) return undefined;
    dispatch(fetchAssetInProducts());
    return undefined;
  }, [dispatch, isDraft, transaction.id]);

  useEffect(() => {
    if (activityStatus === 'failed') {
      setActivityError('Could not load activity.');
    }
  }, [activityStatus]);

  useEffect(() => {
    return () => {
      uploadedFilesRef.current.forEach((file) => {
        if (file?.preview) URL.revokeObjectURL(file.preview);
      });
    };
  }, []);

  useEffect(() => {
    if (!isDraft) return undefined;

    const docName = transaction.id || transaction.serialNumber;
    if (!docName || !String(docName).startsWith('IN-')) return undefined;

    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return undefined;
    }

    const items = mapAssetRowsToApiItems(rows);

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null;
      dispatch(
        saveAssetIn({
          name: docName,
          action: 'save_draft',
          items,
        }),
      );
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [rows, isDraft, transaction.id, transaction.serialNumber, dispatch]);

  // Toggle Row Selection
  const toggleRow = (id) => {
    const next = new Set(selectedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRows(next);
  };

  // Toggle All Rows
  const toggleAll = () => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map((r) => r.id)));
    }
  };

  const persistDraftItems = useCallback(
    async (items) => {
      const docName = transaction.id || transaction.serialNumber;
      if (!docName || !String(docName).startsWith('IN-') || !isDraft) return;

      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      skipAutoSaveRef.current = true;
      await dispatch(
        saveAssetIn({
          name: docName,
          action: 'save_draft',
          items,
        }),
      ).unwrap();
    },
    [dispatch, isDraft, transaction.id, transaction.serialNumber],
  );

  const handleDeleteRow = useCallback(
    async (id) => {
      let itemsToSave = [];

      setRows((current) => {
        const nextRows = current.filter((row) => row.id !== id);
        itemsToSave = mapAssetRowsToApiItems(nextRows);
        return nextRows.length === 0 ? [createEmptyAssetRow(transaction.inDate || '')] : nextRows;
      });

      setSelectedRows((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });

      try {
        await persistDraftItems(itemsToSave);
      } catch (error) {
        skipAutoSaveRef.current = false;
        showErrorToast(error, { defaultMessage: 'Could not delete this asset line.' });
      }
    },
    [persistDraftItems],
  );

  // Add a new empty row to compile asset data
  const handleAddRow = () => {
    setRows((current) => [...current, createEmptyAssetRow(transaction.inDate || '')]);
  };

  const applyProductToRow = useCallback(
    async (row, productValue) => {
      let product = availableProducts.find((p) => p.value === productValue);

      if (!product) {
        try {
          const refreshed = await dispatch(fetchAssetInProducts()).unwrap();
          product = (refreshed ?? []).find((p) => p.value === productValue);
        } catch {
          product = null;
        }
      }

      if (!product) {
        return row;
      }

      let { type, group, category, categoryGroup } = product;
      const itemGroup = product.itemGroup || product.type || type;

      if (itemGroup && (!type || !group || !category || !categoryGroup)) {
        try {
          const hierarchy = await dispatch(resolveAssetInItemGroupHierarchy(itemGroup)).unwrap();
          type = hierarchy.type || type || itemGroup;
          group = hierarchy.group || group;
          category = hierarchy.category || category;
          categoryGroup = hierarchy.categoryGroup || categoryGroup;
        } catch {
          // Keep whatever the product list already provided.
        }
      }

      return {
        ...row,
        name: product.name,
        code: product.code,
        brand: product.brand,
        type,
        group,
        category,
        categoryGroup: categoryGroup || '',
        image: product.image,
        productCode: product.value,
        isNew: false,
      };
    },
    [availableProducts, dispatch],
  );

  // Update a specific row field
  const handleUpdateRowField = useCallback(
    async (id, field, value) => {
      if (field === 'productSelect') {
        const currentRow = rowsRef.current.find((row) => row.id === id);
        if (!currentRow) return;

        const nextRow = await applyProductToRow(currentRow, value);
        setRows((current) => current.map((row) => (row.id === id ? nextRow : row)));
        return;
      }

      setRows((current) =>
        current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
      );
    },
    [applyProductToRow],
  );

  // Filter rows
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchSearch =
        row.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        row.code.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchBrand =
        selectedBrand === 'all' ||
        (row.brand && row.brand.toLowerCase() === selectedBrand.toLowerCase());
      const matchType =
        selectedType === 'all' ||
        (row.type && row.type.toLowerCase() === selectedType.toLowerCase());
      return matchSearch && matchBrand && matchType;
    });
  }, [rows, debouncedSearch, selectedBrand, selectedType]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: 'asc' };
    });
  };

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const aValue = a[sortConfig.key] ?? '';
      const bValue = b[sortConfig.key] ?? '';
      const comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredRows, sortConfig]);

  const hasFilledRows = rows.some((row) => row.name);

  // Unique brands & types for filters
  const uniqueBrands = useMemo(() => {
    const brands = new Set(rows.map((r) => r.brand).filter((b) => b && b !== '—'));
    return [...brands];
  }, [rows]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(rows.map((r) => r.type).filter((t) => t && t !== '—'));
    return [...types];
  }, [rows]);

  // Handle Mark as Completed click
  const handleComplete = () => {
    onMarkAsCompleted(transaction.id, rows);
  };

  const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

  // Handle Mock file upload
  const handleFileDrop = (e) => {
    e.preventDefault();
    const files = [...(e.dataTransfer?.files || e.target.files || [])];
    const accepted = [];

    files.forEach((file) => {
      if (file.size > MAX_UPLOAD_BYTES) {
        showErrorToast(`"${file.name}" exceeds the 50 MB limit.`);
        return;
      }
      accepted.push(file);
    });

    if (accepted.length === 0) return;

    const next = accepted.map((file) => ({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      id: Date.now() + Math.random(),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    setUploadedFiles((current) => [...current, ...next]);
  };

  const handleRemoveFile = (id) => {
    const file = uploadedFiles.find((f) => f.id === id);
    if (file?.preview) URL.revokeObjectURL(file.preview);
    setUploadedFiles(uploadedFiles.filter((f) => f.id !== id));
  };

  return (
    <div className='flex min-h-0 flex-1 flex-col bg-bg-white-0'>
      {/* Header Area */}
      <div className='border-b border-stroke-soft-200 bg-bg-white-0 px-8 py-6'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div className='flex min-w-0 flex-1 items-center gap-3'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={onBack}
              aria-label='Back to listing'
            >
              <Button.Icon as={RiArrowLeftLine} />
            </Button.Root>

            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2 flex-wrap'>
                <h1 className='text-title-h5 font-semibold text-text-strong-950'>
                  {transaction.centerName}
                </h1>

                {/* Status Badge */}
                <Badge.Root
                  size='small'
                  variant='light'
                  color={isDraft ? 'orange' : 'green'}
                  className='rounded-full'
                >
                  {transaction.status}
                </Badge.Root>

                {/* Sub info descriptors */}
                <span className='size-1 rounded-full bg-text-disabled-300 mx-1' />
                <div className='flex items-center gap-1.5 text-label-xs text-text-sub-500'>
                  <RiBuildingLine className='size-4 text-text-soft-400' />
                  <span>
                    {transaction.area} ({transaction.floor})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action button */}
          <Button.Root
            onClick={handleComplete}
            variant='primary'
            className='bg-primary-base hover:bg-primary-dark text-white border-0 gap-1.5'
            mode='filled'
            size='medium'
            disabled={
              !isDraft ||
              isCompleting ||
              rows.length === 0 ||
              rows.some((r) => !r.name || !r.qty || Number(r.qty) < 1)
            }
          >
            <RiCheckLine className='size-5' />
            {isCompleting ? 'Completing...' : 'Mark as Completed'}
          </Button.Root>
        </div>
      </div>

      {/* Tabs */}
      <TabMenuHorizontal.Root value={activeTab} onValueChange={setActiveTab}>
        <TabMenuHorizontal.List
          wrapperClassName='w-full shrink-0'
          className='h-auto min-h-12 gap-6 border-t-0 border-b border-stroke-soft-200 px-8 py-0'
        >
          <TabMenuHorizontal.Trigger
            value='asset'
            className='h-auto py-3.5 data-[state=active]:text-text-strong-950'
          >
            <TabMenuHorizontal.Icon as={RiBox3Line} />
            Asset
          </TabMenuHorizontal.Trigger>
          <TabMenuHorizontal.Trigger
            value='media'
            className='h-auto py-3.5 data-[state=active]:text-text-strong-950'
          >
            <TabMenuHorizontal.Icon as={RiImageLine} />
            Media
          </TabMenuHorizontal.Trigger>
          <TabMenuHorizontal.Trigger
            value='activity'
            className='h-auto py-3.5 data-[state=active]:text-text-strong-950'
          >
            <TabMenuHorizontal.Icon as={RiHistoryLine} />
            Activity
          </TabMenuHorizontal.Trigger>
        </TabMenuHorizontal.List>
      </TabMenuHorizontal.Root>

      {/* Tab Contents */}
      {activeTab === 'asset' && (
        <div className='flex min-h-0 flex-1 flex-col gap-5 px-6 py-5'>
          {/* Toolbar */}
          <div className='flex h-9 w-full min-w-0 items-center justify-between'>
            <div className='w-[276px] shrink-0'>
              <Input.Root size='small' className='rounded-lg'>
                <Input.Wrapper>
                  <Input.Icon as={RiSearchLine} />
                  <Input.Input
                    placeholder='Search here...'
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            <div className='flex shrink-0 items-center justify-end gap-3'>
              <div
                className={cn(
                  'flex items-center transition-opacity',
                  !hasFilledRows && 'pointer-events-none opacity-0',
                )}
              >
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='medium'
                  className='size-9 shrink-0 p-2 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
                  aria-label='Stack view'
                >
                  <Button.Icon as={RiStackLine} />
                </Button.Root>
              </div>

              <div className='w-[105px] shrink-0'>
                <Select.Root size='small' value={selectedBrand} onValueChange={setSelectedBrand}>
                  <Select.Trigger className='w-full rounded-lg'>
                    <Select.Value placeholder='All Brand' />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value='all'>All Brand</Select.Item>
                    {uniqueBrands.map((b) => (
                      <Select.Item key={b} value={b}>
                        {b}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>

              <div className='w-[154px] shrink-0'>
                <Select.Root size='small' value={selectedType} onValueChange={setSelectedType}>
                  <Select.Trigger className='w-full rounded-lg'>
                    <Select.Value placeholder='All Product Type' />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value='all'>All Product Type</Select.Item>
                    {uniqueTypes.map((t) => (
                      <Select.Item key={t} value={t}>
                        {t}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>

              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                onClick={() => setIsUploadOpen(true)}
                className='shrink-0 gap-1 px-2 font-medium text-text-sub-500 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
              >
                <Button.Icon as={RiUploadLine} />
                Upload Media
              </Button.Root>
            </div>
          </div>

          {/* Data Table */}
          <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
            <div className='overflow-x-auto'>
              <Table.Root
                variant='compact'
                className='w-full min-w-[1788px] [&_table]:table-fixed [&>div]:overflow-visible'
              >
                <Table.Header>
                  <Table.Row className={ASSET_TABLE_HEADER_ROW}>
                    <Table.Head className={ASSET_NAME_HEAD}>
                      <div className={NAME_CELL_GRID}>
                        <Checkbox.Root
                          checked={
                            rows.length > 0 && selectedRows.size === rows.length
                              ? true
                              : selectedRows.size > 0
                                ? 'indeterminate'
                                : false
                          }
                          onCheckedChange={toggleAll}
                          aria-label='Select all assets'
                        />
                        <div className='size-8 shrink-0' aria-hidden='true' />
                        <span className='text-paragraph-sm font-medium text-text-soft-400'>
                          Name
                        </span>
                      </div>
                    </Table.Head>
                    <Table.Head className={cn(ASSET_TABLE_HEAD, ASSET_COL.code)}>
                      <SortableColumnHeader
                        label='Product Code'
                        sortKey='code'
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    </Table.Head>
                    <Table.Head className={cn(ASSET_TABLE_HEAD, ASSET_COL.brand)}>
                      <SortableColumnHeader
                        label='Brand'
                        sortKey='brand'
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    </Table.Head>
                    <Table.Head className={cn(ASSET_TABLE_HEAD, ASSET_COL.qty)}>
                      <SortableColumnHeader
                        label='Qty.'
                        sortKey='qty'
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    </Table.Head>
                    <Table.Head className={cn(ASSET_TABLE_HEAD, ASSET_COL.rate)}>
                      <span className='text-paragraph-sm font-medium text-text-soft-400 whitespace-nowrap'>
                        Purchase Rate (₹)
                      </span>
                    </Table.Head>
                    <Table.Head className={cn(ASSET_TABLE_HEAD, ASSET_COL.purchaseDate)}>
                      <SortableColumnHeader
                        label='Purchase Date'
                        sortKey='purchaseDate'
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    </Table.Head>
                    <Table.Head className={cn(ASSET_TABLE_HEAD, ASSET_COL.availableForUseDate)}>
                      <SortableColumnHeader
                        label='Available for Use Date'
                        sortKey='availableForUseDate'
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    </Table.Head>
                    <Table.Head className={cn(ASSET_TABLE_HEAD, ASSET_COL.bill)}>
                      <span className='text-paragraph-sm font-medium text-text-soft-400 whitespace-nowrap'>
                        Associate Bill
                      </span>
                    </Table.Head>
                    <Table.Head className={cn(ASSET_TABLE_HEAD, ASSET_COL.categoryGroup)}>
                      <SortableColumnHeader
                        label='Category Group'
                        sortKey='categoryGroup'
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    </Table.Head>
                    <Table.Head className={cn(ASSET_TABLE_HEAD, ASSET_COL.category)}>
                      <SortableColumnHeader
                        label='Category Type'
                        sortKey='category'
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    </Table.Head>
                    <Table.Head className={cn(ASSET_TABLE_HEAD, ASSET_COL.group)}>
                      <SortableColumnHeader
                        label='Product Group'
                        sortKey='group'
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    </Table.Head>
                    <Table.Head className={cn(ASSET_TABLE_HEAD, ASSET_COL.type)}>
                      <SortableColumnHeader
                        label='Product Type'
                        sortKey='type'
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    </Table.Head>
                    {isDraft && (
                      <Table.Head className={ASSET_TABLE_ACTIONS_HEAD} aria-label='Actions' />
                    )}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {sortedRows.length === 0 ? (
                    <Table.Row className={cn(isDraft && 'border-b border-stroke-soft-200')}>
                      <Table.Cell
                        colSpan={isDraft ? 13 : 12}
                        className='text-center py-10 text-paragraph-sm text-text-sub-500'
                      >
                        No assets added to this transaction.
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    sortedRows.map((row, index) => {
                      const isNewRow = isDraft && !row.name;
                      const isLastRow = index === sortedRows.length - 1;
                      const imageUrl = row.image ? resolveFileUrl(row.image) : '';
                      return (
                        <Table.Row
                          key={row.id}
                          className={cn(ASSET_TABLE_ROW, isLastRow && 'border-b-0')}
                        >
                          <Table.Cell className={ASSET_NAME_CELL}>
                            <div className={NAME_CELL_GRID}>
                              <Checkbox.Root
                                checked={selectedRows.has(row.id)}
                                onCheckedChange={() => toggleRow(row.id)}
                                aria-label={`Select ${row.name || 'asset'}`}
                              />
                              <div
                                className={cn(
                                  'relative size-8 shrink-0 overflow-hidden rounded',
                                  !imageUrl && 'border border-stroke-soft-200 bg-bg-weak-100',
                                )}
                              >
                                {imageUrl ? (
                                  <img src={imageUrl} alt='' className='size-full object-cover' />
                                ) : (
                                  <RiImageLine className='absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-text-soft-400' />
                                )}
                              </div>
                              {isNewRow ? (
                                <div className={ASSET_SELECT_WRAPPER}>
                                  <AssetProductSelect
                                    value=''
                                    products={availableProducts}
                                    isLoading={isLoadingProducts}
                                    onValueChange={(val) =>
                                      handleUpdateRowField(row.id, 'productSelect', val)
                                    }
                                    className='min-w-0 w-full max-w-full'
                                  />
                                </div>
                              ) : (
                                <span className={ASSET_CELL_TEXT_STRONG}>{row.name}</span>
                              )}
                            </div>
                          </Table.Cell>
                          <Table.Cell
                            className={cn(ASSET_TABLE_DATA_CELL, ASSET_COL.code, '!pl-6')}
                          >
                            <span className={ASSET_CELL_TEXT}>{row.code || '—'}</span>
                          </Table.Cell>
                          <Table.Cell className={cn(ASSET_TABLE_DATA_CELL, ASSET_COL.brand)}>
                            {isNewRow ? (
                              <AssetTableSelect
                                value={row.brand}
                                options={BRAND_OPTIONS}
                                onValueChange={(val) => handleUpdateRowField(row.id, 'brand', val)}
                              />
                            ) : (
                              <span className={ASSET_CELL_TEXT}>{row.brand || '—'}</span>
                            )}
                          </Table.Cell>
                          <Table.Cell className={cn(ASSET_TABLE_DATA_CELL, ASSET_COL.qty)}>
                            {isDraft ? (
                              <input
                                type='text'
                                placeholder='Enter Qty.'
                                value={row.qty ?? ''}
                                onChange={(e) =>
                                  handleUpdateRowField(row.id, 'qty', e.target.value)
                                }
                                className={cn(
                                  BORDERLESS_INPUT,
                                  !row.qty && 'text-text-soft-400',
                                  row.qty && 'text-text-sub-500',
                                )}
                              />
                            ) : (
                              <span className={ASSET_CELL_TEXT}>{row.qty || '—'}</span>
                            )}
                          </Table.Cell>
                          <Table.Cell className={cn(ASSET_TABLE_DATA_CELL, ASSET_COL.rate)}>
                            {isDraft ? (
                              <input
                                type='text'
                                placeholder='Enter rate'
                                value={row.rate ?? ''}
                                onChange={(e) =>
                                  handleUpdateRowField(row.id, 'rate', e.target.value)
                                }
                                className={cn(
                                  BORDERLESS_INPUT,
                                  !row.rate && 'text-text-soft-400',
                                  row.rate && 'text-text-sub-500',
                                )}
                              />
                            ) : (
                              <span className={ASSET_CELL_TEXT}>
                                {row.rate ? `₹${row.rate}` : '—'}
                              </span>
                            )}
                          </Table.Cell>
                          <Table.Cell className={cn(ASSET_TABLE_DATA_CELL, ASSET_COL.purchaseDate)}>
                            {isDraft ? (
                              <AssetTableDatepicker
                                value={row.purchaseDate}
                                placeholder='Purchase date'
                                onChange={(val) =>
                                  handleUpdateRowField(row.id, 'purchaseDate', val)
                                }
                              />
                            ) : (
                              <span className={ASSET_CELL_TEXT}>
                                {formatAumDetailDateDisplay(row.purchaseDate) || '—'}
                              </span>
                            )}
                          </Table.Cell>
                          <Table.Cell
                            className={cn(ASSET_TABLE_DATA_CELL, ASSET_COL.availableForUseDate)}
                          >
                            {isDraft ? (
                              <AssetTableDatepicker
                                value={row.availableForUseDate}
                                placeholder='Available date'
                                onChange={(val) =>
                                  handleUpdateRowField(row.id, 'availableForUseDate', val)
                                }
                              />
                            ) : (
                              <span className={ASSET_CELL_TEXT}>
                                {formatAumDetailDateDisplay(row.availableForUseDate) || '—'}
                              </span>
                            )}
                          </Table.Cell>
                          <Table.Cell className={cn(ASSET_TABLE_DATA_CELL, ASSET_COL.bill)}>
                            {ASSET_IN_BILL_FIELD_ENABLED && isDraft ? (
                              <AssetTableSelect
                                value={row.bill}
                                options={BILL_OPTIONS}
                                onValueChange={(val) => handleUpdateRowField(row.id, 'bill', val)}
                              />
                            ) : (
                              <span
                                className={cn(
                                  ASSET_CELL_TEXT,
                                  !ASSET_IN_BILL_FIELD_ENABLED && 'text-text-soft-400',
                                )}
                              >
                                {ASSET_IN_BILL_FIELD_ENABLED ? row.bill || '—' : '—'}
                              </span>
                            )}
                          </Table.Cell>
                          <Table.Cell
                            className={cn(ASSET_TABLE_DATA_CELL, ASSET_COL.categoryGroup)}
                          >
                            <span className={ASSET_CELL_TEXT}>{row.categoryGroup || '—'}</span>
                          </Table.Cell>
                          <Table.Cell className={cn(ASSET_TABLE_DATA_CELL, ASSET_COL.category)}>
                            <span className={ASSET_CELL_TEXT}>{row.category || '—'}</span>
                          </Table.Cell>
                          <Table.Cell className={cn(ASSET_TABLE_DATA_CELL, ASSET_COL.group)}>
                            <span className={ASSET_CELL_TEXT}>{row.group || '—'}</span>
                          </Table.Cell>
                          <Table.Cell className={cn(ASSET_TABLE_DATA_CELL, ASSET_COL.type)}>
                            <span className={ASSET_CELL_TEXT}>{row.type || '—'}</span>
                          </Table.Cell>
                          {isDraft && (
                            <Table.Cell className={ASSET_TABLE_ACTIONS_CELL}>
                              <div className='flex items-center justify-center'>
                                <button
                                  type='button'
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteRow(row.id);
                                  }}
                                  className='flex size-6 items-center justify-center rounded-md text-text-soft-400 transition-colors hover:text-error-base'
                                  aria-label={`Delete ${row.name || 'asset'}`}
                                >
                                  <RiDeleteBin6Line className='size-5' />
                                </button>
                              </div>
                            </Table.Cell>
                          )}
                        </Table.Row>
                      );
                    })
                  )}
                  {isDraft && (
                    <Table.Row
                      className={cn(ASSET_TABLE_ADD_ROW, sortedRows.length === 0 && 'border-t-0')}
                    >
                      <Table.Cell colSpan={13} className='p-0 align-middle'>
                        <button
                          type='button'
                          onClick={handleAddRow}
                          className='flex h-12 w-full items-center py-3 pl-3 pr-3 text-left transition-colors hover:bg-bg-weak-100'
                        >
                          <div className={NAME_CELL_GRID}>
                            <span className='flex size-5 items-center justify-center'>
                              <span className='flex size-7 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'>
                                <RiAddLine className='size-4 text-text-sub-500' />
                              </span>
                            </span>
                            <div className='size-8 shrink-0' aria-hidden='true' />
                            <span className='text-paragraph-sm text-text-sub-500'>Add Asset</span>
                          </div>
                        </button>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </div>
          </div>
        </div>
      )}

      {/* Media Tab */}
      {activeTab === 'media' && (
        <div className='flex min-h-0 flex-1 flex-col px-6 py-5'>
          {displayMediaFiles.length === 0 ? (
            <div className='flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center'>
              <div className='flex size-12 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-weak-100'>
                <RiImageLine className='size-6 text-text-soft-400' />
              </div>
              <div className='space-y-1'>
                <p className='text-paragraph-sm font-medium text-text-strong-950'>
                  No media uploaded yet
                </p>
                <p className='text-paragraph-sm text-text-sub-500'>
                  {isDraft
                    ? 'Upload area photos from the Asset tab to attach media to this entry.'
                    : 'Media attached to this asset entry will appear here.'}
                </p>
              </div>
              {isDraft ? (
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='small'
                  onClick={() => setIsUploadOpen(true)}
                  className='gap-1 font-medium text-text-sub-500 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
                >
                  <Button.Icon as={RiUploadLine} />
                  Upload Media
                </Button.Root>
              ) : null}
            </div>
          ) : (
            <div className='flex flex-wrap gap-3'>
              {displayMediaFiles.map((file) => (
                <div key={file.id} className='relative size-[176px] shrink-0'>
                  <div className='relative flex size-full items-center justify-center overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-weak-100 shadow-regular-xs'>
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className='max-h-full max-w-full object-contain'
                      />
                    ) : (
                      <RiImageLine className='size-6 shrink-0 text-text-soft-400' />
                    )}
                    {!file.fromApi && (
                      <button
                        type='button'
                        onClick={() => handleRemoveFile(file.id)}
                        className='absolute right-0 top-0 flex size-5 items-center justify-center rounded-md border border-stroke-soft-200 bg-bg-white-0 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] text-text-soft-400 hover:text-error-base'
                        aria-label={`Remove ${file.name}`}
                      >
                        <RiCloseLine className='size-[18px]' />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-white-0'>
          <AssetInActivityPanel
            history={activityHistory}
            isLoading={isLoadingActivity}
            error={activityError}
            onRetry={loadActivity}
          />
        </div>
      )}

      {/* Upload Media Dialog */}
      <Modal.Root open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <Modal.Content className='max-w-[440px] rounded-[20px] shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'>
          <Modal.Header className='items-center gap-4 px-8 py-5 before:border-stroke-soft-200'>
            <div className='flex size-11 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 p-2.5'>
              <RiImageLine className='size-6 text-text-sub-600' />
            </div>
            <div className='min-w-0 flex-1 space-y-1'>
              <Modal.Title className='text-lg font-medium leading-6 tracking-[-0.27px] text-text-strong-950'>
                Upload Media
              </Modal.Title>
              <Modal.Description className='text-paragraph-sm text-text-sub-500'>
                Upload area photos or videos to fetch assets from it.
              </Modal.Description>
            </div>
          </Modal.Header>

          <Modal.Body className='flex flex-col gap-4 px-8 py-6'>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className='flex flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-stroke-sub-300 p-8 text-center'
            >
              <RiUploadCloud2Line className='size-6 text-text-soft-400' />
              <div className='flex w-full flex-col gap-1'>
                <p className='text-paragraph-sm font-medium text-text-strong-950'>
                  Choose a file or drag &amp; drop it here.
                </p>
                <p className='text-paragraph-xs text-text-soft-400'>
                  {uploadedFiles.length > 0
                    ? 'JPEG, PNG formats, up to 50 MB.'
                    : 'JPEG, PNG, MP4 formats, up to 50 MB.'}
                </p>
              </div>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                onClick={() => fileInputRef.current?.click()}
                className='px-4 py-1.5 font-medium text-text-sub-500 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
              >
                Browse File
              </Button.Root>
              <input
                ref={fileInputRef}
                type='file'
                multiple
                accept='image/jpeg,image/png,image/jpg,video/mp4'
                onChange={handleFileDrop}
                className='hidden'
              />
            </div>

            {uploadedFiles.length > 0 && (
              <div className='flex flex-wrap gap-1.5'>
                {uploadedFiles.map((file) => (
                  <div key={file.id} className='relative size-[82px] shrink-0'>
                    <div className='absolute left-0 top-1.5 flex size-[76px] items-center justify-center overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-weak-100 shadow-regular-xs'>
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className='size-full object-cover'
                        />
                      ) : (
                        <RiImageLine className='size-5 text-text-soft-400' />
                      )}
                    </div>
                    <CompactButton.Root
                      type='button'
                      variant='stroke'
                      size='medium'
                      onClick={() => handleRemoveFile(file.id)}
                      className='absolute right-0 top-0 size-5 rounded-md p-px shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
                      aria-label={`Remove ${file.name}`}
                    >
                      <CompactButton.Icon as={RiCloseLine} className='size-[18px]' />
                    </CompactButton.Root>
                  </div>
                ))}
              </div>
            )}
          </Modal.Body>

          <Modal.Footer className='gap-3 px-8 py-6'>
            <Modal.Close asChild>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                className='min-w-0 flex-1 p-2 font-medium text-text-sub-500 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
              >
                Cancel
              </Button.Root>
            </Modal.Close>
            <Button.Root
              onClick={() => {
                setIsUploadOpen(false);
                setActiveTab('media');
              }}
              variant='primary'
              mode='filled'
              size='small'
              className='min-w-0 flex-1 p-2 font-medium shadow-[0px_1px_2px_0px_rgba(55,93,251,0.08)]'
              disabled={uploadedFiles.length === 0}
            >
              Analyse
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
}
