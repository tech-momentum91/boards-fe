import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchVendorPaymentsList } from '@/api/vendorPayments';
import { VENDOR_PAYMENTS_LIST_DEFAULT_SORTING } from '@/components/procurements/constants';
import { useVendorPaymentsListColumnConfig } from '@/components/procurements/vendor-payments-list-column-config';
import VendorPaymentsListTable from '@/components/procurements/vendor-payments-list-table';
import VendorPaymentsListToolbar from '@/components/procurements/vendor-payments-list-toolbar';
import {
  filterVendorPaymentsRows,
  sortVendorPaymentsRows,
} from '@/components/procurements/project-procurements-utils';
import { showErrorToast } from '@/utils/error-utils';

function groupVendorPaymentsRows(rows = [], groupBy = '', groupOrder = 'asc') {
  if (!groupBy) return rows;

  const fieldMap = {
    'Vendor Name': 'vendor_name',
    Project: 'project',
    'Bill Received': 'bill_received',
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
    return String(left.vendor_name ?? '').localeCompare(String(right.vendor_name ?? ''));
  });
}

function toFilterOptions(values = [], allLabel) {
  return [{ value: 'all', label: allLabel }, ...values.map((value) => ({ value, label: value }))];
}

export default function VendorPaymentsListTab() {
  const columnConfigHook = useVendorPaymentsListColumnConfig();
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [sorting, setSorting] = useState(VENDOR_PAYMENTS_LIST_DEFAULT_SORTING);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [fetchedRows, setFetchedRows] = useState([]);
  const [vendorOptions, setVendorOptions] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
      const result = await fetchVendorPaymentsList({
        keyword: debouncedSearch,
        vendor: vendorFilter,
        project: projectFilter,
      });
      if (requestId !== fetchRequestIdRef.current) return;
      setFetchedRows(result.rows || []);
      setVendorOptions(result.vendors || []);
      setProjectOptions(result.projects || []);
    } catch (error) {
      if (requestId !== fetchRequestIdRef.current) return;
      setFetchedRows([]);
      setVendorOptions([]);
      setProjectOptions([]);
      showErrorToast(error, { defaultMessage: 'Failed to load vendor payments.' });
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [debouncedSearch, projectFilter, vendorFilter]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const vendorFilterOptions = useMemo(
    () => toFilterOptions(vendorOptions, 'All Vendors'),
    [vendorOptions],
  );
  const projectFilterOptions = useMemo(
    () => toFilterOptions(projectOptions, 'All Projects'),
    [projectOptions],
  );

  const rows = useMemo(() => {
    // Server applies keyword/vendor/project; keep local sort/group for UI responsiveness.
    const filtered = filterVendorPaymentsRows(fetchedRows, {
      search: '',
      vendorFilter: 'all',
      projectFilter: 'all',
    });
    const sorted = sortVendorPaymentsRows(filtered, sorting);
    return groupVendorPaymentsRows(sorted, groupBy, groupOrder);
  }, [fetchedRows, groupBy, groupOrder, sorting]);

  const handleBillNoChange = useCallback((rowId, nextValue) => {
    setFetchedRows((currentRows) =>
      currentRows.map((row) => (row.id === rowId ? { ...row, bill_no: nextValue } : row)),
    );
  }, []);

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden px-8 pb-8 pt-5'>
      <div className='shrink-0 pb-5'>
        <VendorPaymentsListToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          vendorFilter={vendorFilter}
          onVendorFilterChange={setVendorFilter}
          projectFilter={projectFilter}
          onProjectFilterChange={setProjectFilter}
          vendorFilterOptions={vendorFilterOptions}
          projectFilterOptions={projectFilterOptions}
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
            Loading vendor payments…
          </div>
        ) : (
          <VendorPaymentsListTable
            rows={rows}
            columnConfig={columnConfigHook.columns}
            sorting={sorting}
            onSortingChange={setSorting}
            onBillNoChange={handleBillNoChange}
          />
        )}
      </div>
    </div>
  );
}
