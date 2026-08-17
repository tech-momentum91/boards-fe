import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiAddLine,
  RiBuilding4Line,
  RiCalendarLine,
  RiCloseLine,
  RiFileListLine,
  RiFileUploadLine,
  RiHistoryLine,
  RiListCheck2,
  RiMedalLine,
  RiPriceTag3Line,
  RiStickyNoteLine,
} from 'react-icons/ri';

import {
  formatVendorRcDateDisplay,
  vendorRcDateToIso,
  vendorRcIsoToDate,
} from '@/components/stocks/stocks-helper';
import { createEmptyVendorRcLineItem } from '@/components/stocks/constants';
import VendorRcLineItemsTable from '@/components/stocks/vendor-rc/components/vendor-rc-line-items-table';
import AttachmentList from '@/components/ui/attachment-list';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import { Datepicker } from '@/components/ui/datepicker';
import * as Drawer from '@/components/ui/drawer';
import FieldRow from '@/components/ui/field-row';
import { MultiSelect } from '@/components/ui/multi-select';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as Textarea from '@/components/ui/textarea';
import StocksActivityPanel from '@/components/stocks/shared/stocks-activity-panel';
import {
  clearStocksDocumentActivity,
  fetchStockRuleCategoryItems,
  fetchStocksDocumentActivity,
  fetchVendorRcCenters,
  selectStockRulesCategoryItemsState,
  selectStocksDocumentActivity,
  selectVendorRcCentersState,
} from '@/redux/stocksSlice';
import { resolveFileUrl } from '@/lib/utils';
import { showSuccessToast } from '@/utils/error-utils';

const TAB_RC = 'rc-rates';
const TAB_ACTIVITY = 'activity';
const FIELD_DEBOUNCE_MS = 600;
const DEBOUNCED_FIELDS = new Set(['notes']);

function getVendorRcContractFileLabel(path) {
  if (!path || typeof path !== 'string') return 'Contract document';
  const name = path.split('/').pop() || path;
  try {
    return decodeURIComponent(name) || name;
  } catch {
    return name;
  }
}

function getFieldValue(row, localChanges, fieldName) {
  if (localChanges[fieldName] !== undefined && localChanges[fieldName] !== null) {
    return localChanges[fieldName];
  }
  if (row?.[fieldName] !== undefined && row?.[fieldName] !== null && row?.[fieldName] !== '') {
    return row[fieldName];
  }
  if (fieldName === 'centerIds') return [];
  if (fieldName === 'lineItems') return [];
  return '';
}

