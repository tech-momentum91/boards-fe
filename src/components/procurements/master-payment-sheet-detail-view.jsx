import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiCloseLine } from 'react-icons/ri';

import {
  fetchMasterPaymentSheetDetail,
  setMasterPaymentSheetStatus,
  updateMasterPaymentSheetAllocations,
} from '@/api/masterPaymentSheets';
import {
  MASTER_PAYMENT_SHEET_DETAIL_DEFAULT_SORTING,
  MASTER_PAYMENT_SHEETS_STATUS_FILTER_OPTIONS,
} from '@/components/procurements/constants';
import { useMasterPaymentSheetDetailColumnConfig } from '@/components/procurements/master-payment-sheet-detail-column-config';
import MasterPaymentSheetDetailTable from '@/components/procurements/master-payment-sheet-detail-table';
import MasterPaymentSheetDetailToolbar from '@/components/procurements/master-payment-sheet-detail-toolbar';
import MasterPaymentSheetStatusBadge from '@/components/procurements/master-payment-sheet-status-badge';
import {
  filterMasterPaymentSheetDetailRows,
  formatProcurementAmount,
  sortMasterPaymentSheetDetailRows,
} from '@/components/procurements/project-procurements-utils';
import * as Button from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const STATUS_OPTIONS = MASTER_PAYMENT_SHEETS_STATUS_FILTER_OPTIONS.filter(
  (option) => option.value !== 'all',
);

const roundTo = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(Number(value) * factor) / factor;
};

/** Cap percent input at 100; keep empty / in-progress strings as-is. */
function clampPercentInput(value) {
  if (value === '' || value == null) return '';
  const num = Number(String(value).replaceAll(',', ''));
  if (!Number.isFinite(num)) return value;
  if (num > 100) return '100';
  if (num < 0) return '0';
  return value;
}

