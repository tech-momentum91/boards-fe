import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiCloseLine, RiInformationLine } from 'react-icons/ri';

import { createEmptyStockRuleDraftRow } from '@/components/stocks/constants';
import StockRulesAddForm from '@/components/stocks/stock-rules/components/stock-rules-add-form';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';
import {
  buildSaveStockRulesPayload,
  fetchStockRuleCategoryItems,
  mapCategoryItemToStockRuleDraftRow,
  selectStockRulesCategoryItemsState,
  selectStockRulesSaveState,
} from '@/redux/stocksSlice';

const CreateStockRuleModal = ({ open, onOpenChange, onSubmit, categoryOptions = [] }) => {
  const dispatch = useDispatch();
  const centerAccess = useSelector(selectCenterAccess);
  const categoryItemsState = useSelector(selectStockRulesCategoryItemsState);
  const saveState = useSelector(selectStockRulesSaveState);

  const [centers, setCenters] = useState([]);
  const [category, setCategory] = useState('');
  const [ruleRows, setRuleRows] = useState([]);
  const [notes, setNotes] = useState('');

  const centerOptions = useMemo(() => {
    const list = Array.isArray(centerAccess.data) ? centerAccess.data : [];
    return list.map((center) => ({
      value: center.name,
      label: center.center_name || center.name,
    }));
  }, [centerAccess.data]);

  const handleReset = useCallback(() => {
    setCenters([]);
    setCategory('');
    setRuleRows([]);
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
    if (centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess());
    }
  }, [open, dispatch, centerAccess.status]);

  const handleCategoryChange = useCallback(
    (value) => {
      setCategory(value);
      setRuleRows([]);
      if (!value) return;
      dispatch(fetchStockRuleCategoryItems(value))
        .unwrap()
        .then((result) => {
          const items = Array.isArray(result?.items) ? result.items : [];
          setRuleRows(items.map((item) => mapCategoryItemToStockRuleDraftRow(item, value)));
        })
        .catch(() => {
          setRuleRows([]);
        });
    },
    [dispatch],
  );

  const handleAddRuleRow = useCallback(() => {
    setRuleRows((previous) => [...previous, createEmptyStockRuleDraftRow(category)]);
  }, [category]);

  const categoryProductOptions = useMemo(() => {
    if (!category || categoryItemsState.itemGroup !== category) return [];
    return (categoryItemsState.items || []).map((item) => ({
      value: item.name ?? item.item_code ?? '',
      label: item.item_name || item.name || item.item_code || '',
      unit: item.stock_uom || '',
    }));
  }, [category, categoryItemsState.itemGroup, categoryItemsState.items]);

  const isLoadingProducts =
    categoryItemsState.isLoading && categoryItemsState.itemGroup === category;

  const productsError =
    categoryItemsState.status === 'failed' && categoryItemsState.itemGroup === category
      ? categoryItemsState.error
      : null;

  const canSubmit = useMemo(() => {
    if (centers.length === 0 || !category || ruleRows.length === 0 || saveState.isLoading) {
      return false;
    }
    return ruleRows.every(
      (row) =>
        String(row.productValue || '').trim() &&
        String(row.min ?? '').trim() !== '' &&
        String(row.trigger ?? '').trim() !== '' &&
        String(row.target ?? '').trim() !== '' &&
        String(row.consumption || '').trim() &&
        String(row.frequency || '').trim(),
    );
  }, [centers.length, category, ruleRows, saveState.isLoading]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    const payload = buildSaveStockRulesPayload({
      centers,
      itemGroup: category,
      ruleRows,
    });
    if (!payload) return;

    try {
      await onSubmit?.(payload);
      handleOpenChange(false);
    } catch {
      // Parent shows error toast; keep modal open.
    }
  }, [canSubmit, centers, category, ruleRows, onSubmit, handleOpenChange]);

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
                <RiInformationLine className='size-6' />
              </div>
              <div className='flex min-w-0 flex-col gap-1'>
                <Modal.Title className='text-[18px] font-medium leading-6 tracking-tight text-text-main-900'>
                  Add Stock Rule
                </Modal.Title>
                <Modal.Description className='paragraph-small text-text-sub-600'>
                  Enter below details to add new stock rule.
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
          <StockRulesAddForm
            centers={centers}
            onCentersChange={setCenters}
            centerOptions={centerOptions}
            centersLoading={centerAccess.status === 'loading'}
            category={category}
            onCategoryChange={handleCategoryChange}
            ruleRows={ruleRows}
            onRuleRowsChange={setRuleRows}
            notes={notes}
            onNotesChange={setNotes}
            onAddRuleRow={handleAddRuleRow}
            isLoadingProducts={isLoadingProducts}
            productsError={productsError}
            categoryProductOptions={categoryProductOptions}
            categoryOptions={categoryOptions}
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

export default CreateStockRuleModal;
