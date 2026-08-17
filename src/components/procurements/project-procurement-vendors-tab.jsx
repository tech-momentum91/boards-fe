import React, { useEffect, useMemo, useState } from 'react';

import { fetchProjectProcurementVendors } from '@/api/projectProcurements';
import { getProjectBillingQcVendors } from '@/api/projectBillingQc';
import {
  PROJECT_PROCUREMENT_VENDORS_CATEGORY_FILTER_OPTIONS,
  PROJECT_PROCUREMENT_VENDORS_LIST_DEFAULT_SORTING,
  PROJECT_PROCUREMENT_VENDORS_TYPE_FILTER_OPTIONS,
} from '@/components/procurements/constants';
import { useProjectProcurementVendorsColumnConfig } from '@/components/procurements/project-procurement-vendors-column-config';
import ProjectProcurementVendorsTable from '@/components/procurements/project-procurement-vendors-table';
import ProjectProcurementVendorsToolbar from '@/components/procurements/project-procurement-vendors-toolbar';
import {
  buildProjectProcurementVendorFilterOptions,
  filterProjectProcurementVendorRows,
  sortProjectProcurementVendorRows,
} from '@/components/procurements/project-procurements-utils';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';

function mergeWorkOrderStatus(rows, workOrders) {
  if (!workOrders?.length) return rows;

  const statusByVendor = new Map(
    workOrders.map((row) => [String(row.vendor_name ?? '').toLowerCase(), row.status]),
  );

  return rows.map((row) => ({
    ...row,
    work_order_status: statusByVendor.get(String(row.vendor_name ?? '').toLowerCase()) ?? null,
  }));
}

function groupVendorRows(rows = [], groupBy = '', groupOrder = 'asc') {
  if (!groupBy) return rows;

  const fieldMap = {
    Type: 'type',
    Category: 'category',
  };
  const field = fieldMap[groupBy];
  if (!field) return rows;

  const grouped = [...rows].sort((left, right) => {
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

  return grouped;
}

export default function ProjectProcurementVendorsTab({ projectId }) {
  const columnConfigHook = useProjectProcurementVendorsColumnConfig();
  const [searchValue, setSearchValue] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sorting, setSorting] = useState(PROJECT_PROCUREMENT_VENDORS_LIST_DEFAULT_SORTING);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [vendorRows, setVendorRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!projectId) {
      setVendorRows([]);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      fetchProjectProcurementVendors(projectId),
      getProjectBillingQcVendors(projectId).catch(() => ({ vendors: [] })),
    ])
      .then(([vendors, workOrderResponse]) => {
        if (cancelled) return;
        setVendorRows(mergeWorkOrderStatus(vendors, workOrderResponse?.vendors ?? []));
      })
      .catch((error) => {
        if (cancelled) return;
        setVendorRows([]);
        setLoadError(error);
        showErrorToast(extractErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const filterOptions = useMemo(
    () => buildProjectProcurementVendorFilterOptions(vendorRows),
    [vendorRows],
  );

  const typeOptions =
    filterOptions.typeOptions.length > 1
      ? filterOptions.typeOptions
      : PROJECT_PROCUREMENT_VENDORS_TYPE_FILTER_OPTIONS;

  const categoryOptions =
    filterOptions.categoryOptions.length > 1
      ? filterOptions.categoryOptions
      : PROJECT_PROCUREMENT_VENDORS_CATEGORY_FILTER_OPTIONS;

  const rows = useMemo(() => {
    const filtered = filterProjectProcurementVendorRows(vendorRows, {
      search: searchValue,
      typeFilter,
      categoryFilter,
    });

    const sorted = sortProjectProcurementVendorRows(filtered, sorting);
    return groupVendorRows(sorted, groupBy, groupOrder);
  }, [vendorRows, categoryFilter, groupBy, groupOrder, searchValue, sorting, typeFilter]);

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div className='shrink-0 pb-5'>
        <ProjectProcurementVendorsToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          columnConfig={columnConfigHook}
          groupBy={groupBy}
          groupOrder={groupOrder}
          onGroupByChange={setGroupBy}
          onGroupOrderChange={setGroupOrder}
          typeOptions={typeOptions}
          categoryOptions={categoryOptions}
        />
      </div>

      <div className='min-h-0 flex-1 overflow-hidden'>
        {loadError && !isLoading && vendorRows.length === 0 ? (
          <div className='flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
            <p className='text-label-md text-text-strong-950'>Unable to load vendors</p>
            <p className='mt-1 text-paragraph-sm text-text-sub-500'>
              {extractErrorMessage(loadError)}
            </p>
          </div>
        ) : (
          <ProjectProcurementVendorsTable
            rows={rows}
            columnConfig={columnConfigHook.columns}
            sorting={sorting}
            onSortingChange={setSorting}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
