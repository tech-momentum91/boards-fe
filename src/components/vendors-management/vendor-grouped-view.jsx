import React, { useEffect, useMemo, useState } from 'react';
import { RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';

import VendorTable from '@/components/vendors-management/vendor-table';

/**
 * Collapsible sections per group key — same structure as team-management grouped support view.
 */
const VendorGroupedView = ({
  groupedData = {},
  isLoading,
  tableVariant,
  onRowSelect,
  onEdit,
  onDelete,
  permissions,
  /** Shared with primary VendorTable — avoids duplicate get_list_pref per group. */
  columnManagerApi,
}) => {
  const [expandedKeys, setExpandedKeys] = useState(() =>
    Object.fromEntries(Object.keys(groupedData || {}).map((k) => [k, true])),
  );

  useEffect(() => {
    setExpandedKeys((previous) => {
      const next = { ...previous };
      Object.keys(groupedData || {}).forEach((k) => {
        if (next[k] === undefined) next[k] = true;
      });
      return next;
    });
  }, [groupedData]);

  const entries = useMemo(() => Object.entries(groupedData || {}), [groupedData]);

  const toggle = (key) => setExpandedKeys((previous) => ({ ...previous, [key]: !previous[key] }));

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-16 text-text-soft-400'>Loading...</div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className='flex items-center justify-center py-16 text-text-soft-400'>
        No results found.
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-8'>
      {entries.map(([key, members]) => {
        const isExpanded = expandedKeys[key] !== false;
        const rows = Array.isArray(members) ? members : [];

        return (
          <div key={key} className='flex flex-col gap-1'>
            <button
              type='button'
              onClick={() => toggle(key)}
              className='label-small flex w-full cursor-pointer items-center gap-1 text-left font-medium text-[var(--color-text-sub-500)] transition-opacity hover:opacity-80'
            >
              {key}
              <span className='font-normal text-text-soft-400'>({rows.length})</span>
              {isExpanded ? (
                <RiArrowUpSLine size={16} className='shrink-0' />
              ) : (
                <RiArrowDownSLine size={16} className='shrink-0' />
              )}
            </button>

            {isExpanded &&
              (rows.length === 0 ? (
                <div className='rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 px-4 py-8 text-center text-paragraph-sm text-text-sub-600'>
                  No vendors in this group.
                </div>
              ) : (
                <div className='w-full overflow-x-auto rounded-2xl border border-stroke-soft-200 bg-bg-white-0 pt-2'>
                  <VendorTable
                    rows={rows}
                    isLoading={false}
                    hasMore={false}
                    enableScrollPagination={false}
                    onRowSelect={onRowSelect}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    permissions={permissions}
                    tableVariant={tableVariant}
                    tableId='vendors-table'
                    columnManagerApi={columnManagerApi}
                  />
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
};

export default VendorGroupedView;
