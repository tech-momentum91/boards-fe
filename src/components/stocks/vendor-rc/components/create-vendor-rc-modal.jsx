import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiCloseLine, RiFileTextLine } from 'react-icons/ri';

import { createEmptyVendorRcLineItem } from '@/components/stocks/constants';
import VendorRcAddForm from '@/components/stocks/vendor-rc/components/vendor-rc-add-form';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import {
  fetchStockRuleCategoryItems,
  fetchVendorRcCenters,
  fetchVendorRcSuppliers,
  mapCategoryItemToVendorRcDraftRow,
  selectStockRulesCategoryItemsState,
  selectVendorRcCentersState,
  selectVendorRcSaveState,
  selectVendorRcVendorsState,
} from '@/redux/stocksSlice';

const countFilledLineItems = (items) =>
  items.reduce(
    (accumulator, row) => accumulator + (String(row.itemCode || row.product || '').trim() ? 1 : 0),
    0,
  );

const CreateVendorRcModal = ({ open, onOpenChange, onSubmit, categoryOptions = [] }) => {
  const dispatch = useDispatch();
  const vendorsState = useSelector(selectVendorRcVendorsState);
  const centersState = useSelector(selectVendorRcCentersState);
  const categoryItemsState = useSelector(selectStockRulesCategoryItemsState);
  const saveState = useSelector(selectVendorRcSaveState);

  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('');
  const [centers, setCenters] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [lineItems, setLineItems] = useState(() => [createEmptyVendorRcLineItem()]);
  const [contractFiles, setContractFiles] = useState([]);
  const [notes, setNotes] = useState('');

  const vendorOptions = useMemo(
    () => (Array.isArray(vendorsState.items) ? vendorsState.items : []),
    [vendorsState.items],
  );

  const centerOptions = useMemo(
    () => (Array.isArray(centersState.items) ? centersState.items : []),
    [centersState.items],
  );

  const handleReset = useCallback(() => {
    setVendor('');
    setCategory('');
    setCenters([]);
    setStartDate('');
    setEndDate('');
    setLineItems([createEmptyVendorRcLineItem()]);
    setContractFiles([]);
    setNotes('');
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      if (!nextOpen) handleReset();
      onOpenChange(nextOpen);
    },
    [onOpenChange, handleReset],
  );

  useEffect(() => {
    if (!open) return;
    if (vendorsState.status === 'idle') {
      dispatch(fetchVendorRcSuppliers());
    }
    if (centersState.status === 'idle') {
      dispatch(fetchVendorRcCenters());
    }
  }, [open, dispatch, vendorsState.status, centersState.status]);

  const handleCategoryChange = useCallback(
    (value) => {
      setCategory(value);
      setLineItems([]);
      if (!value) return;
      dispatch(fetchStockRuleCategoryItems(value))
        .unwrap()
        .then((result) => {
          const items = Array.isArray(result?.items) ? result.items : [];
          setLineItems(
            items.length > 0
              ? items.map((item) => mapCategoryItemToVendorRcDraftRow(item))
              : [createEmptyVendorRcLineItem()],
          );
        })
        .catch(() => {
          setLineItems([createEmptyVendorRcLineItem()]);
        });
    },
    [dispatch],
  );

  const handleCentersChange = useCallback((nextCenters) => {
    setCenters(nextCenters);
  }, []);

  const handleContractFilesAppend = useCallback((files) => {
    const list = [...(files || [])].filter(Boolean);
    if (list.length === 0) return;
    setContractFiles((previous) => [
      ...previous,
      ...list.map((file) => ({
        id: `vrc-file-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        name: file.name,
        file,
      })),
    ]);
  }, []);

  const handleContractFileRemove = useCallback((fileId) => {
    setContractFiles((previous) => previous.filter((item) => item.id !== fileId));
  }, []);

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

  const isLoadingProducts =
    categoryItemsState.isLoading && categoryItemsState.itemGroup === category;

  const productsError =
    categoryItemsState.status === 'failed' && categoryItemsState.itemGroup === category
      ? categoryItemsState.error
      : null;

  const canSubmit = useMemo(() => {
    const filled = countFilledLineItems(lineItems);
    return (
      Boolean(vendor) &&
      Boolean(category) &&
      centers.length > 0 &&
      Boolean(startDate) &&
      Boolean(endDate) &&
      filled > 0 &&
      !saveState.isLoading
    );
  }, [vendor, category, centers, startDate, endDate, lineItems, saveState.isLoading]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    try {
      await onSubmit?.({
        supplier: vendor,
        category,
        centers,
        startDate,
        endDate,
        lineItems,
        notes,
        contractFiles,
      });
      handleOpenChange(false);
    } catch {
      // Parent shows error toast; keep modal open.
    }
  }, [
    canSubmit,
    vendor,
    category,
    centers,
    startDate,
    endDate,
    lineItems,
    notes,
    onSubmit,
    handleOpenChange,
  ]);

  const handleAddLineItem = useCallback(() => {
    setLineItems((previous) => [...previous, createEmptyVendorRcLineItem()]);
  }, []);

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content
        showClose={false}
        className='flex max-h-[min(90vh,calc(100vh-32px))] max-w-[min(1024px,calc(100vw-16px))] flex-col overflow-hidden p-0'
      >
        <div className='sticky top-0 z-10 flex shrink-0 flex-col items-stretch border-b border-stroke-soft-200 bg-bg-white-0 px-8 py-5'>
          <div className='flex w-full items-start justify-between gap-4'>
            <div className='flex min-w-0 flex-1 items-start gap-4'>
              <div className='mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 text-text-sub-600'>
                <RiFileTextLine className='size-6' />
              </div>
              <div className='flex min-w-0 flex-col gap-1'>
                <Modal.Title className='text-[18px] font-medium leading-6 tracking-tight text-text-main-900'>
                  Add Vendor Rate Contract
                </Modal.Title>
                <Modal.Description className='paragraph-small text-text-sub-600'>
                  Enter below details to add new vendor rate contract.
                </Modal.Description>
              </div>
            </div>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              onClick={() => handleOpenChange(false)}
            >
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </div>

        <Modal.Body className='min-h-0 flex-1 overflow-y-auto px-8 py-6'>
          <VendorRcAddForm
            vendor={vendor}
            onVendorChange={setVendor}
            vendorOptions={vendorOptions}
            vendorsLoading={vendorsState.isLoading}
            category={category}
            onCategoryChange={handleCategoryChange}
            categoryOptions={categoryOptions}
            centers={centers}
            onCentersChange={handleCentersChange}
            centerOptions={centerOptions}
            centersLoading={centersState.isLoading}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            lineItems={lineItems}
            onLineItemsChange={setLineItems}
            onAddLineItem={handleAddLineItem}
            productOptions={categoryProductOptions}
            isLoadingProducts={isLoadingProducts}
            productsError={productsError}
            contractFiles={contractFiles}
            onContractFilesAppend={handleContractFilesAppend}
            onContractFileRemove={handleContractFileRemove}
            notes={notes}
            onNotesChange={setNotes}
          />
        </Modal.Body>

        <Modal.Footer className='mt-auto shrink-0 justify-end gap-3 border-t border-stroke-soft-200 bg-bg-white-0 px-8 py-5'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            onClick={() => handleOpenChange(false)}
            disabled={saveState.isLoading}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            className='px-5 '
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {saveState.isLoading ? 'Saving…' : 'Add'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CreateVendorRcModal;