export default function MasterPaymentSheetDetailView({ sheet, onClose, onChanged }) {
  const columnConfigHook = useMasterPaymentSheetDetailColumnConfig();
  const [searchValue, setSearchValue] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sorting, setSorting] = useState(MASTER_PAYMENT_SHEET_DETAIL_DEFAULT_SORTING);
  const [allocatedValues, setAllocatedValues] = useState({});

  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const fetchRequestIdRef = useRef(0);

  const sheetName = sheet?.name ?? sheet?.id;

  const loadDetail = useCallback(async () => {
    if (!sheetName) return;
    const requestId = fetchRequestIdRef.current + 1;
    fetchRequestIdRef.current = requestId;
    setIsLoading(true);

    try {
      const result = await fetchMasterPaymentSheetDetail(sheetName);
      if (requestId !== fetchRequestIdRef.current) return;
      setDetail(result);
      setAllocatedValues({});
    } catch (error) {
      if (requestId !== fetchRequestIdRef.current) return;
      setDetail(null);
      showErrorToast(error, { defaultMessage: 'Failed to load payment sheet details.' });
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [sheetName]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const sourceRows = useMemo(() => detail?.items ?? [], [detail]);

  const rows = useMemo(() => {
    const filtered = filterMasterPaymentSheetDetailRows(sourceRows, {
      search: searchValue,
      projectFilter,
      vendorFilter,
      categoryFilter,
    });
    return sortMasterPaymentSheetDetailRows(filtered, sorting);
  }, [categoryFilter, projectFilter, searchValue, sorting, sourceRows, vendorFilter]);

  const budgeted = detail?.budgeted ?? sheet?.budgeted ?? 0;

  const totals = useMemo(() => {
    const requested = rows.reduce((sum, row) => sum + (Number(row.requested_amt) || 0), 0);
    const allocatedFromInputs = rows.reduce((sum, row) => {
      const rowValues = allocatedValues[row.id];
      const amount = rowValues?.amount ?? row.allocated_amt;
      return sum + (Number(amount) || 0);
    }, 0);

    return {
      budgeted,
      requested,
      allocated: allocatedFromInputs > 0 ? allocatedFromInputs : requested,
    };
  }, [allocatedValues, budgeted, rows]);

  const handleAllocatedChange = useCallback(
    (rowId, field, value) => {
      const row = sourceRows.find((item) => item.id === rowId);
      const base = Number(row?.po_value) || 0;
      const isEmpty = value === '' || value == null;

      setAllocatedValues((current) => {
        const next = { ...current[rowId] };

        if (field === 'amount') {
          let amountValue = value;
          let amountNum = Number(value);
          if (!isEmpty && Number.isFinite(amountNum) && base > 0 && amountNum > base) {
            amountNum = base;
            amountValue = String(roundTo(base));
          }
          next.amount = amountValue;
          if (isEmpty) {
            next.percent = '';
          } else if (base > 0 && Number.isFinite(amountNum)) {
            next.percent = Math.min(100, roundTo((amountNum / base) * 100));
          }
        } else if (field === 'percent') {
          const percentValue = clampPercentInput(value);
          const percentEmpty = percentValue === '' || percentValue == null;
          next.percent = percentValue;
          if (percentEmpty) {
            next.amount = '';
          } else if (base > 0) {
            const percentNum = Number(percentValue);
            if (Number.isFinite(percentNum)) next.amount = roundTo((percentNum / 100) * base);
          }
        }

        return { ...current, [rowId]: next };
      });
    },
    [sourceRows],
  );

  const handleSaveAllocations = useCallback(async () => {
    const items = Object.entries(allocatedValues)
      .map(([rowId, values]) => {
        const hasAmount = values?.amount != null && values.amount !== '';
        const hasPercent = values?.percent != null && values.percent !== '';
        if (!hasAmount && !hasPercent) return null;
        const item = { name: rowId };
        if (hasAmount) item.allocated_amount = Number(values.amount) || 0;
        if (hasPercent) item.allocated_pct = Number(values.percent) || 0;
        return item;
      })
      .filter(Boolean);

    if (items.length === 0) {
      showErrorToast(null, { defaultMessage: 'No allocation changes to save.' });
      return;
    }

    setIsSaving(true);
    try {
      await updateMasterPaymentSheetAllocations(sheetName, items);
      showSuccessToast('Allocations saved successfully.');
      await loadDetail();
      await onChanged?.();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to save allocations.' });
    } finally {
      setIsSaving(false);
    }
  }, [allocatedValues, loadDetail, onChanged, sheetName]);

  const handleStatusChange = useCallback(
    async (nextStatus) => {
      if (!nextStatus || nextStatus === detail?.status) return;
      setIsUpdatingStatus(true);
      try {
        await setMasterPaymentSheetStatus(sheetName, nextStatus);
        showSuccessToast(`Status updated to ${nextStatus}.`);
        await loadDetail();
        await onChanged?.();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update status.' });
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [detail?.status, loadDetail, onChanged, sheetName],
  );

  if (!sheet) return null;

  const status = detail?.status ?? sheet.status;
  const monthYear = detail?.month_year ?? sheet.month_year;
  const subtitle = [monthYear, formatProcurementAmount(budgeted)].filter(Boolean).join(' · ');

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden px-8 pb-8 pt-5'>
      <div className='shrink-0 border-b border-stroke-soft-200 pb-5'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <div className='flex flex-wrap items-center gap-1.5'>
              <h2 className='text-[18px] font-medium leading-7 tracking-[-0.45px] text-text-main-900'>
                {detail?.sheet_name ?? sheet.sheet_name}
              </h2>
              <MasterPaymentSheetStatusBadge value={status} />
            </div>
            <p className='text-[12px] font-medium leading-4 text-[#737373]'>{subtitle}</p>
          </div>

          <div className='flex shrink-0 items-center gap-2'>
            <SearchableSelect
              size='xsmall'
              variant='compact'
              showArrow
              value={status}
              onValueChange={handleStatusChange}
              options={STATUS_OPTIONS}
              placeholder='Set status'
              searchPlaceholder='Search status...'
              noResultsMessage='No status found'
              disabled={isUpdatingStatus || isLoading}
              triggerClassName='h-8 min-h-8 gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 pl-2 pr-1.5 font-normal text-text-main-900'
              contentClassName='min-w-[200px]'
            />

            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              className='size-8 shrink-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
              aria-label='Close payment sheet detail'
              onClick={onClose}
            >
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </div>
      </div>

      <div className='shrink-0 py-5'>
        <MasterPaymentSheetDetailToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          projectFilter={projectFilter}
          onProjectFilterChange={setProjectFilter}
          vendorFilter={vendorFilter}
          onVendorFilterChange={setVendorFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          columnConfig={columnConfigHook}
          onSave={handleSaveAllocations}
          isSaving={isSaving}
        />
      </div>

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
        <MasterPaymentSheetDetailTable
          rows={rows}
          columnConfig={columnConfigHook.columns}
          sorting={sorting}
          onSortingChange={setSorting}
          totals={totals}
          allocatedValues={allocatedValues}
          onAllocatedChange={handleAllocatedChange}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
