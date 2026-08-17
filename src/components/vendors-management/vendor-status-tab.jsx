import React from 'react';
import * as ButtonGroup from '@/components/ui/button-group';

/**
 * Active / Inactive ButtonGroup for the Vendors listview. `counts` mirrors the
 * shape returned by `get_vendor_listview` → `status_counts` (capitalised keys),
 * with optional snake_case fallbacks so the component is forgiving about the
 * source. Renders a badge next to each label whenever its count is > 0, using
 * the same selected-vs-unselected styling pattern as the Agreements
 * Active/Pending tabs (see `pages/Agreements/agreements-list-page.jsx`).
 */
const VendorStatusTab = ({ value, onChange, counts = {} }) => {
  const activeCount = Number(counts.active ?? counts.Active ?? 0) || 0;
  const inactiveCount = Number(counts.inactive ?? counts.Inactive ?? 0) || 0;
  const tabs = [
    { label: 'Active', key: 'active', count: activeCount },
    { label: 'Inactive', key: 'inactive', count: inactiveCount },
  ];

  return (
    <ButtonGroup.Root>
      {tabs.map((tab) => {
        const isSelected = value === tab.key;
        const showCount = tab.count > 0;
        const grayBadgeClass =
          'flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-weak-100 px-1.5 text-label-xs text-text-sub-600';
        const badgeClass = isSelected
          ? 'flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-base px-1.5 text-label-xs text-static-white'
          : grayBadgeClass;
        return (
          <ButtonGroup.Item
            key={tab.key}
            data-state={isSelected ? 'on' : 'off'}
            onClick={() => onChange(tab.key)}
            className='
              px-3 py-2 text-sm font-medium
              data-[state=on]:ring-1
              data-[state=on]:bg-primary-lighter
              data-[state=on]:ring-primary-base
              data-[state=on]:z-1
            '
          >
            <span className='inline-flex items-center gap-2'>
              <span>{tab.label}</span>
              {showCount ? <span className={badgeClass}>{tab.count}</span> : null}
            </span>
          </ButtonGroup.Item>
        );
      })}
    </ButtonGroup.Root>
  );
};

export default VendorStatusTab;
