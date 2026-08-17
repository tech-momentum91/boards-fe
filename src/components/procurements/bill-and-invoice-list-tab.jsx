import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  approveBillAndInvoice,
  clearBillAndInvoice,
  fetchBillAndInvoiceList,
  uploadBillAndInvoice,
} from '@/api/billAndInvoice';
import { BILL_AND_INVOICE_LIST_DEFAULT_SORTING } from '@/components/procurements/constants';
import { useBillAndInvoiceListColumnConfig } from '@/components/procurements/bill-and-invoice-list-column-config';
import BillAndInvoiceListTable from '@/components/procurements/bill-and-invoice-list-table';
import BillAndInvoiceListToolbar from '@/components/procurements/bill-and-invoice-list-toolbar';
import {
  filterBillAndInvoiceRows,
  sortBillAndInvoiceRows,
} from '@/components/procurements/project-procurements-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

function groupBillAndInvoiceRows(rows = [], groupBy = '', groupOrder = 'asc') {
  if (!groupBy) return rows;

  const fieldMap = {
    Vendor: 'vendor',
    Project: 'project',
    Status: 'status',
  };
  const field = fieldMap[groupBy];
  if (!field) return rows;

  return [...rows].sort((left, right) => {
    const comparison = String(left[field] ?? '').localeCompare(
      String(right[field] ?? ''),
      undefined,
      {
        sensitivity: 'base',
      },
    );
    if (comparison !== 0) return groupOrder === 'desc' ? -comparison : comparison;
    return String(left.invoice_no ?? '').localeCompare(String(right.invoice_no ?? ''));
  });
}

export default function BillAndInvoiceListTab() {
  const columnConfigHook = useBillAndInvoiceListColumnConfig();
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sorting, setSorting] = useState(BILL_AND_INVOICE_LIST_DEFAULT_SORTING);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [fetchedRows, setFetchedRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const fetchRequestIdRef = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchValue.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchValue]);

  const loadRows = useCallback(async () => {
    const requestId = fetchRequestIdRef.current + 1;
    fetchRequestIdRef.current = requestId;
    setIsLoading(true);

    try {
      const result = await fetchBillAndInvoiceList({
        keyword: debouncedSearch,
        status: statusFilter,
      });
      if (requestId !== fetchRequestIdRef.current) return;
      setFetchedRows(result.rows || []);
    } catch (error) {
      if (requestId !== fetchRequestIdRef.current) return;
      setFetchedRows([]);
      showErrorToast(error, { defaultMessage: 'Failed to load bills & invoices.' });
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const handleLinkedBillUpload = useCallback(
    async (rowId, file) => {
      try {
        // Cell currently passes a plain { name, sizeLabel } object without the File.
        // Prefer the browser File when available.
        const uploadFile =
          file?.file instanceof File ? file.file : file instanceof File ? file : null;
        if (!uploadFile) {
          showErrorToast('Please choose a bill file to upload.');
          return;
        }
        await uploadBillAndInvoice({
          itemId: rowId,
          file: uploadFile,
        });
        showSuccessToast('Bill uploaded.');
        await loadRows();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to upload bill.' });
      }
    },
    [loadRows],
  );

  const handleLinkedBillRemove = useCallback(
    async (rowId) => {
      try {
        await clearBillAndInvoice(rowId);
        showSuccessToast('Bill removed.');
        await loadRows();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to remove bill.' });
      }
    },
    [loadRows],
  );

  const handleApprove = useCallback(
    async (rowId) => {
      setApprovingId(rowId);
      try {
        await approveBillAndInvoice(rowId);
        showSuccessToast('Bill approved.');
        await loadRows();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to approve bill.' });
      } finally {
        setApprovingId(null);
      }
    },
    [loadRows],
  );

  const rows = useMemo(() => {
    // Server already applies keyword/status; keep local filter for latency-free typing edge cases.
    const filtered = filterBillAndInvoiceRows(fetchedRows, {
      search: '',
      statusFilter: 'all',
    });
    const sorted = sortBillAndInvoiceRows(filtered, sorting);
    return groupBillAndInvoiceRows(sorted, groupBy, groupOrder);
  }, [fetchedRows, groupBy, groupOrder, sorting]);

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden px-8 pb-8 pt-5'>
      <div className='shrink-0 pb-5'>
        <BillAndInvoiceListToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          columnConfig={columnConfigHook}
          groupBy={groupBy}
          groupOrder={groupOrder}
          onGroupByChange={setGroupBy}
          onGroupOrderChange={setGroupOrder}
        />
      </div>

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        {isLoading ? (
          <div className='flex h-full min-h-[240px] items-center justify-center text-paragraph-sm text-text-sub-500'>
            Loading bills…
          </div>
        ) : (
          <BillAndInvoiceListTable
            rows={rows}
            columnConfig={columnConfigHook.columns}
            sorting={sorting}
            onSortingChange={setSorting}
            onLinkedBillUpload={handleLinkedBillUpload}
            onLinkedBillRemove={handleLinkedBillRemove}
            onApprove={handleApprove}
            approvingId={approvingId}
          />
        )}
      </div>
    </div>
  );
}