function normalizeForCompare(fieldName, value) {
  if (fieldName === 'centerIds' || fieldName === 'lineItems') {
    return JSON.stringify(value ?? (fieldName === 'centerIds' ? [] : []));
  }
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

const ViewVendorRcDrawer = ({
  open,
  onOpenChange,
  row,
  isLoading = false,
  error = null,
  onUpdateVendor,
  onUploadContractDocument,
  onRemoveContractDocument,
  isUploadingContractDocument = false,
}) => {
  const dispatch = useDispatch();
  const contractFileInputRef = useRef(null);
  const centersState = useSelector(selectVendorRcCentersState);
  const categoryItemsState = useSelector(selectStockRulesCategoryItemsState);

  const updateQueueRef = useRef(Promise.resolve());
  const previousContractIdRef = useRef(null);
  const debounceTimersRef = useRef({});
  const pendingDebouncedRef = useRef({});

  const [activeTab, setActiveTab] = useState(TAB_RC);
  const [localChanges, setLocalChanges] = useState({});

  const contractId = row?.id ?? row?.name;
  const activityState = useSelector(selectStocksDocumentActivity('vendorRc'));

  const handleClose = () => onOpenChange(false);

  useEffect(() => {
    if (!open || activeTab !== TAB_ACTIVITY || !contractId) return;
    dispatch(fetchStocksDocumentActivity({ scope: 'vendorRc', name: contractId }));
  }, [dispatch, open, activeTab, contractId]);

  useEffect(() => {
    if (!open) dispatch(clearStocksDocumentActivity('vendorRc'));
  }, [dispatch, open]);

  const centerOptions = useMemo(
    () => (Array.isArray(centersState.items) ? centersState.items : []),
    [centersState.items],
  );

  const category = getFieldValue(row, localChanges, 'category');

  useEffect(() => {
    if (!open) return;
    if (centersState.status === 'idle') {
      dispatch(fetchVendorRcCenters());
    }
  }, [open, dispatch, centersState.status]);

  useEffect(() => {
    if (!open || !category) return;
    if (categoryItemsState.itemGroup !== category && !categoryItemsState.isLoading) {
      dispatch(fetchStockRuleCategoryItems(category));
    }
  }, [open, category, dispatch, categoryItemsState.itemGroup, categoryItemsState.isLoading]);

  const categoryProductOptions = useMemo(() => {
    if (!category || categoryItemsState.itemGroup !== category) return [];
    return (categoryItemsState.items || []).map((item) => {
      const value = item.name ?? item.item_code ?? '';
      return {
        value,
        label: item.item_name || item.name || item.item_code || value,
      };
    });
  }, [category, categoryItemsState.itemGroup, categoryItemsState.items]);

  const getOriginalFieldValue = useCallback(
    (fieldName) => getFieldValue(row, {}, fieldName),
    [row],
  );

  const persistUpdate = useCallback(
    (updates) => {
      if (!contractId || !onUpdateVendor) return Promise.resolve();
      return Promise.resolve(onUpdateVendor(contractId, updates)).then((result) => {
        if (activeTab === TAB_ACTIVITY) {
          dispatch(fetchStocksDocumentActivity({ scope: 'vendorRc', name: contractId }));
        }
        return result;
      });
    },
    [contractId, onUpdateVendor, activeTab, dispatch],
  );

  const clearDebouncedField = useCallback((fieldName) => {
    if (debounceTimersRef.current[fieldName]) {
      window.clearTimeout(debounceTimersRef.current[fieldName]);
      delete debounceTimersRef.current[fieldName];
    }
    delete pendingDebouncedRef.current[fieldName];
  }, []);

  const flushDebouncedField = useCallback(
    (fieldName) => {
      if (debounceTimersRef.current[fieldName]) {
        window.clearTimeout(debounceTimersRef.current[fieldName]);
        delete debounceTimersRef.current[fieldName];
      }

      const value = pendingDebouncedRef.current[fieldName];
      if (value === undefined) return;
      delete pendingDebouncedRef.current[fieldName];

      const currentValue = getOriginalFieldValue(fieldName);
      if (normalizeForCompare(fieldName, currentValue) === normalizeForCompare(fieldName, value)) {
        return;
      }

      updateQueueRef.current = updateQueueRef.current
        .catch(() => {})
        .then(() => persistUpdate({ [fieldName]: value }));
    },
    [getOriginalFieldValue, persistUpdate],
  );

  const scheduleDebouncedPersist = useCallback(
    (fieldName, value) => {
      pendingDebouncedRef.current[fieldName] = value;
      if (debounceTimersRef.current[fieldName]) {
        window.clearTimeout(debounceTimersRef.current[fieldName]);
      }
      debounceTimersRef.current[fieldName] = window.setTimeout(() => {
        delete debounceTimersRef.current[fieldName];
        flushDebouncedField(fieldName);
      }, FIELD_DEBOUNCE_MS);
    },
    [flushDebouncedField],
  );

  const handleFieldChange = useCallback(
    (fieldName, value, { immediate = false, toast, persist = true } = {}) => {
      if (!contractId || !onUpdateVendor) return;

      const currentValue = getOriginalFieldValue(fieldName);
      if (normalizeForCompare(fieldName, currentValue) === normalizeForCompare(fieldName, value)) {
        // Matches server again (e.g. delete a newly added empty line) — clear local override.
        setLocalChanges((previous) => {
          if (previous[fieldName] === undefined) return previous;
          const next = { ...previous };
          delete next[fieldName];
          return next;
        });
        clearDebouncedField(fieldName);
        return;
      }

      setLocalChanges((previous) => ({
        ...previous,
        [fieldName]: value,
      }));

      // Local-only update (e.g. typing); API runs on blur via persist: true.
      if (!persist) {
        return;
      }

      if (!immediate && DEBOUNCED_FIELDS.has(fieldName)) {
        scheduleDebouncedPersist(fieldName, value);
        return;
      }

      clearDebouncedField(fieldName);

      updateQueueRef.current = updateQueueRef.current
        .catch(() => {})
        .then(() =>
          persistUpdate({ [fieldName]: value }).then(() => {
            if (toast) showSuccessToast(toast);
          }),
        );
    },
    [
      contractId,
      onUpdateVendor,
      getOriginalFieldValue,
      persistUpdate,
      scheduleDebouncedPersist,
      clearDebouncedField,
    ],
  );

  useEffect(() => {
    if (!open) {
      Object.keys(pendingDebouncedRef.current).forEach((fieldName) => {
        flushDebouncedField(fieldName);
      });
      setLocalChanges({});
      updateQueueRef.current = Promise.resolve();
      previousContractIdRef.current = null;
      debounceTimersRef.current = {};
      pendingDebouncedRef.current = {};
      return;
    }

    if (previousContractIdRef.current !== contractId) {
      previousContractIdRef.current = contractId;
      setLocalChanges({});
      updateQueueRef.current = Promise.resolve();
      debounceTimersRef.current = {};
      pendingDebouncedRef.current = {};
      setActiveTab(TAB_RC);
    }
  }, [open, contractId, flushDebouncedField]);

  const centerIds = getFieldValue(row, localChanges, 'centerIds');
  const lineItems = getFieldValue(row, localChanges, 'lineItems');
  const notes = getFieldValue(row, localChanges, 'notes');
  const startDate = getFieldValue(row, localChanges, 'startDate');
  const endDate = getFieldValue(row, localChanges, 'endDate');
  const status = row?.status || '';

  const handleAddLineItem = useCallback(() => {
    setLocalChanges((previous) => {
      const current =
        previous.lineItems !== undefined && previous.lineItems !== null
          ? previous.lineItems
          : Array.isArray(row?.lineItems)
            ? row.lineItems
            : [];
      return {
        ...previous,
        lineItems: [...current, createEmptyVendorRcLineItem()],
      };
    });
  }, [row?.lineItems]);

  const contractAttachments = useMemo(() => {
    const path = row?.custom_document;
    if (!path || typeof path !== 'string') return [];
    return [
      {
        id: path,
        fileName: getVendorRcContractFileLabel(path),
        fileUrl: resolveFileUrl(path),
        size: 0,
      },
    ];
  }, [row?.custom_document]);

  const hasContractDocument = contractAttachments.length > 0;

  const handleContractUploadClick = useCallback(() => {
    contractFileInputRef.current?.click();
  }, []);

  const handleContractFilesSelected = useCallback(
    async (event) => {
      const input = event.target;
      const files = [...(input.files || [])].filter(Boolean);
      if (files.length === 0 || !onUploadContractDocument) {
        if (input) input.value = '';
        return;
      }
      try {
        await onUploadContractDocument(files);
      } finally {
        if (input) input.value = '';
      }
    },
    [onUploadContractDocument],
  );

  const handleContractDocumentRemove = useCallback(async () => {
    if (!onRemoveContractDocument) return;
    await onRemoveContractDocument();
  }, [onRemoveContractDocument]);

  if (!open) return null;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='max-w-[1200px]'>
        <div className='flex h-full max-h-[100dvh] min-h-0 flex-col'>
          <Drawer.Header
            className='sticky top-0 z-10 shrink-0 border-b border-stroke-soft-200 bg-bg-white-0 px-6 py-3'
            showCloseButton={false}
          >
            <div className='flex w-full items-center justify-end gap-4'>
              {/* <div className='flex items-center gap-1'>
                <Button.Root type='button' variant='neutral' mode='stroke' size='xsmall' onClick={handleClose}>
                  <Button.Icon as={RiArrowLeftSLine} />
                </Button.Root>
                <Button.Root type='button' variant='neutral' mode='stroke' size='xsmall' disabled>
                  <Button.Icon as={RiArrowRightSLine} />
                </Button.Root>
              </div> */}
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='xsmall'
                onClick={handleClose}
              >
                <Button.Icon as={RiCloseLine} />
              </Button.Root>
            </div>
          </Drawer.Header>
          {isLoading ? (
            <div className='flex flex-1 items-center justify-center p-8'>
              <span className='paragraph-small text-text-sub-600'>Loading contract…</span>
            </div>
          ) : error ? (
            <div className='flex flex-1 items-center justify-center p-8'>
              <span className='paragraph-small text-red-600'>{error}</span>
            </div>
          ) : !row ? null : (
            <div className='flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row'>
              <aside className='flex w-full shrink-0 flex-col overflow-y-auto border-stroke-soft-200 px-6 py-5 lg:w-[422px] lg:border-r'>
                <h2 className='text-title-h6 text-text-strong-950'>{row.vendor || 'Vendor'}</h2>
                <p className='mt-1 text-paragraph-sm text-text-sub-600'>Vendor rate contract</p>
                <div className='mt-6  rounded-xl shrink-0 border border-stroke-soft-200 bg-bg-white-0'>
                  <div className='divide-y divide-stroke-soft-200'>
                    <FieldRow icon={RiMedalLine} label='Status' className='bg-[#F6F8FA]'>
                      <Badge.Root size='small' variant='light' color='gray'>
                        {status || '--'}
                      </Badge.Root>
                    </FieldRow>
                    <FieldRow
                      icon={RiPriceTag3Line}
                      label='Category'
                      required
                      className='bg-[#F6F8FA]'
                    >
                      <span className='text-paragraph-sm px-2 text-text-sub-500'>{category}</span>
                    </FieldRow>
                    <FieldRow
                      icon={RiBuilding4Line}
                      label='Center'
                      required
                      alignTop
                      className='bg-[#F6F8FA]'
                    >
                      <MultiSelect
                        options={centerOptions}
                        value={Array.isArray(centerIds) ? centerIds : []}
                        onValueChange={(values) => handleFieldChange('centerIds', values)}
                        placeholder='Select centers'
                        size='xsmall'
                        variant='borderless'
                        disabled={centersState.isLoading}
                      />
                    </FieldRow>
                    <FieldRow
                      icon={RiCalendarLine}
                      label='Start date'
                      required
                      className='bg-[#F6F8FA]'
                    >
                      <Datepicker
                        value={vendorRcIsoToDate(startDate)}
                        onChange={(date) => handleFieldChange('startDate', vendorRcDateToIso(date))}
                        placeholder='Select start date'
                        size='xsmall'
                        variant='borderless'
                        formatDate={(date) => formatVendorRcDateDisplay(vendorRcDateToIso(date))}
                      />
                    </FieldRow>
                    <FieldRow
                      icon={RiCalendarLine}
                      label='End date'
                      required
                      className='bg-[#F6F8FA]'
                    >
                      <Datepicker
                        value={vendorRcIsoToDate(endDate)}
                        onChange={(date) => handleFieldChange('endDate', vendorRcDateToIso(date))}
                        placeholder='Select end date'
                        size='xsmall'
                        variant='borderless'
                        min={vendorRcIsoToDate(startDate)}
                        formatDate={(date) => formatVendorRcDateDisplay(vendorRcDateToIso(date))}
                      />
                    </FieldRow>
                  </div>
                </div>
                <div className='mt-6 flex flex-col gap-2'>
                  <div className='flex items-center gap-2 text-label-sm text-text-main-900'>
                    <RiStickyNoteLine className='size-4 text-text-sub-600' />
                    Notes
                  </div>
                  <Textarea.Root
                    value={notes || ''}
                    onChange={(event) =>
                      handleFieldChange('notes', event.target.value, { persist: false })
                    }
                    onBlur={(event) =>
                      handleFieldChange('notes', event.target.value, { immediate: true })
                    }
                    placeholder='Add or edit notes…'
                    rows={4}
                    containerClassName='min-h-[100px]'
                  />
                </div>
                <div className='mb-5 mt-3 flex flex-col gap-2'>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex min-w-0 items-center gap-2'>
                      <RiFileListLine className='shrink-0 text-text-sub-500' size={20} />
                      <span className='label-medium text-text-sub-500'>Rate contract</span>
                    </div>
                    {onUploadContractDocument ? (
                      <Button.Root
                        variant='neutral'
                        mode='stroke'
                        size='xsmall'
                        className='shrink-0 gap-2'
                        type='button'
                        onClick={handleContractUploadClick}
                        disabled={isLoading || isUploadingContractDocument}
                      >
                        <Button.Icon as={RiFileUploadLine} />
                        <span className='text-label-sm'>
                          {isUploadingContractDocument ? 'Uploading…' : 'Upload files'}
                        </span>
                      </Button.Root>
                    ) : null}
                  </div>
                  {onUploadContractDocument ? (
                    <input
                      ref={contractFileInputRef}
                      type='file'
                      accept='*'
                      multiple={false}
                      className='hidden'
                      onChange={handleContractFilesSelected}
                    />
                  ) : null}

                  {hasContractDocument ? (
                    <AttachmentList
                      attachments={contractAttachments}
                      onRemove={onRemoveContractDocument ? handleContractDocumentRemove : undefined}
                      disabled={isLoading || isUploadingContractDocument}
                      emptyStateMessage='No contract document yet.'
                      emptyStateDescription=''
                    />
                  ) : (
                    <div className='rounded-xl border border-dashed border-stroke-soft-200 bg-bg-white-0 px-5 py-4'>
                      <p className='text-paragraph-sm text-text-sub-600'>
                        No contract document attached.
                      </p>
                    </div>
                  )}
                </div>
              </aside>
              <main className='flex min-h-0 min-w-0 flex-1 flex-col'>
                <TabMenuHorizontal.Root
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className='flex min-h-0 flex-1 flex-col'
                >
                  <TabMenuHorizontal.List
                    wrapperClassName='w-full shrink-0'
                    className='h-auto min-h-12 gap-6 border-b border-stroke-soft-200 px-6 py-3'
                  >
                    <TabMenuHorizontal.Trigger
                      value={TAB_RC}
                      className='h-auto gap-1.5 py-0 data-[state=active]:text-text-strong-950'
                    >
                      <TabMenuHorizontal.Icon as={RiListCheck2} />
                      RC rates
                    </TabMenuHorizontal.Trigger>
                    <TabMenuHorizontal.Trigger
                      value={TAB_ACTIVITY}
                      className='h-auto gap-1.5 py-0 data-[state=active]:text-text-strong-950'
                    >
                      <TabMenuHorizontal.Icon as={RiHistoryLine} />
                      Activity
                    </TabMenuHorizontal.Trigger>
                  </TabMenuHorizontal.List>
                  <TabMenuHorizontal.Content
                    value={TAB_RC}
                    className='flex min-h-0 flex-1 flex-col overflow-hidden'
                  >
                    <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6'>
                      <div className='flex items-center justify-between gap-3'>
                        <p className='text-label-md font-medium text-text-sub-500'>
                          Product Line Items
                        </p>
                        <Button.Root
                          type='button'
                          variant='neutral'
                          mode='stroke'
                          size='small'
                          className='gap-2'
                          onClick={handleAddLineItem}
                          disabled={isLoading || !category}
                        >
                          <Button.Icon as={RiAddLine} className='!mx-0' />
                          <span>Add</span>
                        </Button.Root>
                      </div>
                      <VendorRcLineItemsTable
                        lineItems={lineItems}
                        onChange={(next, options) => handleFieldChange('lineItems', next, options)}
                        productOptions={categoryProductOptions}
                      />
                    </div>
                  </TabMenuHorizontal.Content>
                  <TabMenuHorizontal.Content
                    value={TAB_ACTIVITY}
                    className='flex min-h-0 flex-1 flex-col overflow-hidden'
                  >
                    <StocksActivityPanel
                      activity={activityState.items}
                      isLoading={activityState.isLoading}
                      error={activityState.error}
                      onRetry={() =>
                        contractId &&
                        dispatch(
                          fetchStocksDocumentActivity({ scope: 'vendorRc', name: contractId }),
                        )
                      }
                    />
                  </TabMenuHorizontal.Content>
                </TabMenuHorizontal.Root>
              </main>
            </div>
          )}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default ViewVendorRcDrawer;
