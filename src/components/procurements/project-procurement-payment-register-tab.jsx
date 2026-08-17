import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchProjectPaymentRegister } from '@/api/projectPaymentSheets';
import { PROJECT_PROCUREMENT_PAYMENT_REGISTER_LIST_DEFAULT_SORTING } from '@/components/procurements/constants';
import { useProjectProcurementPaymentRegisterColumnConfig } from '@/components/procurements/project-procurement-payment-register-column-config';
import ProjectProcurementPaymentRegisterTable from '@/components/procurements/project-procurement-payment-register-table';
import ProjectProcurementPaymentRegisterToolbar from '@/components/procurements/project-procurement-payment-register-toolbar';
import {
  buildPaymentRegisterFilterOptions,
  normalizeProjectPaymentRegisterRows,
  sortProjectProcurementPaymentRegisterRows,
} from '@/components/procurements/project-procurements-utils';
import { showErrorToast } from '@/utils/error-utils';

function groupPaymentRegisterRows(rows = [], groupBy = '', groupOrder = 'asc') {
  if (!groupBy) return rows;

  const fieldMap = {
    Vendor: 'vendor',
    Category: 'category',
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
    return String(left.vendor ?? '').localeCompare(String(right.vendor ?? ''));
  });
}

export default function ProjectProcurementPaymentRegisterTab({ projectId }) {
  const columnConfigHook = useProjectProcurementPaymentRegisterColumnConfig();
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sorting, setSorting] = useState(PROJECT_PROCUREMENT_PAYMENT_REGISTER_LIST_DEFAULT_SORTING);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');

  const [fetchedRows, setFetchedRows] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(projectId));
  const [optionRows, setOptionRows] = useState([]);
  const fetchRequestIdRef = useRef(0);
  const optionsRequestIdRef = useRef(0);

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
      const result = await fetchProjectPaymentRegister({
        project: projectId,
        keyword: debouncedSearch,
        vendor: vendorFilter,
        category: categoryFilter,
        status: statusFilter,
      });
      if (requestId !== fetchRequestIdRef.current) return;
      setFetchedRows(normalizeProjectPaymentRegisterRows(result.rows));
    } catch (error) {
      if (requestId !== fetchRequestIdRef.current) return;
      setFetchedRows([]);
      showErrorToast(error, { defaultMessage: 'Failed to load payment register.' });
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [categoryFilter, debouncedSearch, projectId, statusFilter, vendorFilter]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    const requestId = optionsRequestIdRef.current + 1;
    optionsRequestIdRef.current = requestId;

    if (!projectId) {
      setOptionRows([]);
      return;
    }

    fetchProjectPaymentRegister({ project: projectId })
      .then((result) => {
        if (requestId !== optionsRequestIdRef.current) return;
        setOptionRows(normalizeProjectPaymentRegisterRows(result.rows));
      })
      .catch(() => {
        if (requestId !== optionsRequestIdRef.current) return;
        setOptionRows([]);
      });
  }, [projectId]);

  const { vendorOptions, categoryOptions } = useMemo(
    () => buildPaymentRegisterFilterOptions(optionRows),
    [optionRows],
  );

  const rows = useMemo(() => {
    const sorted = sortProjectProcurementPaymentRegisterRows(fetchedRows, sorting);
    return groupPaymentRegisterRows(sorted, groupBy, groupOrder);
  }, [fetchedRows, groupBy, groupOrder, sorting]);

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div className='shrink-0 pb-5'>
        <ProjectProcurementPaymentRegisterToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          vendorFilter={vendorFilter}
          onVendorFilterChange={setVendorFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          vendorOptions={vendorOptions}
          categoryOptions={categoryOptions}
          columnConfig={columnConfigHook}
          groupBy={groupBy}
          groupOrder={groupOrder}
          onGroupByChange={setGroupBy}
          onGroupOrderChange={setGroupOrder}
        />
      </div>

      <div className='min-h-0 flex-1 overflow-hidden'>
        <ProjectProcurementPaymentRegisterTable
          rows={rows}
          columnConfig={columnConfigHook.columns}
          sorting={sorting}
          onSortingChange={setSorting}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
