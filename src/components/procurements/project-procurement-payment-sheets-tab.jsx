import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchProjectPaymentSheetsList } from '@/api/projectPaymentSheets';
import { PROJECT_PROCUREMENT_PAYMENT_SHEETS_LIST_DEFAULT_SORTING } from '@/components/procurements/constants';
import ProjectProcurementCreatePaymentSheetDrawer from '@/components/procurements/project-procurement-create-payment-sheet-drawer';
import ProjectProcurementPaymentSheetDetailView from '@/components/procurements/project-procurement-payment-sheet-detail-view';
import { useProjectProcurementPaymentSheetsColumnConfig } from '@/components/procurements/project-procurement-payment-sheets-column-config';
import ProjectProcurementPaymentSheetsTable from '@/components/procurements/project-procurement-payment-sheets-table';
import ProjectProcurementPaymentSheetsToolbar from '@/components/procurements/project-procurement-payment-sheets-toolbar';
import { showErrorToast } from '@/utils/error-utils';

function groupPaymentSheetRows(rows = [], groupBy = '', groupOrder = 'asc') {
  if (!groupBy) return rows;

  const fieldMap = {
    Status: 'status',
    'Master Sheet': 'master_sheet',
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

function buildPaymentSheetOrderBy(sorting = []) {
  const { id, desc } = sorting?.[0] ?? {};
  if (!id) return 'sheet_name asc';
  return `${id} ${desc ? 'desc' : 'asc'}`;
}

export default function ProjectProcurementPaymentSheetsTab({ projectId }) {
  const columnConfigHook = useProjectProcurementPaymentSheetsColumnConfig();
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sorting, setSorting] = useState(PROJECT_PROCUREMENT_PAYMENT_SHEETS_LIST_DEFAULT_SORTING);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);

  const [fetchedRows, setFetchedRows] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(projectId));
  const fetchRequestIdRef = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchValue.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchValue]);

  const loadRows = useCallback(async () => {
    if (!projectId) {
      setFetchedRows([]);
      setIsLoading(false);
      return;
    }

    const requestId = fetchRequestIdRef.current + 1;
    fetchRequestIdRef.current = requestId;
    setIsLoading(true);

    try {
      const result = await fetchProjectPaymentSheetsList({
        project: projectId,
        keyword: debouncedSearch,
        status: statusFilter,
        orderBy: buildPaymentSheetOrderBy(sorting),
      });
      if (requestId !== fetchRequestIdRef.current) return;
      setFetchedRows(result.rows || []);
    } catch (error) {
      if (requestId !== fetchRequestIdRef.current) return;
      setFetchedRows([]);
      showErrorToast(error, { defaultMessage: 'Failed to load payment sheets.' });
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [debouncedSearch, projectId, sorting, statusFilter]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const rows = useMemo(
    () => groupPaymentSheetRows(fetchedRows, groupBy, groupOrder),
    [fetchedRows, groupBy, groupOrder],
  );

  const handleCreateDrawerOpenChange = useCallback((nextOpen) => {
    setCreateDrawerOpen(nextOpen);
    if (!nextOpen) setEditingSheet(null);
  }, []);

  const handleRowClick = useCallback((sheet) => {
    const status = String(sheet?.status || '')
      .trim()
      .toLowerCase();
    if (status === 'draft') {
      setSelectedSheet(null);
      setEditingSheet(sheet);
      setCreateDrawerOpen(true);
      return;
    }
    setSelectedSheet(sheet);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedSheet(null);
  }, []);

  if (selectedSheet) {
    return (
      <>
        <ProjectProcurementPaymentSheetDetailView
          sheet={selectedSheet}
          onClose={handleCloseDetail}
        />
        <ProjectProcurementCreatePaymentSheetDrawer
          open={createDrawerOpen}
          onOpenChange={handleCreateDrawerOpenChange}
          projectId={projectId}
          editingSheet={editingSheet}
          onCreated={loadRows}
        />
      </>
    );
  }

  return (
    <>
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <div className='shrink-0 pb-5'>
          <ProjectProcurementPaymentSheetsToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            columnConfig={columnConfigHook}
            groupBy={groupBy}
            groupOrder={groupOrder}
            onGroupByChange={setGroupBy}
            onGroupOrderChange={setGroupOrder}
            onCreatePaymentSheet={() => {
              setEditingSheet(null);
              setCreateDrawerOpen(true);
            }}
          />
        </div>

        <div className='min-h-0 flex-1 overflow-hidden'>
          <ProjectProcurementPaymentSheetsTable
            rows={rows}
            columnConfig={columnConfigHook.columns}
            sorting={sorting}
            onSortingChange={setSorting}
            onRowClick={handleRowClick}
            isLoading={isLoading}
          />
        </div>
      </div>

      <ProjectProcurementCreatePaymentSheetDrawer
        open={createDrawerOpen}
        onOpenChange={handleCreateDrawerOpenChange}
        projectId={projectId}
        editingSheet={editingSheet}
        onCreated={loadRows}
      />
    </>
  );
}
