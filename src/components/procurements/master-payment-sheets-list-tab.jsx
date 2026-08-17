import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchMasterPaymentSheetsList } from '@/api/masterPaymentSheets';
import { MASTER_PAYMENT_SHEETS_LIST_DEFAULT_SORTING } from '@/components/procurements/constants';
import MasterPaymentSheetCreateModal from '@/components/procurements/master-payment-sheet-create-modal';
import MasterPaymentSheetDetailView from '@/components/procurements/master-payment-sheet-detail-view';
import { useMasterPaymentSheetsListColumnConfig } from '@/components/procurements/master-payment-sheets-list-column-config';
import MasterPaymentSheetsListTable from '@/components/procurements/master-payment-sheets-list-table';
import MasterPaymentSheetsListToolbar from '@/components/procurements/master-payment-sheets-list-toolbar';
import { showErrorToast } from '@/utils/error-utils';

function groupMasterPaymentSheetRows(rows = [], groupBy = '', groupOrder = 'asc') {
  if (!groupBy) return rows;

  const fieldMap = {
    Status: 'status',
    Month: 'month',
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
    return String(left.sheet_name ?? '').localeCompare(String(right.sheet_name ?? ''));
  });
}

function buildMasterPaymentSheetOrderBy(sorting = []) {
  const { id, desc } = sorting?.[0] ?? {};
  if (!id) return 'sheet_name asc';
  return `${id} ${desc ? 'desc' : 'asc'}`;
}

export default function MasterPaymentSheetsListTab() {
  const columnConfigHook = useMasterPaymentSheetsListColumnConfig();
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sorting, setSorting] = useState(MASTER_PAYMENT_SHEETS_LIST_DEFAULT_SORTING);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState(null);

  const [fetchedRows, setFetchedRows] = useState([]);
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
      const result = await fetchMasterPaymentSheetsList({
        keyword: debouncedSearch,
        status: statusFilter,
        orderBy: buildMasterPaymentSheetOrderBy(sorting),
      });
      if (requestId !== fetchRequestIdRef.current) return;
      setFetchedRows(result.rows || []);
    } catch (error) {
      if (requestId !== fetchRequestIdRef.current) return;
      setFetchedRows([]);
      showErrorToast(error, { defaultMessage: 'Failed to load master payment sheets.' });
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [debouncedSearch, sorting, statusFilter]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const rows = useMemo(
    () => groupMasterPaymentSheetRows(fetchedRows, groupBy, groupOrder),
    [fetchedRows, groupBy, groupOrder],
  );

  const handleRowClick = useCallback((sheet) => {
    setSelectedSheet(sheet);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedSheet(null);
    loadRows();
  }, [loadRows]);

  if (selectedSheet) {
    return (
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <MasterPaymentSheetDetailView
          sheet={selectedSheet}
          onClose={handleCloseDetail}
          onChanged={loadRows}
        />
        <MasterPaymentSheetCreateModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onCreated={loadRows}
        />
      </div>
    );
  }

  return (
    <>
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden px-8 pb-8 pt-5'>
        <div className='shrink-0 pb-5'>
          <MasterPaymentSheetsListToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            columnConfig={columnConfigHook}
            groupBy={groupBy}
            groupOrder={groupOrder}
            onGroupByChange={setGroupBy}
            onGroupOrderChange={setGroupOrder}
            onCreate={() => setCreateModalOpen(true)}
          />
        </div>

        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          <MasterPaymentSheetsListTable
            rows={rows}
            columnConfig={columnConfigHook.columns}
            sorting={sorting}
            onSortingChange={setSorting}
            onRowClick={handleRowClick}
            isLoading={isLoading}
          />
        </div>
      </div>

      <MasterPaymentSheetCreateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreated={loadRows}
      />
    </>
  );
}
