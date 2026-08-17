import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchProcurementPosFilterOptions,
  fetchProjectProcurementPos,
} from '@/api/projectProcurements';
import { PROJECT_PROCUREMENT_POS_LIST_DEFAULT_SORTING } from '@/components/procurements/constants';
import { useProjectProcurementPosColumnConfig } from '@/components/procurements/project-procurement-pos-column-config';
import ProjectProcurementPoDetailView from '@/components/procurements/project-procurement-po-detail-view';
import ProjectProcurementPosTable from '@/components/procurements/project-procurement-pos-table';
import ProjectProcurementPosToolbar from '@/components/procurements/project-procurement-pos-toolbar';
import {
  filterProjectProcurementPosRows,
  sortProjectProcurementPosRows,
} from '@/components/procurements/project-procurements-utils';
import { showErrorToast } from '@/utils/error-utils';

const EMPTY_FILTER_OPTIONS = {
  vendorOptions: [{ value: 'all', label: 'All Vendors' }],
  packageOptions: [{ value: 'all', label: 'All Packages' }],
  categoryOptions: [{ value: 'all', label: 'All Categories' }],
};

function groupPosRows(rows = [], groupBy = '', groupOrder = 'asc') {
  if (!groupBy) return rows;

  const fieldMap = {
    Vendor: 'vendor_name',
    Package: 'package',
    Category: 'category',
  };
  const field = fieldMap[groupBy];
  if (!field) return rows;

  return [...rows].sort((left, right) => {
    const comparison = String(left[field] ?? '').localeCompare(
      String(right[field] ?? ''),
      undefined,
      { sensitivity: 'base' },
    );
    if (comparison !== 0) return groupOrder === 'desc' ? -comparison : comparison;
    return String(left.po_number ?? '').localeCompare(String(right.po_number ?? ''));
  });
}

export default function ProjectProcurementPosTab({ project, selectedPoId = null, onSelectPo }) {
  const projectId = project?.id ?? project?.name ?? '';
  const columnConfigHook = useProjectProcurementPosColumnConfig();
  const [searchValue, setSearchValue] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [packageFilter, setPackageFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sorting, setSorting] = useState(PROJECT_PROCUREMENT_POS_LIST_DEFAULT_SORTING);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [posRows, setPosRows] = useState([]);
  const [filterOptions, setFilterOptions] = useState(EMPTY_FILTER_OPTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchProcurementPosFilterOptions()
      .then((options) => {
        if (cancelled) return;
        setFilterOptions({
          vendorOptions: options.vendorOptions ?? EMPTY_FILTER_OPTIONS.vendorOptions,
          packageOptions: options.packageOptions ?? EMPTY_FILTER_OPTIONS.packageOptions,
          categoryOptions: options.categoryOptions ?? EMPTY_FILTER_OPTIONS.categoryOptions,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setFilterOptions(EMPTY_FILTER_OPTIONS);
        showErrorToast(error, { defaultMessage: 'Failed to load filter options.' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!projectId) {
      setPosRows([]);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    fetchProjectProcurementPos(projectId)
      .then((rows) => {
        if (cancelled) return;
        setPosRows(rows);
      })
      .catch((error) => {
        if (cancelled) return;
        setPosRows([]);
        setLoadError(error);
        showErrorToast(error, { defaultMessage: 'Failed to load project purchase orders.' });
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    setSearchValue('');
    setVendorFilter('all');
    setPackageFilter('all');
    setCategoryFilter('all');
  }, [projectId]);

  useEffect(() => {
    if (
      vendorFilter !== 'all' &&
      !filterOptions.vendorOptions.some((option) => option.value === vendorFilter)
    ) {
      setVendorFilter('all');
    }
    if (
      packageFilter !== 'all' &&
      !filterOptions.packageOptions.some((option) => option.value === packageFilter)
    ) {
      setPackageFilter('all');
    }
    if (
      categoryFilter !== 'all' &&
      !filterOptions.categoryOptions.some((option) => option.value === categoryFilter)
    ) {
      setCategoryFilter('all');
    }
  }, [categoryFilter, filterOptions, packageFilter, vendorFilter]);

  const rows = useMemo(() => {
    const filtered = filterProjectProcurementPosRows(posRows, {
      search: searchValue,
      vendorFilter,
      packageFilter,
      categoryFilter,
    });

    const sorted = sortProjectProcurementPosRows(filtered, sorting);
    return groupPosRows(sorted, groupBy, groupOrder);
  }, [
    categoryFilter,
    groupBy,
    groupOrder,
    packageFilter,
    posRows,
    searchValue,
    sorting,
    vendorFilter,
  ]);

  const selectedPoStub = useMemo(() => {
    if (!selectedPoId) return null;
    const fromList = posRows.find(
      (row) => row.id === selectedPoId || row.po_number === selectedPoId,
    );
    return fromList ?? { id: selectedPoId, po_number: selectedPoId };
  }, [posRows, selectedPoId]);

  const handlePoClick = useCallback(
    (row) => {
      onSelectPo?.(row);
    },
    [onSelectPo],
  );

  const handlePoClose = useCallback(() => {
    onSelectPo?.(null);
  }, [onSelectPo]);

  const handleGroupOrderChange = useCallback((next) => {
    setGroupOrder((previous) => {
      const resolved = typeof next === 'function' ? next(previous) : next;
      return resolved === 'desc' ? 'desc' : 'asc';
    });
  }, []);

  if (selectedPoStub) {
    return (
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <ProjectProcurementPoDetailView po={selectedPoStub} onClose={handlePoClose} />
      </div>
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div className='shrink-0 pb-5'>
        <ProjectProcurementPosToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          vendorFilter={vendorFilter}
          onVendorFilterChange={setVendorFilter}
          packageFilter={packageFilter}
          onPackageFilterChange={setPackageFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          vendorOptions={filterOptions.vendorOptions}
          packageOptions={filterOptions.packageOptions}
          categoryOptions={filterOptions.categoryOptions}
          columnConfig={columnConfigHook}
          groupBy={groupBy}
          groupOrder={groupOrder}
          onGroupByChange={setGroupBy}
          onGroupOrderChange={handleGroupOrderChange}
        />
      </div>

      {loadError && !isLoading && rows.length === 0 ? (
        <div className='flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
          <p className='text-label-md text-text-strong-950'>Failed to load purchase orders</p>
          <p className='mt-1 text-paragraph-sm text-text-sub-500'>
            Try refreshing the page or check your permissions.
          </p>
        </div>
      ) : (
        <div className='min-h-0 flex-1 overflow-hidden'>
          <ProjectProcurementPosTable
            rows={rows}
            columnConfig={columnConfigHook.columns}
            sorting={sorting}
            onSortingChange={setSorting}
            onRowClick={handlePoClick}
            isLoading={isLoading}
            emptyDescription={
              posRows.length === 0
                ? 'No purchase orders are linked to this project yet.'
                : 'Adjust your search or filters to see results.'
            }
          />
        </div>
      )}
    </div>
  );
}
